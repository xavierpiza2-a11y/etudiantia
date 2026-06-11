// src/components/Summary.jsx
const DIFFICULTY_META = {
  facile: { label: "Facile", color: "#10B981", icon: "🟢" },
  moyen: { label: "Moyen", color: "#F59E0B", icon: "🟡" },
  difficile: { label: "Difficile", color: "#EF4444", icon: "🔴" },
};

export default function Summary({ summary, imageURL, onStartQuiz }) {
  if (!summary) return null;
  const diff = DIFFICULTY_META[summary.difficulty] || DIFFICULTY_META.moyen;

  return (
    <div className="summary-card">
      <div className="summary-top">
        {imageURL && (
          <img src={imageURL} alt="Cours scanné" className="summary-img" />
        )}
        <div className="summary-meta">
          <h2 className="summary-title">{summary.title}</h2>
          <div className="summary-tags">
            <span className="tag tag-subject">📚 {summary.subject}</span>
            <span className="tag" style={{ borderColor: diff.color, color: diff.color }}>
              {diff.icon} {diff.label}
            </span>
            <span className="tag">⏱ {summary.estimated_read_minutes} min</span>
          </div>
        </div>
      </div>

      <div className="summary-body">
        <h3 className="summary-section-title">Résumé</h3>
        <p className="summary-text">{summary.summary}</p>

        <h3 className="summary-section-title">Points clés</h3>
        <ul className="key-points">
          {summary.key_points?.map((point, i) => (
            <li key={i} className="key-point">
              <span className="key-point-dot" />
              {point}
            </li>
          ))}
        </ul>
      </div>

      <button className="btn-start-quiz" onClick={onStartQuiz}>
        Lancer le quiz 🚀
      </button>
    </div>
  );
}
