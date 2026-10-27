// server/config.js
// Lecture et validation de la configuration (variables d'environnement / .env).
// Le serveur refuse de démarrer sans clé d'accès : jamais d'accès ouvert par défaut.

import path from "node:path";

function str(name, fallback = "") {
  const v = process.env[name];
  return v === undefined ? fallback : String(v).trim();
}

function int(name, fallback) {
  const raw = str(name, "");
  if (raw === "") return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

function bool(name, fallback) {
  const raw = str(name, "").toLowerCase();
  if (raw === "") return fallback;
  return ["1", "true", "yes", "oui", "on"].includes(raw);
}

export const config = {
  port: int("PORT_INTERNAL", 3000),
  dataDir: path.resolve(str("DATA_DIR", "/data")),

  accessKey: str("ACCESS_KEY"),
  adminPin: str("ADMIN_PIN"),

  anthropicApiKey: str("ANTHROPIC_API_KEY"),
  model: str("ANTHROPIC_MODEL") || "claude-sonnet-5-5",
  modelQuiz: str("ANTHROPIC_MODEL_QUIZ") || str("ANTHROPIC_MODEL") || "claude-sonnet-5-5",

  sessionDays: int("SESSION_DAYS", 30),
  adminSessionMinutes: int("ADMIN_SESSION_MINUTES", 30),
  cookieSecure: bool("COOKIE_SECURE", false),
  trustProxy: bool("TRUST_PROXY", false),

  allowProfileCreation: bool("ALLOW_PROFILE_CREATION", true),
  defaultProfiles: str("DEFAULT_PROFILES")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  maxProfiles: int("MAX_PROFILES", 12),

  // Garde-fou coût : nombre max d'appels IA par profil et par jour (0 = illimité)
  dailyAiLimit: int("DAILY_AI_LIMIT", 30),

  maxImages: 5,
  maxImageBytes: 8 * 1024 * 1024,
};

export function validateConfig() {
  const errors = [];
  const warnings = [];

  if (!config.accessKey) {
    errors.push("ACCESS_KEY est vide. Définis une clé d'accès dans le fichier .env.");
  } else if (config.accessKey.length < 8) {
    errors.push("ACCESS_KEY est trop courte (8 caractères minimum).");
  }

  if (!config.adminPin) {
    warnings.push("ADMIN_PIN est vide : l'espace administrateur est désactivé.");
  } else if (config.adminPin.length < 4) {
    errors.push("ADMIN_PIN est trop court (4 caractères minimum).");
  }

  if (!config.anthropicApiKey) {
    warnings.push(
      "ANTHROPIC_API_KEY est vide : l'analyse des cours et la génération de quiz seront indisponibles " +
        "(les cours et quiz déjà enregistrés restent utilisables)."
    );
  }

  return { errors, warnings };
}
