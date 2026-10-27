// server/courses.js
// Accès aux cours / quiz stockés dans /data (partagé par les routes utilisateur et admin).

import { paths, readJSON, writeJSON, listDir, isValidId, removePath, updateJSON } from "./store.js";

export async function getCourse(id) {
  if (!isValidId(id)) return null;
  return readJSON(paths.courseFile(id), null);
}

// Renvoie le cours uniquement s'il appartient au profil demandé
export async function getOwnedCourse(id, profileId) {
  const course = await getCourse(id);
  return course && course.profileId === profileId ? course : null;
}

export async function saveCourse(course) {
  await writeJSON(paths.courseFile(course.id), course);
}

// Modification atomique d'un cours (évite les écrasements en cas de requêtes simultanées)
export function patchCourse(id, patch) {
  return updateJSON(paths.courseFile(id), null, (c) => (c ? { ...c, ...patch } : undefined));
}

export async function listAllCourses() {
  const out = [];
  for (const id of await listDir(paths.coursesRoot())) {
    if (!isValidId(id)) continue;
    const c = await readJSON(paths.courseFile(id), null);
    if (c) out.push(c);
  }
  return out;
}

export async function listCoursesFor(profileId) {
  const all = await listAllCourses();
  return all
    .filter((c) => c.profileId === profileId)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export function publicCourse(c) {
  return {
    id: c.id,
    status: c.status,
    error: c.error || null,
    summary: c.summary || null,
    pageCount: c.pageCount,
    createdAt: c.createdAt,
    quizId: c.quizId || null,
    fromCache: !!c.fromCache,
    imageUrls: Array.from({ length: c.pageCount }, (_, i) => `/api/courses/${c.id}/image/${i}`),
  };
}

export async function getQuiz(id) {
  if (!isValidId(id)) return null;
  return readJSON(paths.quizFile(id), null);
}

export async function saveQuiz(quiz) {
  await writeJSON(paths.quizFile(quiz.id), quiz);
}

// Supprime un cours, ses images et ses quiz. Les résultats (historique) sont conservés,
// ainsi que le cache IA : rescanner le même cours ne coûtera aucun appel.
export async function deleteCourse(course) {
  for (const qid of course.quizIds || []) await removePath(paths.quizFile(qid));
  await removePath(paths.courseDir(course.id));
}
