// src/components/CourseList.jsx
import { useState, useEffect } from "react";
import { collection, getDocs, orderBy, query, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";

const DIFFICULTY_META = {
  facile: { label: "Facile", color: "#10B981" },
  moyen:  { label: "Moyen",  color: "#F59E0B" },
  difficile: { label: "Difficile", color: "#EF4444" },
};

// Statuts considérés comme cliquables (le cours peut être ouvert)
const CLICKABLE_STATUSES = ["ready", "ready_for_quiz", "summarized"];

const STATUS_LABELS = {
  processing: "⏳ Analyse en cours…",
  summarized: "✅ Synthèse prête",
  ready_for_quiz: "⚙️ Quiz à configurer",
  ready: "🎯 Quiz prêt",
};

export default function CourseList({ user, onOpenCourse }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    const fetch = async () => {
      try {
        const q = query(
          collection(db, "users", user.uid, "courses"),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        setCourses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("Erreur chargement cours:", e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [user]);

  const handleDelete = async (e, courseId) => {
    e.stopPropagation();
    if (!confirm("Supprimer ce cours ?")) return;
    await deleteDoc(doc(db, "users", user.uid, "courses", courseId));
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
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
      <div className="course-grid">
        {courses.map((course) => {
          const diff = DIFFICULTY_META[course.summary?.difficulty] || DIFFICULTY_META.moyen;
          const isClickable = CLICKABLE_STATUSES.includes(course.status);
          const needsConfig = course.status === "ready_for_quiz" || course.status === "summarized";

          return (
            <div
              key={course.id}
              className={`course-card ${isClickable ? "clickable" : "processing"}`}
              onClick={() => isClickable && onOpenCourse(course)}
            >
              {course.imageURL && (
                <img src={course.imageURL} alt="" className="course-card-img" />
              )}
              <div className="course-card-body">
                <p className="course-card-title">
                  {course.summary?.title || "Analyse en cours…"}
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
                </div>
                <p className="course-card-date">
                  {course.createdAt?.toDate
                    ? course.createdAt.toDate().toLocaleDateString("fr-FR")
                    : "—"}
                </p>
              </div>

              {isClickable && (
                <button
                  className="course-delete-btn"
                  onClick={(e) => handleDelete(e, course.id)}
                  title="Supprimer"
                >
                  🗑
                </button>
              )}

              {/* Badge de statut */}
              <div className={`course-card-status ${needsConfig ? "status-pending" : ""}`}>
                {STATUS_LABELS[course.status] || "⏳ En cours…"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}