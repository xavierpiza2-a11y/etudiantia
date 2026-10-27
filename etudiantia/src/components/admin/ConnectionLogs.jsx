// src/components/admin/ConnectionLogs.jsx
const EVENT_LABELS = {
  login: "🔑 Accès (clé valide)",
  login_failed: "⛔ Clé incorrecte",
  logout: "🔒 Verrouillage",
  profile_select: "👤 Profil choisi",
  profile_create: "➕ Profil créé",
  admin_login: "🛠️ Admin connecté",
  admin_failed: "⛔ PIN incorrect",
  admin_profile_update: "✏️ Profil modifié (admin)",
  admin_profile_delete: "🗑 Profil supprimé (admin)",
};

export default function ConnectionLogs({ logs, loading }) {
  if (loading) return <p className="loading-text">Chargement des logs…</p>;

  return (
    <div className="admin-logs">
      <h2 className="admin-section-title">Historique des connexions</h2>
      <p className="admin-logs-count">{logs.length} derniers événements</p>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Événement</th>
              <th>Profil</th>
              <th>Adresse IP</th>
              <th>Navigateur</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, i) => (
              <tr key={`${log.t}-${i}`} className={log.event.endsWith("_failed") ? "row-failed" : ""}>
                <td>{new Date(log.t).toLocaleString("fr-FR")}</td>
                <td>{EVENT_LABELS[log.event] || log.event}</td>
                <td>{log.profile || "—"}</td>
                <td>{log.ip || "—"}</td>
                <td className="admin-ua-cell">{(log.ua || "").slice(0, 60)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && <p className="admin-empty">Aucun événement enregistré.</p>}
      </div>
    </div>
  );
}
