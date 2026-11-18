import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const upstream = join(root, "upstream");
const harness = join(root, "harness");
const patch = join(root, "patches", "openclaw-catalog-retry-r018.patch");
const pin = "cf5cf7a8c609d8b26bd81495634eda973a2e4742";
const sha = (file) => createHash("sha256").update(readFileSync(file)).digest("hex").toUpperCase();
const source = (relative) => join(upstream, ...relative.split("/"));
const runGit = (...args) => {
  const result = spawnSync("git", ["-C", upstream, ...args], {
    encoding: "utf8", timeout: 12000, stdio: ["ignore", "pipe", "pipe"]
  });
  assert.equal(result.status, 0, "git " + args.join(" ") + ": " + (result.stderr || "").slice(-1200));
  return (result.stdout || "").trim();
};
assert.equal(runGit("rev-parse", "HEAD"), pin, "Upstream must be pinned");
assert.equal(runGit("status", "--porcelain=v1"), "", "No pre-existing upstream edits");
assert.equal(sha(patch), "E316D1BE4B6F0931987B159FC4A84E9CB3CD0ABF1F1AADDA58F1239F52B00C39");

const paths = {
  reporter: "src/agents/prepared-model-runtime.publication-events.ts",
  catalog: "src/agents/prepared-model-runtime.catalog-access.ts",
  test: "src/agents/prepared-model-runtime.publication-events.test.ts"
};
const original = {
  reporter: "A1FF9E0B4C4C64B3BD05A55D9A1346B6674F65D2E7F46876A869C9FF33AB13F6",
  catalog: "22A711910CA64A5BD29854F4F1ACB1E7EC7A4DD95FFE8FE611AAD474E00433F0",
  test: "312F6B49843B984234D64C58E21FD97A8274F1E1B50860662789537F7E7B52CC"
};
const patched = {
  reporter: "87B00ABCF14DACAD646A81C99D48D2241C18F76D260BD585D8AF43B7EC9DF508",
  catalog: "DF5E5F43E77FC193AAA63BF9C468651AC90175F374841040B40446C52FDE76E3",
  test: "4F352C2DAFBDFAC3232D793DD41F61E4DF23ACCDA306FCAAADE2CBCD8B3D52B2"
};
for (const [key, path] of Object.entries(paths)) {
  assert.equal(sha(source(path)), original[key], "Original upstream source mismatch: " + path);
}
const work = join(harness, "work");
assert.equal(existsSync(work), false, "Refuse to overwrite an existing generated fixture");
const writeCopy = (from, relative) => {
  const to = join(work, ...relative.split("/"));
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
};
writeCopy(source(paths.reporter), "red/" + paths.reporter);
runGit("apply", "--check", patch);
runGit("apply", patch);
for (const [key, path] of Object.entries(paths)) {
  assert.equal(sha(source(path)), patched[key], "Patched upstream source mismatch: " + path);
}
for (const variant of ["red", "green"]) {
  if (variant === "green") writeCopy(source(paths.reporter), variant + "/" + paths.reporter);
  writeCopy(source(paths.test), variant + "/" + paths.test);
  for (const path of [
    "src/logging/subsystem.ts",
    "src/shared/listeners.ts",
    "src/agents/prepared-model-runtime.errors.ts"
  ]) {
    writeCopy(join(harness, "stubs", ...path.split("/")), variant + "/" + path);
  }
}
const output = join(harness, "out");
mkdirSync(output, { recursive: true });
writeFileSync(join(output, "source-evidence.json"), JSON.stringify({
  upstream: "openclaw/openclaw", commit: pin, patchSha256: sha(patch),
  sourceBaseline: original, patchedSource: patched,
  serviceDependencies: "three synthetic stand-ins; no real Gateway"
}, null, 2) + "\n");
console.log("PASS: exact pinned upstream + reviewed patch applied; red/green source fixtures prepared");
