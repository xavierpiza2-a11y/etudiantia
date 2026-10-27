# 📘 Mode d'emploi — installer StudyAI sur une VM Ubuntu (Freebox)

Ce guide t'accompagne de zéro jusqu'à l'application qui tourne chez toi, avec mise à jour automatique.
Compte environ **30 à 45 minutes** la première fois (la plus grande partie est l'attente de la construction de l'image Docker).

> **Les commandes** de ce guide sont à taper dans le terminal de la VM (en SSH). Les blocs grisés se copient-collent tels quels, en remplaçant uniquement ce qui est écrit `EN-MAJUSCULES`.

---

## Sommaire

1. [Ce que tu obtiens](#1-ce-que-tu-obtiens)
2. [Ce qu'il te faut avant de commencer](#2-ce-quil-te-faut-avant-de-commencer)
3. [Créer la VM Ubuntu sur la Freebox](#3-créer-la-vm-ubuntu-sur-la-freebox)
4. [Se connecter à la VM et la préparer](#4-se-connecter-à-la-vm-et-la-préparer)
5. [Installer Docker](#5-installer-docker)
6. [Récupérer l'application](#6-récupérer-lapplication)
7. [Configurer le fichier `.env`](#7-configurer-le-fichier-env)
8. [Premier démarrage](#8-premier-démarrage)
9. [Utiliser l'application](#9-utiliser-lapplication)
10. [Où sont tes données (`/data`) et comment elles sont protégées](#10-où-sont-tes-données-data-et-comment-elles-sont-protégées)
11. [Mises à jour (manuelles et automatiques)](#11-mises-à-jour-manuelles-et-automatiques)
12. [Sauvegarde et restauration](#12-sauvegarde-et-restauration)
13. [Commandes utiles au quotidien](#13-commandes-utiles-au-quotidien)
14. [Accès depuis l'extérieur (optionnel)](#14-accès-depuis-lextérieur-optionnel)
15. [Dépannage](#15-dépannage)

---

## 1. Ce que tu obtiens

- Une application web accessible depuis tous les appareils de ta maison : `http://ADRESSE-IP-DE-LA-VM:8080`
- **Accès protégé par une clé** (définie dans `.env`), puis **choix du profil** (façon Netflix).
- **Aucun compte Google / Firebase / Cloudflare** : tout tourne dans **un seul conteneur Docker** sur ta VM.
- **Économies d'IA** : photos, résumés et quiz sont enregistrés sur le disque. Rouvrir un cours ou refaire un quiz **ne coûte aucun appel à l'IA**. Scanner deux fois le même cours (mêmes photos) réutilise aussi le résultat.
- Espace **administrateur** protégé par un PIN : profils, statistiques d'appels IA évités, stockage, journal des connexions, export.
- **Mise à jour en une commande** (ou automatique chaque nuit) avec sauvegarde préalable et retour arrière si la nouvelle version ne démarre pas.

---

## 2. Ce qu'il te faut avant de commencer

| Élément | Détail |
|---|---|
| **Une Freebox avec machines virtuelles** | Freebox **Delta** ou **Ultra** (la Freebox Révolution n'a pas de VM). Un disque/SSD doit être présent pour stocker la VM. |
| **Un ordinateur** sur le même réseau | Pour ouvrir Freebox OS et te connecter en SSH (Windows 10/11 : « Terminal » ou PowerShell ; Mac/Linux : Terminal). |
| **Une clé API Anthropic** | Voir ci-dessous. |
| **Internet sur la VM** | Pour télécharger Docker, l'application et appeler l'IA. |

### Obtenir une clé API Anthropic

1. Va sur **<https://console.anthropic.com>** et crée un compte.
2. Dans **Billing** (facturation), ajoute un moyen de paiement et un peu de crédit (quelques euros suffisent pour commencer).
3. *(Recommandé)* Définis une **limite de dépense mensuelle** dans les paramètres de facturation.
4. Dans **API Keys**, clique sur **Create Key**, donne-lui un nom (ex. `studyai-freebox`) et **copie la clé** (elle commence par `sk-ant-`). Elle ne sera plus affichée ensuite : garde-la sous la main pour l'étape 7.

> 🔐 Cette clé donne accès à ton crédit. Elle restera uniquement dans le fichier `.env` de ta VM : elle n'est jamais envoyée aux navigateurs et n'est jamais commitée sur GitHub.

---

## 3. Créer la VM Ubuntu sur la Freebox

1. Sur un ordinateur du réseau, ouvre **<http://mafreebox.freebox.fr>** et connecte-toi à **Freebox OS**.
2. Ouvre l'application **Machines virtuelles** (aussi appelée « VM »).
3. Clique sur **Ajouter une VM** et renseigne :
   - **Nom** : `studyai` (au choix)
   - **Système** : choisis une image **Ubuntu Server récente** (24.04 LTS ou 22.04 LTS si elle est proposée dans la liste).
   - **Stockage** : emplacement = le disque interne/SSD de la Freebox ; **taille du disque : 16 Go minimum** (30 Go recommandé : les photos de cours s'accumulent).
   - **Processeurs** : 2 (1 minimum).
   - **Mémoire (RAM)** : **2 Go recommandé** (1 Go minimum : voir l'astuce « swap » en section 15).
   - **Identifiants / clé SSH** : définis le nom d'utilisateur et le mot de passe (ou ta clé SSH) si l'assistant te le demande. **Note-les.**
4. Valide, puis **allume** la VM (bouton vert en haut de l'interface).
5. Au bout d'une minute ou deux, la VM obtient une **adresse IP** sur ton réseau (du type `192.168.1.xx`). Tu la trouves dans la fiche de la VM, ou dans la liste des appareils de Freebox OS.

> ℹ️ Les noms exacts des menus peuvent légèrement varier selon la version de Freebox OS. Les paramètres d'une VM ne se modifient que lorsqu'elle est **éteinte**.

### Fixer l'adresse IP de la VM (important)

Pour que l'adresse de l'application ne change jamais, réserve une IP fixe à la VM :

1. Dans Freebox OS : **Paramètres de la Freebox** (mode avancé) → **DHCP**.
2. Ajoute un **bail DHCP statique** : choisis la VM dans la liste (adresse MAC) et indique l'IP voulue (ex. `192.168.1.50`).
3. Redémarre la VM pour qu'elle prenne cette adresse.

Dans la suite, remplace **`IP-DE-LA-VM`** par cette adresse.

---

## 4. Se connecter à la VM et la préparer

Depuis ton ordinateur (Terminal / PowerShell) :

```bash
ssh NOM-UTILISATEUR@IP-DE-LA-VM
```

Accepte l'empreinte (`yes`) puis saisis le mot de passe. Tu es connecté si tu vois une invite du type `utilisateur@studyai:~$`.

Mets le système à jour et installe les outils de base :

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl ca-certificates cron nano
sudo timedatectl set-timezone Europe/Paris
```

*(Si une fenêtre rose/violette te demande de redémarrer des services, valide avec Entrée.)*

Vérifie l'architecture du processeur (information, aucune action requise : l'application fonctionne en `x86_64` comme en `aarch64`/ARM) :

```bash
uname -m
```

---

## 5. Installer Docker

Méthode officielle (dépôt Docker pour Ubuntu) :

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Autorise ton utilisateur à utiliser Docker **sans `sudo`** (indispensable pour la mise à jour automatique) :

```bash
sudo usermod -aG docker $USER
```

**Déconnecte-toi puis reconnecte-toi** (`exit`, puis de nouveau `ssh …`) pour que le changement soit pris en compte. Teste :

```bash
docker run --rm hello-world
docker compose version
```

Tu dois voir « Hello from Docker! » puis une version de Docker Compose.

> 🔁 Docker redémarre tout seul avec la VM, et l'application aussi (`restart: unless-stopped`).

---

## 6. Récupérer l'application

```bash
cd ~
git clone https://github.com/xavierpiza2-a11y/etudiantia.git
cd etudiantia
chmod +x update-freebox.sh
```

> 🔒 Si ton dépôt GitHub devient **privé**, `git clone` demandera une authentification : crée une *clé de déploiement* (Deploy key, lecture seule) dans les paramètres du dépôt GitHub et clone avec l'adresse SSH (`git@github.com:xavierpiza2-a11y/etudiantia.git`).

---

## 7. Configurer le fichier `.env`

Copie le modèle puis édite-le :

```bash
cp .env.example .env
nano .env
```

Renseigne **au minimum** ces trois lignes :

```ini
ACCESS_KEY=ta-cle-d-acces
ADMIN_PIN=1234
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxx
```

| Variable | Rôle |
|---|---|
| `ACCESS_KEY` | **Clé demandée à l'ouverture de l'application.** 8 caractères minimum. Pour en générer une solide : `openssl rand -hex 12` (donne 24 caractères). Évite les caractères `$ # " ' \` et les espaces. |
| `ADMIN_PIN` | **PIN de l'espace administrateur** (4 caractères minimum). Vide = admin désactivé. |
| `ANTHROPIC_API_KEY` | Ta clé API Anthropic (étape 2). |
| `ANTHROPIC_MODEL` | Modèle IA (analyse des photos + quiz). Défaut : `claude-sonnet-5-5`. |
| `ANTHROPIC_MODEL_QUIZ` | *(Optionnel)* Modèle différent, plus économique, **uniquement pour les quiz** (ex. `claude-haiku-5-5`). L'analyse des photos garde `ANTHROPIC_MODEL`. |
| `DAILY_AI_LIMIT` | Garde-fou : appels IA max par profil et par jour (défaut 30 ; `0` = illimité). Réviser des cours déjà enregistrés n'est jamais limité. |
| `HOST_PORT` | Port d'accès (défaut `8080`). |
| `TZ` | Fuseau horaire (défaut `Europe/Paris`). |
| `DEFAULT_PROFILES` | Profils créés au 1er démarrage : `DEFAULT_PROFILES=Xavier,Emma,Lucas`. |
| `ALLOW_PROFILE_CREATION` | `true` : toute personne ayant la clé peut créer un profil. `false` : seul l'admin peut. |
| `SESSION_DAYS` | Durée pendant laquelle un appareil retient la clé (défaut 30 jours). |

Enregistre dans `nano` : **Ctrl + O**, **Entrée**, puis quitte : **Ctrl + X**.

> 🔁 **Modifier la clé d'accès** (ou le PIN) plus tard : édite `.env`, puis `docker compose up -d`. Changer `ACCESS_KEY` **déconnecte tous les appareils** (ils devront ressaisir la nouvelle clé).
>
> 🛡️ Protège le fichier : `chmod 600 .env`

---

## 8. Premier démarrage

```bash
docker compose up -d --build
```

La **première construction prend de 3 à 10 minutes** (téléchargement des images, installation des dépendances, compilation de l'interface). C'est normal, surtout sur un processeur ARM.

Vérifie que tout va bien :

```bash
docker compose ps          # l'état doit afficher « Up … (healthy) » après ~30 secondes
docker compose logs --tail 20
```

Tu dois voir dans les journaux :

```
🎓 StudyAI (etudiantia) v2.0.0 démarré sur le port 3000
   Données : /data
```

Ouvre maintenant, depuis un téléphone ou un ordinateur du réseau :

**`http://IP-DE-LA-VM:8080`**

Active enfin la **mise à jour automatique** (voir section 11) :

```bash
./update-freebox.sh --install-cron 04:00
```

---

## 9. Utiliser l'application

1. **Clé d'accès** : saisis `ACCESS_KEY`. L'appareil la retient (30 jours par défaut).
2. **Choix du profil** : touche ton profil, ou **« Nouveau profil »** (prénom + avatar). Le bouton 🔒 verrouille l'application ; l'avatar en haut à droite permet de **changer de profil**.
3. **Accueil** : photographie ou importe jusqu'à 5 pages d'un cours → **Analyser**. L'IA produit un résumé ; les photos sont enregistrées sur ta VM.
4. **Quiz** : choisis le nombre de QCM / Vrai-Faux / Textes à trous, puis lance.
5. **Mes cours** : rouvre un cours et son quiz **sans aucun appel IA**. Le bouton « Générer un autre quiz » fait, lui, un nouvel appel.
6. **Progression** : XP, niveaux, badges, série de jours.
7. **Admin** : onglet 🛠️ Admin → saisis `ADMIN_PIN` (déverrouillage de 30 minutes).

### Appareil photo sur téléphone

Le navigateur n'autorise la caméra intégrée à la page **qu'en HTTPS** (ou sur `localhost`). En `http://IP:8080`, le bouton **📷 Caméra** ouvre automatiquement **l'appareil photo natif du téléphone** : tu prends la photo, elle revient dans l'application. Aucune configuration n'est nécessaire.

### Que se passe-t-il si l'analyse échoue ?

Les photos sont déjà enregistrées. Dans **Mes cours**, le cours affiche **« Relancer l'analyse »** : aucune photo à renvoyer. Les erreurs courantes (clé refusée, crédit épuisé, modèle introuvable) affichent un message explicite.

---

## 10. Où sont tes données (`/data`) et comment elles sont protégées

Sur la VM, tout est dans le dossier **`~/etudiantia/data`** (monté dans le conteneur sous `/data`) :

```
data/
├── profiles.json            profils, XP, niveaux, badges, séries
├── courses/<id>/            photos des cours (page-0.jpg …) + course.json (résumé)
├── quizzes/<id>.json        quiz générés
├── results/<profil>.json    historique des résultats
├── cache/                   cache IA (synthèses et quiz) → évite les appels payants
├── logs/connections.jsonl   journal des connexions
├── stats.json               compteurs d'appels IA / appels évités
├── session-secret.key       secret de signature des sessions (généré automatiquement)
└── meta.json                version du format des données
```

**Pourquoi c'est protégé lors des mises à jour :**

- `data/` et `.env` sont dans le `.gitignore` : `git pull` ne peut ni les écraser ni les supprimer ;
- le conteneur est **reconstruit**, mais `data/` est un dossier de la VM monté dedans (*volume*), pas une partie de l'image ;
- le script de mise à jour **sauvegarde `data/`** avant chaque mise à jour ;
- le format des données est versionné (`meta.json`) : si tu repars par erreur sur une version plus ancienne de l'application, elle **refuse de démarrer** plutôt que d'abîmer des données créées par une version plus récente.

> 💾 **La VM et ses données sont stockées sur le disque de la Freebox.** Si ce disque tombe en panne, tout part avec. Copie régulièrement le dossier `backups/` ailleurs (section 12).

---

## 11. Mises à jour (manuelles et automatiques)

Le principe : tu modifies / publies le code sur **GitHub** ; la VM le récupère avec `update-freebox.sh`.

### Mise à jour manuelle

```bash
cd ~/etudiantia
./update-freebox.sh
```

Le script :

1. compare avec GitHub — **s'il n'y a rien de nouveau, il s'arrête** (aucune coupure) ;
2. **sauvegarde `data/`** dans `backups/` (les 7 dernières sont conservées) ;
3. récupère la nouvelle version, reconstruit l'image et redémarre ;
4. attend que l'application réponde ;
5. **si elle ne démarre pas : retour automatique à la version précédente**, avec un message clair. La version fautive n'est pas retentée chaque nuit : le script attend une version corrigée.

Options : `--force` (reconstruire même sans nouveauté), `--no-backup`, `--help`.

### Mise à jour automatique chaque nuit

```bash
./update-freebox.sh --install-cron 04:00     # tous les jours à 4h00 (change l'heure si tu veux)
./update-freebox.sh --uninstall-cron         # pour l'arrêter
crontab -l                                   # pour vérifier
tail -50 update.log                          # journal des mises à jour automatiques
```

La coupure lors d'une vraie mise à jour dure environ une à deux minutes.

### Si le script refuse de se lancer

| Message | Solution |
|---|---|
| « Des fichiers suivis par Git ont été modifiés localement » | Tu as modifié un fichier du dépôt sur la VM. Annule : `git checkout -- .` (le `.env` et `data/` ne sont pas concernés). |
| « Docker inaccessible » | `sudo usermod -aG docker $USER`, puis reconnecte-toi en SSH. |
| « Fichier .env introuvable » | `cp .env.example .env` puis remplis-le. |
| « L'historique local et GitHub ont divergé » | Quelqu'un a modifié l'historique GitHub (force-push) ou la VM a des commits locaux. Aucune donnée n'est touchée ; demande de l'aide ou refais un `git clone` propre (en gardant `data/` et `.env`). |

---

## 12. Sauvegarde et restauration

### Sauvegarde manuelle

```bash
cd ~/etudiantia
docker compose stop
tar czf ~/studyai-data-$(date +%F).tar.gz data
docker compose start
```

*(Le script de mise à jour fait déjà une sauvegarde automatique avant chaque mise à jour, dans `~/etudiantia/backups/`.)*

### Copier les sauvegardes sur ton ordinateur

Depuis ton ordinateur (pas depuis la VM) :

```bash
scp NOM-UTILISATEUR@IP-DE-LA-VM:~/etudiantia/backups/*.tar.gz .
```

### Restaurer

```bash
cd ~/etudiantia
docker compose down
mv data data.cassee            # on garde l'ancien au cas où
tar xzf backups/etudiantia-data-AAAAMMJJ-HHMMSS.tar.gz     # recrée le dossier data/
docker compose up -d
```

### Migrer vers une autre VM

Installe l'application sur la nouvelle VM (étapes 4 à 7), puis copie **`data/`** et **`.env`** depuis l'ancienne avant de lancer `docker compose up -d --build`.

---

## 13. Commandes utiles au quotidien

Toutes à lancer dans `~/etudiantia` :

| Action | Commande |
|---|---|
| État de l'application | `docker compose ps` |
| Voir les journaux en direct | `docker compose logs -f` |
| Redémarrer | `docker compose restart` |
| Arrêter / démarrer | `docker compose stop` / `docker compose start` |
| Appliquer une modification du `.env` | `docker compose up -d` |
| Mettre à jour | `./update-freebox.sh` |
| Espace disque utilisé par les données | `du -sh data` |
| Espace disque libre sur la VM | `df -h /` |
| Nettoyer d'anciennes images Docker | `docker image prune -f` |

---

## 14. Accès depuis l'extérieur (optionnel)

Par défaut l'application n'est accessible **que depuis ton réseau local**, ce qui est le plus sûr. Si tu veux y accéder depuis l'extérieur :

- **Le plus simple et le plus sûr : un VPN** (par exemple le serveur VPN intégré à la Freebox, ou Tailscale installé sur la VM et tes appareils). Tu te comportes alors comme si tu étais chez toi.
- **Redirection de port** (Freebox OS → Paramètres → Redirections de ports) vers `IP-DE-LA-VM:8080` : **déconseillé en HTTP simple**, car la clé d'accès circulerait en clair. Si tu le fais malgré tout :
  1. mets l'application derrière un **reverse proxy HTTPS** (Caddy, Nginx Proxy Manager…) avec un vrai certificat ;
  2. dans `.env` : `COOKIE_SECURE=true` et `TRUST_PROXY=true` ;
  3. choisis une `ACCESS_KEY` longue (≥ 20 caractères).

L'application bloque pendant 15 minutes une adresse IP après 8 mauvaises clés (ou PINs) consécutifs, et journalise chaque tentative (onglet Admin → Connexions).

---

## 15. Dépannage

**Le conteneur redémarre en boucle** (`docker compose ps` affiche *Restarting*)
→ `docker compose logs --tail 30`. Le message commence par ❌ et dit quoi corriger : le plus souvent `ACCESS_KEY` vide/trop courte ou `ADMIN_PIN` trop court dans `.env`. Corrige puis `docker compose up -d`.

**Impossible d'ouvrir `http://IP:8080`**
→ La VM est-elle allumée ? L'IP est-elle la bonne ? `docker compose ps` doit afficher `Up (healthy)`. Si le port 8080 est déjà pris, change `HOST_PORT` dans `.env` puis `docker compose up -d`.

**« Clé API Anthropic refusée (401) »**
→ Vérifie `ANTHROPIC_API_KEY` dans `.env` (pas d'espace, pas de guillemets), puis `docker compose up -d`.

**« Crédit Anthropic insuffisant »**
→ Recharge ton compte sur <https://console.anthropic.com> (Billing).

**« Modèle introuvable »**
→ Le nom indiqué dans `ANTHROPIC_MODEL` n'existe pas ou plus. Mets un modèle valide (liste dans la documentation Anthropic), puis `docker compose up -d`.

**« Limite quotidienne atteinte »**
→ Le garde-fou `DAILY_AI_LIMIT` est atteint pour ce profil. Augmente la valeur (ou `0`), ou attends demain. Les cours déjà enregistrés restent accessibles.

**« Impossible d'écrire dans /data »**
→ Normalement le conteneur règle lui-même les droits. Si tu as restauré `data/` à la main : `sudo chown -R 1000:1000 data` puis `docker compose restart`.

**La construction est « Killed » / s'arrête avec une erreur de mémoire** (VM à 1 Go de RAM)
→ Ajoute du swap, puis relance :
```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```
(ou augmente la RAM de la VM dans Freebox OS, VM éteinte).

**J'ai oublié la clé d'accès ou le PIN**
→ Ils sont dans `~/etudiantia/.env` (`nano .env`). Tu peux les changer à tout moment, puis `docker compose up -d`.

**Un enfant a oublié son profil / veut le supprimer**
→ Admin → Profils : désactiver, réactiver ou supprimer (supprime aussi ses cours, images, quiz et résultats ; le cache IA est conservé).

**Le bouton Caméra ouvre l'appareil photo du téléphone au lieu de la caméra dans la page**
→ Normal en HTTP (voir section 9). C'est sans conséquence.

**Une photo iPhone (HEIC) est refusée**
→ Dans Réglages iPhone → Appareil photo → Formats → **Le plus compatible**, ou importe la photo depuis la galerie (iOS la convertit généralement en JPEG).

**Repartir de zéro (⚠️ efface TOUTES les données)**
```bash
cd ~/etudiantia && docker compose down && sudo rm -rf data && docker compose up -d
```

---

*Besoin d'aide ? Garde sous la main la sortie de `docker compose logs --tail 50` : elle contient presque toujours la réponse.*
