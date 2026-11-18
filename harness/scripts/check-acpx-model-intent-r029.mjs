import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const cases = [
  {
    "file": "acpx-cli-opaque-set.public-regression.test.ts",
    "tap": "acpx-r027.tap",
    "tests": [
      "acpx #1005: non-model option must preserve exact padded value",
      "acpx #1005 control: ordinary non-model option passes unchanged",
      "acpx #1005 control: existing key normalization remains separate"
    ]
  },
  {
    "file": "acpx-model-control-contract.public.test.ts",
    "tap": "acpx-r028.tap",
    "tests": [
      "acpx model-control: nonliteral model category is discovered",
      "acpx model-control: non-model input remains byte-exact at runtime",
      "acpx model-control: advertised model applies under a nonliteral config ID",
      "acpx model-control: embedded opaque model value is not implicitly trimmed",
      "acpx model-control: refreshed catalog overrides an obsolete model config ID",
      "acpx model-control: queue parser preserves padded non-model option values",
      "acpx model-control: queue rejects whitespace-only values",
      "acpx model-control: existing CLI model parser and shorthand normalization remain distinct"
    ]
  },
  {
    "file": "acpx-cli-model-intent.public.test.ts",
    "tap": "acpx-r029.tap",
    "tests": [
      "acpx candidate: CLI non-model literal survives argument admission",
      "acpx candidate: non-model exact values survive CLI routing",
      "acpx candidate: nonliteral model category normalizes CLI model input",
      "acpx candidate: embedded model value remains untrimmed",
      "acpx candidate: fresh catalog controls which model ID gets normalized",
      "acpx candidate: queue preserves typed CLI model intent and raw text",
      "acpx candidate: invalid or absent queue intent cannot become true"
    ]
  }
];
const outcome = cases.map(({ file, tap, tests }) => {
  const log = readFileSync("harness/out/" + tap, "utf8");
  const observed = log.split(/\r?\n/u).filter(x => /^(?:ok|not ok) \d+ - /u.test(x)).map(x => {
    const match = /^(ok|not ok) \d+ - (.+)$/u.exec(x);
    return { status: match?.[1], name: match?.[2]?.replaceAll("\\#", "#") };
  });
  const counters = Object.fromEntries([...log.matchAll(/^# (tests|pass|fail|cancelled|skipped|todo) (\d+)\s*$/gmu)].map(m => [m[1], Number(m[2])]));
  const exactNames = observed.length === tests.length && tests.every((name, i) => observed[i]?.status === "ok" && observed[i]?.name === name);
  const exactCount = counters.tests === tests.length && counters.pass === tests.length && counters.fail === 0 && counters.cancelled === 0 && counters.skipped === 0 && counters.todo === 0;
  return { file, exactNames, exactCount, counters, observed, verified: exactNames && exactCount };
});
const result = { status: outcome.every(x=>x.verified) ? "PASS_CANDIDATE_EXACT_SOURCE_CASES" : "HOLD_UNEXPECTED_TEST_RESULT", expectedCounts:[3,8,7], upstreamPin:"48c1615057ae43893f80868f81cd3ee0445eb0ae", patchSha256:"DFF7390CF7B85813D83D66A38D0F7AC1DDD0A96F8F3BF909DED51B274A6AC8E2", outcomes: outcome, scope:"CLI argument, source helper, queue parser; not live old-owner compatibility" };
writeFileSync("harness/out/acpx-candidate-r029-summary.json", JSON.stringify(result,null,2)+"\n");
console.log("ACPX_CANDIDATE_R029_GATE:",JSON.stringify(result));
assert.equal(outcome.every(x=>x.verified),true,"Only exact passing production candidate tests are accepted");
