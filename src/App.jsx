// src/App.jsx
// Parcours : clé d'accès  →  choix du profil  →  application.
import { useState, useEffect, useCallback } from "react";
import { api, SESSION_INVALID_EVENT } from "./lib/api";
import { BADGES } from "./hooks/useXP";
import KeyScreen from "./components/KeyScreen";
import ProfileSelect from "./components/ProfileSelect";
import Navbar from "./components/Navbar";
import Upload from "./components/Upload";
import Summary from "./components/Summary";
import Quiz from "./components/Quiz";
import Dashboard from "./components/Dashboard";
import CourseList from "./components/CourseList";
import AdminPanel from "./components/admin/AdminPanel";

// Toast de notification XP (+ nouveaux badges)
function XPToast({ gain, badges = [], onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, badges.length ? 4000 : 2500);
    return () => clearTimeout(t);
  }, []);
  const earned = badges.map((id) => BADGES.find((b) => b.id === id)).filter(Boolean);
  return (
    <div className="xp-toast" role="alert" aria-live="polite">
      <span className="xp-toast-icon">⚡</span>
      <span>+{gain} XP</span>
      {earned.map((b) => (
        <span key={b.id} className="xp-toast-badge" title={b.desc}>
          {b.icon} {b.name}
        </span>
      ))}
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null); // null = chargement
  const [profile, setProfile] = useState(null);
  const [page, setPage] = useState("home"); // "home" | "course" | "quiz" | "dashboard" | "courses" | "admin"
  const [activeCourse, setActiveCourse] = useState(null);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [xpToast, setXPToast] = useState(null);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [quizError, setQuizError] = useState(null);

  const resetNavigation = () => {
    setPage("home");
    setActiveCourse(null);
    setActiveQuiz(null);
    setQuizError(null);
  };

  const refreshSession = useCallback(async () => {
    try {
      const s = await api.get("/session");
      setSession(s);
      setProfile(s.profile || null);
      return s;
    } catch {
      setSession({ authenticated: false });
      setProfile(null);
      return null;
    }
  }, []);

  useEffect(() => {
    refreshSession();
    const onInvalid = () => {
      refreshSession().then(() => resetNavigation());
    };
    window.addEventListener(SESSION_INVALID_EVENT, onInvalid);
    return () => window.removeEventListener(SESSION_INVALID_EVENT, onInvalid);
  }, [refreshSession]);

  // Applique le résultat d'une action (XP gagnée, badges, profil mis à jour)
  const handleActivity = (activity) => {
    if (!activity) return;
    if (activity.profile) setProfile(activity.profile);
    if (activity.gained) setXPToast({ gain: activity.gained, badges: activity.newBadges || [], key: Date.now() });
  };

  const handleLogout = async () => {
    try {
      await api.post("/session/logout");
    } catch {
      /* déjà déconnecté */
    }
    resetNavigation();
    await refreshSession();
  };

  const handleSwitchProfile = async () => {
    try {
      await api.post("/session/profile", { profileId: null });
    } catch {
      /* ignore */
    }
    resetNavigation();
    await refreshSession();
  };

  // ── Upload terminé : le cours est analysé (ou récupéré du cache) ─────────
  const handleUploadComplete = ({ course, activity }) => {
    setActiveCourse(course);
    setQuizError(null);
    setPage("course");
    handleActivity(activity);
  };

  const handleOpenCourse = (course) => {
    setActiveCourse(course);
    setQuizError(null);
    setPage("course");
  };

  // ── Génération d'un quiz (ou récupération depuis le cache serveur) ───────
  const handleStartQuiz = async (quizConfig, { force = false } = {}) => {
    if (!activeCourse?.id) return;
    setGeneratingQuiz(true);
    setQuizError(null);
    try {
      const { quiz } = await api.post(`/courses/${activeCourse.id}/quiz`, { config: quizConfig, force });
      setActiveCourse((c) => ({ ...c, quizId: quiz.id, status: "ready" }));
      setActiveQuiz({ quizId: quiz.id, questions: quiz.questions });
      setPage("quiz");
    } catch (e) {
      setQuizError(e.message);
    } finally {
      setGeneratingQuiz(false);
    }
  };

  // Quiz déjà enregistré : chargé depuis le disque, aucun appel IA
  const handleLoadExistingQuiz = async () => {
    if (!activeCourse?.quizId) return;
    setQuizError(null);
    try {
      const { quiz } = await api.get(`/quizzes/${activeCourse.quizId}`);
      setActiveQuiz({ quizId: quiz.id, questions: quiz.questions });
      setPage("quiz");
    } catch (e) {
      setQuizError(e.message);
    }
  };

  const handleHome = () => {
    setPage("home");
    setActiveCourse(null);
    setActiveQuiz(null);
  };

  const handleNavigate = (p) => {
    if (p === "home") handleHome();
    else setPage(p);
  };

  // ── Rendu ────────────────────────────────────────────────────────────────
  if (!session) {
    return (
      <div className="splash">
        <div className="splash-logo">🎓</div>
        <div className="splash-spinner" />
      </div>
    );
  }

  if (!session.authenticated) {
    return <KeyScreen onSuccess={refreshSession} />;
  }

  if (!session.profile) {
    return (
      <ProfileSelect
        canCreate={session.canCreateProfiles}
        onSelected={async () => {
          resetNavigation();
          await refreshSession();
        }}
        onLogout={handleLogout}
      />
    );
  }

  // Profil désactivé par l'administrateur → blocage total
  if (profile?.disabled) {
    return (
      <div className="disabled-screen">
        <div className="disabled-card">
          <div className="disabled-icon">🚫</div>
          <h2>Profil désactivé</h2>
          <p>Ce profil a été suspendu. Contacte l'administrateur pour plus d'informations.</p>
          <button className="btn-reset" onClick={handleSwitchProfile}>Changer de profil</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Navbar
        profile={profile}
        adminEnabled={session.adminEnabled}
        currentPage={page}
        onNavigate={handleNavigate}
        onSwitchProfile={handleSwitchProfile}
        onLogout={handleLogout}
      />

      <main className="main-content">
        {page === "home" && (
          <div className="home-page">
            <div className="home-hero">
              <h1 className="hero-title">Scanne. Révise. <span className="hero-accent">Progresse.</span></h1>
              <p className="hero-sub">Prends en photo ton cours et laisse l'IA créer ton quiz personnalisé.</p>
            </div>
            <Upload onComplete={handleUploadComplete} />
          </div>
        )}

        {page === "courses" && <CourseList onOpenCourse={handleOpenCourse} />}

        {page === "course" && activeCourse && (
          <Summary
            summary={activeCourse.summary}
            imageUrls={activeCourse.imageUrls}
            fromCache={activeCourse.fromCache}
            hasQuiz={!!activeCourse.quizId}
            onOpenQuiz={handleLoadExistingQuiz}
            onStartQuiz={handleStartQuiz}
            generating={generatingQuiz}
            error={quizError}
          />
        )}

        {page === "quiz" && activeQuiz && (
          <Quiz
            quizId={activeQuiz.quizId}
            questions={activeQuiz.questions}
            onActivity={handleActivity}
            onHome={handleHome}
          />
        )}

        {page === "dashboard" && <Dashboard profile={profile} />}

        {page === "admin" && (
          <AdminPanel isAdmin={session.isAdmin} onSessionChange={refreshSession} />
        )}
      </main>

      {xpToast && (
        <XPToast key={xpToast.key} gain={xpToast.gain} badges={xpToast.badges} onDone={() => setXPToast(null)} />
      )}
    </div>
  );
}
