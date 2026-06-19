// src/hooks/useAdmin.js
import { useState, useEffect, useCallback } from "react";
import {
  collection, getDocs, doc, getDoc, updateDoc,
  query, orderBy, limit as fbLimit, collectionGroup,
} from "firebase/firestore";
import { db } from "../firebase/config";

export const ADMIN_EMAIL = "xavier.piza2@gmail.com";

export function isAdminUser(user) {
  return user?.email === ADMIN_EMAIL;
}

export function useAdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Récupère tous les profils via collectionGroup
      const profilesSnap = await getDocs(collectionGroup(db, "profile"));
      const usersData = [];

      for (const profileDoc of profilesSnap.docs) {
        const uid = profileDoc.ref.parent.parent.id;
        const profile = profileDoc.data();

        // Compter cours et quiz pour cet utilisateur
        const coursesSnap = await getDocs(collection(db, "users", uid, "courses"));
        const quizzesSnap = await getDocs(collection(db, "users", uid, "quizzes"));
        const resultsSnap = await getDocs(collection(db, "users", uid, "results"));

        usersData.push({
          uid,
          ...profile,
          courseCount: coursesSnap.size,
          quizCount: quizzesSnap.size,
          resultCount: resultsSnap.size,
        });
      }

      setUsers(usersData);
    } catch (e) {
      console.error("Erreur chargement utilisateurs:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const toggleDisabled = useCallback(async (uid, currentlyDisabled) => {
    try {
      await updateDoc(doc(db, "users", uid, "profile", "main"), {
        disabled: !currentlyDisabled,
      });
      setUsers((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, disabled: !currentlyDisabled } : u))
      );
      return true;
    } catch (e) {
      console.error("Erreur toggle disabled:", e);
      return false;
    }
  }, []);

  return { users, loading, error, refetch: fetchUsers, toggleDisabled };
}

export function useAdminLogs(limitCount = 100) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const q = query(
          collection(db, "connectionLogs"),
          orderBy("timestamp", "desc"),
          fbLimit(limitCount)
        );
        const snap = await getDocs(q);
        setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("Erreur chargement logs:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [limitCount]);

  return { logs, loading };
}

export async function fetchUserDetail(uid) {
  const [profileSnap, coursesSnap, quizzesSnap, resultsSnap] = await Promise.all([
    getDoc(doc(db, "users", uid, "profile", "main")),
    getDocs(collection(db, "users", uid, "courses")),
    getDocs(collection(db, "users", uid, "quizzes")),
    getDocs(collection(db, "users", uid, "results")),
  ]);

  return {
    profile: profileSnap.exists() ? profileSnap.data() : null,
    courses: coursesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    quizzes: quizzesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    results: resultsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
  };
}

export async function exportAllData(users) {
  const fullExport = [];
  for (const u of users) {
    const detail = await fetchUserDetail(u.uid);
    fullExport.push({ uid: u.uid, ...detail });
  }
  const blob = new Blob([JSON.stringify(fullExport, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `studyai_export_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}