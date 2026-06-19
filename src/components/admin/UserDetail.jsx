// src/components/admin/UserDetail.jsx
import { useState, useEffect } from "react";
import { fetchUserDetail } from "../../hooks/useAdmin";

export default function UserDetail({ uid, onBack }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserDetail(uid).then((d) => {
      setDetail(d);
      setLoading(false);
    });
  }, [uid]);

  if (loading) return <p className="loading-text">Chargement du profil…</p>;
  if (!detail) return <p className="admin-empty">Utilisateur introuvable.</p>;

  const { profile, courses, quizzes, results } = detail;

  // Estimation du stockage (images compressées ~150-300KB en moyenne)
  const estimatedStorageKB = courses.reduce(
    (acc, c) => acc + (c.pageCount || 1) * 200, 0
  );

  return (
    <div className="admin-user-detail">
      <button className="admin-back-btn" onClick={onBack}>← Retour à la liste</button>

      <h2 className="admin-section-title">Détail utilisateur</h2>
      <p className="admin-uid-full">{uid}</p>

      <div className="admin-detail-grid">
        <div className="admin-detail-card">
          <span className="admin-detail-label">XP</span>
          <span className="admin-detail-value">{profile?.xp || 0}</span>
        </div>
        <div className="admin-detail-card">
          <span className="admin-detail-label">Niveau</span>
          <span className="admin-detail-value">{profile?.level || 1}</span>
        </div>
        <div className="admin-detail-card">
          <span className="admin-detail-label">Badges</span>
          <span className="admin-detail-value">{profile?.badges?.length || 0}</span>
        </div>
        <div className="admin-detail-card">
          <span className="admin-detail-label">Stockage estimé</span>
          <span className="admin-detail-value">{(estimatedStorageKB / 1024).toFixed(1)} MB</span>
        </div>
      </div>

      <h3 className="admin-subsection-title">Cours ({courses.length})</h3>
      <div className="admin-mini-list">
        {courses.map((c) => (
          <div key={c.id} className="admin-mini-item">
            <span>{c.summary?.title || "Sans titre"}</span>
            <span className="admin-mini-meta">{c.pageCount || 1} page(s) · {c.status}</span>
          </div>
        ))}
        {courses.length === 0 && <p className="admin-empty">Aucun cours.</p>}
      </div>

      <h3 className="admin-subsection-title">Résultats de quiz ({results.length})</h3>
      <div className="admin-mini-list">
        {results.map((r) => (
          <div key={r.id} className="admin-mini-item">
            <span>{r.score}/{r.maxScore} pts</span>
            <span className="admin-mini-meta">{r.percentage}%</span>
          </div>
        ))}
        {results.length === 0 && <p className="admin-empty">Aucun résultat.</p>}
      </div>
    </div>
  );
}