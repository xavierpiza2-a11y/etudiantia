// src/lib/images.jsx
// Images personnalisables (mascotte, décors, badges…). Si une image n'existe pas,
// on affiche un emoji à la place : l'application est toujours complète.
import { useState, useSyncExternalStore } from "react";

// ── Version des images (change quand on importe/retire une image dans l'admin) ──
let version = 0;
const listeners = new Set();
const failed = new Set(); // "nom:version" → image absente
const loaded = new Set(); // "nom:version" → image présente

const subscribe = (cb) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const getVersion = () => version;

export function bumpImageVersion() {
  version = Date.now();
  failed.clear();
  loaded.clear();
  listeners.forEach((l) => l());
}

export const useImageVersion = () => useSyncExternalStore(subscribe, getVersion);

export const imageUrl = (name, v = version) => `/img/${name}${v ? `?v=${v}` : ""}`;

// ── <Img name="mascot_happy" fallback="🦉" size={120} /> ──────────────────────
export function Img({ name, fallback = null, size, alt = "", className = "" }) {
  const v = useImageVersion();
  const [, force] = useState(0);
  const key = `${name}:${v}`;
  const box = size ? { width: size, height: size, fontSize: Math.round(size * 0.78) } : undefined;

  if (failed.has(key)) {
    return fallback ? (
      <span className={`img-slot img-fallback ${className}`} style={box} aria-hidden={alt ? undefined : true}>
        {fallback}
      </span>
    ) : null;
  }

  const isLoaded = loaded.has(key);
  return (
    <span className={`img-slot ${className}`} style={box}>
      {!isLoaded && fallback && <span className="img-fallback" aria-hidden="true">{fallback}</span>}
      <img
        src={imageUrl(name, v)}
        alt={alt}
        className={isLoaded ? "img-ready" : "img-pending"}
        draggable={false}
        onLoad={() => {
          loaded.add(key);
          force((n) => n + 1);
        }}
        onError={() => {
          failed.add(key);
          force((n) => n + 1);
        }}
      />
    </span>
  );
}

// ── Mascotte : "happy" | "think" | "win" | "sad" ──────────────────────────────
export function Mascot({ mood = "happy", size = 120, className = "" }) {
  return (
    <Img
      name={`mascot_${mood}`}
      fallback="🦉"
      size={size}
      className={`mascot mascot-${mood} ${className}`}
    />
  );
}

// ── Décor plein écran : "login" | "home" | "quiz" | "results" ─────────────────
export function SceneBackground({ scene }) {
  const v = useImageVersion();
  return (
    <div
      className={`scene-bg scene-${scene}`}
      style={{ "--scene-img": `url(${imageUrl(`bg_${scene}`, v)})` }}
      aria-hidden="true"
    />
  );
}
