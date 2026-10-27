// src/components/KeyScreen.jsx
// Écran d'accès : saisie de la clé d'accès définie dans le fichier .env du serveur.
import { useState } from "react";
import { api } from "../lib/api";

export default function KeyScreen({ onSuccess }) {
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!key.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      await api.post("/session/login", { key: key.trim() });
      onSuccess();
    } catch (err) {
      setError(err.message);
      setKey("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <div className="login-logo">🎓</div>
        <h1 className="login-title">StudyAI</h1>
        <p className="login-subtitle">Entre la clé d'accès pour continuer.</p>

        <div className="key-field">
          <input
            className="key-input"
            type={show ? "text" : "password"}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Clé d'accès"
            autoComplete="current-password"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
            aria-label="Clé d'accès"
          />
          <button
            type="button"
            className="key-toggle"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Masquer la clé" : "Afficher la clé"}
          >
            {show ? "🙈" : "👁️"}
          </button>
        </div>

        {error && <p className="login-error" role="alert">{error}</p>}

        <button className="btn-login" type="submit" disabled={loading || !key.trim()}>
          {loading ? "Vérification…" : "Entrer 🔑"}
        </button>
        <p className="login-hint">Accès privé · Tes données restent sur ton serveur</p>
      </form>
    </div>
  );
}
