// src/components/ProfileSelect.jsx
// Choix du profil, affiché juste après la saisie de la clé d'accès.
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { getLevelFromXP } from "../hooks/useXP";

const AVATARS = ["🦊", "🐼", "🦁", "🐯", "🐨", "🐸", "🦄", "🐙", "🦉", "🐧", "🐢", "🦖"];

export default function ProfileSelect({ canCreate, onSelected, onLogout }) {
  const [profiles, setProfiles] = useState(null);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);

  const load = async () => {
    try {
      const { profiles } = await api.get("/profiles");
      setProfiles(profiles);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const choose = async (profile) => {
    if (profile.disabled || busyId) return;
    setBusyId(profile.id);
    setError(null);
    try {
      await api.post("/session/profile", { profileId: profile.id });
      onSelected();
    } catch (e) {
      setError(e.message);
      setBusyId(null);
      load();
    }
  };

  const create = async (e) => {
    e.preventDefault();
    if (!name.trim() || busyId) return;
    setBusyId("new");
    setError(null);
    try {
      const { profile } = await api.post("/profiles", { name: name.trim(), avatar });
      await api.post("/session/profile", { profileId: profile.id });
      onSelected();
    } catch (err) {
      setError(err.message);
      setBusyId(null);
    }
  };

  if (!profiles && !error) {
    return (
      <div className="splash">
        <div className="splash-spinner" />
      </div>
    );
  }

  return (
    <div className="profiles-screen">
      <h1 className="profiles-title">Qui révise aujourd'hui ?</h1>

      {error && <p className="login-error" role="alert">{error}</p>}

      {!creating ? (
        <div className="profiles-grid">
          {(profiles || []).map((p) => {
            const lvl = getLevelFromXP(p.xp || 0).current;
            return (
              <button
                key={p.id}
                className={`profile-tile ${p.disabled ? "is-disabled" : ""}`}
                style={{ "--tile-color": p.color }}
                onClick={() => choose(p)}
                disabled={p.disabled || !!busyId}
              >
                <span className="profile-avatar">{busyId === p.id ? "⏳" : p.avatar}</span>
                <span className="profile-name">{p.name}</span>
                <span className="profile-level">
                  {p.disabled ? "🚫 Désactivé" : `${lvl.icon} Niv. ${lvl.level} · ${p.xp} XP`}
                </span>
              </button>
            );
          })}

          {canCreate && (
            <button className="profile-tile profile-add" onClick={() => setCreating(true)}>
              <span className="profile-avatar">＋</span>
              <span className="profile-name">Nouveau profil</span>
            </button>
          )}
        </div>
      ) : (
        <form className="profile-form" onSubmit={create}>
          <h2 className="profile-form-title">Nouveau profil</h2>
          <input
            className="key-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ton prénom"
            maxLength={24}
            autoFocus
            aria-label="Prénom"
          />
          <div className="avatar-picker" role="radiogroup" aria-label="Choisis ton avatar">
            {AVATARS.map((a) => (
              <button
                type="button"
                key={a}
                role="radio"
                aria-checked={avatar === a}
                className={`avatar-choice ${avatar === a ? "selected" : ""}`}
                onClick={() => setAvatar(a)}
              >
                {a}
              </button>
            ))}
          </div>
          <div className="config-actions">
            <button type="button" className="btn-config-cancel" onClick={() => setCreating(false)}>
              ← Retour
            </button>
            <button className="btn-generate-quiz" type="submit" disabled={!name.trim() || !!busyId}>
              Créer et entrer 🚀
            </button>
          </div>
        </form>
      )}

      {!profiles?.length && !canCreate && !creating && (
        <p className="login-hint">
          Aucun profil n'existe encore. Demande à l'administrateur d'en créer un.
        </p>
      )}

      <button className="profiles-logout" onClick={onLogout}>🔒 Verrouiller</button>
    </div>
  );
}
