// src/components/Dashboard.jsx
import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase/config";
import { getLevelFromXP, LEVELS, BADGES } from "../hooks/useXP";

function XPBar({ xp }) {
  const { current, next, progress } = getLevelFromXP(xp);
  return (
    <div className="xp-bar-container">
      <div className="xp-level-row">
        <span className="xp-level-icon">{current.icon}</span>
        <div className="xp-level-info">
          <span className="xp-level-name">Niv. {current.level} — {current.name}</span>
          <span className="xp-total">{xp} XP</span>
        </div>
        {next && (
          <span className="xp-next-label">{next.minXP - xp} XP → {next.name}</span>
        )}
      </div>
      <div className="xp-track">
        <div
          className="xp-fill"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}

function BadgeGrid({ earnedBadges }) {
  return (
    <div className="badges-section">
      <h3 className="section-title">Badges</h3>
      <div className="badges-grid">
        {BADGES.map((badge) => {
          const earned = earnedBadges?.includes(badge.id);
          return (
            <div
              key={badge.id}
              className={`badge-card ${earned ? "earned" : "locked"}`}
              title={badge.desc}
            >
              <span className="badge-icon">{earned ? badge.icon : "🔒"}</span>
              <span className="badge-name">{badge.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="stat-card">
      <span className="stat-icon">{icon}</span>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function RecentResults({ results }) {
  if (!results.length) {
    return (
      <div className="empty-results">
        <p>Aucun quiz complété pour l'instant.</p>
        <p className="empty-hint">Scanne un cours pour commencer ! 📸</p>
      </div>
    );
  }
  return (
    <div className="recent-results">
      <h3 className="section-title">Derniers quiz</h3>
      {results.map((r, i) => (
        <div key={i} className="result-item">
          <div className="result-item-bar" style={{ width: `${r.percentage}%` }} />
          <div className="result-item-content">
            <span className="result-item-pct">{r.percentage}%</span>
            <span className="result-item-score">{r.score}/{r.maxScore} pts</span>
            <span className="result-item-date">
              {r.completedAt?.toDate
                ? r.completedAt.toDate().toLocaleDateString("fr-FR")
                : "—"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard({ user, profile }) {
  const [results, setResults] = useState([]);
  const [loadingResults, setLoadingResults] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    const fetchResults = async () => {
      try {
        const q = query(
          collection(db, "users", user.uid, "results"),
          orderBy("completedAt", "desc"),
          limit(10)
        );
        const snap = await getDocs(q);
        setResults(snap.docs.map((d) => d.data()));
      } catch (e) {
        console.error("Erreur chargement résultats:", e);
      } finally {
        setLoadingResults(false);
      }
    };
    fetchResults();
  }, [user]);

  const avgScore =
    results.length > 0
      ? Math.round(results.reduce((acc, r) => acc + r.percentage, 0) / results.length)
      : 0;

  const perfectScores = results.filter((r) => r.percentage === 100).length;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <img src={user?.photoURL} alt="" className="avatar" referrerPolicy="no-referrer" />
        <div>
          <h2 className="dashboard-name">{user?.displayName?.split(" ")[0]} 👋</h2>
          <p className="dashboard-sub">Continue ta progression !</p>
        </div>
      </div>

      {profile && <XPBar xp={profile.xp || 0} />}

      <div className="stats-row">
        <StatCard icon="📝" label="Quiz complétés" value={profile?.totalQuizzes || 0} />
        <StatCard icon="📊" label="Moyenne" value={`${avgScore}%`} />
        <StatCard icon="💯" label="Scores parfaits" value={perfectScores} />
        <StatCard icon="🔥" label="Série" value={`${profile?.streak || 0}j`} />
      </div>

      {profile && <BadgeGrid earnedBadges={profile.badges} />}

      {loadingResults ? (
        <p className="loading-text">Chargement des résultats…</p>
      ) : (
        <RecentResults results={results} />
      )}
    </div>
  );
}
