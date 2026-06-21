// src/components/Summary.jsx
import { useState, useEffect, useRef } from "react";

const DIFFICULTY_META = {
  facile:    { label: "Facile",    color: "#10B981" },
  moyen:     { label: "Moyen",     color: "#F59E0B" },
  difficile: { label: "Difficile", color: "#EF4444" },
};

const MIN_QUESTIONS = 3;
const MAX_QUESTIONS = 20;

function Counter({ label, icon, value, onChange, max }) {
  return (
    <div className="counter-row">
      <span className="counter-icon">{icon}</span>
      <span className="counter-label">{label}</span>
      <div className="counter-controls">
        <button
          className="counter-btn"
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={value <= 0}
          aria-label={`Diminuer ${label}`}
        >−</button>
        <span className="counter-value">{value}</span>
        <button
          className="counter-btn"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`Augmenter ${label}`}
        >+</button>
      </div>
    </div>
  );
}

// Barre de progression simulée pendant la génération du quiz
// (l'API ne donne pas de progression réelle, on simule une avancée crédible)
function QuizGeneratingProgress({ total }) {
  const [progress, setProgress] = useState(5);
  const intervalRef = useRef();

  useEffect(() => {
    // Progression non-linéaire : rapide au début, ralentit vers 90%
    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 92) return p;
        const remaining = 92 - p;
        const step = Math.max(0.5, remaining * 0.08);
        return Math.min(92, p + step);
      });
    }, 200);
    return () => clearInterval(intervalRef.current);
  }, []);

  return (
    <div className="quiz-generating">
      <div className="quiz-generating-icon">🧠</div>
      <p className="quiz-generating-title">Claude génère ton quiz…</p>
      <p className="quiz-generating-sub">{total} questions en préparation</p>
      <div className="progress-bar-track generating-track">
        <div
          className="progress-bar-fill"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <p className="progress-pct">{Math.round(progress)}%</p>
    </div>
  );
}

export default function Summary({ summary, imageURL, onStartQuiz, generating }) {
  const [showConfig, setShowConfig] = useState(false);
  const [qcm, setQcm] = useState(4);
  const [vraiFaux, setVraiFaux] = useState(3);
  const [texteTrous, setTexteTrous] = useState(3);

  if (!summary) return null;

  const diff = DIFFICULTY_META[summary.difficulty] || DIFFICULTY_META.moyen;
  const total = qcm + vraiFaux + texteTrous;
  const isValid = total >= MIN_QUESTIONS && total <= MAX_QUESTIONS;

  const getStatusColor = () => {
    if (total === 0) return "var(--text-muted)";
    if (!isValid) return "var(--red)";
    return "var(--green)";
  };

  const getStatusLabel = () => {
    if (total === 0) return "Ajoute au moins 3 questions";
    if (total < MIN_QUESTIONS) return `Minimum ${MIN_QUESTIONS} questions`;
    if (total > MAX_QUESTIONS) return `Maximum ${MAX_QUESTIONS} questions`;
    return `${total} questions ✅`;
  };

  const handleGenerate = () => {
    if (!isValid || generating) return;
    onStartQuiz({ qcm, vrai_faux: vraiFaux, texte_a_trous: texteTrous, total });
  };

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
              {diff.label}
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

      {generating ? (
        <QuizGeneratingProgress total={total} />
      ) : !showConfig ? (
        <button className="btn-start-quiz" onClick={() => setShowConfig(true)}>
          Configurer le quiz ⚙️
        </button>
      ) : (
        <div className="quiz-config">
          <h3 className="config-title">⚙️ Configurer le quiz</h3>

          <div className="counters-list">
            <Counter label="QCM" icon="🎯" value={qcm} onChange={setQcm} max={MAX_QUESTIONS} />
            <Counter label="Vrai / Faux" icon="⚡" value={vraiFaux} onChange={setVraiFaux} max={MAX_QUESTIONS} />
            <Counter label="Texte à trous" icon="✍️" value={texteTrous} onChange={setTexteTrous} max={MAX_QUESTIONS} />
          </div>

          <div className="config-total" style={{ color: getStatusColor() }}>
            {getStatusLabel()}
          </div>

          <div className="config-actions">
            <button className="btn-config-cancel" onClick={() => setShowConfig(false)}>
              ← Retour
            </button>
            <button className="btn-generate-quiz" onClick={handleGenerate} disabled={!isValid}>
              Générer le quiz 🚀
            </button>
          </div>
        </div>
      )}
    </div>
  );
}