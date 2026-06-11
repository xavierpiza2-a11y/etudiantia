# 🎓 StudyAI — Guide de déploiement

Scanne tes cours, génère des quiz, progresse avec XP et badges.

---

## Stack
| Couche | Service | Plan |
|--------|---------|------|
| Frontend | Cloudflare Pages | Gratuit |
| Auth + DB + Storage | Firebase | Spark (gratuit) |
| Proxy API | Cloudflare Workers | Gratuit (100k req/j) |
| IA | Anthropic Claude | Clé API |

---

## 1. Firebase — Créer le projet

1. Va sur https://console.firebase.google.com
2. **Créer un projet** → nom au choix → désactiver Google Analytics (optionnel)
3. **Authentication** → Sign-in method → activer **Google**
4. **Firestore** → Créer la base → mode **production** → région `eur3 (europe-west)`
5. **Storage** → Commencer → mode **production** → même région

### Règles Firestore (Firestore → Règles)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Règles Storage (Storage → Règles)
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /courses/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

6. **Paramètres du projet** (icône ⚙️) → **Vos applications** → Ajouter une application Web
7. Copie les valeurs `firebaseConfig` → tu en auras besoin pour les variables d'env

---

## 2. Cloudflare Worker — Proxy API sécurisé

1. Va sur https://dash.cloudflare.com → **Workers & Pages** → **Create**
2. Choisis **Create Worker** → nom : `studyai-worker`
3. Copie le contenu de `cloudflare-worker/index.js` dans l'éditeur
4. **Déployer**
5. Va dans **Settings** → **Variables** → **Add variable**
   - Nom : `ANTHROPIC_API_KEY`
   - Valeur : ta clé API Anthropic (depuis https://console.anthropic.com)
   - ⚠️ Coche **Encrypt** pour la chiffrer

6. Copie l'URL du Worker (ex: `https://studyai-worker.XXX.workers.dev`)

> **Important :** Dans `cloudflare-worker/index.js`, ligne 8, remplace `your-app.pages.dev`
> par ton vrai domaine Cloudflare Pages une fois connu.

---

## 3. Cloudflare Pages — Déploiement frontend

### Option A : Via GitHub (recommandé)

1. Pousse le projet sur GitHub :
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/TON_PSEUDO/studyai.git
   git push -u origin main
   ```

2. Va sur https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages**
3. Connecte ton compte GitHub → sélectionne le repo `studyai`
4. Configuration de build :
   - Framework preset : **Vite**
   - Build command : `npm run build`
   - Build output directory : `dist`
5. **Variables d'environnement** → ajoute toutes les variables du `.env.example` remplies

### Option B : Upload manuel

```bash
npm install
npm run build
# Upload le dossier dist/ sur Cloudflare Pages
```

---

## 4. Variables d'environnement à configurer

Dans Cloudflare Pages → Settings → Environment variables :

| Variable | Valeur |
|----------|--------|
| `VITE_FIREBASE_API_KEY` | Depuis Firebase |
| `VITE_FIREBASE_AUTH_DOMAIN` | `ton-projet.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `ton-projet` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `ton-projet.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Depuis Firebase |
| `VITE_FIREBASE_APP_ID` | Depuis Firebase |
| `VITE_WORKER_URL` | URL de ton Cloudflare Worker |

---

## 5. Autoriser le domaine dans Firebase Auth

1. Firebase Console → **Authentication** → **Settings** → **Authorized domains**
2. Ajouter `ton-app.pages.dev`

---

## 6. Développement local

```bash
# Copier et remplir les variables
cp .env.example .env

# Installer les dépendances
npm install

# Lancer en développement
npm run dev
```

Pour le Worker en local, utilise [Wrangler](https://developers.cloudflare.com/workers/wrangler/) :
```bash
cd cloudflare-worker
npx wrangler dev
```

---

## Structure des données Firestore

```
users/
  {uid}/
    profile/
      main → { xp, level, badges[], streak, totalQuizzes }
    courses/
      {courseId} → { imageURL, summary, status, quizId, createdAt }
    quizzes/
      {quizId} → { questions[], courseId, createdAt }
    results/
      {resultId} → { quizId, score, maxScore, percentage, answers[], completedAt }
```

---

## Limites plan gratuit

| Service | Limite | Usage typique |
|---------|--------|---------------|
| Firebase Storage | 5 GB | ~5000 photos |
| Firestore lectures | 50k/jour | ~500 quiz/jour |
| Firestore écritures | 20k/jour | ~2000 actions/jour |
| CF Workers | 100k req/jour | Largement suffisant |
| CF Pages | 500 builds/mois | OK |
