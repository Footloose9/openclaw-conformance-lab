import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const repo = process.cwd();
const source = join(repo, "upstream");
const outputs = join(repo, "harness", "out");
mkdirSync(outputs, { recursive: true });
const patchPath = join(repo, "patches", "openclaw-catalog-retry-r018.patch");
const pin = "cf5cf7a8c609d8b26bd81495634eda973a2e4742";
const hash = (path) => createHash("sha256").update(readFileSync(path)).digest("hex").toUpperCase();
const git = (...args) => {
  const done = spawnSync("git", ["-C", source, ...args], {
    encoding: "utf8", timeout: 15000, stdio: ["ignore", "pipe", "pipe"]
  });
  assert.equal(done.status, 0, (done.stderr || "").slice(-1600));
  return done.stdout.trim();
};
const files = {
  "src/agents/prepared-model-runtime.catalog-access.ts": [
    "22A711910CA64A5BD29854F4F1ACB1E7EC7A4DD95FFE8FE611AAD474E00433F0",
    "DF5E5F43E77FC193AAA63BF9C468651AC90175F374841040B40446C52FDE76E3"
  ],
  "src/agents/prepared-model-runtime.publication-events.ts": [
    "A1FF9E0B4C4C64B3BD05A55D9A1346B6674F65D2E7F46876A869C9FF33AB13F6",
    "87B00ABCF14DACAD646A81C99D48D2241C18F76D260BD585D8AF43B7EC9DF508"
  ],
  "src/agents/prepared-model-runtime.publication-events.test.ts": [
    "312F6B49843B984234D64C58E21FD97A8274F1E1B50860662789537F7E7B52CC",
    "4F352C2DAFBDFAC3232D793DD41F61E4DF23ACCDA306FCAAADE2CBCD8B3D52B2"
  ]
};
assert.equal(git("rev-parse", "HEAD"), pin);
assert.equal(git("status", "--porcelain=v1"), "");
assert.equal(hash(patchPath), "E316D1BE4B6F0931987B159FC4A84E9CB3CD0ABF1F1AADDA58F1239F52B00C39");
for (const [relative, [original]] of Object.entries(files)) {
  assert.equal(hash(join(source, relative)), original, "Source drift: " + relative);
}
git("apply", "--check", patchPath);
git("apply", patchPath);
assert.equal(git("diff", "--check"), "");
for (const [relative, [, corrected]] of Object.entries(files)) {
  assert.equal(hash(join(source, relative)), corrected, "Patch mismatch: " + relative);
}
const changed = git("diff", "--name-only").split("\n").filter(Boolean);
assert.deepEqual(changed.sort(), Object.keys(files).sort());
const report = {
  upstream: "openclaw/openclaw", commit: pin, patchSha256: hash(patchPath),
  files, onlyExpectedPathsChanged: true, gatewayRunning: false,
  validatedAtUTC: new Date().toISOString()
};
writeFileSync(join(outputs, "real-upstream-source.json"), JSON.stringify(report, null, 2) + "\n");
console.log("PASS: actual upstream source revision, patch applicability, three-file integrity");
