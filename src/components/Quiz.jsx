// src/components/Quiz.jsx
import { useState, useEffect, useRef } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import { XP_REWARDS, getLevelFromXP } from "../hooks/useXP";

// Composant : question QCM
function QCMQuestion({ question, onAnswer, answered }) {
  const [selected, setSelected] = useState(null);

  const handleSelect = (option) => {
    if (answered) return;
    setSelected(option);
    onAnswer(option === question.answer, option);
  };

  const getOptionStyle = (option) => {
    if (!answered) return selected === option ? "option selected" : "option";
    if (option === question.answer) return "option correct";
    if (option === selected && option !== question.answer) return "option wrong";
    return "option";
  };

  return (
    <div className="question-body">
      <p className="question-text">{question.question}</p>
      <div className="options-grid">
        {question.options.map((opt, i) => (
          <button
            key={i}
            className={getOptionStyle(opt)}
            onClick={() => handleSelect(opt)}
            disabled={answered}
          >
            <span className="option-letter">{String.fromCharCode(65 + i)}</span>
            <span>{opt}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Composant : question Vrai/Faux
function VraiFauxQuestion({ question, onAnswer, answered }) {
  const [selected, setSelected] = useState(null);

  const handleSelect = (value) => {
    if (answered) return;
    setSelected(value);
    onAnswer(value === question.answer, value);
  };

  const getBtnStyle = (value) => {
    if (!answered) return selected === value ? "vf-btn selected" : "vf-btn";
    if (value === question.answer) return "vf-btn correct";
    if (value === selected && value !== question.answer) return "vf-btn wrong";
    return "vf-btn";
  };

  return (
    <div className="question-body">
      <p className="question-text">{question.question}</p>
      <div className="vf-row">
        <button className={getBtnStyle(true)} onClick={() => handleSelect(true)} disabled={answered}>
          ✅ Vrai
        </button>
        <button className={getBtnStyle(false)} onClick={() => handleSelect(false)} disabled={answered}>
          ❌ Faux
        </button>
      </div>
    </div>
  );
}

// Composant : texte à trous
function TexteTrousQuestion({ question, onAnswer, answered }) {
  const [input, setInput] = useState("");
  const [showHint, setShowHint] = useState(false);
  const inputRef = useRef();

  const handleSubmit = () => {
    if (answered || !input.trim()) return;
    const isCorrect =
      input.trim().toLowerCase() === question.answer.toLowerCase();
    onAnswer(isCorrect, input.trim());
  };

  // Afficher la phrase avec le trou mis en évidence
  const parts = question.question.split("____");

  return (
    <div className="question-body">
      <p className="question-text trous-text">
        {parts[0]}
        <span className="trous-blank">
          {answered ? (
            <span className={input.toLowerCase() === question.answer.toLowerCase() ? "correct-word" : "wrong-word"}>
              {answered ? question.answer : "____"}
            </span>
          ) : (
            "____"
          )}
        </span>
        {parts[1]}
      </p>
      {!answered && (
        <div className="trous-input-row">
          <input
            ref={inputRef}
            className="trous-input"
            type="text"
            placeholder="Ta réponse…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            autoFocus
          />
          {question.hint && (
            <button className="hint-btn" onClick={() => setShowHint(!showHint)}>
              💡
            </button>
          )}
          <button className="submit-btn" onClick={handleSubmit} disabled={!input.trim()}>
            Valider
          </button>
        </div>
      )}
      {showHint && !answered && (
        <p className="hint-text">Indice : {question.hint}</p>
      )}
    </div>
  );
}

// Badge de type de question
const TYPE_META = {
  qcm: { label: "QCM", color: "#7C3AED", icon: "🎯" },
  vrai_faux: { label: "Vrai / Faux", color: "#F59E0B", icon: "⚡" },
  texte_a_trous: { label: "Texte à trous", color: "#10B981", icon: "✍️" },
};

// Composant résultat final
function QuizResults({ score, maxScore, questions, answers, onRetry, onHome }) {
  const pct = Math.round((score / maxScore) * 100);
  const stars = pct >= 90 ? 3 : pct >= 60 ? 2 : pct >= 30 ? 1 : 0;
  const xpGained = pct === 100 ? XP_REWARDS.QUIZ_COMPLETE + XP_REWARDS.PERFECT_SCORE : XP_REWARDS.QUIZ_COMPLETE;

  return (
    <div className="results-card">
      <div className="results-stars">{"⭐".repeat(stars)}{"🌑".repeat(3 - stars)}</div>
      <h2 className="results-title">
        {pct === 100 ? "Parfait !" : pct >= 60 ? "Bien joué !" : "Continue !"}
      </h2>
      <div className="results-score-circle">
        <span className="results-score-pct">{pct}%</span>
        <span className="results-score-pts">{score} / {maxScore} pts</span>
      </div>
      <div className="results-xp-gained">+{xpGained} XP gagnés 🎉</div>

      <div className="results-breakdown">
        {questions.map((q, i) => (
          <div key={q.id} className={`result-row ${answers[i]?.correct ? "ok" : "ko"}`}>
            <span>{answers[i]?.correct ? "✅" : "❌"}</span>
            <span className="result-q-text">{q.question.replace("____", "___")}</span>
            <span className="result-pts">+{answers[i]?.correct ? q.points : 0}</span>
          </div>
        ))}
      </div>

      <div className="results-actions">
        <button className="btn-retry" onClick={onRetry}>🔄 Refaire</button>
        <button className="btn-home" onClick={onHome}>🏠 Accueil</button>
      </div>
    </div>
  );
}

// Composant principal Quiz
export default function Quiz({ quizId, questions, user, onXPGain, onHome }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [answered, setAnswered] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(null);
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(0);

  const current = questions[currentIdx];
  const meta = TYPE_META[current?.type] || TYPE_META.qcm;

  const handleAnswer = async (isCorrect, value) => {
    setAnswered(true);
    setLastCorrect(isCorrect);
    setShowExplanation(true);

    const pts = isCorrect ? current.points : 0;
    const newScore = score + pts;
    const newAnswers = [...answers, { correct: isCorrect, value, points: pts }];

    setScore(newScore);
    setAnswers(newAnswers);

    // Si c'est la dernière question, sauvegarder
    if (currentIdx === questions.length - 1) {
      const maxScore = questions.reduce((acc, q) => acc + q.points, 0);
      const pct = Math.round((newScore / maxScore) * 100);
      const xpGained = pct === 100
        ? XP_REWARDS.QUIZ_COMPLETE + XP_REWARDS.PERFECT_SCORE
        : XP_REWARDS.QUIZ_COMPLETE;

      try {
        await addDoc(collection(db, "users", user.uid, "results"), {
          quizId,
          score: newScore,
          maxScore,
          percentage: pct,
          answers: newAnswers,
          completedAt: serverTimestamp(),
        });
        onXPGain?.(xpGained, pct === 100);
      } catch (e) {
        console.error("Erreur sauvegarde résultat:", e);
      }
    }
  };

  const handleNext = () => {
    if (currentIdx === questions.length - 1) {
      setFinished(true);
    } else {
      setCurrentIdx((i) => i + 1);
      setAnswered(false);
      setShowExplanation(false);
      setLastCorrect(null);
    }
  };

  const handleRetry = () => {
    setCurrentIdx(0);
    setAnswers([]);
    setAnswered(false);
    setShowExplanation(false);
    setLastCorrect(null);
    setFinished(false);
    setScore(0);
  };

  if (finished) {
    const maxScore = questions.reduce((acc, q) => acc + q.points, 0);
    return (
      <QuizResults
        score={score}
        maxScore={maxScore}
        questions={questions}
        answers={answers}
        onRetry={handleRetry}
        onHome={onHome}
      />
    );
  }

  return (
    <div className="quiz-wrapper">
      {/* Header progression */}
      <div className="quiz-header">
        <div className="quiz-progress-track">
          <div
            className="quiz-progress-fill"
            style={{ width: `${((currentIdx) / questions.length) * 100}%` }}
          />
        </div>
        <span className="quiz-counter">{currentIdx + 1} / {questions.length}</span>
      </div>

      {/* Carte question */}
      <div
        className="question-card"
        style={{ "--type-color": meta.color }}
        key={currentIdx} // force re-mount pour reset state interne
      >
        <div className="question-type-badge">
          <span>{meta.icon}</span>
          <span>{meta.label}</span>
          <span className="question-pts">+{current.points} pts</span>
        </div>

        {current.type === "qcm" && (
          <QCMQuestion question={current} onAnswer={handleAnswer} answered={answered} />
        )}
        {current.type === "vrai_faux" && (
          <VraiFauxQuestion question={current} onAnswer={handleAnswer} answered={answered} />
        )}
        {current.type === "texte_a_trous" && (
          <TexteTrousQuestion question={current} onAnswer={handleAnswer} answered={answered} />
        )}

        {/* Feedback */}
        {showExplanation && (
          <div className={`feedback-box ${lastCorrect ? "feedback-correct" : "feedback-wrong"}`}>
            <p className="feedback-title">
              {lastCorrect ? `✅ +${current.points} pts !` : "❌ Pas tout à fait…"}
            </p>
            <p className="feedback-explanation">{current.explanation}</p>
            <button className="btn-next" onClick={handleNext}>
              {currentIdx === questions.length - 1 ? "Voir les résultats 🏁" : "Question suivante →"}
            </button>
          </div>
        )}
      </div>

      {/* Score courant */}
      <div className="quiz-score-bar">
        Score : <strong>{score} pts</strong>
      </div>
    </div>
  );
}
