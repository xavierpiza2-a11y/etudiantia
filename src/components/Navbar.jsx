// src/components/Navbar.jsx
// Mobile : en-tête compact + barre d'onglets en bas (zone du pouce) + feuille « Profil ».
// Ordinateur : en-tête avec liens ; l'avatar ouvre la même feuille.
import { useState } from "react";
import { getLevelFromXP } from "../hooks/useXP";
import { Img } from "../lib/images";

const TABS = [
  { id: "home", label: "Accueil", icon: "🏠", img: "nav_home" },
  { id: "courses", label: "Cours", icon: "📚", img: "nav_courses" },
  { id: "dashboard", label: "Progrès", icon: "🏆", img: "nav_progress" },
];

function ProfileSheet({ profile, levelInfo, adminEnabled, onClose, onNavigate, onSwitchProfile, onLogout }) {
  const run = (fn) => () => {
    onClose();
    fn();
  };
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label="Menu du profil" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-profile">
          <span className="sheet-avatar" style={{ "--tile-color": profile.color }}>{profile.avatar}</span>
          <div>
            <p className="sheet-name">{profile.name}</p>
            <p className="sheet-level">
              {levelInfo.current.icon} Niv. {levelInfo.current.level} · {levelInfo.current.name} · {profile.xp} XP
            </p>
          </div>
        </div>
        <button className="sheet-btn" onClick={run(onSwitchProfile)}>🔄 Changer de profil</button>
        {adminEnabled && (
          <button className="sheet-btn sheet-btn-admin" onClick={run(() => onNavigate("admin"))}>
            🛠️ Administration
          </button>
        )}
        <button className="sheet-btn sheet-btn-lock" onClick={run(onLogout)}>🔒 Verrouiller l'application</button>
        <button className="sheet-close" onClick={onClose}>Fermer</button>
      </div>
    </div>
  );
}

export default function Navbar({
  profile, adminEnabled, currentPage, focus, onNavigate, onSwitchProfile, onLogout,
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const levelInfo = profile ? getLevelFromXP(profile.xp || 0) : null;
  const profileActive = currentPage === "admin" || sheetOpen;

  return (
    <>
      <nav className="navbar">
        <div className="navbar-brand" onClick={() => onNavigate("home")} role="button" tabIndex={0}>
          <Img name="logo" fallback="🎓" size={38} className="navbar-logo" />
          <span className="navbar-title">StudyAI</span>
        </div>

        {/* Liens : visibles seulement sur grand écran (sur mobile : barre d'onglets) */}
        <div className="navbar-links">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`nav-link ${currentPage === t.id ? "active" : ""}`}
              onClick={() => onNavigate(t.id)}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="navbar-right">
          {levelInfo && (
            <div className="xp-chip" title={`${profile.xp} XP`}>
              <Img name={`level_${levelInfo.current.level}`} fallback={levelInfo.current.icon} size={26} />
              <div className="xp-chip-body">
                <span className="xp-chip-xp">{profile.xp} XP</span>
                <div className="navbar-xp-track">
                  <div className="navbar-xp-fill" style={{ width: `${levelInfo.progress}%` }} />
                </div>
              </div>
            </div>
          )}
          {profile && (
            <button
              className="navbar-profile navbar-profile-desktop"
              style={{ "--tile-color": profile.color }}
              onClick={() => setSheetOpen(true)}
              aria-label={`Menu du profil ${profile.name}`}
            >
              <span>{profile.avatar}</span>
            </button>
          )}
        </div>
      </nav>

      {/* Barre d'onglets du bas (mobile) — masquée pendant un quiz pour éviter les fausses manœuvres */}
      {!focus && (
        <nav className="tabbar" aria-label="Navigation principale">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab ${currentPage === t.id ? "active" : ""}`}
              onClick={() => onNavigate(t.id)}
              aria-current={currentPage === t.id ? "page" : undefined}
            >
              <Img name={t.img} fallback={t.icon} size={30} className="tab-icon" />
              <span className="tab-label">{t.label}</span>
            </button>
          ))}
          <button
            className={`tab ${profileActive ? "active" : ""}`}
            onClick={() => setSheetOpen(true)}
            aria-label="Profil et réglages"
          >
            <span className="tab-icon tab-avatar" style={{ "--tile-color": profile?.color }}>{profile?.avatar}</span>
            <span className="tab-label">Profil</span>
          </button>
        </nav>
      )}

      {sheetOpen && profile && (
        <ProfileSheet
          profile={profile}
          levelInfo={levelInfo}
          adminEnabled={adminEnabled}
          onClose={() => setSheetOpen(false)}
          onNavigate={onNavigate}
          onSwitchProfile={onSwitchProfile}
          onLogout={onLogout}
        />
      )}
    </>
  );
}
