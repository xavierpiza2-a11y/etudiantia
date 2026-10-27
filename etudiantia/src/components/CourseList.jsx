// src/components/CourseList.jsx
import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";

const DIFFICULTY_META = {
  facile: { label: "Facile", color: "#10B981" },
  moyen:  { label: "Moyen",  color: "#F59E0B" },
  difficile: { label: "Difficile", color: "#EF4444" },
};

// Statuts considérés comme cliquables (le cours peut être ouvert)
const CLICKABLE_STATUSES = ["ready", "ready_for_quiz"];

const STATUS_LABELS = {
  processing: "⏳ Analyse en cours…",
  ready_for_quiz: "⚙️ Quiz à configurer",
  ready: "🎯 Quiz prêt",
  error: "⚠️ Analyse échouée",
};

// Une analyse « en cours » depuis plus de 3 minutes a probablement été interrompue
const STALE_MS = 3 * 60 * 1000;

export default function CourseList({ onOpenCourse }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const { courses } = await api.get("/courses");
      setCourses(courses);
    } catch (e) {
      console.error("Erreur chargement cours:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (e, courseId) => {
    e.stopPropagation();
    if (!confirm("Supprimer ce cours, ses images et ses quiz ?")) return;
    try {
      await api.del(`/courses/${courseId}`);
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
    } catch (err) {
      setError(err.message);
    }
  };

  // Relance l'analyse d'un cours dont les images sont déjà enregistrées
  const handleRetry = async (e, courseId) => {
    e.stopPropagation();
    setRetryingId(courseId);
    setError(null);
    try {
      await api.post(`/courses/${courseId}/summarize`);
    } catch (err) {
      setError(err.message);
    } finally {
      setRetryingId(null);
      load();
    }
  };

  if (loading) return <p className="loading-text">Chargement des cours…</p>;

  if (!courses.length) return (
    <div className="empty-courses">
      <div className="empty-courses-icon">📚</div>
      <p className="empty-courses-title">Aucun cours scanné pour l'instant</p>
      <p className="empty-courses-sub">Prends en photo ton premier cours !</p>
    </div>
  );

  return (
    <div className="course-list">
      <h2 className="course-list-title">Mes cours <span className="course-count">{courses.length}</span></h2>
      {error && <p className="upload-error" role="alert">{error}</p>}
      <div className="course-grid">
        {courses.map((course) => {
          const diff = DIFFICULTY_META[course.summary?.difficulty] || DIFFICULTY_META.moyen;
          const isClickable = CLICKABLE_STATUSES.includes(course.status);
          const needsConfig = course.status === "ready_for_quiz";
          const stale =
            course.status === "processing" && Date.now() - new Date(course.createdAt).getTime() > STALE_MS;
          const canRetry = course.status === "error" || stale;

          return (
            <div
              key={course.id}
              className={`course-card ${isClickable ? "clickable" : "processing"}`}
              onClick={() => isClickable && onOpenCourse(course)}
            >
              {course.imageUrls?.[0] && (
                <img src={course.imageUrls[0]} alt="" className="course-card-img" loading="lazy" />
              )}
              <div className="course-card-body">
                <p className="course-card-title">
                  {course.summary?.title || (canRetry ? "Cours non analysé" : "Analyse en cours…")}
                </p>
                <div className="course-card-tags">
                  {course.summary?.subject && (
                    <span className="tag tag-subject">📚 {course.summary.subject}</span>
                  )}
                  {course.summary?.difficulty && (
                    <span className="tag" style={{ borderColor: diff.color, color: diff.color }}>
                      {diff.label}
                    </span>
                  )}
                  {course.summary?.estimated_read_minutes && (
                    <span className="tag">⏱ {course.summary.estimated_read_minutes} min</span>
                  )}
                  {course.pageCount > 1 && <span className="tag">📄 {course.pageCount} p.</span>}
                </div>
                <p className="course-card-date">
                  {course.createdAt ? new Date(course.createdAt).toLocaleDateString("fr-FR") : "—"}
                </p>
                {canRetry && (
                  <button
                    className="btn-retry-analysis"
                    onClick={(e) => handleRetry(e, course.id)}
                    disabled={retryingId === course.id}
                  >
                    {retryingId === course.id ? "Analyse…" : "🔄 Relancer l'analyse"}
                  </button>
                )}
              </div>

              <button
                className="course-delete-btn"
                onClick={(e) => handleDelete(e, course.id)}
                title="Supprimer"
                aria-label="Supprimer ce cours"
              >
                🗑
              </button>

              <div className={`course-card-status ${needsConfig || canRetry ? "status-pending" : ""}`}>
                {STATUS_LABELS[course.status] || "⏳ En cours…"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
