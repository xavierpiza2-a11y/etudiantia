// server/index.js
// Point d'entrée : sert l'interface (dist/) et l'API (/api) depuis un seul conteneur.

import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { config, validateConfig } from "./config.js";
import { initDataDir } from "./store.js";
import { initAuth } from "./auth.js";
import { seedDefaultProfiles } from "./profiles.js";
import { router, apiErrorHandler } from "./routes.js";
import { adminRouter } from "./admin.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../dist");
const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../package.json"), "utf8"));

// ── Vérification de la configuration ─────────────────────────────────────
const { errors, warnings } = validateConfig();
for (const w of warnings) console.warn(`⚠️  ${w}`);
if (errors.length) {
  console.error("\n❌ Configuration invalide — le serveur ne démarre pas :");
  for (const e of errors) console.error(`   • ${e}`);
  console.error("\n   Édite le fichier .env puis relance : docker compose up -d\n");
  process.exit(1);
}

try {
  await initDataDir();
  await initAuth();
  await seedDefaultProfiles();
} catch (e) {
  console.error(`\n❌ ${e.message}\n`);
  process.exit(1);
}

// ── Application Express ──────────────────────────────────────────────────
const app = express();
app.disable("x-powered-by");
if (config.trustProxy) app.set("trust proxy", true);

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("Permissions-Policy", "camera=(self), microphone=(), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "media-src 'self' blob:",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; ")
  );
  if (config.cookieSecure) res.setHeader("Strict-Transport-Security", "max-age=15552000");
  next();
});

// Santé (utilisé par le HEALTHCHECK Docker) — aucune donnée sensible
app.get("/api/health", (_req, res) => res.json({ ok: true, version: pkg.version }));

// Petit parseur JSON partout, sauf l'envoi des images (parseur dédié, après authentification)
const smallJson = express.json({ limit: "50kb" });
app.use((req, res, next) => {
  if (req.method === "POST" && req.path === "/api/courses") return next();
  return smallJson(req, res, next);
});

app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.use("/api", router);
app.use("/api/admin", adminRouter);
app.use("/api", (_req, res) => res.status(404).json({ error: "not_found" }));
app.use("/api", apiErrorHandler);

// ── Interface (build Vite) ───────────────────────────────────────────────
if (fs.existsSync(distDir)) {
  app.use(
    "/assets",
    express.static(path.join(distDir, "assets"), { maxAge: "1y", immutable: true })
  );
  app.use(express.static(distDir, { maxAge: 0, index: false }));
  app.get("*", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.join(distDir, "index.html"));
  });
} else {
  app.get("/", (_req, res) =>
    res.status(503).send("Interface non compilée. Lance « npm run build » (ou utilise l'image Docker).")
  );
}

const server = app.listen(config.port, () => {
  console.log(`\n🎓 StudyAI (etudiantia) v${pkg.version} démarré sur le port ${config.port}`);
  console.log(`   Données : ${config.dataDir}`);
  console.log(`   Modèle IA : ${config.model}${config.modelQuiz !== config.model ? ` (quiz : ${config.modelQuiz})` : ""}`);
  console.log(`   Limite IA/jour/profil : ${config.dailyAiLimit || "illimitée"}\n`);
});

function shutdown(signal) {
  console.log(`\n${signal} reçu — arrêt propre…`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 8000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
