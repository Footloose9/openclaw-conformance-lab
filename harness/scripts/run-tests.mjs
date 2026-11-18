import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const harness = fileURLToPath(new URL("../", import.meta.url));
const vitest = join(harness, "node_modules", "vitest", "vitest.mjs");
const out = join(harness, "out");
mkdirSync(out, { recursive: true });
const summary = [];
let valid = true;
for (const variant of ["red", "green"]) {
  const file = join(out, variant + ".json");
  const command = [
    vitest, "run",
    "work/" + variant + "/src/agents/prepared-model-runtime.publication-events.test.ts",
    "--pool=forks", "--maxWorkers=1", "--no-file-parallelism",
    "--reporter=json", "--outputFile=" + file
  ];
  const result = spawnSync(process.execPath, command, {
    cwd: harness, encoding: "utf8", timeout: 100000,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, CI: "true", NODE_OPTIONS: "--max-old-space-size=1024" }
  });
  let data;
  try {
    data = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    summary.push({ variant, ok: false, exitCode: result.status, error: "Missing test JSON",
      stderr: (result.stderr || "").slice(-1200) });
    valid = false;
    continue;
  }
  const failedNames = data.testResults.flatMap((item) =>
    item.assertionResults.filter((item) => item.status === "failed").map((item) => item.fullName));
  const expectedFailureNames = [
    "records each failed background provider acquisition without exposing pending status",
    "retains the silent failed-provider scope after sibling publication"
  ];
  const expected = variant === "red" ? { exit: 1, passed: 4, failed: 2 } :
    { exit: 0, passed: 6, failed: 0 };
  const ok = result.status === expected.exit && data.numTotalTests === 6 &&
    data.numPassedTests === expected.passed && data.numFailedTests === expected.failed &&
    (variant === "green" || expectedFailureNames.every((name) =>
      failedNames.some((failure) => failure.includes(name))));
  summary.push({ variant, ok, exitCode: result.status, total: data.numTotalTests,
    passed: data.numPassedTests, failed: data.numFailedTests, failedNames });
  valid &&= ok;
  console.log(variant.toUpperCase() + ": " + (ok ? "PASS" : "FAIL") +
    " (" + data.numPassedTests + " pass / " + data.numFailedTests + " fail; exit " + result.status + ")");
}
writeFileSync(join(out, "summary.json"), JSON.stringify({
  scope: "Pinned upstream source + real Vitest + synthetic service boundaries",
  sourceEvidence: "source-evidence.json",
  success: valid, scenarios: summary,
  fullUpstreamSuite: false, liveGatewayE2E: false
}, null, 2) + "\n");
assert.equal(valid, true, "Expected real-Vitest baseline red / correction green evidence not established");
