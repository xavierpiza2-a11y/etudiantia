// Génère IMAGES-IA.md à partir du registre shared/assets.js (source unique).
// Usage : node scripts/gen-images-doc.mjs
import fs from "node:fs";
import { IMAGE_ASSETS, IMAGE_STYLE, MASCOT_DESCRIPTION, TIER_LABELS, buildFullPrompt } from "../shared/assets.js";

const lines = [];
const L = (s = "") => lines.push(s);

L("# 🎨 Guide des images IA — StudyAI");
L();
L("Ce guide t'explique **quelles images générer**, avec **les prompts prêts à coller**, les tailles et les noms.");
L("Il est généré automatiquement à partir de `shared/assets.js` (les mêmes prompts sont dans l'application).");
L();
L("> 📱 **Le plus simple depuis ton téléphone** : ouvre l'application → **Profil** → **Administration** (PIN) → onglet **🖼️ Images**.");
L("> Pour chaque image : **📋 Prompt** (copie), tu le colles dans ton outil d'IA, tu enregistres l'image, puis **⬆️ Importer**.");
L("> L'image apparaît tout de suite dans l'app. Tant qu'une image manque, un emoji la remplace : **rien ne casse**.");
L();
L("## 1. Par où commencer");
L();
L("Génère d'abord les **9 images « Essentielles »** : c'est elles qui donnent le style à l'application.");
L("Les images « Recommandées » (badges, icônes) et « Bonus » (niveaux, types de questions) viennent ensuite, à ton rythme.");
L();
L("## 2. Garder un style cohérent");
L();
L("1. **Commence par la mascotte « contente »** (`mascot_happy`). Choisis la version que tu aimes vraiment.");
L("2. Pour les autres poses, **donne cette image comme référence** à ton outil d'IA :");
L("   - ChatGPT / Gemini : joins l'image et écris « garde exactement le même personnage » ;");
L("   - Midjourney : ajoute l'image avec `--cref` (référence de personnage) ;");
L("   - tout autre outil : option « image de référence » ou « image-to-image ».");
L("3. Ajoute toujours le **bloc de style** (déjà inclus dans chaque prompt copié depuis l'app).");
L("4. Pour les images à **fond transparent**, demande un PNG avec fond transparent. Si ton outil ne sait pas le faire, génère sur fond uni puis retire le fond avec un outil de détourage (ex. remove.bg) avant l'import.");
L("5. Pour les **décors**, garde le centre calme et vide : les cartes de l'application viennent se poser dessus.");
L();
L("## 3. Bloc de style (commun à toutes les images)");
L();
L("```text");
L(IMAGE_STYLE);
L("```");
L();
L("**Description de la mascotte** (à garder identique d'une pose à l'autre) :");
L();
L("```text");
L(MASCOT_DESCRIPTION);
L("```");
L();
L("> 🦉 Tu préfères un autre personnage (renard, chat, dragon…) ? Remplace « owl » par ton animal dans `shared/assets.js` (constante `MASCOT_DESCRIPTION` et prompts des niveaux), puis régénère ce guide avec `node scripts/gen-images-doc.mjs`.");
L();
L("## 4. Formats acceptés");
L();
L("- **PNG, JPG ou WebP**, 10 Mo maximum par image.");
L("- `icon` (icône de l'application) : **PNG obligatoire**, carré, sans transparence, sans coins arrondis (le téléphone arrondit lui-même).");
L("- Les tailles indiquées sont des recommandations : le navigateur adapte l'image à l'écran (inutile de la redimensionner).");
L();
L("## 5. Où sont rangées tes images");
L();
L("Dans le dossier `data/img/` de la VM : elles **survivent aux mises à jour** et sont incluses dans les sauvegardes.");
L("Tu peux aussi les déposer toi-même dans ce dossier (nom exact + `.png`, `.jpg` ou `.webp`), sans passer par l'application.");
L();

let n = 0;
for (const tier of [1, 2, 3]) {
  const assets = IMAGE_ASSETS.filter((a) => a.tier === tier);
  L(`## ${5 + tier}. ${TIER_LABELS[tier]} (${assets.length} images)`);
  L();
  for (const group of [...new Set(assets.map((a) => a.group))]) {
    L(`### ${group}`);
    L();
    for (const a of assets.filter((x) => x.group === group)) {
      n++;
      L(`**${n}. ${a.label}** — nom : \`${a.name}\` · taille : ${a.size} · ${a.transparent ? "fond transparent" : "image pleine"}${a.pngOnly ? " · PNG" : ""}`);
      L();
      L("```text");
      L(buildFullPrompt(a));
      L("```");
      L();
    }
  }
}

L("## 9. Dépannage");
L();
L("| Problème | Solution |");
L("|---|---|");
L("| « Format non pris en charge » à l'import | L'image n'est pas un vrai PNG/JPG/WebP (ex. HEIC d'iPhone). Réexporte-la en PNG ou JPG. |");
L("| L'image importée ne s'affiche pas | Recharge la page. Vérifie dans Admin → Images que l'état est « ✅ Ton image ». |");
L("| Le fond de la mascotte est blanc au lieu d'être transparent | Détoure l'image (remove.bg) puis réimporte-la. |");
L("| Je veux revenir à l'image d'origine | Admin → Images → bouton **↩️** de l'image concernée. |");
L("| L'icône sur l'écran d'accueil du téléphone n'a pas changé | Supprime le raccourci puis **ajoute-le de nouveau** : les téléphones gardent l'ancienne icône en mémoire. |");
L();

fs.writeFileSync(new URL("../IMAGES-IA.md", import.meta.url), lines.join("\n"));
console.log(`IMAGES-IA.md généré : ${n} images.`);
