// src/components/admin/AdminPanel.jsx
import { useState } from "react";
import { api } from "../../lib/api";
import { useAdminOverview, useAdminLogs, exportAllData } from "../../hooks/useAdmin";
import AdminDashboard from "./AdminDashboard";
import UserList from "./UserList";
import UserDetail from "./UserDetail";
import ConnectionLogs from "./ConnectionLogs";

const TABS = [
  { id: "overview", label: "📊 Vue d'ensemble" },
  { id: "users", label: "👥 Profils" },
  { id: "logs", label: "🔌 Connexions" },
];

// Saisie du PIN administrateur (ADMIN_PIN du fichier .env)
function PinGate({ onSuccess }) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!pin.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      await api.post("/admin/login", { pin: pin.trim() });
      onSuccess();
    } catch (err) {
      setError(err.message);
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="admin-pin-card" onSubmit={submit}>
      <div className="login-logo">🛠️</div>
      <h2 className="admin-title">Espace administrateur</h2>
      <p className="login-subtitle">Entre le PIN administrateur.</p>
      <input
        className="key-input pin-input"
        type="password"
        inputMode="numeric"
        autoComplete="off"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        placeholder="PIN"
        autoFocus
        aria-label="PIN administrateur"
      />
      {error && <p className="login-error" role="alert">{error}</p>}
      <button className="btn-login" type="submit" disabled={loading || !pin.trim()}>
        {loading ? "Vérification…" : "Déverrouiller"}
      </button>
    </form>
  );
}

function AdminContent({ onLock }) {
  const [tab, setTab] = useState("overview");
  const [selectedId, setSelectedId] = useState(null);
  const { data, loading, error, refetch, toggleDisabled, deleteProfile } = useAdminOverview();
  const { logs, loading: logsLoading } = useAdminLogs(150);

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1 className="admin-title">🛠️ Panel Administrateur</h1>
        <div className="admin-header-actions">
          <button className="admin-export-btn" onClick={exportAllData}>
            ⬇️ Exporter les données
          </button>
          <button className="admin-refresh-btn" onClick={refetch}>🔄 Actualiser</button>
          <button className="admin-refresh-btn" onClick={onLock}>🔒 Quitter</button>
        </div>
      </div>

      <div className="admin-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`admin-tab ${tab === t.id ? "active" : ""}`}
            onClick={() => { setTab(t.id); setSelectedId(null); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="upload-error" role="alert">{error}</p>}

      <div className="admin-content">
        {loading && tab !== "logs" && !data ? (
          <p className="loading-text">Chargement des données…</p>
        ) : (
          <>
            {tab === "overview" && data && <AdminDashboard data={data} logs={logs} />}
            {tab === "users" && data && !selectedId && (
              <UserList
                profiles={data.profiles}
                onToggleDisabled={toggleDisabled}
                onDelete={deleteProfile}
                onSelect={setSelectedId}
              />
            )}
            {tab === "users" && selectedId && (
              <UserDetail id={selectedId} onBack={() => setSelectedId(null)} />
            )}
            {tab === "logs" && <ConnectionLogs logs={logs} loading={logsLoading} />}
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminPanel({ isAdmin, onSessionChange }) {
  const lock = async () => {
    try {
      await api.post("/admin/logout");
    } catch {
      /* ignore */
    }
    onSessionChange();
  };

  if (!isAdmin) return <PinGate onSuccess={onSessionChange} />;
  return <AdminContent onLock={lock} />;
}
