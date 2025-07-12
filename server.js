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

// Test endpoint to confirm it works
app.get("/", (req, res) => {
  res.send("Relay Server is active");
});

// Endpoint to receive fix suggestions from ChatGPT
app.post("/submit-fix", (req, res) => {
  const { filename, code } = req.body;

  if (!filename || !code) {
    return res.status(400).json({ error: "filename and code required" });
  }

  const targetPath = path.join(__dirname, "fixes", filename);

  // Ensure /fixes folder exists
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  // Write file
  fs.writeFile(targetPath, code, "utf8", (err) => {
    if (err) {
      console.error("Error writing fix:", err);
      return res.status(500).json({ error: "Failed to write file" });
    }

    console.log(`Fix saved: ${filename}`);
    res.status(200).json({ message: "Fix saved" });
  });
});
// Test route to verify server is running
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
