// src/components/admin/UserDetail.jsx
import { useState, useEffect } from "react";
import { fetchProfileDetail, formatBytes } from "../../hooks/useAdmin";

export default function UserDetail({ id, onBack }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfileDetail(id)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="loading-text">Chargement du profil…</p>;
  if (!detail) return (
    <>
      <button className="admin-back-btn" onClick={onBack}>← Retour à la liste</button>
      <p className="admin-empty">Profil introuvable.</p>
    </>
  );

  const { profile, courses, results } = detail;
  const storage = courses.reduce((acc, c) => acc + (c.storageBytes || 0), 0);

  return (
    <div className="admin-user-detail">
      <button className="admin-back-btn" onClick={onBack}>← Retour à la liste</button>

      <h2 className="admin-section-title">{profile.avatar} {profile.name}</h2>
      <p className="admin-uid-full">{profile.id}</p>

      <div className="admin-detail-grid">
        <div className="admin-detail-card">
          <span className="admin-detail-label">XP</span>
          <span className="admin-detail-value">{profile.xp || 0}</span>
        </div>
        <div className="admin-detail-card">
          <span className="admin-detail-label">Niveau</span>
          <span className="admin-detail-value">{profile.level || 1}</span>
        </div>
        <div className="admin-detail-card">
          <span className="admin-detail-label">Badges</span>
          <span className="admin-detail-value">{profile.badges?.length || 0}</span>
        </div>
        <div className="admin-detail-card">
          <span className="admin-detail-label">Stockage</span>
          <span className="admin-detail-value">{formatBytes(storage)}</span>
        </div>
      </div>

      <h3 className="admin-subsection-title">Cours ({courses.length})</h3>
      <div className="admin-mini-list">
        {courses.map((c) => (
          <div key={c.id} className="admin-mini-item">
            <span>{c.summary?.title || "Sans titre"}</span>
            <span className="admin-mini-meta">
              {c.pageCount} page(s) · {formatBytes(c.storageBytes)} · {c.status}{c.fromCache ? " · 💾" : ""}
            </span>
          </div>
        ))}
        {courses.length === 0 && <p className="admin-empty">Aucun cours.</p>}
      </div>

      <h3 className="admin-subsection-title">Derniers résultats ({results.length})</h3>
      <div className="admin-mini-list">
        {results.map((r) => (
          <div key={r.id} className="admin-mini-item">
            <span>{r.score}/{r.maxScore} pts</span>
            <span className="admin-mini-meta">
              {r.percentage}% · {r.completedAt ? new Date(r.completedAt).toLocaleDateString("fr-FR") : "—"}
            </span>
          </div>
        ))}
        {results.length === 0 && <p className="admin-empty">Aucun résultat.</p>}
      </div>
    </div>
  );
}
