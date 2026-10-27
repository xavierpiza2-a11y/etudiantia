// server/anthropic.js
// Appels à l'API Anthropic (anciennement fait par le Worker Cloudflare).
// La clé API ne quitte jamais le serveur : elle vient du .env.

import { config } from "./config.js";

// ANTHROPIC_API_URL : surcharge réservée aux tests (serveur factice) — ne pas définir en production
const API_URL = process.env.ANTHROPIC_API_URL || "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

export class AiError extends Error {
  constructor(message, { status = 502, code = "ai_error" } = {}) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function buildSummarizePrompt() {
  return `Tu es un assistant pédagogique expert. Analyse ces images de cours (il peut y en avoir plusieurs pages) et produis une synthèse consolidée en JSON strict (sans markdown, sans backticks).
Format attendu :
{
  "title": "Titre du cours détecté",
  "subject": "Matière (Maths, Histoire, etc.)",
  "summary": "Résumé clair en 3-5 phrases couvrant l'ensemble des pages",
  "key_points": ["point 1", "point 2", "point 3"],
  "difficulty": "facile|moyen|difficile",
  "estimated_read_minutes": 5
}`;
}

export function buildQuizPrompt(config) {
  const { total, qcm, vrai_faux, texte_a_trous } = config;

  const typeInstructions = [];
  if (qcm > 0) typeInstructions.push(`${qcm} questions de type "qcm" (4 choix possibles, une seule bonne réponse)`);
  if (vrai_faux > 0) typeInstructions.push(`${vrai_faux} questions de type "vrai_faux"`);
  if (texte_a_trous > 0) typeInstructions.push(`${texte_a_trous} questions de type "texte_a_trous" (utilise ____ pour le trou)`);

  return `Tu es un créateur de quiz pédagogique. À partir de la synthèse fournie, génère exactement ${total} questions en JSON strict (sans markdown, sans backticks).

Répartition obligatoire :
${typeInstructions.join("\n")}

Format attendu :
{
  "questions": [
    {
      "id": "q1",
      "type": "qcm",
      "question": "Question ici ?",
      "options": ["A", "B", "C", "D"],
      "answer": "A",
      "explanation": "Explication courte",
      "points": 10,
      "difficulty": "facile"
    },
    {
      "id": "q2",
      "type": "vrai_faux",
      "question": "Affirmation à évaluer.",
      "answer": true,
      "explanation": "Explication courte",
      "points": 5,
      "difficulty": "facile"
    },
    {
      "id": "q3",
      "type": "texte_a_trous",
      "question": "La ____ est la capitale de la France.",
      "answer": "Paris",
      "hint": "Ville lumière",
      "explanation": "Explication courte",
      "points": 15,
      "difficulty": "moyen"
    }
  ]
}
Varie les difficultés. Respecte exactement la répartition demandée.
Pour les QCM, la valeur de "answer" doit être EXACTEMENT l'une des chaînes de "options".`;
}

// Extrait un objet JSON d'une réponse, même entourée de ```json ou de texte
export function extractJSON(text) {
  const cleaned = String(text).replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("Réponse IA illisible");
  }
}

async function callAnthropic({ model, messages, maxTokens = 4000 }) {
  if (!config.anthropicApiKey) {
    throw new AiError(
      "La clé API Anthropic n'est pas configurée sur le serveur (ANTHROPIC_API_KEY dans .env).",
      { status: 503, code: "no_api_key" }
    );
  }

  const body = JSON.stringify({ model, max_tokens: maxTokens, messages });
  let lastError;

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 1500 * attempt));
    let response;
    try {
      response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.anthropicApiKey,
          "anthropic-version": API_VERSION,
        },
        body,
        signal: AbortSignal.timeout(120_000),
      });
    } catch (e) {
      lastError = new AiError(
        "Impossible de joindre l'API Anthropic (réseau ou délai dépassé). Vérifie la connexion Internet de la VM.",
        { status: 504, code: "network" }
      );
      continue;
    }

    const raw = await response.text();

    if (response.ok) {
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new AiError("Réponse invalide de l'API Anthropic.");
      }
      const text = (data.content || [])
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("");
      return { text, usage: data.usage || {}, model: data.model || model };
    }

    // Erreurs temporaires : on réessaie
    if ([429, 500, 502, 503, 529].includes(response.status)) {
      lastError = new AiError("L'API Anthropic est momentanément surchargée. Réessaie dans un instant.", {
        status: 503,
        code: "overloaded",
      });
      continue;
    }

    // Erreurs définitives : message clair
    let detail = "";
    try {
      detail = JSON.parse(raw)?.error?.message || "";
    } catch {
      /* ignore */
    }
    console.error(`[anthropic] HTTP ${response.status} : ${detail || raw.slice(0, 300)}`);
    if (response.status === 401) {
      throw new AiError("Clé API Anthropic refusée (401). Vérifie ANTHROPIC_API_KEY dans .env.", {
        status: 502,
        code: "bad_api_key",
      });
    }
    if (response.status === 404) {
      throw new AiError(`Modèle introuvable (« ${model} »). Vérifie ANTHROPIC_MODEL dans .env.`, {
        status: 502,
        code: "bad_model",
      });
    }
    if (response.status === 400 && /credit|balance/i.test(detail)) {
      throw new AiError("Crédit Anthropic insuffisant. Recharge ton compte sur console.anthropic.com.", {
        status: 502,
        code: "no_credit",
      });
    }
    throw new AiError(`Erreur de l'API Anthropic (${response.status}).`, { status: 502 });
  }

  throw lastError || new AiError("Échec de l'appel à l'API Anthropic.");
}

// ── Analyse d'un cours à partir des images (buffers JPEG) ────────────────
export async function summarizeImages(buffers) {
  const content = buffers.map((buf) => ({
    type: "image",
    source: { type: "base64", media_type: "image/jpeg", data: buf.toString("base64") },
  }));
  content.push({ type: "text", text: buildSummarizePrompt() });

  const { text, usage } = await callAnthropic({
    model: config.model,
    messages: [{ role: "user", content }],
  });

  let summary;
  try {
    summary = extractJSON(text);
  } catch {
    throw new AiError("L'IA n'a pas renvoyé une synthèse exploitable. Réessaie.", { code: "bad_output" });
  }
  if (!summary || typeof summary !== "object" || !summary.title) {
    throw new AiError("Synthèse incomplète renvoyée par l'IA. Réessaie.", { code: "bad_output" });
  }
  return { summary: sanitizeSummary(summary), usage };
}

function sanitizeSummary(s) {
  return {
    title: String(s.title || "Cours sans titre").slice(0, 200),
    subject: String(s.subject || "Divers").slice(0, 80),
    summary: String(s.summary || "").slice(0, 3000),
    key_points: Array.isArray(s.key_points) ? s.key_points.map((p) => String(p).slice(0, 400)).slice(0, 15) : [],
    difficulty: ["facile", "moyen", "difficile"].includes(s.difficulty) ? s.difficulty : "moyen",
    estimated_read_minutes: Number.isFinite(Number(s.estimated_read_minutes))
      ? Math.max(1, Math.min(120, Math.round(Number(s.estimated_read_minutes))))
      : 5,
  };
}

// ── Génération d'un quiz à partir de la synthèse ─────────────────────────
export async function generateQuiz(summary, quizConfig) {
  const { text, usage } = await callAnthropic({
    model: config.modelQuiz,
    messages: [
      {
        role: "user",
        content: `Voici la synthèse du cours :\n${JSON.stringify(summary)}\n\n${buildQuizPrompt(quizConfig)}`,
      },
    ],
  });

  let parsed;
  try {
    parsed = extractJSON(text);
  } catch {
    throw new AiError("L'IA n'a pas renvoyé un quiz exploitable. Réessaie.", { code: "bad_output" });
  }
  const questions = sanitizeQuestions(parsed?.questions);
  if (questions.length < 1) {
    throw new AiError("Quiz vide renvoyé par l'IA. Réessaie.", { code: "bad_output" });
  }
  return { questions, usage };
}

// Valide chaque question : un quiz mal formé ferait planter l'interface
function sanitizeQuestions(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const q of list) {
    if (!q || typeof q.question !== "string") continue;
    const base = {
      id: `q${out.length + 1}`,
      type: q.type,
      question: q.question.slice(0, 600),
      explanation: String(q.explanation || "").slice(0, 600),
      points: Number.isFinite(Number(q.points)) && Number(q.points) > 0 ? Math.round(Number(q.points)) : 10,
      difficulty: ["facile", "moyen", "difficile"].includes(q.difficulty) ? q.difficulty : "moyen",
    };
    if (q.type === "qcm") {
      if (!Array.isArray(q.options) || q.options.length < 2) continue;
      const options = q.options.map((o) => String(o).slice(0, 300));
      const answer = String(q.answer);
      if (!options.includes(answer)) continue;
      out.push({ ...base, options, answer });
    } else if (q.type === "vrai_faux") {
      const answer = q.answer === true || q.answer === "true" ? true : q.answer === false || q.answer === "false" ? false : null;
      if (answer === null) continue;
      out.push({ ...base, answer });
    } else if (q.type === "texte_a_trous") {
      if (typeof q.answer !== "string" || !q.question.includes("____")) continue;
      out.push({ ...base, answer: q.answer.slice(0, 200), hint: q.hint ? String(q.hint).slice(0, 200) : undefined });
    }
  }
  return out;
}
