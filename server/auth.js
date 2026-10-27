// server/auth.js
// Accès à l'application :
//   1. clé d'accès (ACCESS_KEY du .env) -> cookie de session signé
//   2. choix du profil -> le profil est inscrit dans le même cookie
//   3. PIN administrateur (ADMIN_PIN du .env) -> élévation temporaire (admin)
// Les jetons sont signés en HMAC-SHA256 : aucun état serveur à conserver,
// et les sessions survivent aux redémarrages / mises à jour du conteneur.

import crypto from "node:crypto";
import fs from "node:fs/promises";
import { config } from "./config.js";
import { paths, withLock } from "./store.js";

export const COOKIE_NAME = "etudiantia_session";

let secret = null;

export async function initAuth() {
  // Secret de signature : généré une fois, conservé dans /data (donc protégé des mises à jour)
  try {
    secret = (await fs.readFile(paths.secret(), "utf8")).trim();
  } catch {
    /* pas encore créé */
  }
  if (!secret || secret.length < 32) {
    secret = crypto.randomBytes(48).toString("hex");
    await fs.writeFile(paths.secret(), secret, { mode: 0o600 });
  }
}

const sha = (s) => crypto.createHash("sha256").update(s).digest();

// Comparaison à temps constant (évite de deviner la clé par mesure de durée)
export function safeEqual(a, b) {
  return crypto.timingSafeEqual(sha(String(a)), sha(String(b)));
}

// Empreinte de la clé d'accès : si ACCESS_KEY change, toutes les sessions existantes sont invalidées
const keyFingerprint = () => sha(`k:${config.accessKey}`).toString("hex").slice(0, 12);

const b64 = (buf) => Buffer.from(buf).toString("base64url");

function sign(payload) {
  const body = b64(JSON.stringify(payload));
  const mac = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${mac}`;
}

function verify(token) {
  if (typeof token !== "string") return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (payload.k !== keyFingerprint()) return null;
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// ── Cookies ──────────────────────────────────────────────────────────────
function parseCookies(header = "") {
  const out = {};
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function issueSession(res, { profileId = null, adminUntil = 0, exp } = {}) {
  const expiry = exp || Date.now() + config.sessionDays * 86400 * 1000;
  const token = sign({ k: keyFingerprint(), p: profileId, a: adminUntil, exp: expiry });
  const attrs = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor((expiry - Date.now()) / 1000)}`,
  ];
  if (config.cookieSecure) attrs.push("Secure");
  res.setHeader("Set-Cookie", attrs.join("; "));
  return { profileId, adminUntil, exp: expiry };
}

export function clearSession(res) {
  const attrs = [`${COOKIE_NAME}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (config.cookieSecure) attrs.push("Secure");
  res.setHeader("Set-Cookie", attrs.join("; "));
}

// ── Middlewares ──────────────────────────────────────────────────────────
// Charge req.session ({ profileId, adminUntil, exp }) ou null
export function loadSession(req, _res, next) {
  const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
  const payload = verify(token);
  req.session = payload
    ? { profileId: payload.p || null, adminUntil: payload.a || 0, exp: payload.exp }
    : null;
  next();
}

export function requireAuth(req, res, next) {
  if (!req.session) return res.status(401).json({ error: "auth_required" });
  next();
}

export function isAdminSession(session) {
  return !!session && session.adminUntil > Date.now();
}

export function requireAdmin(req, res, next) {
  if (!req.session) return res.status(401).json({ error: "auth_required" });
  if (!isAdminSession(req.session)) return res.status(403).json({ error: "admin_required" });
  next();
}

// ── Limitation des tentatives (clé d'accès / PIN) ────────────────────────
const MAX_FAILURES = 8;
const WINDOW_MS = 10 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;
const attempts = new Map(); // "bucket:ip" -> { failures, first, lockedUntil }

export function checkRateLimit(bucket, ip) {
  const entry = attempts.get(`${bucket}:${ip}`);
  if (entry && entry.lockedUntil > Date.now()) {
    return { blocked: true, retryAfter: Math.ceil((entry.lockedUntil - Date.now()) / 1000) };
  }
  return { blocked: false };
}

export function registerFailure(bucket, ip) {
  const k = `${bucket}:${ip}`;
  const now = Date.now();
  let e = attempts.get(k);
  if (!e || now - e.first > WINDOW_MS) e = { failures: 0, first: now, lockedUntil: 0 };
  e.failures += 1;
  if (e.failures >= MAX_FAILURES) e.lockedUntil = now + LOCK_MS;
  attempts.set(k, e);
}

export function registerSuccess(bucket, ip) {
  attempts.delete(`${bucket}:${ip}`);
}

setInterval(() => {
  const now = Date.now();
  for (const [k, e] of attempts) {
    if (e.lockedUntil < now && now - e.first > WINDOW_MS) attempts.delete(k);
  }
}, 5 * 60 * 1000).unref();

// ── Journal des connexions (/data/logs/connections.jsonl) ────────────────
const MAX_LOG_BYTES = 5 * 1024 * 1024;

export async function logEvent(req, event, extra = {}) {
  const entry = {
    t: new Date().toISOString(),
    event,
    ip: req.ip,
    ua: (req.headers["user-agent"] || "").slice(0, 200),
    ...extra,
  };
  const file = paths.logs();
  try {
    await withLock(file, async () => {
      try {
        const st = await fs.stat(file);
        if (st.size > MAX_LOG_BYTES) await fs.rename(file, `${file}.1`);
      } catch {
        /* fichier absent */
      }
      await fs.appendFile(file, JSON.stringify(entry) + "\n");
    });
  } catch (e) {
    console.error("[logs] écriture impossible :", e.message);
  }
}

export async function readLogs(limit = 150) {
  let raw = "";
  try {
    raw = await fs.readFile(paths.logs(), "utf8");
  } catch {
    return [];
  }
  const lines = raw.split("\n").filter(Boolean);
  const out = [];
  for (const line of lines.slice(-limit).reverse()) {
    try {
      out.push(JSON.parse(line));
    } catch {
      /* ligne tronquée */
    }
  }
  return out;
}

