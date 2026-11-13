// Checks that every language file has exactly the same keys as English.
// Run: npm run i18n:check
import { readFileSync, readdirSync } from "node:fs";

const dir = "messages";
const flatten = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([key, value]) =>
    typeof value === "object" && value !== null
      ? flatten(value, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );

const load = (file) => JSON.parse(readFileSync(`${dir}/${file}`, "utf8"));
const base = new Set(flatten(load("en.json")));
let failed = false;

for (const file of readdirSync(dir).filter(
  (f) => f.endsWith(".json") && f !== "en.json",
)) {
  const keys = new Set(flatten(load(file)));
  const missing = [...base].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !base.has(k));
  if (missing.length || extra.length) {
    failed = true;
    console.error(`${file}: missing [${missing.join(", ")}] extra [${extra.join(", ")}]`);
  }
}

if (failed) process.exit(1);
console.log("All language files match en.json");
