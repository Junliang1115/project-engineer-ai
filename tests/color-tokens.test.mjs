import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Colours are defined once, as --app-* tokens in src/App.css; everything else must use var(--…).
const SRC = fileURLToPath(new URL("../src/", import.meta.url));
const COLOR = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+[^)]*\)/g;
// Allowed: palette definitions, macOS traffic-light dots, and black/white shadows or overlays.
const ALLOWED_LINE = /^\s*--app-[\w-]+\s*:|mac-dot-/;
const NEUTRAL_OVERLAY = /^rgba?\(\s*(0\s*,\s*0\s*,\s*0|255\s*,\s*255\s*,\s*255)\b/;

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "assets" ? [] : files(path);
    return /\.(css|jsx?)$/.test(name) ? [path] : [];
  });
}

const offenders = [];
for (const file of files(SRC)) {
  readFileSync(file, "utf8").split("\n").forEach((line, index) => {
    if (ALLOWED_LINE.test(line)) return;
    for (const match of line.match(COLOR) || []) {
      if (!NEUTRAL_OVERLAY.test(match)) offenders.push(`${file.slice(SRC.length)}:${index + 1} ${match}`);
    }
  });
}

assert.deepEqual(offenders, [], `Hard-coded colours found; use a palette token instead:\n${offenders.join("\n")}`);
console.log("color token tests passed");
