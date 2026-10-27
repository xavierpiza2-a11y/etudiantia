// server/stats.js
// Compteurs d'utilisation de l'IA, stockés dans /data/stats.json :
//  - appels réellement envoyés à Anthropic (et tokens consommés)
//  - appels ÉVITÉS grâce au cache (économies)
//  - compteur journalier par profil (garde-fou DAILY_AI_LIMIT)

import { config } from "./config.js";
import { paths, updateJSON, readJSON } from "./store.js";
import { today } from "./profiles.js";

const emptyKind = () => ({ calls: 0, cacheHits: 0, inputTokens: 0, outputTokens: 0 });
const emptyStats = () => ({ totals: { summarize: emptyKind(), quiz: emptyKind() }, daily: {} });

function normalize(stats) {
  const s = stats && typeof stats === "object" ? stats : emptyStats();
  s.totals ||= {};
  s.totals.summarize = { ...emptyKind(), ...(s.totals.summarize || {}) };
  s.totals.quiz = { ...emptyKind(), ...(s.totals.quiz || {}) };
  s.daily ||= {};
  return s;
}

// kind : "summarize" | "quiz"
export function recordAiCall(kind, profileId, usage = {}) {
  return updateJSON(paths.stats(), emptyStats(), (raw) => {
    const s = normalize(raw);
    const t = s.totals[kind];
    t.calls += 1;
    t.inputTokens += usage.input_tokens || 0;
    t.outputTokens += usage.output_tokens || 0;

    const day = today();
    s.daily[day] ||= {};
    s.daily[day][profileId] = (s.daily[day][profileId] || 0) + 1;

    // On ne garde que 30 jours d'historique journalier
    const keep = Object.keys(s.daily).sort().slice(-30);
    for (const d of Object.keys(s.daily)) if (!keep.includes(d)) delete s.daily[d];
    return s;
  });
}

export function recordCacheHit(kind) {
  return updateJSON(paths.stats(), emptyStats(), (raw) => {
    const s = normalize(raw);
    s.totals[kind].cacheHits += 1;
    return s;
  });
}

export async function getStats() {
  return normalize(await readJSON(paths.stats(), emptyStats()));
}

// Vérifie le garde-fou journalier avant un appel IA. Lève une erreur 429 si dépassé.
export async function assertWithinDailyLimit(profileId) {
  if (!config.dailyAiLimit || config.dailyAiLimit <= 0) return;
  const s = await getStats();
  const used = s.daily[today()]?.[profileId] || 0;
  if (used >= config.dailyAiLimit) {
    throw Object.assign(
      new Error(
        `Limite quotidienne atteinte (${config.dailyAiLimit} analyses/quiz par jour). ` +
          `Tu peux continuer à réviser tes cours déjà enregistrés. Réessaie demain !`
      ),
      { status: 429, code: "daily_limit" }
    );
  }
}
