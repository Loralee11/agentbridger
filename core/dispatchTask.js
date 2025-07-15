// core/dispatchTask.js

const axios = require("axios");
const fs = require("fs");
const path = require("path");

function dispatchTask(task) {
  const taskType = task.task;
  const taskId = task.taskId || "unknown";

  console.log(`🧠 dispatchTask() handling "${taskType}" — taskId: ${taskId}`);

  switch (taskType) {
    case "log":
      console.log(`📄 Task Log: ${JSON.stringify(task, null, 2)}`);
      break;

    case "create file":
    case "update file":
      console.log(`✍️ Would handle file write here: ${task.filename}`);
      // Placeholder for future file creation logic
      break;

    case "send":
    case "confirm":
      console.log(`📤 Forwarding or confirming agent task: ${taskId}`);

      const replyTo = task.reply_to || task.replyTo;
      const timestamp = new Date().toISOString();
      const filename = `${taskId}_${timestamp.replace(/[:.]/g, "-")}`;

      if (!replyTo || !replyTo.startsWith("http")) {
        console.warn(`[dispatchTask] ⚠️ Invalid replyTo URL: ${replyTo}`);
        return;
      }

      const payload = {
        status: "received",
        task,
        timestamp,
      };

      axios
        .post(replyTo, payload)
        .then((res) => {
          const result = {
            status: "relay_success",
            statusCode: res.status,
            response: res.data,
            task,
            timestamp,
          };

          // ✅ Ensure result folder exists
          fs.mkdirSync("relay_results", { recursive: true });

          const resultFile = path.join("relay_results", `${filename}.json`);
          fs.writeFileSync(resultFile, JSON.stringify(result, null, 2));
          console.log(`[dispatchTask] ✅ Sent to ${replyTo}`);
        })
        .catch((error) => {
          const errorResult = {
            status: "relay_failed",
            error: error.message,
            stack: error.stack,
            task,
            timestamp,
          };
          const errorFile = path.join("relay_errors", `${filename}_error.json`);
          fs.writeFileSync(errorFile, JSON.stringify(errorResult, null, 2));
          console.warn(`[dispatchTask] ⚠️ Failed to send to ${replyTo}`);
        });

      break;

    default:
      console.warn(`⚠️ Unknown task type: ${taskType}`);
  }
}

module.exports = { dispatchTask };
