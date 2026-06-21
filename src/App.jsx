// src/App.jsx
import { useState, useEffect } from "react";
import { onAuthStateChanged, signInWithPopup } from "firebase/auth";
import { doc, getDoc, collection, addDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, googleProvider, db, logConnection } from "./firebase/config";
import { useXP, XP_REWARDS } from "./hooks/useXP";
import { isAdminUser } from "./hooks/useAdmin";
import Navbar from "./components/Navbar";
import Upload from "./components/Upload";
import Summary from "./components/Summary";
import Quiz from "./components/Quiz";
import Dashboard from "./components/Dashboard";
import CourseList from "./components/CourseList";
import AdminPanel from "./components/admin/AdminPanel";

// Toast de notification XP
function XPToast({ gain, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="xp-toast" role="alert" aria-live="polite">
      <span className="xp-toast-icon">⚡</span>
      <span>+{gain} XP</span>
    </div>
  );
}

// Écran de connexion
function LoginScreen({ onLogin, loading }) {
  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo">🎓</div>
        <h1 className="login-title">StudyAI</h1>
        <p className="login-subtitle">Scanne tes cours, révise intelligemment.</p>
        <button className="btn-google" onClick={onLogin} disabled={loading}>
          {loading ? "Connexion…" : (
            <>
              <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
              </svg>
              Continuer avec Google
            </>
          )}
        </button>
        <p className="login-hint">Gratuit · Tes données restent privées</p>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [page, setPage] = useState("home"); // "home" | "course" | "quiz" | "dashboard" | "courses" | "admin"
  const [activeCourse, setActiveCourse] = useState(null);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [xpToast, setXPToast] = useState(null);

  const { profile, addXP, awardBadge, incrementQuizCount } = useXP(user?.uid);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setAuthLoading(false);
      if (u) {
        await logConnection(u);
      }
    });
    return unsub;
  }, []);

  const handleLogin = async () => {
    setLoginLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      console.error("Erreur connexion Google:", e);
    } finally {
      setLoginLoading(false);
    }
  };

  // Appelé après Upload réussi (analyse terminée, en attente de config quiz)
  const handleUploadComplete = async ({ courseId, summary, imageURL }) => {
    setActiveCourse({ courseId, summary, imageURL, quizId: null });
    setPage("course");

    const result = await addXP(XP_REWARDS.COURSE_UPLOAD, "course_upload");
    if (result) setXPToast(result.gained);
    await awardBadge("first_course");
  };

  // Ouvrir un cours existant depuis la liste "Mes cours"
  const handleOpenCourse = (course) => {
    setActiveCourse({
      courseId: course.id,
      quizId: course.quizId || null,
      summary: course.summary,
      imageURL: course.imageURL,
    });
    setPage("course");
  };

  // Générer le quiz avec la config choisie par l'utilisateur (nb par type)
  const [generatingQuiz, setGeneratingQuiz] = useState(false);

  const handleStartQuiz = async (quizConfig) => {
    if (!activeCourse?.courseId || !user?.uid) return;
    setGeneratingQuiz(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_WORKER_URL}/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Firebase-UID": user.uid,
        },
        body: JSON.stringify({
          action: "generate_quiz",
          summaryText: JSON.stringify(activeCourse.summary),
          quizConfig,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Erreur génération quiz");

      const quizRef = await addDoc(collection(db, "users", user.uid, "quizzes"), {
        questions: json.data.questions,
        courseId: activeCourse.courseId,
        config: quizConfig,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "users", user.uid, "courses", activeCourse.courseId), {
        quizId: quizRef.id,
        status: "ready",
      });

      setActiveQuiz({ quizId: quizRef.id, questions: json.data.questions });
      setPage("quiz");
    } catch (e) {
      console.error("Erreur génération quiz:", e);
    } finally {
      setGeneratingQuiz(false);
    }
  };

  // Charger un quiz déjà existant (depuis "Mes cours")
  const handleLoadExistingQuiz = async () => {
    if (!activeCourse?.quizId || !user?.uid) return;
    try {
      const quizSnap = await getDoc(
        doc(db, "users", user.uid, "quizzes", activeCourse.quizId)
      );
      if (quizSnap.exists()) {
        setActiveQuiz({ quizId: activeCourse.quizId, questions: quizSnap.data().questions });
        setPage("quiz");
      }
    } catch (e) {
      console.error("Erreur chargement quiz:", e);
    }
  };

  // Appelé à la fin d'un quiz
  const handleXPGain = async (amount, isPerfect) => {
    const result = await addXP(amount, "quiz_complete");
    if (result) setXPToast(result.gained);

    await incrementQuizCount();
    await awardBadge("first_quiz");
    if (isPerfect) await awardBadge("perfect_10");

    const updatedTotal = (profile?.totalQuizzes || 0) + 1;
    if (updatedTotal >= 10) await awardBadge("quiz_10");
    if (updatedTotal >= 50) await awardBadge("quiz_50");
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

  if (authLoading) {
    return (
      <div className="splash">
        <div className="splash-logo">🎓</div>
        <div className="splash-spinner" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} loading={loginLoading} />;
  }

  // Compte désactivé par l'admin → blocage total de l'app
  if (profile?.disabled) {
    return (
      <div className="disabled-screen">
        <div className="disabled-card">
          <div className="disabled-icon">🚫</div>
          <h2>Compte désactivé</h2>
          <p>Ton accès à StudyAI a été suspendu. Contacte l'administrateur pour plus d'informations.</p>
          <button className="btn-signout" onClick={() => auth.signOut()}>Se déconnecter</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Navbar
        user={user}
        profile={profile}
        currentPage={page}
        onNavigate={handleNavigate}
      />

      <main className="main-content">
        {page === "home" && (
          <div className="home-page">
            <div className="home-hero">
              <h1 className="hero-title">Scanne. Révise. <span className="hero-accent">Progresse.</span></h1>
              <p className="hero-sub">Prends en photo ton cours et laisse l'IA créer ton quiz personnalisé.</p>
            </div>
            <Upload user={user} onComplete={handleUploadComplete} />
          </div>
        )}

        {page === "courses" && (
          <CourseList user={user} onOpenCourse={handleOpenCourse} />
        )}

        {page === "course" && activeCourse && (
          <Summary
            summary={activeCourse.summary}
            imageURL={activeCourse.imageURL}
            onStartQuiz={activeCourse.quizId ? handleLoadExistingQuiz : handleStartQuiz}
            generating={generatingQuiz}
          />
        )}

        {page === "quiz" && activeQuiz && (
          <Quiz
            quizId={activeQuiz.quizId}
            questions={activeQuiz.questions}
            user={user}
            onXPGain={handleXPGain}
            onHome={handleHome}
          />
        )}

        {page === "dashboard" && (
          <Dashboard user={user} profile={profile} />
        )}

        {page === "admin" && isAdminUser(user) && (
          <AdminPanel />
        )}
      </main>

      {xpToast && (
        <XPToast gain={xpToast} onDone={() => setXPToast(null)} />
      )}
    </div>
  );
}
