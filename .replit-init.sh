#!/bin/bash

# Auto-push logic before running app
git add .
git commit -m "Auto-deploy commit from Replit" || echo "No new changes to commit"
git push origin main

# Then start the server
node server.js
