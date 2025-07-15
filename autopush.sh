#!/bin/bash

BRANCH="main"
cd "$(dirname "$0")"

if git diff --quiet && git diff --cached --quiet; then
  echo "[git] No changes to push."
  exit 0
fi

LOCKFILE=".push.lock"
if [ -f "$LOCKFILE" ]; then
  echo "[git] Push already in progress."
  exit 1
fi

touch "$LOCKFILE"

echo "[git] Committing and pushing changes..."
TASK_ID=$(date +%s)
git add .
git commit -m "[auto] Add task ${TASK_ID}"
git push origin "$BRANCH"

rm -f "$LOCKFILE"
