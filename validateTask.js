const fs = require("fs");
const path = require("path");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");

// Load and compile schema
const schemaPath = path.join(__dirname, "task.schema.json");
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

// Main function
function validateTask(task) {
  console.log("[validateTask] Raw incoming task:", task);

  // Normalize snake_case and camelCase variants
  task.taskId = task.taskId || task.task_id;
  task.origin_agent = task.origin_agent || task.originAgent;
  task.destination_agent = task.destination_agent || task.destinationAgent;
  task.task_type = task.task_type || task.taskType;
  task.manualApproval = task.manualApproval ?? task.manual_approval;
  task.replyTo = task.replyTo || task.reply_to;
  task.prompt = task.prompt; // preserve

  const valid = validate(task);
  if (!valid) {
    console.warn("[validateTask] ❌ Validation failed:", validate.errors);
    return {
      valid: false,
      errors: validate.errors.map(
        (err) => `[${err.instancePath || "/"}] ${err.message}`,
      ),
    };
  }
  return { valid: true };
}

module.exports = validateTask;
