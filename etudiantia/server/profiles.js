// server/profiles.js
// Profils (façon « Netflix ») + XP, niveaux, badges et séries.
// Tout est stocké dans /data/profiles.json.

import { config } from "./config.js";
import { paths, updateJSON, readJSON, newId, removePath, listDir } from "./store.js";
import { XP_REWARDS, getLevelFromXP } from "../shared/gamification.js";

const AVATARS = ["🦊", "🐼", "🦁", "🐯", "🐨", "🐸", "🦄", "🐙", "🦉", "🐧", "🐢", "🦖"];
const COLORS = ["#7C3AED", "#10B981", "#F59E0B", "#EF4444", "#3B82F6", "#EC4899", "#14B8A6", "#F97316"];

const timezone = () => process.env.TZ || "Europe/Paris";

// Date « jour » au format YYYY-MM-DD dans le fuseau configuré
export function today(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86400 * 1000);
  return d.toLocaleDateString("en-CA", { timeZone: timezone() });
}

const defaultProfile = (name, index, avatar) => ({
  id: newId(),
  name,
  avatar: avatar || AVATARS[index % AVATARS.length],
  color: COLORS[index % COLORS.length],
  createdAt: new Date().toISOString(),
  disabled: false,
  xp: 0,
  level: 1,
  badges: [],
  streak: 0,
  lastActiveDate: null,
  totalQuizzes: 0,
});

export const publicProfile = (p) => ({
  id: p.id,
  name: p.name,
  avatar: p.avatar,
  color: p.color,
  createdAt: p.createdAt,
  disabled: !!p.disabled,
  xp: p.xp || 0,
  level: p.level || 1,
  badges: p.badges || [],
  streak: p.streak || 0,
  totalQuizzes: p.totalQuizzes || 0,
});

export async function listProfiles() {
  return (await readJSON(paths.profiles(), [])) || [];
}

export async function getProfile(id) {
  if (!id) return null;
  const all = await listProfiles();
  return all.find((p) => p.id === id) || null;
}

// Crée les profils listés dans DEFAULT_PROFILES (uniquement s'il n'existe encore aucun profil)
export async function seedDefaultProfiles() {
  if (!config.defaultProfiles.length) return;
  await updateJSON(paths.profiles(), [], (list) => {
    if (list.length > 0) return undefined;
    return config.defaultProfiles
      .slice(0, config.maxProfiles)
      .map((name, i) => defaultProfile(name.slice(0, 24), i));
  });
}

export function cleanName(name) {
  return String(name || "")
    .replace(/[\u0000-\u001f<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24);
}

export async function createProfile({ name, avatar }) {
  const clean = cleanName(name);
  if (clean.length < 1) throw Object.assign(new Error("Prénom requis"), { status: 400 });
  let created;
  await updateJSON(paths.profiles(), [], (list) => {
    if (list.length >= config.maxProfiles) {
      throw Object.assign(new Error(`Nombre maximum de profils atteint (${config.maxProfiles}).`), { status: 400 });
    }
    if (list.some((p) => p.name.toLowerCase() === clean.toLowerCase())) {
      throw Object.assign(new Error("Ce prénom existe déjà."), { status: 409 });
    }
    created = defaultProfile(clean, list.length, AVATARS.includes(avatar) ? avatar : undefined);
    return [...list, created];
  });
  return created;
}

export async function updateProfile(id, patch) {
  let updated = null;
  await updateJSON(paths.profiles(), [], (list) => {
    const idx = list.findIndex((p) => p.id === id);
    if (idx < 0) return undefined;
    const p = { ...list[idx] };
    if (patch.name !== undefined) {
      const clean = cleanName(patch.name);
      if (!clean) throw Object.assign(new Error("Prénom invalide"), { status: 400 });
      if (list.some((o, i) => i !== idx && o.name.toLowerCase() === clean.toLowerCase())) {
        throw Object.assign(new Error("Ce prénom existe déjà."), { status: 409 });
      }
      p.name = clean;
    }
    if (patch.disabled !== undefined) p.disabled = !!patch.disabled;
    updated = p;
    const next = [...list];
    next[idx] = p;
    return next;
  });
  return updated;
}

// Supprime le profil et toutes ses données (cours, images, quiz, résultats).
// Le cache IA (/data/cache) est conservé : un cours identique rescanné plus tard ne coûtera rien.
export async function deleteProfile(id) {
  let existed = false;
  await updateJSON(paths.profiles(), [], (list) => {
    existed = list.some((p) => p.id === id);
    return existed ? list.filter((p) => p.id !== id) : undefined;
  });
  if (!existed) return false;

  for (const courseId of await listDir(paths.coursesRoot())) {
    const course = await readJSON(paths.courseFile(courseId), null);
    if (course?.profileId === id) {
      if (course.quizIds) for (const q of course.quizIds) await removePath(paths.quizFile(q));
      await removePath(paths.courseDir(courseId));
    }
  }
  await removePath(paths.resultsFile(id));
  return true;
}

// ── Gamification ─────────────────────────────────────────────────────────
// Enregistre une activité (cours scanné, quiz terminé) : XP, série, badges.
// Retourne { profile, gained, newBadges }.
export async function recordActivity(id, { xp = 0, quizCompleted = false, perfect = false, courseAdded = false }) {
  let outcome = null;

  await updateJSON(paths.profiles(), [], (list) => {
    const idx = list.findIndex((p) => p.id === id);
    if (idx < 0) return undefined;
    const p = { ...list[idx] };
    const badges = new Set(p.badges || []);
    const before = new Set(badges);
    let gained = xp;

    // Série de jours consécutifs
    const day = today();
    if (p.lastActiveDate !== day) {
      p.streak = p.lastActiveDate === today(-1) ? (p.streak || 0) + 1 : 1;
      p.lastActiveDate = day;
      if (p.streak >= 2) gained += XP_REWARDS.DAILY_STREAK;
    }
    if (p.streak >= 3) badges.add("streak_3");
    if (p.streak >= 7) badges.add("streak_7");

    if (courseAdded) badges.add("first_course");
    if (quizCompleted) {
      p.totalQuizzes = (p.totalQuizzes || 0) + 1;
      badges.add("first_quiz");
      if (perfect) badges.add("perfect_10");
      if (p.totalQuizzes >= 10) badges.add("quiz_10");
      if (p.totalQuizzes >= 50) badges.add("quiz_50");
    }

    p.xp = (p.xp || 0) + gained;
    p.level = getLevelFromXP(p.xp).current.level;
    p.badges = [...badges];

    outcome = {
      profile: p,
      gained,
      newBadges: [...badges].filter((b) => !before.has(b)),
    };
    const next = [...list];
    next[idx] = p;
    return next;
  });

  return outcome;
}

// ── Résultats de quiz (un fichier par profil) ────────────────────────────
export async function addResult(profileId, result) {
  await updateJSON(paths.resultsFile(profileId), [], (list) => [...list, result]);
}

export async function listResults(profileId) {
  return (await readJSON(paths.resultsFile(profileId), [])) || [];
}
