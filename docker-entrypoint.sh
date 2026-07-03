#!/bin/sh
# Runs the app as UID:GID from the environment (set them in .env.local),
# fixing ownership of the mounted data/uploads dirs first.
set -e

RUN_UID="${UID:-1000}"
RUN_GID="${GID:-1000}"

# The run user may have no passwd entry; keep HOME writable
export HOME=/tmp

if [ "$(id -u)" = "0" ]; then
  chown -R "$RUN_UID:$RUN_GID" /app/data /app/uploads /app/.next
  exec setpriv --reuid "$RUN_UID" --regid "$RUN_GID" --clear-groups -- "$@"
fi

exec "$@"
