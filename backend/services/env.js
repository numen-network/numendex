const path = require("path");
const dotenv = require("dotenv");

const ROOT_ENV_PATH = path.resolve(__dirname, "../../.env");
dotenv.config({ path: ROOT_ENV_PATH });

function required(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function number(name, fallback) {
  const raw = String(process.env[name] ?? "").trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`Invalid numeric environment variable: ${name}`);
  return value;
}

function list(name, fallback = []) {
  const raw = String(process.env[name] || "").trim();
  if (!raw) return fallback;
  return raw.split(",").map((item) => item.trim()).filter(Boolean);
}

module.exports = {
  ROOT_ENV_PATH,
  required,
  number,
  list,
};
