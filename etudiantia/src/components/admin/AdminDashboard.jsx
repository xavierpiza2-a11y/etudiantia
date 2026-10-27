// src/components/admin/AdminDashboard.jsx
import { formatBytes } from "../../hooks/useAdmin";

function StatBox({ icon, label, value, color }) {
  return (
    <div className="admin-stat-box">
      <span className="admin-stat-icon" style={{ color }}>{icon}</span>
      <span className="admin-stat-value">{value}</span>
      <span className="admin-stat-label">{label}</span>
    </div>
  );
}

const fmt = (n) => Number(n || 0).toLocaleString("fr-FR");

export default function AdminDashboard({ data, logs }) {
  const { profiles, totals, ai, disk, settings } = data;
  const activeCount = profiles.filter((p) => !p.disabled).length;
  const disabledCount = profiles.length - activeCount;

  // Connexions des 7 derniers jours (entrées de profil)
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentLogins = logs.filter(
    (l) => l.event === "profile_select" && new Date(l.t).getTime() >= sevenDaysAgo
  ).length;

  const topUsers = [...profiles].sort((a, b) => (b.xp || 0) - (a.xp || 0)).slice(0, 5);

  return (
    <div className="admin-dashboard">
      <h2 className="admin-section-title">Vue d'ensemble</h2>

      <div className="admin-stats-grid">
        <StatBox icon="👥" label="Profils" value={profiles.length} color="var(--purple-l)" />
        <StatBox icon="✅" label="Profils actifs" value={activeCount} color="var(--green)" />
        <StatBox icon="🚫" label="Profils désactivés" value={disabledCount} color="var(--red)" />
        <StatBox icon="📚" label="Cours scannés" value={totals.courses} color="var(--gold)" />
        <StatBox icon="📝" label="Quiz enregistrés" value={totals.quizzes} color="var(--purple-l)" />
        <StatBox icon="🎯" label="Quiz complétés" value={totals.results} color="var(--green)" />
        <StatBox icon="⚡" label="XP cumulé" value={fmt(totals.xp)} color="var(--gold)" />
        <StatBox icon="🔌" label="Connexions (7j)" value={recentLogins} color="var(--purple-l)" />
      </div>

      <h3 className="admin-subsection-title">Intelligence artificielle & économies</h3>
      <div className="admin-stats-grid">
        <StatBox icon="🤖" label="Appels IA envoyés" value={ai.totalCalls} color="var(--purple-l)" />
        <StatBox icon="💾" label="Appels évités (cache)" value={ai.totalCacheHits} color="var(--green)" />
        <StatBox icon="🔤" label="Tokens envoyés" value={fmt(ai.inputTokens)} color="var(--gold)" />
        <StatBox icon="💬" label="Tokens reçus" value={fmt(ai.outputTokens)} color="var(--gold)" />
      </div>
      <p className="admin-note">
        Analyses : {ai.summarize.calls} appel(s), {ai.summarize.cacheHits} réutilisation(s) ·
        Quiz : {ai.quiz.calls} appel(s), {ai.quiz.cacheHits} réutilisation(s).
        Modèle : <code>{settings.model}</code>
        {settings.modelQuiz !== settings.model && <> (quiz : <code>{settings.modelQuiz}</code>)</>} ·
        Limite : {settings.dailyAiLimit ? `${settings.dailyAiLimit} appels/jour/profil` : "aucune"} ·
        Clé API : {settings.apiKeyConfigured ? "✅ configurée" : "❌ absente"}
      </p>

      <h3 className="admin-subsection-title">Stockage (/data)</h3>
      <div className="admin-stats-grid">
        <StatBox icon="💽" label="Total" value={formatBytes(disk.dataBytes)} color="var(--purple-l)" />
        <StatBox icon="🖼️" label="Cours & images" value={formatBytes(disk.coursesBytes)} color="var(--gold)" />
        <StatBox icon="🧠" label="Cache IA" value={formatBytes(disk.cacheBytes)} color="var(--green)" />
      </div>

      <h3 className="admin-subsection-title">Top profils (XP)</h3>
      <div className="admin-top-list">
        {topUsers.map((u, i) => (
          <div key={u.id} className="admin-top-item">
            <span className="admin-top-rank">#{i + 1}</span>
            <span className="admin-top-uid">{u.avatar} {u.name}</span>
            <span className="admin-top-xp">{u.xp || 0} XP</span>
            <span className="admin-top-stats">{u.courseCount} cours · {u.resultCount} quiz</span>
          </div>
        ))}
        {topUsers.length === 0 && <p className="admin-empty">Aucun profil pour l'instant.</p>}
      </div>
    </div>
  );
}
