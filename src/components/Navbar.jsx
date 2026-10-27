// src/components/Navbar.jsx
import { getLevelFromXP } from "../hooks/useXP";

export default function Navbar({ profile, adminEnabled, currentPage, onNavigate, onSwitchProfile, onLogout }) {
  const levelInfo = profile ? getLevelFromXP(profile.xp || 0) : null;

  return (
    <nav className="navbar">
      <div className="navbar-brand" onClick={() => onNavigate("home")} role="button" tabIndex={0}>
        <span className="navbar-logo">🎓</span>
        <span className="navbar-title">StudyAI</span>
      </div>

      <div className="navbar-links">
        <button
          className={`nav-link ${currentPage === "home" ? "active" : ""}`}
          onClick={() => onNavigate("home")}
        >
          🏠 Accueil
        </button>
        <button
          className={`nav-link ${currentPage === "courses" ? "active" : ""}`}
          onClick={() => onNavigate("courses")}
        >
          📚 Mes cours
        </button>
        <button
          className={`nav-link ${currentPage === "dashboard" ? "active" : ""}`}
          onClick={() => onNavigate("dashboard")}
        >
          📊 Progression
        </button>
        {adminEnabled && (
          <button
            className={`nav-link admin-link ${currentPage === "admin" ? "active" : ""}`}
            onClick={() => onNavigate("admin")}
          >
            🛠️ Admin
          </button>
        )}
      </div>

      <div className="navbar-right">
        {levelInfo && (
          <div className="navbar-xp">
            <span className="navbar-level-icon">{levelInfo.current.icon}</span>
            <div className="navbar-xp-mini">
              <span>{profile.xp} XP</span>
              <div className="navbar-xp-track">
                <div className="navbar-xp-fill" style={{ width: `${levelInfo.progress}%` }} />
              </div>
            </div>
          </div>
        )}
        {profile && (
          <div className="navbar-user">
            <button
              className="navbar-profile"
              style={{ "--tile-color": profile.color }}
              onClick={onSwitchProfile}
              title={`${profile.name} — changer de profil`}
              aria-label={`Profil ${profile.name} : changer de profil`}
            >
              <span>{profile.avatar}</span>
            </button>
            <button className="btn-signout" onClick={onLogout} title="Verrouiller l'application" aria-label="Verrouiller">
              🔒
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
