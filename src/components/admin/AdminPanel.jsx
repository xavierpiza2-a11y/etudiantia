// src/components/admin/AdminPanel.jsx
import { useState } from "react";
import { useAdminUsers, useAdminLogs, exportAllData } from "../../hooks/useAdmin";
import AdminDashboard from "./AdminDashboard";
import UserList from "./UserList";
import UserDetail from "./UserDetail";
import ConnectionLogs from "./ConnectionLogs";

const TABS = [
  { id: "overview", label: "📊 Vue d'ensemble" },
  { id: "users", label: "👥 Utilisateurs" },
  { id: "logs", label: "🔌 Connexions" },
];

export default function AdminPanel({ onClose }) {
  const [tab, setTab] = useState("overview");
  const [selectedUid, setSelectedUid] = useState(null);
  const [exporting, setExporting] = useState(false);

  const { users, loading: usersLoading, toggleDisabled, refetch } = useAdminUsers();
  const { logs, loading: logsLoading } = useAdminLogs(150);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportAllData(users);
    } catch (e) {
      console.error("Erreur export:", e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1 className="admin-title">🛠️ Panel Administrateur</h1>
        <div className="admin-header-actions">
          <button className="admin-export-btn" onClick={handleExport} disabled={exporting || usersLoading}>
            {exporting ? "Export en cours…" : "⬇️ Exporter toutes les données"}
          </button>
          <button className="admin-refresh-btn" onClick={refetch}>🔄 Actualiser</button>
        </div>
      </div>

      <div className="admin-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`admin-tab ${tab === t.id ? "active" : ""}`}
            onClick={() => { setTab(t.id); setSelectedUid(null); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="admin-content">
        {usersLoading && tab !== "logs" ? (
          <p className="loading-text">Chargement des données…</p>
        ) : (
          <>
            {tab === "overview" && <AdminDashboard users={users} logs={logs} />}
            {tab === "users" && !selectedUid && (
              <UserList users={users} onToggleDisabled={toggleDisabled} onSelectUser={setSelectedUid} />
            )}
            {tab === "users" && selectedUid && (
              <UserDetail uid={selectedUid} onBack={() => setSelectedUid(null)} />
            )}
            {tab === "logs" && <ConnectionLogs logs={logs} loading={logsLoading} />}
          </>
        )}
      </div>
    </div>
  );
}