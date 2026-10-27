// server/admin.js
// Espace administrateur : protégé par le PIN (ADMIN_PIN du .env).
// Le PIN donne une élévation temporaire (ADMIN_SESSION_MINUTES) dans le cookie de session.

import express from "express";
import { config } from "./config.js";
import {
  requireAuth, requireAdmin, issueSession, safeEqual,
  checkRateLimit, registerFailure, registerSuccess, logEvent, readLogs,
} from "./auth.js";
import { paths, dirSize, isValidId, readJSON } from "./store.js";
import {
  listProfiles, getProfile, updateProfile, deleteProfile, publicProfile, listResults,
} from "./profiles.js";
import { listAllCourses, publicCourse } from "./courses.js";
import { getStats } from "./stats.js";

export const adminRouter = express.Router();

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Connexion / déconnexion admin ────────────────────────────────────────
adminRouter.post("/login", requireAuth, wrap(async (req, res) => {
  if (!config.adminPin) return res.status(503).json({ error: "admin_disabled" });

  const limit = checkRateLimit("pin", req.ip);
  if (limit.blocked) {
    return res.status(429).json({ error: "too_many_attempts", retryAfter: limit.retryAfter });
  }
  const pin = String(req.body?.pin ?? "").trim();
  if (!pin || !safeEqual(pin, config.adminPin)) {
    registerFailure("pin", req.ip);
    await logEvent(req, "admin_failed");
    await sleep(400);
    return res.status(401).json({ error: "bad_pin" });
  }
  registerSuccess("pin", req.ip);
  issueSession(res, {
    profileId: req.session.profileId,
    adminUntil: Date.now() + config.adminSessionMinutes * 60 * 1000,
    exp: req.session.exp,
  });
  await logEvent(req, "admin_login");
  res.json({ ok: true });
}));

adminRouter.post("/logout", requireAuth, (req, res) => {
  issueSession(res, { profileId: req.session.profileId, exp: req.session.exp });
  res.json({ ok: true });
});

// Tout ce qui suit exige l'élévation admin
adminRouter.use(requireAdmin);

// ── Vue d'ensemble + liste des profils ───────────────────────────────────
adminRouter.get("/overview", wrap(async (_req, res) => {
  const [profiles, courses, stats] = await Promise.all([listProfiles(), listAllCourses(), getStats()]);

  const perProfile = new Map();
  for (const p of profiles) perProfile.set(p.id, { courseCount: 0, quizCount: 0, storageBytes: 0 });
  for (const c of courses) {
    const entry = perProfile.get(c.profileId);
    if (!entry) continue;
    entry.courseCount += 1;
    entry.quizCount += (c.quizIds || []).length;
    entry.storageBytes += await dirSize(paths.courseDir(c.id));
  }

  const rows = [];
  for (const p of profiles) {
    const extra = perProfile.get(p.id);
    const results = await listResults(p.id);
    rows.push({
      ...publicProfile(p),
      lastActiveDate: p.lastActiveDate || null,
      ...extra,
      resultCount: results.length,
    });
  }

  const [dataBytes, coursesBytes, cacheBytes] = await Promise.all([
    dirSize(paths.root()),
    dirSize(paths.coursesRoot()),
    dirSize(paths.cacheRoot()),
  ]);

  const totalCalls = stats.totals.summarize.calls + stats.totals.quiz.calls;
  const totalHits = stats.totals.summarize.cacheHits + stats.totals.quiz.cacheHits;

  res.json({
    profiles: rows,
    totals: {
      courses: courses.length,
      quizzes: rows.reduce((a, r) => a + r.quizCount, 0),
      results: rows.reduce((a, r) => a + r.resultCount, 0),
      xp: rows.reduce((a, r) => a + r.xp, 0),
    },
    ai: {
      summarize: stats.totals.summarize,
      quiz: stats.totals.quiz,
      totalCalls,
      totalCacheHits: totalHits,
      inputTokens: stats.totals.summarize.inputTokens + stats.totals.quiz.inputTokens,
      outputTokens: stats.totals.summarize.outputTokens + stats.totals.quiz.outputTokens,
    },
    disk: { dataBytes, coursesBytes, cacheBytes },
    settings: {
      model: config.model,
      modelQuiz: config.modelQuiz,
      dailyAiLimit: config.dailyAiLimit,
      apiKeyConfigured: !!config.anthropicApiKey,
      allowProfileCreation: config.allowProfileCreation,
    },
  });
}));

// ── Détail d'un profil ───────────────────────────────────────────────────
adminRouter.get("/profiles/:id", wrap(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ error: "not_found" });
  const profile = await getProfile(req.params.id);
  if (!profile) return res.status(404).json({ error: "not_found" });

  const courses = (await listAllCourses())
    .filter((c) => c.profileId === profile.id)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  const withSize = [];
  for (const c of courses) {
    withSize.push({ ...publicCourse(c), storageBytes: await dirSize(paths.courseDir(c.id)) });
  }
  const results = (await listResults(profile.id)).slice(-30).reverse();

  res.json({ profile: publicProfile(profile), courses: withSize, results });
}));

adminRouter.patch("/profiles/:id", wrap(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ error: "not_found" });
  const patch = {};
  if (req.body?.disabled !== undefined) patch.disabled = !!req.body.disabled;
  if (req.body?.name !== undefined) patch.name = req.body.name;
  const updated = await updateProfile(req.params.id, patch);
  if (!updated) return res.status(404).json({ error: "not_found" });
  await logEvent(req, "admin_profile_update", { profile: updated.name, patch: Object.keys(patch).join(",") });
  res.json({ profile: publicProfile(updated) });
}));

adminRouter.delete("/profiles/:id", wrap(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ error: "not_found" });
  const profile = await getProfile(req.params.id);
  if (!profile) return res.status(404).json({ error: "not_found" });
  await deleteProfile(profile.id);
  await logEvent(req, "admin_profile_delete", { profile: profile.name });
  res.json({ ok: true });
}));

// ── Journal des connexions ───────────────────────────────────────────────
adminRouter.get("/logs", wrap(async (req, res) => {
  const limit = Math.max(1, Math.min(500, Number.parseInt(req.query.limit, 10) || 150));
  res.json({ logs: await readLogs(limit) });
}));

// ── Export JSON de toutes les données (hors images) ──────────────────────
adminRouter.get("/export", wrap(async (_req, res) => {
  const profiles = await listProfiles();
  const courses = await listAllCourses();
  const data = [];
  for (const p of profiles) {
    const mine = courses.filter((c) => c.profileId === p.id);
    const quizzes = [];
    for (const c of mine) {
      for (const qid of c.quizIds || []) {
        const q = await readJSON(paths.quizFile(qid), null);
        if (q) quizzes.push(q);
      }
    }
    data.push({
      profile: p,
      courses: mine.map(({ hash, ...rest }) => rest),
      quizzes,
      results: await listResults(p.id),
    });
  }
  const payload = { exportedAt: new Date().toISOString(), stats: await getStats(), profiles: data };
  const name = `etudiantia_export_${new Date().toISOString().slice(0, 10)}.json`;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
  res.send(JSON.stringify(payload, null, 2));
}));
