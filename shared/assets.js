// shared/assets.js
// Registre de TOUTES les images personnalisables de l'application (générées par IA).
// Source unique : utilisée par le serveur (validation, état), l'interface (affichage avec
// repli sur un emoji) et l'onglet Admin → Images (prompts à copier, import des fichiers).
//
// Principe : l'app fonctionne sans aucune image (emojis + décors en CSS).
// Chaque image déposée « s'allume » automatiquement à son emplacement.

export const IMAGE_EXTS = ["png", "webp", "jpg"];
export const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;

// Bloc de style ajouté devant chaque prompt pour garder un rendu cohérent
export const IMAGE_STYLE =
  "Cute 2D cartoon illustration, flat vivid colors with soft cel shading, thick dark indigo (#2B1B5A) outlines, " +
  "bright saturated palette (violet #8B5CF6, sunny yellow #FFC21A, mint green #22C55E, coral pink #FF6B8A, sky blue #4CC9F0), " +
  "rounded friendly shapes, kid-friendly and playful, clean vector-like look, no text, no letters, no watermark.";

export const MASCOT_DESCRIPTION =
  "a cheerful round owl mascot with big shiny expressive eyes, small round glasses, a tiny graduation cap with a yellow tassel, " +
  "violet and cream feathers";

const T = "isolated on a fully transparent background (PNG with alpha), centered, generous margin around the subject";
const BG = "full-bleed background scene in portrait orientation, no characters, no text, large calm empty area in the center of the image so that interface cards can sit on top";

// tier 1 = essentiel · 2 = recommandé · 3 = bonus
export const IMAGE_ASSETS = [
  // ── Essentiels ───────────────────────────────────────────────────────────
  {
    name: "mascot_happy", tier: 1, group: "Mascotte", label: "Mascotte — contente (accueil)",
    size: "1024×1024", transparent: true,
    prompt: `${MASCOT_DESCRIPTION}, waving one wing with a big happy smile, full body, front view, ${T}`,
  },
  {
    name: "mascot_think", tier: 1, group: "Mascotte", label: "Mascotte — réfléchit (analyse en cours)",
    size: "1024×1024", transparent: true,
    prompt: `The same owl mascot (${MASCOT_DESCRIPTION}), thoughtful pose, one wing on its chin, eyes looking up, a small light bulb floating above its head, full body, ${T}`,
  },
  {
    name: "mascot_win", tier: 1, group: "Mascotte", label: "Mascotte — fête (bon résultat)",
    size: "1024×1024", transparent: true,
    prompt: `The same owl mascot (${MASCOT_DESCRIPTION}), jumping with joy, both wings up, throwing confetti, stars around it, huge smile, full body, ${T}`,
  },
  {
    name: "mascot_sad", tier: 1, group: "Mascotte", label: "Mascotte — déçue (erreur / mauvais score)",
    size: "1024×1024", transparent: true,
    prompt: `The same owl mascot (${MASCOT_DESCRIPTION}), slightly sad but cute, drooping wings, big watery eyes, a small rain cloud above its head, full body, ${T}`,
  },
  {
    name: "logo", tier: 1, group: "Identité", label: "Logo (emblème)",
    size: "512×512", transparent: true,
    prompt: `Emblem logo: the head of ${MASCOT_DESCRIPTION} inside a rounded shield badge with a thick outline, open book at the bottom, ${T}`,
  },
  {
    name: "icon", tier: 1, group: "Identité", label: "Icône de l'application (écran d'accueil du téléphone)",
    size: "1024×1024", transparent: false, pngOnly: true,
    prompt: `App icon: the face of ${MASCOT_DESCRIPTION} centered on a vivid violet-to-pink gradient background, the subject fills about 65% of the square, full-bleed square image with NO rounded corners and NO transparency`,
  },
  {
    name: "bg_login", tier: 1, group: "Décors", label: "Décor — accès et choix du profil",
    size: "1080×1920", transparent: false,
    prompt: `Magical school entrance at golden sunset, a big round wooden door in a cozy castle-like building, soft clouds and sparkles, ${BG}`,
  },
  {
    name: "bg_home", tier: 1, group: "Décors", label: "Décor — accueil et navigation",
    size: "1080×1920", transparent: false,
    prompt: `Sunny bright sky with fluffy clouds, rolling green hills at the bottom, floating books and little stars, pastel colors, ${BG}`,
  },
  {
    name: "bg_quiz", tier: 1, group: "Décors", label: "Décor — quiz",
    size: "1080×1920", transparent: false,
    prompt: `Cozy magical library interior, pastel violet and blue tones, softly blurred bookshelves and floating lanterns, ${BG}`,
  },

  // ── Recommandés ──────────────────────────────────────────────────────────
  {
    name: "bg_results", tier: 2, group: "Décors", label: "Décor — résultats du quiz",
    size: "1080×1920", transparent: false,
    prompt: `Celebration scene with colorful confetti, streamers, spotlights and golden stars on a bright violet and pink sky, ${BG}`,
  },
  {
    name: "nav_home", tier: 2, group: "Navigation", label: "Onglet — Accueil",
    size: "256×256", transparent: true,
    prompt: `A cute little house with a round door and a heart on the roof, game icon style, ${T}`,
  },
  {
    name: "nav_courses", tier: 2, group: "Navigation", label: "Onglet — Mes cours",
    size: "256×256", transparent: true,
    prompt: `A stack of three colorful books with a bookmark, game icon style, ${T}`,
  },
  {
    name: "nav_progress", tier: 2, group: "Navigation", label: "Onglet — Progression",
    size: "256×256", transparent: true,
    prompt: `A golden trophy on a small podium with a star, game icon style, ${T}`,
  },
  {
    name: "icon_camera", tier: 2, group: "Actions", label: "Bouton — Caméra",
    size: "256×256", transparent: true,
    prompt: `A cute chunky camera with a big lens and a sparkle, game icon style, ${T}`,
  },
  {
    name: "icon_file", tier: 2, group: "Actions", label: "Bouton — Fichier / galerie",
    size: "256×256", transparent: true,
    prompt: `A framed picture with a sun and a mountain inside, game icon style, ${T}`,
  },
  {
    name: "badge_first_course", tier: 2, group: "Badges", label: "Badge — Premier cours",
    size: "256×256", transparent: true,
    prompt: `Round medal badge with a camera and sparkles in the center, gold rim, small ribbon, ${T}`,
  },
  {
    name: "badge_first_quiz", tier: 2, group: "Badges", label: "Badge — Premier quiz",
    size: "256×256", transparent: true,
    prompt: `Round medal badge with a pencil and a green check mark in the center, gold rim, small ribbon, ${T}`,
  },
  {
    name: "badge_perfect_10", tier: 2, group: "Badges", label: "Badge — Sans faute",
    size: "256×256", transparent: true,
    prompt: `Round medal badge with a big shiny golden star and sparkles in the center, gold rim, small ribbon, ${T}`,
  },
  {
    name: "badge_streak_3", tier: 2, group: "Badges", label: "Badge — 3 jours de suite",
    size: "256×256", transparent: true,
    prompt: `Round medal badge with a small cheerful orange flame in the center, bronze rim, small ribbon, ${T}`,
  },
  {
    name: "badge_streak_7", tier: 2, group: "Badges", label: "Badge — 7 jours de suite",
    size: "256×256", transparent: true,
    prompt: `Round medal badge with a big blazing flame and a star in the center, gold rim, small ribbon, ${T}`,
  },
  {
    name: "badge_quiz_10", tier: 2, group: "Badges", label: "Badge — 10 quiz",
    size: "256×256", transparent: true,
    prompt: `Round medal badge with a stack of papers and a green check mark in the center, silver rim, small ribbon, ${T}`,
  },
  {
    name: "badge_quiz_50", tier: 2, group: "Badges", label: "Badge — 50 quiz",
    size: "256×256", transparent: true,
    prompt: `Round medal badge with a rocket flying up among stars in the center, gold rim, small ribbon, ${T}`,
  },

  // ── Bonus ────────────────────────────────────────────────────────────────
  ...[
    [1, "Débutant", "a fluffy baby owlet hatching from a cracked egg"],
    [2, "Apprenti", "a young owl holding a big pencil"],
    [3, "Étudiant", "an owl wearing a graduation cap and holding a diploma scroll"],
    [4, "Savant", "an owl wearing science goggles and holding a glowing test tube"],
    [5, "Expert", "an owl wearing a shiny star medal on its chest"],
    [6, "Maître", "an owl holding a big golden trophy"],
    [7, "Légende", "an owl wearing a golden crown and a royal cape, sparkling aura"],
  ].map(([n, label, what]) => ({
    name: `level_${n}`, tier: 3, group: "Niveaux", label: `Niveau ${n} — ${label}`,
    size: "256×256", transparent: true,
    prompt: `${what}, in the same owl style as the mascot (${MASCOT_DESCRIPTION}), chibi proportions, ${T}`,
  })),
  {
    name: "type_qcm", tier: 3, group: "Types de questions", label: "Question — QCM",
    size: "256×256", transparent: true,
    prompt: `Four round answer bubbles stacked, the second one checked with a green tick, game icon style, ${T}`,
  },
  {
    name: "type_vrai_faux", tier: 3, group: "Types de questions", label: "Question — Vrai / Faux",
    size: "256×256", transparent: true,
    prompt: `A green check mark circle and a red cross circle side by side, game icon style, ${T}`,
  },
  {
    name: "type_texte_a_trous", tier: 3, group: "Types de questions", label: "Question — Texte à trous",
    size: "256×256", transparent: true,
    prompt: `A line of text bars with an empty dashed slot in the middle and a pencil next to it, game icon style, ${T}`,
  },
];

export const TIER_LABELS = { 1: "Essentiel", 2: "Recommandé", 3: "Bonus" };

export const getAsset = (name) => IMAGE_ASSETS.find((a) => a.name === name) || null;
export const isValidAssetName = (name) => IMAGE_ASSETS.some((a) => a.name === name);

// Prompt complet à coller dans l'outil d'IA (style commun + sujet + format)
export function buildFullPrompt(asset) {
  const format = asset.transparent
    ? `Square ${asset.size} image, transparent background.`
    : `${asset.size} image.`;
  return `${IMAGE_STYLE} ${asset.prompt}. ${format}`;
}
