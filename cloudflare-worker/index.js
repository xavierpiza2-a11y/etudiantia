/**
 * Cloudflare Worker — Proxy sécurisé Anthropic
 * Variable d'environnement requise : ANTHROPIC_API_KEY
 */

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";

const PROMPTS = {
  summarize: `Tu es un assistant pédagogique expert. Analyse ces images de cours (il peut y en avoir plusieurs pages) et produis une synthèse consolidée en JSON strict (sans markdown, sans backticks).
Format attendu :
{
  "title": "Titre du cours détecté",
  "subject": "Matière (Maths, Histoire, etc.)",
  "summary": "Résumé clair en 3-5 phrases couvrant l'ensemble des pages",
  "key_points": ["point 1", "point 2", "point 3"],
  "difficulty": "facile|moyen|difficile",
  "estimated_read_minutes": 5
}`,

  quiz: `Tu es un créateur de quiz pédagogique. À partir de la synthèse fournie, génère exactement 10 questions variées en JSON strict (sans markdown, sans backticks).
Types disponibles : "qcm", "vrai_faux", "texte_a_trous"
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
Génère un mix de 4 QCM, 3 Vrai/Faux, 3 Texte à trous. Varie les difficultés.`,
};

function extractJSON(text) {
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}

async function handleRequest(request, env) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Firebase-UID",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const firebaseUID = request.headers.get("X-Firebase-UID");
  if (!firebaseUID) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { action, images, summaryText } = body;

  if (!action || !["summarize", "generate_quiz"].includes(action)) {
    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let anthropicMessages;

  if (action === "summarize") {
    // images = tableau de { base64, mediaType }
    if (!images || !Array.isArray(images) || images.length === 0) {
      return new Response(JSON.stringify({ error: "Missing images array" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (images.length > 5) {
      return new Response(JSON.stringify({ error: "Maximum 5 images allowed" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Construire le contenu avec toutes les images
    const content = images.map((img) => ({
      type: "image",
      source: {
        type: "base64",
        media_type: img.mediaType,
        data: img.base64,
      },
    }));

    // Ajouter le prompt texte après les images
    content.push({ type: "text", text: PROMPTS.summarize });

    anthropicMessages = [{ role: "user", content }];

  } else if (action === "generate_quiz") {
    if (!summaryText) {
      return new Response(JSON.stringify({ error: "Missing summary text" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    anthropicMessages = [
      {
        role: "user",
        content: `Voici la synthèse du cours :\n${summaryText}\n\n${PROMPTS.quiz}`,
      },
    ];
  }

  try {
    const response = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        messages: anthropicMessages,
      }),
    });

    const rawBody = await response.text();

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: "Anthropic API error", details: rawBody, status: response.status }),
        {
          status: response.status,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        }
      );
    }

    let data;
    try {
      data = JSON.parse(rawBody);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON from Anthropic", raw: rawBody.slice(0, 500) }),
        { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    const rawText = data.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    const parsed = extractJSON(rawText);

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal error", message: err.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  }
}

export default { fetch: handleRequest };
