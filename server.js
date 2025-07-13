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

// Existing: root test
app.get("/", (req, res) => {
  res.send("Relay Server is active");
});

// Existing: submit-fix
app.post("/submit-fix", (req, res) => {
  const { filename, code } = req.body;

  if (!filename || !code) {
    return res.status(400).json({ error: "filename and code required" });
  }

  const targetPath = path.join(__dirname, "fixes", filename);

  // Ensure /fixes folder exists
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });

  fs.writeFile(targetPath, code, "utf8", (err) => {
    if (err) {
      console.error("Error writing fix:", err);
      return res.status(500).json({ error: "Failed to write file" });
    }

    console.log(`Fix saved: ${filename}`);
    res.status(200).json({ message: "Fix saved" });
  });
});

// Existing: test route
app.get("/test", (req, res) => {
  res.json({
    status: "OK",
    message: "Test route is working.",
    timestamp: new Date().toISOString(),
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Relay server listening on port ${PORT}`);
});
