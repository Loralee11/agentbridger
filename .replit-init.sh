#!/bin/bash

# Start SSH agent and add key (needed for git push to work reliably)
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Auto-push logic before running app
git add .
git commit -m "Auto-deploy commit from Replit" || echo "No new changes to commit"
git push origin main || echo "Git push failed"

# Then start the server
node server.js
