// server.js

const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { sendTaskOutbound } = require("./core/sendTask"); // ✅ New import
const validateTask = require("./validateTask"); // ✅ Schema validator
const { dispatchTask } = require("./core/dispatchTask"); // ✅ New dispatch logic
const { writeStatus } = require("./statusManager"); // ✅ Status tracking for approval flow

const app = express();
app.use(bodyParser.json());

// Optional: Enable CORS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// Load config
let config = { logMode: "verbose" };
try {
  const configFile = fs.readFileSync("config.json", "utf-8");
  config = JSON.parse(configFile);
} catch (err) {
  console.log("No config.json found or invalid — using default config.");
}

// POST /relay-test — test-only
app.post("/relay-test", (req, res) => {
  const payload = req.body;
  if (config.logMode === "verbose") {
    console.log("[/relay-test] Payload received:");
    console.log(JSON.stringify(payload, null, 2));
  }
  res.json({ status: "OK", received: true });
});

// POST /relay — save incoming relay file
app.post("/relay", (req, res) => {
  const payload = req.body;

  // ✅ Schema validation
  const { valid, errors } = validateTask(payload);
  if (!valid) {
    console.warn("[/relay] ❌ Invalid task format:", errors);
    return res
      .status(400)
      .json({ error: "Invalid task format", details: errors });
  }

  if (config.logMode === "verbose") {
    console.log("[/relay] Incoming payload:");
    console.log(JSON.stringify(payload, null, 2));
  }

  const dir = path.join(__dirname, "relay_tasks");
  fs.mkdirSync(dir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `relay_${timestamp}.json`;
  const filepath = path.join(dir, filename);

  fs.writeFile(filepath, JSON.stringify(payload, null, 2), "utf-8", (err) => {
    if (err) {
      console.error("❌ Failed to write file!");
      console.error(err.stack || err);
      return res.status(500).json({ error: "Failed to write file" });
    }

    console.log(`✅ Relay file saved: ${filename}`);
    res.status(200).json({
      status: "received_and_saved",
      filename,
      timestamp: new Date().toISOString(),
    });
  });
});

// POST /incoming — Save task + (conditionally) dispatch
app.post("/incoming", async (req, res) => {
  const task = req.body;

  // NEW: Normalize manualApproval from alternate casing (e.g., manual_approval)
  if (task.manual_approval && task.manualApproval === undefined) {
    task.manualApproval = task.manual_approval;
  }

  // ✅ Schema validation
  const { valid, errors } = validateTask(task);
  if (!valid) {
    console.warn("[/incoming] ❌ Invalid task format:", errors);
    return res
      .status(400)
      .json({ error: "Invalid task format", details: errors });
  }

  const dir = path.join(__dirname, "relay_tasks");
  fs.mkdirSync(dir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `incoming_${timestamp}.json`;
  const filepath = path.join(dir, filename);

  fs.writeFile(
    filepath,
    JSON.stringify(task, null, 2),
    "utf-8",
    async (err) => {
      if (err) {
        console.error("❌ Failed to save incoming task!");
        console.error(err.stack || err);
        return res.status(500).json({ error: "Write failed" });
      }

      console.log(`✅ Incoming task saved: ${filename}`);

      // NEW: Check for manual approval flag
      if (task.manualApproval === true) {
        console.log(`🟡 Task ${task.taskId} is awaiting manual approval.`);
        writeStatus(task.taskId, "pending_manual_approval", [
          "Task saved for review.",
        ]);
      } else {
        dispatchTask(task); // ✅ Auto-dispatch
        sendTaskOutbound(task, filename.replace(/\.json$/, ""));
      }

      res.status(200).json({
        status: "received_and_saved",
        filename,
        timestamp: new Date().toISOString(),
      });
    },
  );
});

// ✅ Unified /confirm — Save task replies into relay_results
app.post("/confirm", (req, res) => {
  const task = req.body;
  const taskId = task.taskId || "unknown";
  const timestamp = new Date().toISOString();

  console.log(`✅ /confirm received a task reply — taskId: ${taskId}`);
  console.log(JSON.stringify(task, null, 2));

  const filename = `confirm_${timestamp.replace(/[:.]/g, "-")}.json`;
  const filePath = path.join(__dirname, "relay_results", filename);

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(task, null, 2));

  res.status(200).json({ status: "confirm_received", taskId, timestamp });
});

// ✅ POST /approve/:taskId — manually approve queued task
app.post("/approve/:taskId", async (req, res) => {
  const taskId = req.params.taskId;
  const filePath = path.join(__dirname, "relay_tasks", `${taskId}.json`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Task not found" });
  }

  const task = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  console.log(`✅ Manually approving task ${taskId}...`);
  await dispatchTask(task);
  writeStatus(taskId, "approved_and_dispatched", ["Approved manually."]);

  res.status(200).json({ status: "approved_and_dispatched", taskId });
});

// ✅ POST /test/inject — Manual debug entrypoint
app.post("/test/inject", (req, res) => {
  console.log("[/test/inject] 🔍 Manual injection route hit.");
  res.json({ ok: true, message: "Test injection successful." });
});

// ✅ Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ AgentBridger relay server is running on port ${PORT}`);
});
