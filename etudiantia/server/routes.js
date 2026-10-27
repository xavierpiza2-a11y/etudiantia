// server/routes.js
// API utilisateur : session (clé d'accès + profil), cours, quiz, résultats.

import express from "express";
import fs from "node:fs/promises";
import { config } from "./config.js";
import {
  loadSession, requireAuth, issueSession, clearSession, isAdminSession,
  safeEqual, checkRateLimit, registerFailure, registerSuccess, logEvent,
} from "./auth.js";
import {
  paths, newId, sha256, isValidId, readJSON, writeJSON, writeBuffer, exists, streamFile,
} from "./store.js";
import {
  listProfiles, getProfile, createProfile, publicProfile, recordActivity, addResult, listResults,
} from "./profiles.js";
import {
  getOwnedCourse, saveCourse, patchCourse, listCoursesFor, publicCourse,
  getQuiz, saveQuiz, deleteCourse,
} from "./courses.js";
import { summarizeImages, generateQuiz, AiError } from "./anthropic.js";
import { recordAiCall, recordCacheHit, assertWithinDailyLimit } from "./stats.js";
import {
  XP_REWARDS, isAnswerCorrect, QUIZ_MIN_QUESTIONS, QUIZ_MAX_QUESTIONS,
} from "../shared/gamification.js";

export const router = express.Router();

// Les erreurs async d'Express 4 doivent être relayées manuellement
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

router.use(loadSession);

// ── Middleware : profil sélectionné et actif ─────────────────────────────
async function requireProfile(req, res, next) {
  if (!req.session) return res.status(401).json({ error: "auth_required" });
  if (!req.session.profileId) return res.status(403).json({ error: "profile_required" });
  const profile = await getProfile(req.session.profileId);
  if (!profile) return res.status(403).json({ error: "profile_required" });
  if (profile.disabled) return res.status(403).json({ error: "disabled" });
  req.profile = profile;
  next();
}
const profileGuard = wrap(requireProfile);

// ═══════════════════════════════ SESSION ═══════════════════════════════

router.get("/session", wrap(async (req, res) => {
  if (!req.session) {
    return res.json({ authenticated: false });
  }
  const profile = req.session.profileId ? await getProfile(req.session.profileId) : null;
  const isAdmin = isAdminSession(req.session);
  res.json({
    authenticated: true,
    profile: profile ? publicProfile(profile) : null,
    isAdmin,
    adminEnabled: !!config.adminPin,
    canCreateProfiles: config.allowProfileCreation || isAdmin,
  });
}));

router.post("/session/login", wrap(async (req, res) => {
  const limit = checkRateLimit("key", req.ip);
  if (limit.blocked) {
    return res.status(429).json({ error: "too_many_attempts", retryAfter: limit.retryAfter });
  }
  const key = String(req.body?.key ?? "").trim();
  if (!key || !safeEqual(key, config.accessKey)) {
    registerFailure("key", req.ip);
    await logEvent(req, "login_failed");
    await sleep(400); // ralentit les tentatives automatisées
    return res.status(401).json({ error: "bad_key" });
  }
  registerSuccess("key", req.ip);
  issueSession(res, { profileId: null });
  await logEvent(req, "login");
  res.json({ ok: true });
}));

router.post("/session/profile", requireAuth, wrap(async (req, res) => {
  const { profileId } = req.body || {};

  // Retour à l'écran de choix de profil (l'élévation admin est retirée par sécurité)
  if (profileId === null) {
    issueSession(res, { profileId: null, exp: req.session.exp });
    return res.json({ ok: true });
  }
  if (!isValidId(profileId)) return res.status(400).json({ error: "bad_profile" });

  const profile = await getProfile(profileId);
  if (!profile) return res.status(404).json({ error: "profile_not_found" });
  if (profile.disabled) return res.status(403).json({ error: "disabled" });

  issueSession(res, { profileId, exp: req.session.exp });
  await logEvent(req, "profile_select", { profile: profile.name });
  res.json({ ok: true, profile: publicProfile(profile) });
}));

router.post("/session/logout", wrap(async (req, res) => {
  if (req.session) await logEvent(req, "logout");
  clearSession(res);
  res.json({ ok: true });
}));

// ═══════════════════════════════ PROFILS ═══════════════════════════════

router.get("/profiles", requireAuth, wrap(async (_req, res) => {
  const list = await listProfiles();
  res.json({
    profiles: list.map((p) => ({
      id: p.id, name: p.name, avatar: p.avatar, color: p.color,
      level: p.level || 1, xp: p.xp || 0, disabled: !!p.disabled,
    })),
  });
}));

router.post("/profiles", requireAuth, wrap(async (req, res) => {
  if (!config.allowProfileCreation && !isAdminSession(req.session)) {
    return res.status(403).json({ error: "creation_disabled" });
  }
  const profile = await createProfile({ name: req.body?.name, avatar: req.body?.avatar });
  await logEvent(req, "profile_create", { profile: profile.name });
  res.status(201).json({ profile: publicProfile(profile) });
}));

router.get("/me", profileGuard, (req, res) => {
  res.json({ profile: publicProfile(req.profile) });
});

// ═══════════════════════════════ COURS ═════════════════════════════════

router.get("/courses", profileGuard, wrap(async (req, res) => {
  const courses = await listCoursesFor(req.profile.id);
  res.json({ courses: courses.map(publicCourse) });
}));

router.get("/courses/:id", profileGuard, wrap(async (req, res) => {
  const course = await getOwnedCourse(req.params.id, req.profile.id);
  if (!course) return res.status(404).json({ error: "not_found" });
  res.json({ course: publicCourse(course) });
}));

router.get("/courses/:id/image/:n", profileGuard, wrap(async (req, res) => {
  const course = await getOwnedCourse(req.params.id, req.profile.id);
  const n = Number.parseInt(req.params.n, 10);
  if (!course || !Number.isInteger(n) || n < 0 || n >= course.pageCount) {
    return res.status(404).end();
  }
  const file = paths.courseImage(course.id, n);
  if (!(await exists(file))) return res.status(404).end();
  res.setHeader("Content-Type", "image/jpeg");
  res.setHeader("Cache-Control", "private, max-age=86400");
  streamFile(file).pipe(res);
}));

router.delete("/courses/:id", profileGuard, wrap(async (req, res) => {
  const course = await getOwnedCourse(req.params.id, req.profile.id);
  if (!course) return res.status(404).json({ error: "not_found" });
  await deleteCourse(course);
  res.json({ ok: true });
}));

// ── Création : enregistre les images sur le disque (aucun appel IA ici) ──
const bigJson = express.json({ limit: "30mb" });

function decodeImages(images) {
  if (!Array.isArray(images) || images.length < 1) {
    throw Object.assign(new Error("Aucune image reçue."), { status: 400 });
  }
  if (images.length > config.maxImages) {
    throw Object.assign(new Error(`Maximum ${config.maxImages} pages par cours.`), { status: 400 });
  }
  return images.map((img, i) => {
    const b64 = typeof img?.base64 === "string" ? img.base64.replace(/^data:[^,]+,/, "") : "";
    const buf = Buffer.from(b64, "base64");
    if (buf.length === 0 || buf.length > config.maxImageBytes) {
      throw Object.assign(new Error(`Image ${i + 1} vide ou trop volumineuse.`), { status: 400 });
    }
    const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    if (!isJpeg) {
      throw Object.assign(new Error(`Image ${i + 1} : format non pris en charge (JPEG attendu).`), { status: 400 });
    }
    return buf;
  });
}

router.post("/courses", profileGuard, bigJson, wrap(async (req, res) => {
  const buffers = decodeImages(req.body?.images);

  // Empreinte du cours : mêmes images => même empreinte => synthèse réutilisée sans appel IA
  const hash = sha256(buffers.map((b) => sha256(b)).join(":"));

  const id = newId();
  for (let i = 0; i < buffers.length; i++) await writeBuffer(paths.courseImage(id, i), buffers[i]);

  const course = {
    id,
    profileId: req.profile.id,
    createdAt: new Date().toISOString(),
    pageCount: buffers.length,
    hash,
    status: "processing",
    summary: null,
    quizId: null,
    quizIds: [],
    fromCache: false,
    xpAwarded: false,
  };

  const cached = await readJSON(paths.cacheSummary(hash), null);
  let activity = null;
  if (cached?.summary) {
    course.summary = cached.summary;
    course.status = "ready_for_quiz";
    course.fromCache = true;
    await recordCacheHit("summarize");
    activity = await awardCourseXP(course, req.profile);
  }
  await saveCourse(course);

  res.status(201).json({
    course: publicCourse(course),
    needsAnalysis: !course.summary,
    activity,
  });
}));

// XP + badge « premier cours » : une seule fois par cours, et pas si le profil a déjà ce même cours
async function awardCourseXP(course, profile) {
  if (course.xpAwarded) return null;
  const mine = await listCoursesFor(profile.id);
  const duplicate = mine.some((c) => c.id !== course.id && c.hash === course.hash && c.xpAwarded);
  course.xpAwarded = true;
  if (duplicate) return null;
  const out = await recordActivity(profile.id, { xp: XP_REWARDS.COURSE_UPLOAD, courseAdded: true });
  return out ? { gained: out.gained, newBadges: out.newBadges, profile: publicProfile(out.profile) } : null;
}

// ── Analyse IA (appelée seulement si le cours n'est pas déjà dans le cache) ──
const inFlight = new Set();

router.post("/courses/:id/summarize", profileGuard, wrap(async (req, res) => {
  const course = await getOwnedCourse(req.params.id, req.profile.id);
  if (!course) return res.status(404).json({ error: "not_found" });

  // Déjà analysé : on renvoie le résultat enregistré, sans aucun appel IA
  if (course.summary) return res.json({ course: publicCourse(course), activity: null });

  if (inFlight.has(course.id)) {
    return res.status(409).json({ error: "Analyse déjà en cours pour ce cours." });
  }
  inFlight.add(course.id);

  try {
    // Un autre profil a peut-être analysé le même cours entre-temps
    const cached = await readJSON(paths.cacheSummary(course.hash), null);
    if (cached?.summary) {
      course.summary = cached.summary;
      course.fromCache = true;
      await recordCacheHit("summarize");
    } else {
      await assertWithinDailyLimit(req.profile.id);
      const buffers = [];
      for (let i = 0; i < course.pageCount; i++) buffers.push(await fs.readFile(paths.courseImage(course.id, i)));
      const { summary, usage } = await summarizeImages(buffers);
      await recordAiCall("summarize", req.profile.id, usage);
      await writeJSON(paths.cacheSummary(course.hash), { summary, createdAt: new Date().toISOString() });
      course.summary = summary;
    }

    course.status = "ready_for_quiz";
    course.error = null;
    const activity = await awardCourseXP(course, req.profile);
    await saveCourse(course);
    res.json({ course: publicCourse(course), activity });
  } catch (e) {
    // Les images restent enregistrées : on pourra relancer l'analyse sans tout renvoyer
    await patchCourse(course.id, { status: "error", error: e.message });
    throw e;
  } finally {
    inFlight.delete(course.id);
  }
}));

// ═══════════════════════════════ QUIZ ══════════════════════════════════

function parseQuizConfig(raw) {
  const num = (v) => (Number.isInteger(v) && v >= 0 && v <= QUIZ_MAX_QUESTIONS ? v : null);
  const qcm = num(raw?.qcm);
  const vrai_faux = num(raw?.vrai_faux);
  const texte_a_trous = num(raw?.texte_a_trous);
  if (qcm === null || vrai_faux === null || texte_a_trous === null) return null;
  const total = qcm + vrai_faux + texte_a_trous;
  if (total < QUIZ_MIN_QUESTIONS || total > QUIZ_MAX_QUESTIONS) return null;
  return { qcm, vrai_faux, texte_a_trous, total };
}

router.post("/courses/:id/quiz", profileGuard, wrap(async (req, res) => {
  const course = await getOwnedCourse(req.params.id, req.profile.id);
  if (!course) return res.status(404).json({ error: "not_found" });
  if (!course.summary) return res.status(409).json({ error: "Ce cours n'a pas encore été analysé." });

  const quizConfig = parseQuizConfig(req.body?.config);
  if (!quizConfig) {
    return res.status(400).json({
      error: `Configuration invalide : entre ${QUIZ_MIN_QUESTIONS} et ${QUIZ_MAX_QUESTIONS} questions au total.`,
    });
  }
  const force = req.body?.force === true;

  const key = `quiz:${course.id}`;
  if (inFlight.has(key)) return res.status(409).json({ error: "Génération déjà en cours." });
  inFlight.add(key);

  try {
    // Même synthèse + même répartition => on réutilise le quiz déjà généré (0 appel IA)
    const cacheHash = sha256(
      JSON.stringify(course.summary) + `|${quizConfig.qcm}-${quizConfig.vrai_faux}-${quizConfig.texte_a_trous}`
    );
    let questions = null;
    let fromCache = false;

    if (!force) {
      const cached = await readJSON(paths.cacheQuiz(cacheHash), null);
      if (cached?.questions?.length) {
        questions = cached.questions;
        fromCache = true;
        await recordCacheHit("quiz");
      }
    }

    if (!questions) {
      await assertWithinDailyLimit(req.profile.id);
      const out = await generateQuiz(course.summary, quizConfig);
      await recordAiCall("quiz", req.profile.id, out.usage);
      questions = out.questions;
      await writeJSON(paths.cacheQuiz(cacheHash), { questions, createdAt: new Date().toISOString() });
    }

    const quiz = {
      id: newId(),
      profileId: req.profile.id,
      courseId: course.id,
      questions,
      config: quizConfig,
      fromCache,
      createdAt: new Date().toISOString(),
    };
    await saveQuiz(quiz);
    await patchCourse(course.id, {
      quizId: quiz.id,
      quizIds: [...(course.quizIds || []), quiz.id],
      status: "ready",
    });

    res.status(201).json({ quiz: { id: quiz.id, courseId: quiz.courseId, questions, fromCache } });
  } finally {
    inFlight.delete(key);
  }
}));

router.get("/quizzes/:id", profileGuard, wrap(async (req, res) => {
  const quiz = await getQuiz(req.params.id);
  if (!quiz || quiz.profileId !== req.profile.id) return res.status(404).json({ error: "not_found" });
  res.json({ quiz: { id: quiz.id, courseId: quiz.courseId, questions: quiz.questions, fromCache: !!quiz.fromCache } });
}));

// ── Résultat : le score, l'XP et les badges sont calculés par le serveur ──
router.post("/quizzes/:id/results", profileGuard, wrap(async (req, res) => {
  const quiz = await getQuiz(req.params.id);
  if (!quiz || quiz.profileId !== req.profile.id) return res.status(404).json({ error: "not_found" });

  const sent = Array.isArray(req.body?.answers) ? req.body.answers : [];
  const byId = new Map(sent.map((a) => [a?.id, a?.value]));

  let score = 0;
  let maxScore = 0;
  const answers = quiz.questions.map((q) => {
    const value = byId.get(q.id);
    const correct = isAnswerCorrect(q, value);
    const points = correct ? q.points : 0;
    score += points;
    maxScore += q.points;
    return { id: q.id, value: value ?? null, correct, points };
  });

  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const perfect = percentage === 100;
  const xp = XP_REWARDS.QUIZ_COMPLETE + (perfect ? XP_REWARDS.PERFECT_SCORE : 0);

  const result = {
    id: newId(),
    quizId: quiz.id,
    courseId: quiz.courseId,
    score,
    maxScore,
    percentage,
    answers,
    completedAt: new Date().toISOString(),
  };
  await addResult(req.profile.id, result);
  const out = await recordActivity(req.profile.id, { xp, quizCompleted: true, perfect });

  res.status(201).json({
    result,
    activity: out
      ? { gained: out.gained, newBadges: out.newBadges, profile: publicProfile(out.profile) }
      : null,
  });
}));

router.get("/results", profileGuard, wrap(async (req, res) => {
  const limit = Math.max(1, Math.min(100, Number.parseInt(req.query.limit, 10) || 10));
  const all = await listResults(req.profile.id);
  res.json({ results: all.slice(-limit).reverse() });
}));

// ═════════════════════ Gestion d'erreurs de l'API ══════════════════════

export function apiErrorHandler(err, _req, res, _next) {
  if (err instanceof AiError) {
    return res.status(err.status).json({ error: err.message, code: err.code });
  }
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ error: "Images trop volumineuses." });
  }
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Requête invalide." });
  }
  const status = err?.status && err.status >= 400 && err.status < 600 ? err.status : 500;
  if (status >= 500) console.error("[api]", err);
  res.status(status).json({ error: status >= 500 ? "Erreur interne du serveur." : err.message, code: err.code });
}
