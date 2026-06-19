// src/components/Navbar.jsx
import { signOut } from "firebase/auth";
import { auth } from "../firebase/config";
import { getLevelFromXP } from "../hooks/useXP";
import { isAdminUser } from "../hooks/useAdmin";

export default function Navbar({ user, profile, currentPage, onNavigate }) {
  const levelInfo = profile ? getLevelFromXP(profile.xp || 0) : null;

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Erreur déconnexion:", e);
    }
  };

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
        {isAdminUser(user) && (
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
        {user && (
          <div className="navbar-user">
            <img
              src={user.photoURL}
              alt={user.displayName}
              className="navbar-avatar"
              referrerPolicy="no-referrer"
            />
            <button className="btn-signout" onClick={handleSignOut} title="Se déconnecter">
              ↩
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
