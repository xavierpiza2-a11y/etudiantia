// src/components/admin/AdminDashboard.jsx
function StatBox({ icon, label, value, color }) {
  return (
    <div className="admin-stat-box">
      <span className="admin-stat-icon" style={{ color }}>{icon}</span>
      <span className="admin-stat-value">{value}</span>
      <span className="admin-stat-label">{label}</span>
    </div>
  );
}

export default function AdminDashboard({ users, logs }) {
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => !u.disabled).length;
  const disabledUsers = users.filter((u) => u.disabled).length;
  const totalCourses = users.reduce((acc, u) => acc + (u.courseCount || 0), 0);
  const totalQuizzes = users.reduce((acc, u) => acc + (u.quizCount || 0), 0);
  const totalResults = users.reduce((acc, u) => acc + (u.resultCount || 0), 0);
  const totalXP = users.reduce((acc, u) => acc + (u.xp || 0), 0);

  // Connexions des 7 derniers jours
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const recentLogs = logs.filter((l) => {
    const t = l.timestamp?.toDate ? l.timestamp.toDate().getTime() : 0;
    return t >= sevenDaysAgo;
  });

  // Top 5 utilisateurs par XP
  const topUsers = [...users].sort((a, b) => (b.xp || 0) - (a.xp || 0)).slice(0, 5);

  return (
    <div className="admin-dashboard">
      <h2 className="admin-section-title">Vue d'ensemble</h2>

      <div className="admin-stats-grid">
        <StatBox icon="👥" label="Utilisateurs" value={totalUsers} color="var(--purple-l)" />
        <StatBox icon="✅" label="Comptes actifs" value={activeUsers} color="var(--green)" />
        <StatBox icon="🚫" label="Comptes désactivés" value={disabledUsers} color="var(--red)" />
        <StatBox icon="📚" label="Cours scannés" value={totalCourses} color="var(--gold)" />
        <StatBox icon="📝" label="Quiz générés" value={totalQuizzes} color="var(--purple-l)" />
        <StatBox icon="🎯" label="Quiz complétés" value={totalResults} color="var(--green)" />
        <StatBox icon="⚡" label="XP cumulé" value={totalXP} color="var(--gold)" />
        <StatBox icon="🔌" label="Connexions (7j)" value={recentLogs.length} color="var(--purple-l)" />
      </div>

      <h3 className="admin-subsection-title">Top utilisateurs (XP)</h3>
      <div className="admin-top-list">
        {topUsers.map((u, i) => (
          <div key={u.uid} className="admin-top-item">
            <span className="admin-top-rank">#{i + 1}</span>
            <span className="admin-top-uid">{u.uid.slice(0, 12)}…</span>
            <span className="admin-top-xp">{u.xp || 0} XP</span>
            <span className="admin-top-stats">{u.courseCount} cours · {u.resultCount} quiz</span>
          </div>
        ))}
        {topUsers.length === 0 && <p className="admin-empty">Aucun utilisateur encore.</p>}
      </div>
    </div>
  );
}