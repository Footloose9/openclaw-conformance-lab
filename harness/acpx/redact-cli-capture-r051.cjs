"use strict";
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const assert=require("node:assert/strict");
const [rawPath,jsonPath,mdPath]=process.argv.slice(2);
assert(rawPath&&jsonPath&&mdPath,"Pass private capture, public JSON and Markdown paths");
const rawBytes=fs.readFileSync(rawPath);
const privateHash=crypto.createHash("sha256").update(rawBytes).digest("hex").toUpperCase();
const original=JSON.parse(rawBytes);
assert.equal(original.sourceHead,"613e95c641a623d51710b8ee7b3ad954b3ae66b4");
assert.equal(original.predecessor,"acpx@0.22.0");
assert.equal(original.successful,true);
assert.equal(original.scenarios?.length,3);
assert.equal(original.captures?.length,13);
const codes=original.scenarios.flatMap(s=>s.steps.map(x=>x.exit));
assert.equal(codes.length,24);
assert.equal(codes.filter(x=>x===0).length,23);
assert.equal(codes.filter(x=>x===1).length,1);
const opaqueKeys=new Set([
  "acpxRecordId","acpxSessionId","acpSessionId","sessionId",
  "ownerGeneration","pid","processId","requestId","lastRequestId",
  "cwd","home","path","filePath","projectPath","socketPath","lockPath",
  "agentCommand","agentArgv","eventLog","messages","endpoint","url",
  "token","apiKey","authorization","accessToken"
]);
function scrub(value,key="") {
  if(opaqueKeys.has(key)||(/Id$/.test(key)&&!["modelId","configId","modeId"].includes(key)))return "<REDACTED>";
  if(typeof value==="string") {
    return value
      .replace(/[A-Za-z]:\\[^\s"',<>]+/g,"<REDACTED_PATH>")
      .replace(/\/(?:home|tmp|Users)\/[^\s"',<>]+/g,"<REDACTED_PATH>")
      .replace(/https?:\/\/[^\s"',<>]+/g,"<REDACTED_ENDPOINT>")
      .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g,"<REDACTED_IP>")
      .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,"<REDACTED_UUID>")
      .replace(/\b[\w.%+-]+@[\w.-]+\.[a-z]{2,}\b/gi,"<REDACTED_EMAIL>")
      .replace(/\b(?:ghp_|github_pat_|sk-proj-)[A-Za-z0-9_-]{12,}\b/g,"<REDACTED_CREDENTIAL>");
  }
  if(Array.isArray(value))return value.map(x=>scrub(x));
  if(value&&typeof value==="object")return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,scrub(v,k)]));
  return value;
}
const captures=original.captures.map(c=>({
  scenario:c.scenario,step:c.step,exit:c.exit,
  cliStdout:scrub(c.capturedCliStdout),
  cliStderr:scrub(c.capturedCliStderr)
}));
function get(s,step) {
  const x=captures.find(x=>x.scenario===s&&x.step===step);
  assert(x,"Missing capture "+s+"/"+step);
  return x;
}
assert.equal(get("direct","set-padded").cliStdout.value," high ");
assert.equal(get("direct","set-padded").cliStdout.configId,"reasoning_effort");
assert.equal(get("direct","set-model").cliStdout.modelId,"fast-model");
assert.equal(get("upgrade","old-show").cliStdout.acpx.desired_config_options.reasoning_effort,"high");
assert.equal(get("upgrade","new-show-existing").cliStdout.acpx.desired_config_options.reasoning_effort,"high");
assert.equal(get("upgrade","new-show-changed").cliStdout.acpx.desired_config_options.reasoning_effort," high ");
assert.equal(get("old-owner","new-reject-padded").exit,1);
assert.match(get("old-owner","new-reject-padded").cliStdout.error.message,/wait for the older owner to exit/);
assert.equal(get("old-owner","new-reject-padded").cliStdout.error.data.detailCode,"QUEUE_CLI_CONFIG_OWNER_UNSUPPORTED");
assert.equal(get("old-owner","new-legacy-plain").cliStdout.value,"high");
const out={
  schema:"acpx-r051-captured-cli-output.v1",
  description:"Real compiled CLI stdout/stderr captured against the ACPX synthetic mock adapter, with ephemeral identities, paths and unrelated metadata redacted. Not a wire-level ACP packet capture.",
  provenance:{
    oldPackage:"acpx@0.22.0",
    reviewedHead:"613e95c641a623d51710b8ee7b3ad954b3ae66b4",
    platform:"Windows",
    node:"24.19.0",
    localPrivateCaptureSha256:privateHash,
    executedCaptureRunnerSha256:"2B1306CCACA4E4E8AE38C39B06D50CCD1ECF8676F01730A3FE03CB870942E921",
    linuxSourceQualification:"https://github.com/Footloose9/openclaw-conformance-lab/actions/runs/44457625530"
  },
  commandOutcomes:{scenarios:3,operations:24,successful:23,expectedDefensiveRefusals:1},
  captures,
  limits:["Synthetic ACP peer only","The captured responses are CLI JSON, not raw ACP wire frames","Actual provider execution and maintainer acceptance remain unverified"]
};
const json=JSON.stringify(out,null,2)+"\n";
const examples=[
  ["Direct CLI preserves padded non-model value","direct","set-padded"],
  ["Direct CLI normalizes model","direct","set-model"],
  ["Published prior saved state","upgrade","old-show"],
  ["Revised CLI reads prior saved state","upgrade","new-show-existing"],
  ["Revised CLI persists padded follow-up","upgrade","new-show-changed"],
  ["Older owner refuses padded input","old-owner","new-reject-padded"],
  ["Older owner accepts plain legacy control","old-owner","new-legacy-plain"]
];
const md=[
"# ACPX PR #1038 — captured and redacted shipped-CLI responses",
"",
"The JSON below is taken directly from real compiled CLI process stdout and structurally redacted. It is not a reconstruction of expected values. All 13 captured responses and 24 step exit codes appear in the companion JSON artifact.",
"",
"Reviewed commit: 613e95c641a623d51710b8ee7b3ad954b3ae66b4.",
"Published predecessor: acpx@0.22.0. Windows and Node 24.19.0. Synthetic ACP mock agent only.",
"Original private capture SHA-256: "+privateHash,
"Executed runner SHA-256: 2B1306CCACA4E4E8AE38C39B06D50CCD1ECF8676F01730A3FE03CB870942E921.",
"Source implementation is included under harness/acpx/shipped-cli-capture-r051.cjs; public code strengthens redaction only.",
"",
"Three scenarios passed: 23 ordinary successful CLI commands and one intentional padded-value refusal. The unrelated Linux source qualification passed 18/18 regressions and complete upstream checks.",
""
];
for(const [heading,s,step] of examples) {
  const a=get(s,step);
  md.push("## "+heading,"","CLI exit: "+a.exit,"");
  const excerpt=JSON.stringify(a.cliStdout,null,2).split("\n").map(line=>"    "+line).join("\n");
  md.push(excerpt,"");
}
md.push("## Limits","","The output is synthetic-adapter CLI data, not production-provider certification. Session identifiers, process identities, local paths, unrelated message contents, email addresses, credentials and endpoints were redacted. Maintainer acceptance of the mixed-version protocol remains a separate decision.","");
const markdown=md.join("\n");
for(const [label,content] of [["json",json],["md",markdown]]) {
  const denied=[
    /[A-Za-z]:\\/i,
    /(?:^|[\s"'])\/(?:home|tmp|Users)\//m,
    /\bghp_[A-Za-z0-9]{20,}\b/,/\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
    /\bsk-proj-[A-Za-z0-9_-]{20,}\b/,/-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    /\b(?:\d{1,3}\.){3}\d{1,3}\b/,
    /\b[\w.%+-]+@[\w.-]+\.[a-z]{2,}\b/i
  ];
  for(const re of denied)if(re.test(content))throw Error("HOLD_PUBLIC_REDACTION_"+label+"_"+re);
}
for(const [f,content] of [[jsonPath,json],[mdPath,markdown]]) {
  assert(!fs.existsSync(f),"Evidence file already exists");
  fs.mkdirSync(path.dirname(f),{recursive:true});
  fs.writeFileSync(f,content);
  console.log("PUBLISHED_CANDIDATE",path.basename(f),"SHA256",
    crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex").toUpperCase(),
    "BYTES",Buffer.byteLength(content));
}
console.log("R051_CAPTURE_REDACTION_PASS",captures.length);
