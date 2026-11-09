// server/images.js
// Images personnalisables (mascotte, décors, badges…).
//  - GET /img/<nom>          : sert l'image (publique : nécessaire avant la connexion)
//  - /api/admin/images (PIN) : état, import depuis le navigateur, retrait
// Ordre de recherche : /data/img (tes images, survivent aux mises à jour)
//                      puis dist/img (images par défaut livrées avec l'app).

import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { requireAdmin, logEvent } from "./auth.js";
import {
  IMAGE_ASSETS, IMAGE_EXTS, MAX_IMAGE_UPLOAD_BYTES, getAsset, isValidAssetName,
} from "../shared/assets.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultDir = path.resolve(__dirname, "../dist/img");
const customDir = () => path.join(config.dataDir, "img");

async function fileExists(f) {
  try {
    await fs.access(f);
    return true;
  } catch {
    return false;
  }
}

// Cherche un fichier pour ce nom ; renvoie { file, source } ou null
export async function findImage(name) {
  for (const [dir, source] of [[customDir(), "custom"], [defaultDir, "default"]]) {
    for (const ext of IMAGE_EXTS) {
      const file = path.join(dir, `${name}.${ext}`);
      if (await fileExists(file)) return { file, source, ext };
    }
  }
  return null;
}

// Type réel du fichier d'après ses premiers octets (on ne fait pas confiance à l'extension)
export function sniffImage(buf) {
  if (buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

// ── Route publique /img/<nom> ────────────────────────────────────────────
export const publicImageRouter = express.Router();

publicImageRouter.get("/:name", async (req, res, next) => {
  try {
    const { name } = req.params;
    if (!/^[a-z0-9_]+$/.test(name)) return res.status(404).end();
    const found = await findImage(name);
    if (!found) return res.status(404).end();
    // no-cache : le navigateur revalide (ETag) → une image remplacée apparaît tout de suite
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(found.file);
  } catch (e) {
    next(e);
  }
});

// ── Routes admin ─────────────────────────────────────────────────────────
export const adminImagesRouter = express.Router();
adminImagesRouter.use(requireAdmin);

adminImagesRouter.get("/", async (_req, res, next) => {
  try {
    const items = [];
    for (const a of IMAGE_ASSETS) {
      const found = await findImage(a.name);
      items.push({
        name: a.name,
        status: found ? found.source : "missing", // custom | default | missing
      });
    }
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

const rawImage = express.raw({ type: ["image/png", "image/jpeg", "image/webp", "application/octet-stream"], limit: MAX_IMAGE_UPLOAD_BYTES });

adminImagesRouter.put("/:name", rawImage, async (req, res, next) => {
  try {
    const { name } = req.params;
    const asset = getAsset(name);
    if (!asset) return res.status(404).json({ error: "Emplacement d'image inconnu." });
    const buf = req.body;
    if (!Buffer.isBuffer(buf) || buf.length === 0) {
      return res.status(400).json({ error: "Aucun fichier reçu." });
    }
    const kind = sniffImage(buf);
    if (!kind) return res.status(400).json({ error: "Format non pris en charge (PNG, JPG ou WebP uniquement)." });
    if (asset.pngOnly && kind !== "png") {
      return res.status(400).json({ error: "L'icône de l'application doit être au format PNG." });
    }

    await fs.mkdir(customDir(), { recursive: true });
    // Une seule version par image : on retire les autres extensions
    for (const ext of IMAGE_EXTS) await fs.rm(path.join(customDir(), `${name}.${ext}`), { force: true });
    const target = path.join(customDir(), `${name}.${kind}`);
    const tmp = `${target}.tmp`;
    await fs.writeFile(tmp, buf);
    await fs.rename(tmp, target);

    await logEvent(req, "admin_image_upload", { image: name });
    res.json({ ok: true, name, status: "custom" });
  } catch (e) {
    next(e);
  }
});

adminImagesRouter.delete("/:name", async (req, res, next) => {
  try {
    const { name } = req.params;
    if (!isValidAssetName(name)) return res.status(404).json({ error: "Emplacement d'image inconnu." });
    for (const ext of IMAGE_EXTS) await fs.rm(path.join(customDir(), `${name}.${ext}`), { force: true });
    await logEvent(req, "admin_image_remove", { image: name });
    const found = await findImage(name);
    res.json({ ok: true, name, status: found ? found.source : "missing" });
  } catch (e) {
    next(e);
  }
});
