// shared/gamification.js
// Source unique de vérité pour l'XP, les niveaux et les badges.
// Importé par le serveur (server/*.js) ET par l'interface (src/hooks/useXP.js).

export const XP_REWARDS = {
  COURSE_UPLOAD: 20,
  QUIZ_COMPLETE: 50,
  PERFECT_SCORE: 100,
  DAILY_STREAK: 30,
};

export const LEVELS = [
  { level: 1, name: "Débutant", minXP: 0, icon: "🌱" },
  { level: 2, name: "Apprenti", minXP: 100, icon: "📚" },
  { level: 3, name: "Étudiant", minXP: 300, icon: "🎓" },
  { level: 4, name: "Savant", minXP: 600, icon: "🔬" },
  { level: 5, name: "Expert", minXP: 1000, icon: "⭐" },
  { level: 6, name: "Maître", minXP: 1500, icon: "🏆" },
  { level: 7, name: "Légende", minXP: 2500, icon: "👑" },
];

export const BADGES = [
  { id: "first_course", name: "Premier cours", icon: "📸", desc: "Scanner ton premier cours" },
  { id: "first_quiz", name: "Premier quiz", icon: "✏️", desc: "Compléter ton premier quiz" },
  { id: "perfect_10", name: "Sans faute", icon: "💯", desc: "Score parfait à un quiz" },
  { id: "streak_3", name: "Sur ta lancée", icon: "🔥", desc: "3 jours de suite" },
  { id: "streak_7", name: "Habitué", icon: "🌟", desc: "7 jours de suite" },
  { id: "quiz_10", name: "Assidu", icon: "📊", desc: "Compléter 10 quiz" },
  { id: "quiz_50", name: "Passionné", icon: "🚀", desc: "Compléter 50 quiz" },
];

export function getLevelFromXP(xp) {
  let currentLevel = LEVELS[0];
  for (const level of LEVELS) {
    if (xp >= level.minXP) currentLevel = level;
    else break;
  }
  const nextLevel = LEVELS.find((l) => l.level === currentLevel.level + 1);
  const progress = nextLevel
    ? ((xp - currentLevel.minXP) / (nextLevel.minXP - currentLevel.minXP)) * 100
    : 100;
  return { current: currentLevel, next: nextLevel, progress: Math.min(progress, 100) };
}

// Comparaison des réponses « texte à trous » : insensible à la casse,
// aux accents et aux espaces multiples. Utilisée côté client (feedback
// immédiat) ET côté serveur (calcul officiel du score).
export function normalizeAnswer(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function isAnswerCorrect(question, value) {
  if (!question) return false;
  if (question.type === "texte_a_trous") {
    return normalizeAnswer(value) === normalizeAnswer(question.answer);
  }
  return value === question.answer;
}

// Constantes partagées pour la configuration des quiz
export const QUIZ_MIN_QUESTIONS = 3;
export const QUIZ_MAX_QUESTIONS = 20;
