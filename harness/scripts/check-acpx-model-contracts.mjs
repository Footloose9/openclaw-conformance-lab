import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const names = [
  "acpx model-control: nonliteral model category is discovered",
  "acpx model-control: non-model input remains byte-exact at runtime",
  "acpx model-control: advertised model applies under a nonliteral config ID",
  "acpx model-control: embedded opaque model value is not implicitly trimmed",
  "acpx model-control: refreshed catalog overrides an obsolete model config ID",
  "acpx model-control: queue parser preserves padded non-model option values",
  "acpx model-control: queue rejects whitespace-only values",
  "acpx model-control: existing CLI model parser and shorthand normalization remain distinct",
];
const log = readFileSync("harness/out/acpx-model-contracts.tap", "utf8");
const observed = log.split(/\r?\n/u)
  .filter(line => /^(?:ok|not ok) \d+ - /u.test(line))
  .map(line => /^(ok|not ok) \d+ - (.+)$/u.exec(line))
  .map(match => ({ status: match?.[1], name: match?.[2]?.replaceAll("\\#", "#") }));
const counters = Object.fromEntries(
  [...log.matchAll(/^# (tests|pass|fail|cancelled|skipped|todo) (\d+)\s*$/gmu)]
    .map(match => [match[1], Number(match[2])]),
);
const exactCases = observed.length === names.length &&
  names.every((name, i) => observed[i]?.status === "ok" && observed[i]?.name === name);
const exactCounts = counters.tests === names.length &&
  counters.pass === names.length && counters.fail === 0 &&
  counters.cancelled === 0 && counters.skipped === 0 && counters.todo === 0;
const result = {
  status: exactCases && exactCounts ? "PASS_MODEL_CONTRACTS" : "HOLD_UNEXPECTED_MODEL_CONTRACTS",
  upstreamPin: "48c1615057ae43893f80868f81cd3ee0445eb0ae",
  exactCases,
  exactCounts,
  counters,
  observed,
  limit: "Pure source helper/queue message tests; not full direct/owner reconnect E2E",
};
mkdirSync("harness/out", { recursive: true });
writeFileSync("harness/out/acpx-model-contracts-summary.json", JSON.stringify(result, null, 2) + "\n");
console.log("ACPX_MODEL_CONTRACTS_GATE:", JSON.stringify(result));
assert.equal(exactCases && exactCounts, true, "Only eight exact passing cases qualify as evidence");
