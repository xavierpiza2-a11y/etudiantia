// server/store.js
// Stockage sur disque dans /data : fichiers JSON + images.
// - écritures atomiques (fichier temporaire + rename) : pas de fichier à moitié écrit
//   en cas de coupure de courant ;
// - verrou par fichier : deux requêtes simultanées ne s'écrasent pas ;
// - aucun module natif : rien à compiler, fonctionne en x86_64 comme en arm64.

import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { config } from "./config.js";

export const SCHEMA_VERSION = 1;

export const paths = {
  root: () => config.dataDir,
  meta: () => path.join(config.dataDir, "meta.json"),
  secret: () => path.join(config.dataDir, "session-secret.key"),
  profiles: () => path.join(config.dataDir, "profiles.json"),
  stats: () => path.join(config.dataDir, "stats.json"),
  logs: () => path.join(config.dataDir, "logs", "connections.jsonl"),
  courseDir: (id) => path.join(config.dataDir, "courses", id),
  courseFile: (id) => path.join(config.dataDir, "courses", id, "course.json"),
  courseImage: (id, n) => path.join(config.dataDir, "courses", id, `page-${n}.jpg`),
  coursesRoot: () => path.join(config.dataDir, "courses"),
  quizFile: (id) => path.join(config.dataDir, "quizzes", `${id}.json`),
  quizzesRoot: () => path.join(config.dataDir, "quizzes"),
  resultsFile: (profileId) => path.join(config.dataDir, "results", `${profileId}.json`),
  resultsRoot: () => path.join(config.dataDir, "results"),
  cacheSummary: (hash) => path.join(config.dataDir, "cache", "summaries", `${hash}.json`),
  cacheQuiz: (hash) => path.join(config.dataDir, "cache", "quizzes", `${hash}.json`),
  cacheRoot: () => path.join(config.dataDir, "cache"),
};

const ID_RE = /^[a-f0-9]{16}$/;
const HASH_RE = /^[a-f0-9]{64}$/;

export const isValidId = (id) => typeof id === "string" && ID_RE.test(id);
export const isValidHash = (h) => typeof h === "string" && HASH_RE.test(h);
export const newId = () => crypto.randomBytes(8).toString("hex");
export const sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex");

// ── Verrou par chemin (file d'attente de promesses) ──────────────────────
const locks = new Map();

export function withLock(key, fn) {
  const prev = locks.get(key) || Promise.resolve();
  const next = prev.catch(() => {}).then(fn);
  locks.set(key, next);
  const cleanup = () => {
    if (locks.get(key) === next) locks.delete(key);
  };
  next.then(cleanup, cleanup);
  return next;
}

// ── Lecture / écriture JSON ──────────────────────────────────────────────
export async function readJSON(file, fallback = null) {
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    if (e.code === "ENOENT") return fallback;
    if (e instanceof SyntaxError) {
      console.error(`[store] JSON corrompu : ${file} — ${e.message}`);
      return fallback;
    }
    throw e;
  }
}

export async function writeJSON(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${crypto.randomBytes(4).toString("hex")}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmp, file);
}

// Lecture-modification-écriture sous verrou. `mutator` reçoit la valeur courante
// et renvoie la nouvelle valeur (ou undefined pour ne pas écrire).
export function updateJSON(file, fallback, mutator) {
  return withLock(file, async () => {
    const current = await readJSON(file, fallback);
    const next = await mutator(current);
    if (next !== undefined) await writeJSON(file, next);
    return next === undefined ? current : next;
  });
}

export async function writeBuffer(file, buffer) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${crypto.randomBytes(4).toString("hex")}.tmp`;
  await fs.writeFile(tmp, buffer);
  await fs.rename(tmp, file);
}

export async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

export async function listDir(dir) {
  try {
    return await fs.readdir(dir);
  } catch (e) {
    if (e.code === "ENOENT") return [];
    throw e;
  }
}

export async function removePath(target) {
  await fs.rm(target, { recursive: true, force: true });
}

export function streamFile(file) {
  return createReadStream(file);
}

// Taille cumulée d'un dossier (octets)
export async function dirSize(dir) {
  let total = 0;
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) total += await dirSize(full);
    else if (entry.isFile()) {
      try {
        total += (await fs.stat(full)).size;
      } catch {
        /* fichier disparu entre-temps */
      }
    }
  }
  return total;
}

// ── Initialisation du dossier /data ──────────────────────────────────────
export async function initDataDir() {
  const dirs = [
    "logs",
    "courses",
    "quizzes",
    "results",
    "cache/summaries",
    "cache/quizzes",
  ];
  await fs.mkdir(config.dataDir, { recursive: true });
  for (const d of dirs) await fs.mkdir(path.join(config.dataDir, d), { recursive: true });

  // Test d'écriture : message clair si les droits sont mauvais
  const probe = path.join(config.dataDir, ".write-test");
  try {
    await fs.writeFile(probe, "ok");
    await fs.rm(probe, { force: true });
  } catch (e) {
    throw new Error(
      `Impossible d'écrire dans ${config.dataDir} (${e.code}). ` +
        `Vérifie les droits du dossier ./data sur la VM (voir INSTALLATION.md).`
    );
  }

  const meta = await readJSON(paths.meta(), null);
  if (!meta) {
    await writeJSON(paths.meta(), { schemaVersion: SCHEMA_VERSION, createdAt: new Date().toISOString() });
  } else if (meta.schemaVersion > SCHEMA_VERSION) {
    throw new Error(
      `Le dossier /data a été créé par une version plus récente de l'application ` +
        `(schéma ${meta.schemaVersion} > ${SCHEMA_VERSION}). Mise à jour annulée par sécurité.`
    );
  }
  // Les futures migrations de schéma s'ajouteront ici (meta.schemaVersion < SCHEMA_VERSION).
}
