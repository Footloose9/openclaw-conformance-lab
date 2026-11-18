import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const expected = [
  {
    "file": "acpx-old-owner-queue-reject.public.test.ts",
    "tap": "acpx-old-owner.tap",
    "caseNames": [
      "acpx old-owner: dedicated CLI config request kind is unrecognized",
      "acpx old-owner control: familiar queue config request remains valid"
    ]
  },
  {
    "file": "acpx-cli-opaque-set.public-regression.test.ts",
    "tap": "acpx-r027.tap",
    "caseNames": [
      "acpx #1005: non-model option must preserve exact padded value",
      "acpx #1005 control: ordinary non-model option passes unchanged",
      "acpx #1005 control: existing key normalization remains separate"
    ]
  },
  {
    "file": "acpx-model-control-contract.public.test.ts",
    "tap": "acpx-r028.tap",
    "caseNames": [
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
    "file": "acpx-cli-model-intent-r030.public.test.ts",
    "tap": "acpx-r030.tap",
    "caseNames": [
      "acpx candidate: CLI non-model literal survives argument admission",
      "acpx candidate: non-model exact values survive CLI routing",
      "acpx candidate: nonliteral model category normalizes CLI model input",
      "acpx candidate: embedded model value remains untrimmed",
      "acpx candidate: fresh catalog controls which model ID gets normalized",
      "acpx R030: dedicated queue control kind preserves raw model input",
      "acpx R030: legacy queue control remains exact and has no CLI intent",
      "acpx R030: no inline intent flags or blank values can bypass queue validation",
      "acpx R030: unrecognized owner request kind is rejected rather than downgraded"
    ]
  }
];
const outcomes = expected.map(({file,tap,caseNames}) => {
  const log = readFileSync("harness/out/" + tap, "utf8");
  const observations = log.split(/\r?\n/u).filter(x => /^(?:ok|not ok) \d+ - /u.test(x))
    .map(x => /^(ok|not ok) \d+ - (.+)$/u.exec(x))
    .map(m => ({ status: m?.[1], name: m?.[2]?.replaceAll("\\#", "#") }));
  const counts = Object.fromEntries([...log.matchAll(/^# (tests|pass|fail|cancelled|skipped|todo) (\d+)\s*$/gmu)]
    .map(m => [m[1], Number(m[2])]));
  const identityOk = observations.length === caseNames.length &&
    caseNames.every((name,i) => observations[i]?.status === "ok" && observations[i]?.name === name);
  const countsOk = counts.tests === caseNames.length && counts.pass === caseNames.length &&
    counts.fail === 0 && counts.cancelled === 0 && counts.skipped === 0 && counts.todo === 0;
  return {file, counts, identityOk, countsOk, verified: identityOk && countsOk};
});
const result = {status: outcomes.every(x => x.verified) ? "PASS_R030_SCOPED_SOURCE_COMPATIBILITY" : "HOLD_R030_SOURCE_COMPATIBILITY",
  upstreamPin:"48c1615057ae43893f80868f81cd3ee0445eb0ae",
  patchSha256:"6EF2495073C3A0E4136A3DB5BA3D773967CC8AF0E83D66459F8A8379D26A9734",
  sourceCases:22, outcomes,
  limitation:"Old-owner evidence is pinned unmodified source parser rejection, not live mixed-version owner socket E2E"};
writeFileSync("harness/out/acpx-r030-summary.json", JSON.stringify(result,null,2)+"\n");
console.log("ACPX_R030_GATE:",JSON.stringify(result));
assert.ok(outcomes.every(x => x.verified), "Only 22 exactly named passing cases qualify");
