# 🎨 Guide des images IA — StudyAI

Ce guide t'explique **quelles images générer**, avec **les prompts prêts à coller**, les tailles et les noms.
Il est généré automatiquement à partir de `shared/assets.js` (les mêmes prompts sont dans l'application).

> 📱 **Le plus simple depuis ton téléphone** : ouvre l'application → **Profil** → **Administration** (PIN) → onglet **🖼️ Images**.
> Pour chaque image : **📋 Prompt** (copie), tu le colles dans ton outil d'IA, tu enregistres l'image, puis **⬆️ Importer**.
> L'image apparaît tout de suite dans l'app. Tant qu'une image manque, un emoji la remplace : **rien ne casse**.

## 1. Par où commencer

Génère d'abord les **9 images « Essentielles »** : c'est elles qui donnent le style à l'application.
Les images « Recommandées » (badges, icônes) et « Bonus » (niveaux, types de questions) viennent ensuite, à ton rythme.

## 2. Garder un style cohérent

1. **Commence par la mascotte « contente »** (`mascot_happy`). Choisis la version que tu aimes vraiment.
2. Pour les autres poses, **donne cette image comme référence** à ton outil d'IA :
   - ChatGPT / Gemini : joins l'image et écris « garde exactement le même personnage » ;
   - Midjourney : ajoute l'image avec `--cref` (référence de personnage) ;
   - tout autre outil : option « image de référence » ou « image-to-image ».
3. Ajoute toujours le **bloc de style** (déjà inclus dans chaque prompt copié depuis l'app).
4. Pour les images à **fond transparent**, demande un PNG avec fond transparent. Si ton outil ne sait pas le faire, génère sur fond uni puis retire le fond avec un outil de détourage (ex. remove.bg) avant l'import.
5. Pour les **décors**, garde le centre calme et vide : les cartes de l'application viennent se poser dessus.

## 3. Bloc de style (commun à toutes les images)

```text
Cute 2D cartoon illustration, flat vivid colors with soft cel shading, thick dark indigo (#2B1B5A) outlines, bright saturated palette (violet #8B5CF6, sunny yellow #FFC21A, mint green #22C55E, coral pink #FF6B8A, sky blue #4CC9F0), rounded friendly shapes, kid-friendly and playful, clean vector-like look, no text, no letters, no watermark.
```

**Description de la mascotte** (à garder identique d'une pose à l'autre) :

```text
a cheerful round owl mascot with big shiny expressive eyes, small round glasses, a tiny graduation cap with a yellow tassel, violet and cream feathers
```

> 🦉 Tu préfères un autre personnage (renard, chat, dragon…) ? Remplace « owl » par ton animal dans `shared/assets.js` (constante `MASCOT_DESCRIPTION` et prompts des niveaux), puis régénère ce guide avec `node scripts/gen-images-doc.mjs`.

## 4. Formats acceptés

- **PNG, JPG ou WebP**, 10 Mo maximum par image.
- `icon` (icône de l'application) : **PNG obligatoire**, carré, sans transparence, sans coins arrondis (le téléphone arrondit lui-même).
- Les tailles indiquées sont des recommandations : le navigateur adapte l'image à l'écran (inutile de la redimensionner).

## 5. Où sont rangées tes images

Dans le dossier `data/img/` de la VM : elles **survivent aux mises à jour** et sont incluses dans les sauvegardes.
Tu peux aussi les déposer toi-même dans ce dossier (nom exact + `.png`, `.jpg` ou `.webp`), sans passer par l'application.

## 6. Essentiel (9 images)

### Mascotte

**1. Mascotte — contente (accueil)** — nom : `mascot_happy` · taille : 1024×1024 · fond transparent

```text
Cute 2D cartoon illustration, flat vivid colors with soft cel shading, thick dark indigo (#2B1B5A) outlines, bright saturated palette (violet #8B5CF6, sunny yellow #FFC21A, mint green #22C55E, coral pink #FF6B8A, sky blue #4CC9F0), rounded friendly shapes, kid-friendly and playful, clean vector-like look, no text, no letters, no watermark. a cheerful round owl mascot with big shiny expressive eyes, small round glasses, a tiny graduation cap with a yellow tassel, violet and cream feathers, waving one wing with a big happy smile, full body, front view, isolated on a fully transparent background (PNG with alpha), centered, generous margin around the subject. Square 1024×1024 image, transparent background.
```

**2. Mascotte — réfléchit (analyse en cours)** — nom : `mascot_think` · taille : 1024×1024 · fond transparent

```text
Cute 2D cartoon illustration, flat vivid colors with soft cel shading, thick dark indigo (#2B1B5A) outlines, bright saturated palette (violet #8B5CF6, sunny yellow #FFC21A, mint green #22C55E, coral pink #FF6B8A, sky blue #4CC9F0), rounded friendly shapes, kid-friendly and playful, clean vector-like look, no text, no letters, no watermark. The same owl mascot (a cheerful round owl mascot with big shiny expressive eyes, small round glasses, a tiny graduation cap with a yellow tassel, violet and cream feathers), thoughtful pose, one wing on its chin, eyes looking up, a small light bulb floating above its head, full body, isolated on a fully transparent background (PNG with alpha), centered, generous margin around the subject. Square 1024×1024 image, transparent background.
```

**3. Mascotte — fête (bon résultat)** — nom : `mascot_win` · taille : 1024×1024 · fond transparent

```text
Cute 2D cartoon illustration, flat vivid colors with soft cel shading, thick dark indigo (#2B1B5A) outlines, bright saturated palette (violet #8B5CF6, sunny yellow #FFC21A, mint green #22C55E, coral pink #FF6B8A, sky blue #4CC9F0), rounded friendly shapes, kid-friendly and playful, clean vector-like look, no text, no letters, no watermark. The same owl mascot (a cheerful round owl mascot with big shiny expressive eyes, small round glasses, a tiny graduation cap with a yellow tassel, violet and cream feathers), jumping with joy, both wings up, throwing confetti, stars around it, huge smile, full body, isolated on a fully transparent background (PNG with alpha), centered, generous margin around the subject. Square 1024×1024 image, transparent background.
```

**4. Mascotte — déçue (erreur / mauvais score)** — nom : `mascot_sad` · taille : 1024×1024 · fond transparent

```text
Cute 2D cartoon illustration, flat vivid colors with soft cel shading, thick dark indigo (#2B1B5A) outlines, bright saturated palette (violet #8B5CF6, sunny yellow #FFC21A, mint green #22C55E, coral pink #FF6B8A, sky blue #4CC9F0), rounded friendly shapes, kid-friendly and playful, clean vector-like look, no text, no letters, no watermark. The same owl mascot (a cheerful round owl mascot with big shiny expressive eyes, small round glasses, a tiny graduation cap with a yellow tassel, violet and cream feathers), slightly sad but cute, drooping wings, big watery eyes, a small rain cloud above its head, full body, isolated on a fully transparent background (PNG with alpha), centered, generous margin around the subject. Square 1024×1024 image, transparent background.
```

### Identité

**5. Logo (emblème)** — nom : `logo` · taille : 512×512 · fond transparent

```text
Cute 2D cartoon illustration, flat vivid colors with soft cel shading, thick dark indigo (#2B1B5A) outlines, bright saturated palette (violet #8B5CF6, sunny yellow #FFC21A, mint green #22C55E, coral pink #FF6B8A, sky blue #4CC9F0), rounded friendly shapes, kid-friendly and playful, clean vector-like look, no text, no letters, no watermark. Emblem logo: the head of a cheerful round owl mascot with big shiny expressive eyes, small round glasses, a tiny graduation cap with a yellow tassel, violet and cream feathers inside a rounded shield badge with a thick outline, open book at the bottom, isolated on a fully transparent background (PNG with alpha), centered, generous margin around the subject. Square 512×512 image, transparent background.
```

**6. Icône de l'application (écran d'accueil du téléphone)** — nom : `icon` · taille : 1024×1024 · image pleine · PNG

```text
Cute 2D cartoon illustration, flat vivid colors with soft cel shading, thick dark indigo (#2B1B5A) outlines, bright saturated palette (violet #8B5CF6, sunny yellow #FFC21A, mint green #22C55E, coral pink #FF6B8A, sky blue #4CC9F0), rounded friendly shapes, kid-friendly and playful, clean vector-like look, no text, no letters, no watermark. App icon: the face of a cheerful round owl mascot with big shiny expressive eyes, small round glasses, a tiny graduation cap with a yellow tassel, violet and cream feathers centered on a vivid violet-to-pink gradient background, the subject fills about 65% of the square, full-bleed square image with NO rounded corners and NO transparency. 1024×1024 image.
```

### Décors

**7. Décor — accès et choix du profil** — nom : `bg_login` · taille : 1080×1920 · image pleine

```text
Cute 2D cartoon illustration, flat vivid colors with soft cel shading, thick dark indigo (#2B1B5A) outlines, bright saturated palette (violet #8B5CF6, sunny yellow #FFC21A, mint green #22C55E, coral pink #FF6B8A, sky blue #4CC9F0), rounded friendly shapes, kid-friendly and playful, clean vector-like look, no text, no letters, no watermark. Magical school entrance at golden sunset, a big round wooden door in a cozy castle-like building, soft clouds and sparkles, full-bleed background scene in portrait orientation, no characters, no text, large calm empty area in the center of the image so that interface cards can sit on top. 1080×1920 image.
```

**8. Décor — accueil et navigation** — nom : `bg_home` · taille : 1080×1920 · image pleine

```text
Cute 2D cartoon illustration, flat vivid colors with soft cel shading, thick dark indigo (#2B1B5A) outlines, bright saturated palette (violet #8B5CF6, sunny yellow #FFC21A, mint green #22C55E, coral pink #FF6B8A, sky blue #4CC9F0), rounded friendly shapes, kid-friendly and playful, clean vector-like look, no text, no letters, no watermark. Sunny bright sky with fluffy clouds, rolling green hills at the bottom, floating books and little stars, pastel colors, full-bleed background scene in portrait orientation, no characters, no text, large calm empty area in the center of the image so that interface cards can sit on top. 1080×1920 image.
```

**9. Décor — quiz** — nom : `bg_quiz` · taille : 1080×1920 · image pleine

```text
Cute 2D cartoon illustration, flat vivid colors with soft cel shading, thick dark indigo (#2B1B5A) outlines, bright saturated palette (violet #8B5CF6, sunny yellow #FFC21A, mint green #22C55E, coral pink #FF6B8A, sky blue #4CC9F0), rounded friendly shapes, kid-friendly and playful, clean vector-like look, no text, no letters, no watermark. Cozy magical library interior, pastel violet and blue tones, softly blurred bookshelves and floating lanterns, full-bleed background scene in portrait orientation, no characters, no text, large calm empty area in the center of the image so that interface cards can sit on top. 1080×1920 image.
```

## 7. Recommandé (13 images)

### Décors

**10. Décor — résultats du quiz** — nom : `bg_results` · taille : 1080×1920 · image pleine

```text
Cute 2D cartoon illustration, flat vivid colors with soft cel shading, thick dark indigo (#2B1B5A) outlines, bright saturated palette (violet #8B5CF6, sunny yellow #FFC21A, mint green #22C55E, coral pink #FF6B8A, sky blue #4CC9F0), rounded friendly shapes, kid-friendly and playful, clean vector-like look, no text, no letters, no watermark. Celebration scene with colorful confetti, streamers, spotlights and golden stars on a bright violet and pink sky, full-bleed background scene in portrait orientation, no characters, no text, large calm empty area in the center of the image so that interface cards can sit on top. 1080×1920 image.
```

### Navigation

**11. Onglet — Accueil** — nom : `nav_home` · taille : 256×256 · fond transparent

```text
Cute 2D cartoon illustration, flat vivid colors with soft cel shading, thick dark indigo (#2B1B5A) outlines, bright saturated palette (violet #8B5CF6, sunny yellow #FFC21A, mint green #22C55E, coral pink #FF6B8A, sky blue #4CC9F0), rounded friendly shapes, kid-friendly and playful, clean vector-like look, no text, no letters, no watermark. A cute little house with a round door and a heart on the roof, game icon style, isolated on a fully transparent background (PNG with alpha), centered, generous margin around the subject. Square 256×256 image, transparent background.
```

**12. Onglet — Mes cours** — nom : `nav_courses` · taille : 256×256 · fond transparent

```text
Cute 2D cartoon illustration, flat vivid colors with soft cel shading, thick dark indigo (#2B1B5A) outlines, bright saturated palette (violet #8B5CF6, sunny yellow #FFC21A, mint green #22C55E, coral pink #FF6B8A, sky blue #4CC9F0), rounded friendly shapes, kid-friendly and playful, clean vector-like look, no text, no letters, no watermark. A stack of three colorful books with a bookmark, game icon style, isolated on a fully transparent background (PNG with alpha), centered, generous margin around the subject. Square 256×256 image, transparent background.
```

**13. Onglet — Progression** — nom : `nav_progress` · taille : 256×256 · fond transparent

```text
Cute 2D cartoon illustration, flat vivid colors with soft cel shading, thick dark indigo (#2B1B5A) outlines, bright saturated palette (violet #8B5CF6, sunny yellow #FFC21A, mint green #22C55E, coral pink #FF6B8A, sky blue #4CC9F0), rounded friendly shapes, kid-friendly and playful, clean vector-like look, no text, no letters, no watermark. A golden trophy on a small podium with a star, game icon style, isolated on a fully transparent background (PNG with alpha), centered, generous margin around the subject. Square 256×256 image, transparent background.
```

### Actions

**14. Bouton — Caméra** — nom : `icon_camera` · taille : 256×256 · fond transparent

```text
Cute 2D cartoon illustration, flat vivid colors with soft cel shading, thick dark indigo (#2B1B5A) outlines, bright saturated palette (violet #8B5CF6, sunny yellow #FFC21A, mint green #22C55E, coral pink #FF6B8A, sky blue #4CC9F0), rounded friendly shapes, kid-friendly and playful, clean vector-like look, no text, no letters, no watermark. A cute chunky camera with a big lens and a sparkle, game icon style, isolated on a fully transparent background (PNG with alpha), centered, generous margin around the subject. Square 256×256 image, transparent background.
```

**15. Bouton — Fichier / galerie** — nom : `icon_file` · taille : 256×256 · fond transparent

```text
Cute 2D cartoon illustration, flat vivid colors with soft cel shading, thick dark indigo (#2B1B5A) outlines, bright saturated palette (violet #8B5CF6, sunny yellow #FFC21A, mint green #22C55E, coral pink #FF6B8A, sky blue #4CC9F0), rounded friendly shapes, kid-friendly and playful, clean vector-like look, no text, no letters, no watermark. A framed picture with a sun and a mountain inside, game icon style, isolated on a fully transparent background (PNG with alpha), centered, generous margin around the subject. Square 256×256 image, transparent background.
```

### Badges

**16. Badge — Premier cours** — nom : `badge_first_course` · taille : 256×256 · fond transparent

```text
Cute 2D cartoon illustration, flat vivid colors with soft cel shading, thick dark indigo (#2B1B5A) outlines, bright saturated palette (violet #8B5CF6, sunny yellow #FFC21A, mint green #22C55E, coral pink #FF6B8A, sky blue #4CC9F0), rounded friendly shapes, kid-friendly and playful, clean vector-like look, no text, no letters, no watermark. Round medal badge with a camera and sparkles in the center, gold rim, small ribbon, isolated on a fully transparent background (PNG with alpha), centered, generous margin around the subject. Square 256×256 image, transparent background.
```

**17. Badge — Premier quiz** — nom : `badge_first_quiz` · taille : 256×256 · fond transparent

```text
Cute 2D cartoon illustration, flat vivid colors with soft cel shading, thick dark indigo (#2B1B5A) outlines, bright saturated palette (violet #8B5CF6, sunny yellow #FFC21A, mint green #22C55E, coral pink #FF6B8A, sky blue #4CC9F0), rounded friendly shapes, kid-friendly and playful, clean vector-like look, no text, no letters, no watermark. Round medal badge with a pencil and a green check mark in the center, gold rim, small ribbon, isolated on a fully transparent background (PNG with alpha), centered, generous margin around the subject. Square 256×256 image, transparent background.
```

**18. Badge — Sans faute** — nom : `badge_perfect_10` · taille : 256×256 · fond transparent

```text
Cute 2D cartoon illustration, flat vivid colors with soft cel shading, thick dark indigo (#2B1B5A) outlines, bright saturated palette (violet #8B5CF6, sunny yellow #FFC21A, mint green #22C55E, coral pink #FF6B8A, sky blue #4CC9F0), rounded friendly shapes, kid-friendly and playful, clean vector-like look, no text, no letters, no watermark. Round medal badge with a big shiny golden star and sparkles in the center, gold rim, small ribbon, isolated on a fully transparent background (PNG with alpha), centered, generous margin around the subject. Square 256×256 image, transparent background.
```

**19. Badge — 3 jours de suite** — nom : `badge_streak_3` · taille : 256×256 · fond transparent

```text
Cute 2D cartoon illustration, flat vivid colors with soft cel shading, thick dark indigo (#2B1B5A) outlines, bright saturated palette (violet #8B5CF6, sunny yellow #FFC21A, mint green #22C55E, coral pink #FF6B8A, sky blue #4CC9F0), rounded friendly shapes, kid-friendly and playful, clean vector-like look, no text, no letters, no watermark. Round medal badge with a small cheerful orange flame in the center, bronze rim, small ribbon, isolated on a fully transparent background (PNG with alpha), centered, generous margin around the subject. Square 256×256 image, transparent background.
```

**20. Badge — 7 jours de suite** — nom : `badge_streak_7` · taille : 256×256 · fond transparent

```text
Cute 2D cartoon illustration, flat vivid colors with soft cel shading, thick dark indigo (#2B1B5A) outlines, bright saturated palette (violet #8B5CF6, sunny yellow #FFC21A, mint green #22C55E, coral pink #FF6B8A, sky blue #4CC9F0), rounded friendly shapes, kid-friendly and playful, clean vector-like look, no text, no letters, no watermark. Round medal badge with a big blazing flame and a star in the center, gold rim, small ribbon, isolated on a fully transparent background (PNG with alpha), centered, generous margin around the subject. Square 256×256 image, transparent background.
```

**21. Badge — 10 quiz** — nom : `badge_quiz_10` · taille : 256×256 · fond transparent

```text
Cute 2D cartoon illustration, flat vivid colors with soft cel shading, thick dark indigo (#2B1B5A) outlines, bright saturated palette (violet #8B5CF6, sunny yellow #FFC21A, mint green #22C55E, coral pink #FF6B8A, sky blue #4CC9F0), rounded friendly shapes, kid-friendly and playful, clean vector-like look, no text, no letters, no watermark. Round medal badge with a stack of papers and a green check mark in the center, silver rim, small ribbon, isolated on a fully transparent background (PNG with alpha), centered, generous margin around the subject. Square 256×256 image, transparent background.
```

**22. Badge — 50 quiz** — nom : `badge_quiz_50` · taille : 256×256 · fond transparent

```text
Cute 2D cartoon illustration, flat vivid colors with soft cel shading, thick dark indigo (#2B1B5A) outlines, bright saturated palette (violet #8B5CF6, sunny yellow #FFC21A, mint green #22C55E, coral pink #FF6B8A, sky blue #4CC9F0), rounded friendly shapes, kid-friendly and playful, clean vector-like look, no text, no letters, no watermark. Round medal badge with a rocket flying up among stars in the center, gold rim, small ribbon, isolated on a fully transparent background (PNG with alpha), centered, generous margin around the subject. Square 256×256 image, transparent background.
```

## 8. Bonus (10 images)

### Niveaux

**23. Niveau 1 — Débutant** — nom : `level_1` · taille : 256×256 · fond transparent

```text
Cute 2D cartoon illustration, flat vivid colors with soft cel shading, thick dark indigo (#2B1B5A) outlines, bright saturated palette (violet #8B5CF6, sunny yellow #FFC21A, mint green #22C55E, coral pink #FF6B8A, sky blue #4CC9F0), rounded friendly shapes, kid-friendly and playful, clean vector-like look, no text, no letters, no watermark. a fluffy baby owlet hatching from a cracked egg, in the same owl style as the mascot (a cheerful round owl mascot with big shiny expressive eyes, small round glasses, a tiny graduation cap with a yellow tassel, violet and cream feathers), chibi proportions, isolated on a fully transparent background (PNG with alpha), centered, generous margin around the subject. Square 256×256 image, transparent background.
```

**24. Niveau 2 — Apprenti** — nom : `level_2` · taille : 256×256 · fond transparent

```text
Cute 2D cartoon illustration, flat vivid colors with soft cel shading, thick dark indigo (#2B1B5A) outlines, bright saturated palette (violet #8B5CF6, sunny yellow #FFC21A, mint green #22C55E, coral pink #FF6B8A, sky blue #4CC9F0), rounded friendly shapes, kid-friendly and playful, clean vector-like look, no text, no letters, no watermark. a young owl holding a big pencil, in the same owl style as the mascot (a cheerful round owl mascot with big shiny expressive eyes, small round glasses, a tiny graduation cap with a yellow tassel, violet and cream feathers), chibi proportions, isolated on a fully transparent background (PNG with alpha), centered, generous margin around the subject. Square 256×256 image, transparent background.
```

**25. Niveau 3 — Étudiant** — nom : `level_3` · taille : 256×256 · fond transparent

```text
Cute 2D cartoon illustration, flat vivid colors with soft cel shading, thick dark indigo (#2B1B5A) outlines, bright saturated palette (violet #8B5CF6, sunny yellow #FFC21A, mint green #22C55E, coral pink #FF6B8A, sky blue #4CC9F0), rounded friendly shapes, kid-friendly and playful, clean vector-like look, no text, no letters, no watermark. an owl wearing a graduation cap and holding a diploma scroll, in the same owl style as the mascot (a cheerful round owl mascot with big shiny expressive eyes, small round glasses, a tiny graduation cap with a yellow tassel, violet and cream feathers), chibi proportions, isolated on a fully transparent background (PNG with alpha), centered, generous margin around the subject. Square 256×256 image, transparent background.
```

**26. Niveau 4 — Savant** — nom : `level_4` · taille : 256×256 · fond transparent

```text
Cute 2D cartoon illustration, flat vivid colors with soft cel shading, thick dark indigo (#2B1B5A) outlines, bright saturated palette (violet #8B5CF6, sunny yellow #FFC21A, mint green #22C55E, coral pink #FF6B8A, sky blue #4CC9F0), rounded friendly shapes, kid-friendly and playful, clean vector-like look, no text, no letters, no watermark. an owl wearing science goggles and holding a glowing test tube, in the same owl style as the mascot (a cheerful round owl mascot with big shiny expressive eyes, small round glasses, a tiny graduation cap with a yellow tassel, violet and cream feathers), chibi proportions, isolated on a fully transparent background (PNG with alpha), centered, generous margin around the subject. Square 256×256 image, transparent background.
```

**27. Niveau 5 — Expert** — nom : `level_5` · taille : 256×256 · fond transparent

```text
Cute 2D cartoon illustration, flat vivid colors with soft cel shading, thick dark indigo (#2B1B5A) outlines, bright saturated palette (violet #8B5CF6, sunny yellow #FFC21A, mint green #22C55E, coral pink #FF6B8A, sky blue #4CC9F0), rounded friendly shapes, kid-friendly and playful, clean vector-like look, no text, no letters, no watermark. an owl wearing a shiny star medal on its chest, in the same owl style as the mascot (a cheerful round owl mascot with big shiny expressive eyes, small round glasses, a tiny graduation cap with a yellow tassel, violet and cream feathers), chibi proportions, isolated on a fully transparent background (PNG with alpha), centered, generous margin around the subject. Square 256×256 image, transparent background.
```

**28. Niveau 6 — Maître** — nom : `level_6` · taille : 256×256 · fond transparent

```text
Cute 2D cartoon illustration, flat vivid colors with soft cel shading, thick dark indigo (#2B1B5A) outlines, bright saturated palette (violet #8B5CF6, sunny yellow #FFC21A, mint green #22C55E, coral pink #FF6B8A, sky blue #4CC9F0), rounded friendly shapes, kid-friendly and playful, clean vector-like look, no text, no letters, no watermark. an owl holding a big golden trophy, in the same owl style as the mascot (a cheerful round owl mascot with big shiny expressive eyes, small round glasses, a tiny graduation cap with a yellow tassel, violet and cream feathers), chibi proportions, isolated on a fully transparent background (PNG with alpha), centered, generous margin around the subject. Square 256×256 image, transparent background.
```

**29. Niveau 7 — Légende** — nom : `level_7` · taille : 256×256 · fond transparent

```text
Cute 2D cartoon illustration, flat vivid colors with soft cel shading, thick dark indigo (#2B1B5A) outlines, bright saturated palette (violet #8B5CF6, sunny yellow #FFC21A, mint green #22C55E, coral pink #FF6B8A, sky blue #4CC9F0), rounded friendly shapes, kid-friendly and playful, clean vector-like look, no text, no letters, no watermark. an owl wearing a golden crown and a royal cape, sparkling aura, in the same owl style as the mascot (a cheerful round owl mascot with big shiny expressive eyes, small round glasses, a tiny graduation cap with a yellow tassel, violet and cream feathers), chibi proportions, isolated on a fully transparent background (PNG with alpha), centered, generous margin around the subject. Square 256×256 image, transparent background.
```

### Types de questions

**30. Question — QCM** — nom : `type_qcm` · taille : 256×256 · fond transparent

```text
Cute 2D cartoon illustration, flat vivid colors with soft cel shading, thick dark indigo (#2B1B5A) outlines, bright saturated palette (violet #8B5CF6, sunny yellow #FFC21A, mint green #22C55E, coral pink #FF6B8A, sky blue #4CC9F0), rounded friendly shapes, kid-friendly and playful, clean vector-like look, no text, no letters, no watermark. Four round answer bubbles stacked, the second one checked with a green tick, game icon style, isolated on a fully transparent background (PNG with alpha), centered, generous margin around the subject. Square 256×256 image, transparent background.
```

**31. Question — Vrai / Faux** — nom : `type_vrai_faux` · taille : 256×256 · fond transparent

```text
Cute 2D cartoon illustration, flat vivid colors with soft cel shading, thick dark indigo (#2B1B5A) outlines, bright saturated palette (violet #8B5CF6, sunny yellow #FFC21A, mint green #22C55E, coral pink #FF6B8A, sky blue #4CC9F0), rounded friendly shapes, kid-friendly and playful, clean vector-like look, no text, no letters, no watermark. A green check mark circle and a red cross circle side by side, game icon style, isolated on a fully transparent background (PNG with alpha), centered, generous margin around the subject. Square 256×256 image, transparent background.
```

**32. Question — Texte à trous** — nom : `type_texte_a_trous` · taille : 256×256 · fond transparent

```text
Cute 2D cartoon illustration, flat vivid colors with soft cel shading, thick dark indigo (#2B1B5A) outlines, bright saturated palette (violet #8B5CF6, sunny yellow #FFC21A, mint green #22C55E, coral pink #FF6B8A, sky blue #4CC9F0), rounded friendly shapes, kid-friendly and playful, clean vector-like look, no text, no letters, no watermark. A line of text bars with an empty dashed slot in the middle and a pencil next to it, game icon style, isolated on a fully transparent background (PNG with alpha), centered, generous margin around the subject. Square 256×256 image, transparent background.
```

## 9. Dépannage

| Problème | Solution |
|---|---|
| « Format non pris en charge » à l'import | L'image n'est pas un vrai PNG/JPG/WebP (ex. HEIC d'iPhone). Réexporte-la en PNG ou JPG. |
| L'image importée ne s'affiche pas | Recharge la page. Vérifie dans Admin → Images que l'état est « ✅ Ton image ». |
| Le fond de la mascotte est blanc au lieu d'être transparent | Détoure l'image (remove.bg) puis réimporte-la. |
| Je veux revenir à l'image d'origine | Admin → Images → bouton **↩️** de l'image concernée. |
| L'icône sur l'écran d'accueil du téléphone n'a pas changé | Supprime le raccourci puis **ajoute-le de nouveau** : les téléphones gardent l'ancienne icône en mémoire. |
