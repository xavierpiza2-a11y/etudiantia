// src/components/admin/UserList.jsx
import { useState } from "react";

export default function UserList({ users, onToggleDisabled, onSelectUser }) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("xp");
  const [confirmUid, setConfirmUid] = useState(null);

  const filtered = users
    .filter((u) => u.uid.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "xp") return (b.xp || 0) - (a.xp || 0);
      if (sortBy === "courses") return (b.courseCount || 0) - (a.courseCount || 0);
      if (sortBy === "quizzes") return (b.resultCount || 0) - (a.resultCount || 0);
      return 0;
    });

  const handleToggle = async (uid, disabled) => {
    if (confirmUid !== uid) {
      setConfirmUid(uid);
      return;
    }
    await onToggleDisabled(uid, disabled);
    setConfirmUid(null);
  };

  return (
    <div className="admin-user-list">
      <div className="admin-list-controls">
        <input
          type="text"
          placeholder="Rechercher par UID…"
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
              <th>UID</th>
              <th>XP</th>
              <th>Niveau</th>
              <th>Cours</th>
              <th>Quiz</th>
              <th>Statut</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.uid} className={u.disabled ? "row-disabled" : ""}>
                <td>
                  <button className="admin-uid-link" onClick={() => onSelectUser(u.uid)}>
                    {u.uid.slice(0, 16)}…
                  </button>
                </td>
                <td>{u.xp || 0}</td>
                <td>{u.level || 1}</td>
                <td>{u.courseCount || 0}</td>
                <td>{u.resultCount || 0}</td>
                <td>
                  <span className={`admin-badge ${u.disabled ? "badge-disabled" : "badge-active"}`}>
                    {u.disabled ? "Désactivé" : "Actif"}
                  </span>
                </td>
                <td>
                  <button
                    className={`admin-action-btn ${confirmUid === u.uid ? "confirm" : ""}`}
                    onClick={() => handleToggle(u.uid, u.disabled)}
                  >
                    {confirmUid === u.uid
                      ? "Confirmer ?"
                      : u.disabled ? "Réactiver" : "Désactiver"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="admin-empty">Aucun utilisateur trouvé.</p>}
      </div>
    </div>
  );
}