import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const log = readFileSync(join(root, "harness", "out", "acpx-baseline.tap"), "utf8");
const tests = [
  { name: "acpx #1005: non-model option must preserve exact padded value", result: "not ok" },
  { name: "acpx #1005 control: ordinary non-model option passes unchanged", result: "ok" },
  { name: "acpx #1005 control: existing key normalization remains separate", result: "ok" },
];
const observed = log
  .split(/\r?\n/u)
  .filter((line) => /^(?:not ok|ok) \d+ - /u.test(line))
  .map((line) => {
    const match = /^(not ok|ok) \d+ - (.+)$/u.exec(line);
    return { name: match?.[2] ?? "", result: match?.[1] ?? "" };
  });
const counters = Object.fromEntries(
  [...log.matchAll(/^# (tests|pass|fail|cancelled|skipped|todo) (\d+)\s*$/gmu)]
    .map((match) => [match[1], Number(match[2])]),
);
const countsPass = counters.tests === 3 && counters.pass === 2 &&
  counters.fail === 1 && (counters.cancelled ?? 0) === 0;
const namesAndStatusesPass = tests.length === observed.length &&
  tests.every((expected, index) =>
    expected.name === observed[index]?.name &&
    expected.result === observed[index]?.result);
const result = {
  status: countsPass && namesAndStatusesPass
    ? "EXPECTED_BASELINE_REGRESSION_CONFIRMED"
    : "HOLD_UNEXPECTED_TEST_RESULT",
  testedFile: "test/acpx-cli-opaque-set.public-regression.test.ts",
  exactUpstreamCommit: "48c1615057ae43893f80868f81cd3ee0445eb0ae",
  issue: "https://github.com/openclaw/acpx/issues/1005",
  expected: tests,
  observed,
  counters,
  countsPass,
  namesAndStatusesPass,
  hasValidBaselineFailure: countsPass && namesAndStatusesPass,
};
writeFileSync(
  join(root, "harness", "out", "acpx-baseline-summary.json"),
  JSON.stringify(result, null, 2) + "\n",
);
console.log("ACPX_BASELINE_GATE:", JSON.stringify(result));
assert.equal(result.hasValidBaselineFailure, true,
  "Only the named non-model padded value failure qualifies as regression evidence");
