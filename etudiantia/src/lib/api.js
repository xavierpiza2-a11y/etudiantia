// src/lib/api.js
// Client HTTP vers le serveur (même origine : le cookie de session part automatiquement).

export class ApiError extends Error {
  constructor(message, { status, code, data } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

const MESSAGES = {
  bad_key: "Clé d'accès incorrecte.",
  bad_pin: "PIN incorrect.",
  too_many_attempts: "Trop de tentatives. Réessaie dans quelques minutes.",
  admin_disabled: "L'espace administrateur n'est pas activé (ADMIN_PIN absent du .env).",
  creation_disabled: "La création de profils est désactivée.",
  disabled: "Ce profil est désactivé.",
  not_found: "Introuvable.",
  auth_required: "Session expirée. Reconnecte-toi.",
  admin_required: "Accès administrateur requis.",
};

// Événement envoyé quand la session n'est plus valable (cookie expiré, profil désactivé…)
export const SESSION_INVALID_EVENT = "studyai:session-invalid";

async function request(method, path, body) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: "same-origin",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Impossible de joindre le serveur. Vérifie ta connexion au réseau local.", { status: 0 });
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* corps vide */
  }

  if (!res.ok) {
    const raw = data?.error;
    const message = MESSAGES[raw] || raw || `Erreur ${res.status}`;
    const isLogin = path === "/session/login" || path === "/admin/login";
    if (!isLogin && [401, 403].includes(res.status) &&
        ["auth_required", "admin_required", "profile_required", "disabled"].includes(raw)) {
      window.dispatchEvent(new Event(SESSION_INVALID_EVENT));
    }
    throw new ApiError(message, { status: res.status, code: data?.code || raw, data });
  }
  return data;
}

export const api = {
  get: (path) => request("GET", path),
  post: (path, body = {}) => request("POST", path, body),
  patch: (path, body = {}) => request("PATCH", path, body),
  del: (path) => request("DELETE", path),
};
