// src/components/admin/AdminImages.jsx
// Gestion des images générées par IA : prompts à copier, import depuis le téléphone, état.
import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../../lib/api";
import { bumpImageVersion, imageUrl, useImageVersion } from "../../lib/images";
import {
  IMAGE_ASSETS, TIER_LABELS, buildFullPrompt, MAX_IMAGE_UPLOAD_BYTES,
} from "../../../shared/assets.js";

// Copie robuste : navigator.clipboard n'existe qu'en HTTPS ; repli sur execCommand
async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* repli ci-dessous */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

const STATUS_LABEL = {
  custom: { text: "✅ Ton image", cls: "img-st-custom" },
  default: { text: "📦 Image par défaut", cls: "img-st-default" },
  missing: { text: "⬜ Manquante", cls: "img-st-missing" },
};

function AssetRow({ asset, status, busy, onImport, onRemove }) {
  const v = useImageVersion();
  const [showPrompt, setShowPrompt] = useState(false);
  const [copied, setCopied] = useState(null); // true | false | null
  const fileRef = useRef();
  const prompt = buildFullPrompt(asset);
  const st = STATUS_LABEL[status] || STATUS_LABEL.missing;

  const copy = async () => {
    setShowPrompt(true);
    setCopied(await copyText(prompt));
  };

  return (
    <div className="img-row">
      <div className="img-row-main">
        <div className={`img-thumb ${asset.transparent ? "checker" : ""}`}>
          {status !== "missing" ? (
            <img src={imageUrl(asset.name, v)} alt="" loading="lazy" />
          ) : (
            <span>🖼️</span>
          )}
        </div>
        <div className="img-row-info">
          <p className="img-row-label">{asset.label}</p>
          <p className="img-row-meta">
            {asset.size} · {asset.transparent ? "fond transparent" : "image pleine"}
            {asset.pngOnly ? " · PNG" : ""}
          </p>
          <span className={`img-status ${st.cls}`}>{st.text}</span>
        </div>
      </div>

      <div className="img-row-actions">
        <button className="img-btn" onClick={copy}>📋 Prompt</button>
        <button className="img-btn img-btn-primary" onClick={() => fileRef.current?.click()} disabled={busy}>
          {busy ? "Envoi…" : "⬆️ Importer"}
        </button>
        {status === "custom" && (
          <button className="img-btn img-btn-danger" onClick={onRemove} disabled={busy} aria-label="Retirer mon image">
            ↩️
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) onImport(f);
          }}
        />
      </div>

      {showPrompt && (
        <div className="img-prompt">
          <p className="img-prompt-note">
            {copied === true && "✅ Prompt copié — colle-le dans ton outil d'IA."}
            {copied === false && "Sélectionne le texte ci-dessous et copie-le (appui long)."}
          </p>
          <textarea readOnly value={prompt} rows={6} onFocus={(e) => e.target.select()} />
        </div>
      )}
    </div>
  );
}

export default function AdminImages() {
  const [statuses, setStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyName, setBusyName] = useState(null);
  const [message, setMessage] = useState(null); // { ok, text }

  const load = useCallback(async () => {
    try {
      const { items } = await api.get("/admin/images");
      setStatuses(Object.fromEntries(items.map((i) => [i.name, i.status])));
    } catch (e) {
      setMessage({ ok: false, text: e.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const importFile = async (asset, file) => {
    setMessage(null);
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      setMessage({ ok: false, text: "Fichier trop volumineux (10 Mo maximum)." });
      return;
    }
    setBusyName(asset.name);
    try {
      await api.upload(`/admin/images/${asset.name}`, file);
      bumpImageVersion();
      await load();
      setMessage({ ok: true, text: `✅ « ${asset.label} » enregistrée.` });
    } catch (e) {
      setMessage({ ok: false, text: e.message });
    } finally {
      setBusyName(null);
    }
  };

  const removeImage = async (asset) => {
    if (!window.confirm("Retirer ton image et revenir à l'image par défaut ?")) return;
    setBusyName(asset.name);
    try {
      await api.del(`/admin/images/${asset.name}`);
      bumpImageVersion();
      await load();
    } catch (e) {
      setMessage({ ok: false, text: e.message });
    } finally {
      setBusyName(null);
    }
  };

  if (loading) return <p className="loading-text">Chargement…</p>;

  const tiers = [1, 2, 3];
  return (
    <div className="admin-images">
      <h2 className="admin-section-title">Images de l'application</h2>
      <p className="admin-note">
        1. Touche <strong>📋 Prompt</strong> et colle-le dans ton outil d'IA · 2. Enregistre l'image sur ton
        téléphone · 3. Touche <strong>⬆️ Importer</strong>. L'image apparaît tout de suite dans l'app.
        Tant qu'une image manque, un emoji la remplace.
      </p>

      {message && (
        <p className={message.ok ? "img-msg-ok" : "upload-error"} role="status">{message.text}</p>
      )}

      {tiers.map((tier) => {
        const assets = IMAGE_ASSETS.filter((a) => a.tier === tier);
        const done = assets.filter((a) => statuses[a.name] === "custom").length;
        const groups = [...new Set(assets.map((a) => a.group))];
        return (
          <section key={tier} className="img-tier">
            <h3 className="admin-subsection-title">
              {TIER_LABELS[tier]} <span className="img-tier-count">{done}/{assets.length}</span>
            </h3>
            {groups.map((g) => (
              <div key={g} className="img-group">
                <p className="img-group-title">{g}</p>
                {assets.filter((a) => a.group === g).map((a) => (
                  <AssetRow
                    key={a.name}
                    asset={a}
                    status={statuses[a.name] || "missing"}
                    busy={busyName === a.name}
                    onImport={(file) => importFile(a, file)}
                    onRemove={() => removeImage(a)}
                  />
                ))}
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
