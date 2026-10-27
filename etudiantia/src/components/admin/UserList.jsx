// src/components/admin/UserList.jsx
import { useState } from "react";
import { formatBytes } from "../../hooks/useAdmin";

export default function UserList({ profiles, onToggleDisabled, onDelete, onSelect }) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("xp");
  const [confirm, setConfirm] = useState(null); // { id, action }

  const filtered = profiles
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "xp") return (b.xp || 0) - (a.xp || 0);
      if (sortBy === "courses") return (b.courseCount || 0) - (a.courseCount || 0);
      if (sortBy === "quizzes") return (b.resultCount || 0) - (a.resultCount || 0);
      return 0;
    });

  const run = async (profile, action) => {
    if (confirm?.id !== profile.id || confirm?.action !== action) {
      setConfirm({ id: profile.id, action });
      return;
    }
    if (action === "toggle") await onToggleDisabled(profile.id, profile.disabled);
    if (action === "delete") await onDelete(profile.id);
    setConfirm(null);
  };

  const isConfirming = (id, action) => confirm?.id === id && confirm?.action === action;

  return (
    <div className="admin-user-list">
      <div className="admin-list-controls">
        <input
          type="text"
          placeholder="Rechercher un profil…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="admin-search"
        />
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="admin-sort">
          <option value="xp">Trier par XP</option>
          <option value="courses">Trier par cours</option>
          <option value="quizzes">Trier par quiz complétés</option>
        </select>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Profil</th>
              <th>XP</th>
              <th>Niv.</th>
              <th>Cours</th>
              <th>Quiz</th>
              <th>Stockage</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className={p.disabled ? "row-disabled" : ""}>
                <td>
                  <button className="admin-uid-link" onClick={() => onSelect(p.id)}>
                    {p.avatar} {p.name}
                  </button>
                </td>
                <td>{p.xp || 0}</td>
                <td>{p.level || 1}</td>
                <td>{p.courseCount || 0}</td>
                <td>{p.resultCount || 0}</td>
                <td>{formatBytes(p.storageBytes)}</td>
                <td>
                  <span className={`admin-badge ${p.disabled ? "badge-disabled" : "badge-active"}`}>
                    {p.disabled ? "Désactivé" : "Actif"}
                  </span>
                </td>
                <td className="admin-actions-cell">
                  <button
                    className={`admin-action-btn ${isConfirming(p.id, "toggle") ? "confirm" : ""}`}
                    onClick={() => run(p, "toggle")}
                  >
                    {isConfirming(p.id, "toggle") ? "Confirmer ?" : p.disabled ? "Réactiver" : "Désactiver"}
                  </button>
                  <button
                    className={`admin-action-btn danger ${isConfirming(p.id, "delete") ? "confirm" : ""}`}
                    onClick={() => run(p, "delete")}
                    title="Supprime le profil, ses cours, images, quiz et résultats"
                  >
                    {isConfirming(p.id, "delete") ? "Supprimer définitivement ?" : "🗑"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="admin-empty">Aucun profil trouvé.</p>}
      </div>
    </div>
  );
}
