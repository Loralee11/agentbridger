// server.js

const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");

const app = express();

// Middleware to parse JSON
app.use(bodyParser.json());

// Optional: Enable CORS if calling this from browser extension
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// ✅ Load config.json if present
let config = { logMode: "verbose" };
try {
  const configFile = fs.readFileSync("config.json", "utf-8");
  config = JSON.parse(configFile);
} catch (err) {
  console.log("No config.json found or invalid — using default config.");
}

// ✅ New endpoint: POST /relay-test
app.post("/relay-test", (req, res) => {
  const payload = req.body;
  if (config.logMode === "verbose") {
    console.log("[/relay-test] Payload received:");
    console.log(JSON.stringify(payload, null, 2));
  }
  res.json({ status: "OK", received: true });
});

// ✅ New endpoint: POST /relay — now with file write
app.post("/relay", (req, res) => {
  const payload = req.body;

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

// ✅ Rewritten: POST /incoming — ChatGPT submits task
app.post("/incoming", (req, res) => {
  const task = req.body;

  if (!task || !task.from || !task.task || !task.replyTo) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const dir = path.join(__dirname, "relay_tasks");
  fs.mkdirSync(dir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `incoming_${timestamp}.json`;
  const filepath = path.join(dir, filename);

  fs.writeFile(filepath, JSON.stringify(task, null, 2), "utf-8", (err) => {
    if (err) {
      console.error("❌ Failed to save incoming task!");
      console.error(err.stack || err);
      return res.status(500).json({ error: "Write failed" });
    }

    console.log(`✅ Incoming task saved: ${filename}`);
    res.status(200).json({
      status: "received_and_saved",
      filename,
      timestamp: new Date().toISOString(),
    });
  });
});

