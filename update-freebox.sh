#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
#  update-freebox.sh — mise à jour automatique de StudyAI (etudiantia) sur la VM
#
#  Ce que fait le script :
#    1. vérifie s'il existe une nouvelle version sur GitHub (sinon ne fait rien)
#    2. sauvegarde le dossier ./data dans ./backups (7 dernières sauvegardes)
#    3. télécharge la nouvelle version, reconstruit l'image Docker, redémarre
#    4. attend que l'application réponde ; sinon REVIENT À L'ANCIENNE VERSION
#
#  Le dossier ./data (images, résumés, quiz, profils, cache IA) et le fichier .env
#  ne sont JAMAIS modifiés : ils sont hors du dépôt Git (.gitignore).
#
#  Usage :
#    ./update-freebox.sh                  mise à jour (si nouveauté)
#    ./update-freebox.sh --force          reconstruit et redémarre même sans nouveauté
#    ./update-freebox.sh --no-backup      saute la sauvegarde de ./data
#    ./update-freebox.sh --install-cron [HH:MM]   mise à jour automatique chaque nuit (4h00 par défaut)
#    ./update-freebox.sh --uninstall-cron         supprime la mise à jour automatique
#    ./update-freebox.sh --help
# ══════════════════════════════════════════════════════════════════════════════
set -Eeuo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

IMAGE="etudiantia:local"
CONTAINER="etudiantia"
BACKUP_DIR="$DIR/backups"
KEEP_BACKUPS="${KEEP_BACKUPS:-7}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-120}"

FORCE=0
NO_BACKUP=0

log() { printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
die() { log "❌ $*"; exit 1; }

usage() { sed -n '2,24p' "$0" | sed 's/^# \{0,1\}//'; }

# ── Gestion de la tâche planifiée (cron) ─────────────────────────────────────
install_cron() {
  local when="${1:-04:00}" hour min
  [[ "$when" =~ ^([0-9]{1,2}):([0-9]{2})$ ]] || die "Heure invalide « $when » (format attendu : HH:MM, ex. 04:00)"
  hour=$((10#${BASH_REMATCH[1]})); min=$((10#${BASH_REMATCH[2]}))
  (( hour <= 23 && min <= 59 )) || die "Heure invalide « $when »"
  command -v crontab >/dev/null 2>&1 || die "crontab introuvable (sudo apt install cron)"
  local line="$min $hour * * * cd \"$DIR\" && ./update-freebox.sh >> \"$DIR/update.log\" 2>&1"
  { crontab -l 2>/dev/null | grep -vF 'update-freebox.sh' || true; echo "$line"; } | crontab -
  log "✅ Mise à jour automatique programmée chaque jour à $(printf '%02d:%02d' "$hour" "$min")."
  log "   Journal : $DIR/update.log"
  exit 0
}

uninstall_cron() {
  command -v crontab >/dev/null 2>&1 || die "crontab introuvable"
  { crontab -l 2>/dev/null | grep -vF 'update-freebox.sh' || true; } | crontab -
  log "✅ Mise à jour automatique supprimée."
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --force) FORCE=1 ;;
    --no-backup) NO_BACKUP=1 ;;
    --install-cron) shift || true; install_cron "${1:-}" ;;
    --uninstall-cron) uninstall_cron ;;
    -h|--help) usage; exit 0 ;;
    *) die "Option inconnue : $1 (voir --help)" ;;
  esac
  shift || true
done

# Tout le programme est dans main() : bash lit alors le script en entier avant de
# l'exécuter, ce qui évite tout problème quand « git merge » réécrit ce fichier en cours de route.
main() {
  # ── Un seul exemplaire du script à la fois (cron + lancement manuel) ─────────
  exec 9>"$DIR/.update.lock"
  flock -n 9 || die "Une mise à jour est déjà en cours."

  # ── Prérequis ────────────────────────────────────────────────────────────────
  command -v git >/dev/null 2>&1 || die "git n'est pas installé (sudo apt install git)."
  git rev-parse --is-inside-work-tree >/dev/null 2>&1 || die "Ce dossier n'est pas un dépôt Git. Installe l'application avec « git clone » (voir INSTALLATION.md)."
  [[ -f "$DIR/.env" ]] || die "Fichier .env introuvable. Copie .env.example en .env et remplis-le (voir INSTALLATION.md)."

  if docker info >/dev/null 2>&1; then
    DOCKER=(docker)
  elif sudo -n docker info >/dev/null 2>&1; then
    DOCKER=(sudo docker)
  else
    die "Docker inaccessible. Ajoute ton utilisateur au groupe docker : sudo usermod -aG docker \$USER (puis reconnecte-toi)."
  fi

  if "${DOCKER[@]}" compose version >/dev/null 2>&1; then
    DC=("${DOCKER[@]}" compose)
  elif command -v docker-compose >/dev/null 2>&1; then
    DC=("${DOCKER[@]:0:${#DOCKER[@]}-1}" docker-compose)
  else
    die "Docker Compose introuvable (sudo apt install docker-compose-v2)."
  fi

  mkdir -p "$DIR/data"

  container_running() {
    [[ "$("${DOCKER[@]}" inspect -f '{{.State.Running}}' "$CONTAINER" 2>/dev/null || echo false)" == "true" ]]
  }

  # ── Sauvegarde de ./data ─────────────────────────────────────────────────────
  backup_data() {
    mkdir -p "$BACKUP_DIR"
    local file="etudiantia-data-$(date +%Y%m%d-%H%M%S).tar.gz"
    log "💾 Sauvegarde de ./data → backups/$file"
    if "${DOCKER[@]}" image inspect "$IMAGE" >/dev/null 2>&1; then
      # Via l'image de l'application : lit tous les fichiers quels que soient leurs droits
      "${DOCKER[@]}" run --rm --entrypoint sh \
        -v "$DIR/data:/data:ro" -v "$BACKUP_DIR:/backup" "$IMAGE" \
        -c "tar czf /backup/$file -C / data && chown $(id -u):$(id -g) /backup/$file"
    else
      tar czf "$BACKUP_DIR/$file" -C "$DIR" data
    fi
    # Ne garde que les N dernières sauvegardes
    # shellcheck disable=SC2012
    ls -1t "$BACKUP_DIR"/etudiantia-data-*.tar.gz 2>/dev/null | tail -n +$((KEEP_BACKUPS + 1)) | xargs -r rm -f
  }

  # ── Construction + démarrage + contrôle de santé ─────────────────────────────
  wait_healthy() {
    local waited=0 status
    log "⏳ Attente du démarrage (max ${HEALTH_TIMEOUT}s)…"
    while (( waited < HEALTH_TIMEOUT )); do
      status="$("${DOCKER[@]}" inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$CONTAINER" 2>/dev/null || echo missing)"
      if [[ "$status" == "healthy" ]]; then return 0; fi
      if ! container_running && (( waited > 10 )); then return 1; fi
      if [[ "$status" == "unhealthy" ]]; then return 1; fi
      sleep 3; waited=$((waited + 3))
    done
    return 1
  }

  deploy() {
    "${DC[@]}" build --pull || return 1
    "${DC[@]}" up -d --remove-orphans || return 1
    wait_healthy
  }

  # ── Programme principal ──────────────────────────────────────────────────────
  BRANCH="$(git rev-parse --abbrev-ref HEAD)"
  [[ "$BRANCH" != "HEAD" ]] || die "Dépôt en « detached HEAD » : place-toi sur une branche (git checkout main)."

  if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
    git status --short --untracked-files=no
    die "Des fichiers suivis par Git ont été modifiés localement (liste ci-dessus). Annule-les (git checkout -- .) ou commite-les, puis relance."
  fi

  log "🔎 Recherche de mises à jour (branche $BRANCH)…"
  git fetch --quiet origin "$BRANCH" || die "Impossible de joindre GitHub (connexion Internet de la VM ?)."

  OLD="$(git rev-parse HEAD)"
  REMOTE="$(git rev-parse "origin/$BRANCH")"
  FAILED_FILE="$DIR/.update-failed"

  # Une version qui a déjà échoué n'est pas retentée chaque nuit : on attend un correctif
  if [[ $FORCE -eq 0 && -f "$FAILED_FILE" && "$(cat "$FAILED_FILE")" == "$REMOTE" ]]; then
    log "⏸️  La version $(git rev-parse --short "$REMOTE") a déjà échoué ; en attente d'une version corrigée (ou ./update-freebox.sh --force)."
    exit 0
  fi

  if [[ "$OLD" == "$REMOTE" && $FORCE -eq 0 ]]; then
    if container_running; then
      log "✅ Déjà à jour ($(git rev-parse --short HEAD)). Rien à faire."
      exit 0
    fi
    log "ℹ️  Code à jour mais l'application est arrêtée : démarrage."
  fi

  if [[ "$OLD" != "$REMOTE" ]]; then
    git merge-base --is-ancestor "$OLD" "$REMOTE" || die "L'historique local et GitHub ont divergé. Mise à jour annulée (aucune donnée touchée)."
    log "🆕 Nouvelle version disponible :"
    git log --oneline --no-decorate "$OLD..$REMOTE" | head -10 | sed 's/^/     • /'
  fi

  [[ $NO_BACKUP -eq 1 ]] || backup_data

  if [[ "$OLD" != "$REMOTE" ]]; then
    git merge --ff-only --quiet "origin/$BRANCH" || die "Fusion impossible."
  fi
  NEW="$(git rev-parse HEAD)"

  log "🔨 Construction et démarrage ($(git rev-parse --short "$OLD") → $(git rev-parse --short "$NEW"))…"
  if deploy; then
    rm -f "$FAILED_FILE"
    "${DOCKER[@]}" image prune -f >/dev/null 2>&1 || true
    log "✅ Mise à jour terminée — l'application répond. Version : $(git rev-parse --short HEAD)"
    exit 0
  fi

  # ── Échec : retour automatique à la version précédente ───────────────────────
  log "⚠️  La nouvelle version ne démarre pas. Dernières lignes du journal :"
  "${DC[@]}" logs --tail 30 2>&1 | sed 's/^/     /' || true

  echo "$NEW" > "$FAILED_FILE"
  if [[ "$OLD" != "$NEW" ]]; then
    log "↩️  Retour à la version précédente ($(git rev-parse --short "$OLD"))…"
    git reset --hard --quiet "$OLD"
    if deploy; then
      log "✅ Ancienne version restaurée et fonctionnelle. Tes données n'ont pas été touchées."
    else
      log "❌ L'ancienne version ne démarre pas non plus. Vérifie le fichier .env et : docker compose logs"
    fi
  fi
  die "Mise à jour échouée."
}

main "$@"; exit $?
