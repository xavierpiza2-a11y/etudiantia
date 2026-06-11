// src/hooks/useXP.js
import { useState, useEffect, useCallback } from "react";
import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "../firebase/config";

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

export function useXP(uid) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const profileRef = uid ? doc(db, "users", uid, "profile", "main") : null;

  useEffect(() => {
    if (!uid) return;
    const init = async () => {
      const snap = await getDoc(profileRef);
      if (!snap.exists()) {
        const defaultProfile = {
          xp: 0,
          level: 1,
          badges: [],
          streak: 0,
          lastActiveDate: null,
          totalQuizzes: 0,
        };
        await setDoc(profileRef, defaultProfile);
        setProfile(defaultProfile);
      } else {
        setProfile(snap.data());
      }
      setLoading(false);
    };
    init();
  }, [uid]);

  const addXP = useCallback(
    async (amount, reason) => {
      if (!uid || !profileRef) return null;
      await updateDoc(profileRef, { xp: increment(amount) });
      const snap = await getDoc(profileRef);
      const updated = snap.data();
      setProfile(updated);

      const levelInfo = getLevelFromXP(updated.xp);
      return { newXP: updated.xp, levelInfo, gained: amount, reason };
    },
    [uid]
  );

  const awardBadge = useCallback(
    async (badgeId) => {
      if (!uid || !profileRef || !profile) return false;
      if (profile.badges?.includes(badgeId)) return false;
      const newBadges = [...(profile.badges || []), badgeId];
      await updateDoc(profileRef, { badges: newBadges });
      setProfile((p) => ({ ...p, badges: newBadges }));
      return true;
    },
    [uid, profile]
  );

  const incrementQuizCount = useCallback(async () => {
    if (!uid || !profileRef) return;
    await updateDoc(profileRef, { totalQuizzes: increment(1) });
    setProfile((p) => ({ ...p, totalQuizzes: (p?.totalQuizzes || 0) + 1 }));
  }, [uid]);

  return { profile, loading, addXP, awardBadge, incrementQuizCount };
}
