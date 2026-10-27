#!/bin/sh
# Prépare /data (droits d'écriture) puis lance l'application sans privilèges.
set -e
DATA="${DATA_DIR:-/data}"

if [ "$(id -u)" = "0" ]; then
  mkdir -p "$DATA"
  chown -R node:node "$DATA"
  exec su-exec node "$@"
fi

exec "$@"
