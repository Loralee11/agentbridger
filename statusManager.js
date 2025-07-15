// statusManager.js
const fs = require("fs");
const path = require("path");

const STATUS_DIR = path.join(__dirname, "task-status");

function ensureStatusDir() {
  if (!fs.existsSync(STATUS_DIR)) {
    fs.mkdirSync(STATUS_DIR, { recursive: true });
  }
}

function getStatusFilePath(taskId) {
  return path.join(STATUS_DIR, `${taskId}_status.json`);
}

function writeStatus(taskId, status, logs = [], retries = 0) {
  ensureStatusDir();
  const data = {
    taskId,
    status,
    retries,
    logs,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(getStatusFilePath(taskId), JSON.stringify(data, null, 2));
}

function appendLog(taskId, message) {
  const filePath = getStatusFilePath(taskId);
  let existing = { logs: [], retries: 0 };

  if (fs.existsSync(filePath)) {
    existing = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }

  existing.logs.push(`[${new Date().toISOString()}] ${message}`);
  existing.updatedAt = new Date().toISOString();

  fs.writeFileSync(filePath, JSON.stringify(existing, null, 2));
}

module.exports = {
  writeStatus,
  appendLog,
};
