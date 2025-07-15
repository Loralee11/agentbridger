// core/sendTask.js

const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { writeStatus, appendLog } = require("../statusManager"); // ✅ New

function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (e) {
    return false;
  }
}

function simulateAIResponse(taskText) {
  return `[Simulated AI reply to task: '${taskText}']`;
}

function archiveResult(taskId, result) {
  const dir = path.join(__dirname, "..", "task-results");
  fs.mkdirSync(dir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(dir, `${taskId}_result.json`);
  fs.writeFileSync(file, JSON.stringify(result, null, 2));
}

function archiveError(taskId, message, payload) {
  const dir = path.join(__dirname, "..", "relay_errors");
  fs.mkdirSync(dir, { recursive: true });

  const file = path.join(dir, `${taskId}_error.json`);
  fs.writeFileSync(file, JSON.stringify({ error: message, payload }, null, 2));
}

async function sendTaskOutbound(task, taskId) {
  const replyTo = task.replyTo;
  const logPrefix = `[outbound → ${replyTo}]`;

  if (!replyTo || !isValidUrl(replyTo)) {
    const error = `❌ Invalid or missing replyTo URL`;
    console.warn(`${logPrefix} ${error}`);
    archiveError(taskId, error, task);
    writeStatus(taskId, "error", [error]);
    return;
  }

  writeStatus(taskId, "queued", [`Preparing to send to ${replyTo}`]);

  try {
    const res = await axios.post(replyTo, task, {
      headers: { "Content-Type": "application/json" },
      timeout: 5000,
    });

    console.log(`${logPrefix} ✅ POST successful (${res.status})`);
    archiveResult(taskId, res.data);
    writeStatus(taskId, "done", [`✅ Sent successfully to ${replyTo}`]);
  } catch (err) {
    console.warn(`${logPrefix} ⚠️ POST failed. Retrying once...`);
    appendLog(taskId, `Retrying once after error: ${err.message}`);

    try {
      const retryRes = await axios.post(replyTo, task, {
        headers: { "Content-Type": "application/json" },
        timeout: 5000,
      });

      console.log(`${logPrefix} ✅ Retry successful (${retryRes.status})`);
      archiveResult(taskId, retryRes.data);
      writeStatus(taskId, "done", [`✅ Retry succeeded to ${replyTo}`], 1);
    } catch (retryErr) {
      const msg = retryErr?.message || "Retry failed";
      console.error(`${logPrefix} ❌ Retry failed: ${msg}`);
      archiveError(taskId, msg, task);
      writeStatus(taskId, "error", [`❌ Retry failed: ${msg}`], 2);
    }
  }
}

// ✅ If used from CLI: simulate and store result locally
if (require.main === module) {
  const [, , taskFilePath] = process.argv;

  if (!taskFilePath) {
    console.error("Usage: node core/sendTask.js <path-to-task-file>");
    process.exit(1);
  }

  const fullPath = path.resolve(taskFilePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ File not found: ${taskFilePath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(fullPath, "utf-8");
  const task = JSON.parse(raw);
  const taskId = path.basename(taskFilePath).replace(/\.json$/, "");

  if (task.replyTo && isValidUrl(task.replyTo)) {
    sendTaskOutbound(task, taskId);
  } else {
    const result = {
      taskId,
      receivedFrom: task.from || "Unknown",
      inputTask: task.task,
      output: simulateAIResponse(task.task),
      status: "simulated",
      timestamp: new Date().toISOString(),
    };

    archiveResult(taskId, result);
    console.log(`✅ Simulated task processed. Result written for: ${taskId}`);
  }
}

module.exports = { sendTaskOutbound };
