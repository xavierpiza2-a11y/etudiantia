# 🎓 StudyAI (etudiantia)

Scanne tes cours en photo, laisse l'IA (Claude) créer un résumé et des quiz, puis progresse avec XP, niveaux, badges et séries de jours.

**Auto-hébergé** : une seule image Docker, pensée pour une **VM Ubuntu sur Freebox** — aucun compte Google, Firebase ou Cloudflare.

## ✨ Fonctionnalités

- 🔑 **Accès par clé** (définie dans `.env`), puis **choix du profil** façon Netflix
- 📸 Scan de 1 à 5 pages (caméra ou fichiers) → résumé, points clés, difficulté
- 🎯 Quiz personnalisables : QCM, Vrai/Faux, Textes à trous (tolérants aux accents et à la casse)
- 💾 **Tout est conservé dans `/data`** (photos, résumés, quiz, résultats) : réviser ne coûte **aucun appel IA**
- ♻️ **Cache intelligent** : mêmes photos ou même synthèse + même répartition de quiz → résultat réutilisé
- 🏆 XP, niveaux, badges, séries de jours (calculés côté serveur)
- 🛠️ **Espace admin** (PIN) : profils, appels IA évités, tokens, stockage, journal des connexions, export
- 🔄 **`update-freebox.sh`** : mise à jour (manuelle ou automatique chaque nuit) avec sauvegarde de `/data` et retour arrière automatique

## 🚀 Installation

👉 **[INSTALLATION.md](INSTALLATION.md)** — guide complet pas à pas (création de la VM sur la Freebox, Docker, `.env`, premier démarrage, mises à jour, sauvegardes, dépannage).

Résumé express (VM Ubuntu avec Docker déjà installé) :

```bash
git clone https://github.com/xavierpiza2-a11y/etudiantia.git && cd etudiantia
cp .env.example .env && nano .env        # ACCESS_KEY, ADMIN_PIN, ANTHROPIC_API_KEY
docker compose up -d --build
./update-freebox.sh --install-cron 04:00 # mises à jour automatiques
```

Puis ouvre `http://IP-DE-LA-VM:8080`.

## 🧱 Architecture

```
Navigateur ──HTTP──▶ Conteneur Docker (Node 22 + Express)
                       ├─ interface React/Vite compilée (dist/)
                       ├─ API /api  (session, profils, cours, quiz, résultats, admin)
                       ├─ appels à l'API Anthropic (la clé reste côté serveur)
                       └─ /data  ◀── volume ./data (jamais touché par les mises à jour)
```

```
server/    API Express (auth, stockage JSON, cache IA, admin, Anthropic)
shared/    règles d'XP / niveaux / badges partagées client + serveur
src/       interface React
docker/    entrypoint du conteneur
```

## 🔐 Sécurité

- Clé d'accès comparée à temps constant, session par cookie signé (HMAC) `HttpOnly`
- Blocage 15 min après 8 mauvaises clés ou PINs consécutifs (par adresse IP)
- Chaque profil ne voit que ses propres cours, images et quiz
- Score, XP et badges calculés par le serveur (pas de triche côté navigateur)
- Conteneur exécuté sans privilèges, en-têtes de sécurité (CSP stricte), polices embarquées (aucune requête externe)
- Le serveur **refuse de démarrer** sans clé d'accès

## 🧑‍💻 Développement local

```bash
npm install
# .env : ACCESS_KEY=..., ADMIN_PIN=..., ANTHROPIC_API_KEY=..., DATA_DIR=./data-dev
npm run dev:server    # API sur http://localhost:3000
npm run dev           # interface Vite (proxy /api → :3000)
```

## 📝 Licence

Projet personnel.
