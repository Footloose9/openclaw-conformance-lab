import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const out = join(root, "harness", "out");
const red = JSON.parse(readFileSync(join(out, "reporter-baseline.json"), "utf8"));
const green = JSON.parse(readFileSync(join(out, "reporter-corrected.json"), "utf8"));
const cases = (r) => (r.testResults ?? []).flatMap((suite) =>
  (suite.assertionResults ?? []).map((item) => ({
    name: String(item.fullName ?? item.title ?? ""),
    status: item.status,
    diagnostic: String(item.failureMessages?.[0] ?? "").slice(0, 500)
  })));
const redCases = cases(red);
const greenCases = cases(green);
const knownNew = [
  "records each failed background provider acquisition without exposing pending status",
  "retains the silent failed-provider scope after sibling publication"
];
const redFailed = redCases.filter((item) => item.status === "failed");
const greenPassed = greenCases.filter((item) => item.status === "passed");
const expectedRedNames = knownNew.every((name) =>
  redFailed.some((item) => item.name.includes(name)));
const namedCasesPreserved = redCases.length === greenCases.length &&
  redCases.map((v) => v.name).sort().join("\n") ===
    greenCases.map((v) => v.name).sort().join("\n");
const testPath = "src/agents/prepared-model-runtime.publication-events.test.ts";
const oneRealTestFileInBoth = [red, green].every((report) =>
  report.numTotalTestSuites >= 1 && report.testResults?.length === 1 &&
  report.testResults[0].name.replaceAll("\\", "/").endsWith(testPath)
);
const redGate = red.success === false && oneRealTestFileInBoth &&
  red.numTotalTests === 6 && red.numPassedTests === 4 &&
  red.numFailedTests === 2 && redFailed.length === 2 && expectedRedNames;
const greenGate = green.success === true && oneRealTestFileInBoth &&
  green.numTotalTests === 6 && green.numPassedTests === 6 &&
  green.numFailedTests === 0 && greenPassed.length === 6 &&
  namedCasesPreserved;
const summary = {
  gate: "OFFICIAL_UPSTREAM_AGENT_CORE_REPORTER_BASELINE_RED_CANDIDATE_GREEN",
  verifiedAtUtc: new Date().toISOString(),
  reference: "openclaw/openclaw@d2db7b2267faf4521b3c3a08acd062edd7cbf910",
  patchSha256: "E316D1BE4B6F0931987B159FC4A84E9CB3CD0ABF1F1AADDA58F1239F52B00C39",
  officialVitestProject: "test/vitest/vitest.agents-core.config.ts",
  realUpstreamModules: true,
  baseline: {
    tests: red.numTotalTests, passed: red.numPassedTests,
    failed: red.numFailedTests,
    expectedFailures: redFailed, verified: redGate
  },
  corrected: {
    tests: green.numTotalTests, passed: green.numPassedTests,
    failed: green.numFailedTests, verified: greenGate
  },
  namedCasesPreserved, success: redGate && greenGate
};
writeFileSync(join(out, "reporter-redgreen-summary.json"),
  JSON.stringify(summary, null, 2) + "\n");
console.log("REPORTER_RED_GREEN:", JSON.stringify({
  baseline: summary.baseline, corrected: summary.corrected,
  namedCasesPreserved, success: summary.success
}));
assert.equal(summary.success, true,
  "A source-specific red/green regression was NOT established");
