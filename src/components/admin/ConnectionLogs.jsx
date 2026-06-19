// src/components/admin/ConnectionLogs.jsx
export default function ConnectionLogs({ logs, loading }) {
  if (loading) return <p className="loading-text">Chargement des logs…</p>;

  return (
    <div className="admin-logs">
      <h2 className="admin-section-title">Historique des connexions</h2>
      <p className="admin-logs-count">{logs.length} dernières connexions</p>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Email</th>
              <th>Nom</th>
              <th>Navigateur</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>
                  {log.timestamp?.toDate
                    ? log.timestamp.toDate().toLocaleString("fr-FR")
                    : "—"}
                </td>
                <td>{log.email}</td>
                <td>{log.displayName}</td>
                <td className="admin-ua-cell">{log.userAgent?.slice(0, 60)}…</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && <p className="admin-empty">Aucune connexion enregistrée.</p>}
      </div>
    </div>
  );
}