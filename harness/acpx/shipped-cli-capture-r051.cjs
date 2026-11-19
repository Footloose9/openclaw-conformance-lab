"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const cp = require("node:child_process");
const crypto = require("node:crypto");

const [sourceArg, oldArg, outputArg] = process.argv.slice(2);
assert(sourceArg && oldArg && outputArg, "Usage: node shipped-cli-r050.cjs <source-checkout> <old-package> <result-json>");
const source = path.resolve(sourceArg);
const oldPackage = path.resolve(oldArg);
const output = path.resolve(outputArg);
const expected = "613e95c641a623d51710b8ee7b3ad954b3ae66b4";
const head = cp.execFileSync("git", ["-C", source, "rev-parse", "HEAD"], {encoding:"utf8"}).trim();
assert.equal(head, expected, "Test only the reviewed PR head");
const oldManifest = JSON.parse(fs.readFileSync(path.join(oldPackage,"package.json"),"utf8"));
assert.equal(oldManifest.name,"acpx");
assert.equal(oldManifest.version,"0.22.0");
const oldCli = path.join(oldPackage,"dist","cli.js");
const newCli = path.join(source,"dist","cli.js");
const mock = path.join(source,"dist-test","test","mock-agent.js");
for (const file of [oldCli,newCli,mock]) assert(fs.statSync(file).isFile(), "Required compiled binary missing");
const report = {
  schema:"acpx-linux-shipped-cli-r050.v1",
  sourceHead:expected,
  predecessor:"acpx@0.22.0",
  adapter:"ACPX repository mock agent (no external provider)",
  platform:process.platform,
  node:process.version,
  successful:false,
  scenarios:[],
  captures:[],
  limits:["Synthetic ACP adapter only","No production sessions, credentials or provider calls","Expected padded old-owner refusal returns exit code 1"]
};
const pause = () => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,100);
function makeContext(name) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(),"acpx-shipped-r050-"));
  const home=path.join(root,"home"),cwd=path.join(root,"project");
  fs.mkdirSync(path.join(home,".acpx"),{recursive:true});
  fs.mkdirSync(cwd,{recursive:true});
  const config={agents:{fixture:{argv:[process.execPath,mock,"--advertise-config-options"]}},defaultPermissions:"deny-all"};
  fs.writeFileSync(path.join(home,".acpx","config.json"),JSON.stringify(config,null,2)+"\n");
  // Explicit allowlist: no host credentials or production provider env.
  const env={PATH:process.env.PATH||"/usr/bin:/bin",HOME:home,USERPROFILE:home,
    APPDATA:path.join(home,"roaming"),LOCALAPPDATA:path.join(home,"local"),
    XDG_CONFIG_HOME:path.join(home,"xdg-config"),XDG_DATA_HOME:path.join(home,"xdg-data"),
    LANG:"C.UTF-8",CI:"true",TMPDIR:root};
  return {name,root,home,cwd,env,base:["--cwd",cwd,"--format","json","fixture"],steps:[]};
}
function redactCaptured(value,ctx,key="") {
  const redactedKeys = new Set(["acpxRecordId","acpxSessionId","acpSessionId","sessionId",
    "ownerGeneration","pid","processId","requestId","lastRequestId",
    "cwd","home","path","filePath","projectPath","socketPath","lockPath",
    "agentCommand","agentArgv","eventLog","messages",
    "endpoint","url","token","apiKey","authorization","accessToken"]);
  if (redactedKeys.has(key) ||
      (/Id$/.test(key) && !["modelId","configId","modeId"].includes(key))) return "<REDACTED>";
  if (typeof value==="string") {
    let s=value;
    for (const [from,to] of [[ctx.root,"<SANDBOX>"],[source,"<SOURCE>"],[oldPackage,"<OLD_PACKAGE>"]]) {
      s=s.split(from).join(to);
    }
    s=s.replace(/[A-Za-z]:\\[^\s"'<>]+/g,"<REDACTED_PATH>");
    s=s.replace(/\/(?:home|tmp|Users)\/[^\s"'<>]+/g,"<REDACTED_PATH>");
    s=s.replace(/https?:\/\/[^\s"'<>]+/g,"<REDACTED_ENDPOINT>");
    s=s.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g,"<REDACTED_IP>");
    s=s.replace(/\b(?:ghp_|github_pat_|sk-proj-)[A-Za-z0-9_-]{10,}\b/g,"<REDACTED_TOKEN>");
    return s;
  }
  if (Array.isArray(value)) return value.map(v=>redactCaptured(v,ctx));
  if (value && typeof value==="object") {
    return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,redactCaptured(v,ctx,k)]));
  }
  return value;
}
const capturedSteps=new Set(["set-padded","show-padded","set-model","show-model",
  "old-show","new-show-existing","new-set-padded","new-show-changed",
  "old-background-prompt","new-reject-padded","new-legacy-plain","new-show"]);
function execCli(ctx,label,cli,args,expectedExit=0) {
  const result=cp.spawnSync(process.execPath,[cli,...args],{
    cwd:ctx.cwd,env:ctx.env,encoding:"utf8",timeout:35000,maxBuffer:750000,windowsHide:true
  });
  const row={label,exit:result.status,error:result.error?.code||null};
  ctx.steps.push(row);
  console.log("STEP",ctx.name,label,"exit",result.status);
  if(result.error||result.status!==expectedExit) {
    const msg="Unexpected CLI result at "+label+" (exit="+result.status+", error="+(result.error?.code||"none")+")";
    throw Error(msg);
  }
  const body=(result.stdout||"").trim();
  let payload=null;try{payload=JSON.parse(body)}catch{}
  if(capturedSteps.has(label)) {
    report.captures.push({scenario:ctx.name,step:label,exit:result.status,
      capturedCliStdout:redactCaptured(payload===null?body:payload,ctx),
      capturedCliStderr:redactCaptured((result.stderr||"").trim(),ctx)});
  }
  return {payload,body,stderr:result.stderr||""};
}
function cleanup(ctx) {
  fs.rmSync(ctx.root,{recursive:true,force:true,maxRetries:5,retryDelay:100});
}
function direct() {
  const c=makeContext("direct");
  const x={id:"direct",passed:false,steps:c.steps};
  try {
    execCli(c,"version",newCli,["--version"]);
    execCli(c,"create",newCli,[...c.base,"sessions","new","--name","direct"]);
    const padded=execCli(c,"set-padded",newCli,[...c.base,"set","-s","direct","reasoning_effort"," high "]).payload;
    const before=execCli(c,"show-padded",newCli,[...c.base,"sessions","show","direct"]).payload;
    const model=execCli(c,"set-model",newCli,[...c.base,"set","-s","direct","model"," fast-model "]).payload;
    const after=execCli(c,"show-model",newCli,[...c.base,"sessions","show","direct"]).payload;
    assert.equal(padded?.value," high ");
    assert.equal(before?.acpx?.desired_config_options?.reasoning_effort," high ");
    assert.equal(model?.modelId,"fast-model");
    assert.equal(after?.acpx?.session_options?.model,"fast-model");
    x.exactNonModelValuePreserved=true;
    x.catalogModelNormalized=true;
    x.passed=true;
  } finally {
    try{execCli(c,"close",newCli,[...c.base,"sessions","close","direct"])}
    catch(e){x.passed=false;x.closeError=e.message}
    cleanup(c);
  }
  return x;
}
function upgrade() {
  const c=makeContext("upgrade");
  const x={id:"upgrade",passed:false,steps:c.steps};
  try {
    execCli(c,"old-version",oldCli,["--version"]);
    execCli(c,"new-version",newCli,["--version"]);
    execCli(c,"old-create",oldCli,[...c.base,"sessions","new","--name","upgrade"]);
    execCli(c,"old-set-model",oldCli,[...c.base,"set","-s","upgrade","model","fast-model"]);
    execCli(c,"old-set-effort",oldCli,[...c.base,"set","-s","upgrade","reasoning_effort","high"]);
    const before=execCli(c,"old-show",oldCli,[...c.base,"sessions","show","upgrade"]).payload;
    assert(before?.acpxRecordId);
    const effort=before?.acpx?.desired_config_options?.reasoning_effort;
    const model=before?.acpx?.current_model_id;
    assert.equal(effort,"high");assert.equal(model,"fast-model");
    const read=execCli(c,"new-show-existing",newCli,[...c.base,"sessions","show","upgrade"]).payload;
    assert.equal(read?.acpxRecordId,before.acpxRecordId);
    assert.equal(read?.acpx?.desired_config_options?.reasoning_effort,effort);
    assert.equal(read?.acpx?.current_model_id,model);
    const changed=execCli(c,"new-set-padded",newCli,[...c.base,"set","-s","upgrade","reasoning_effort"," high "]).payload;
    assert.equal(changed?.value," high ");
    const after=execCli(c,"new-show-changed",newCli,[...c.base,"sessions","show","upgrade"]).payload;
    assert.equal(after?.acpxRecordId,before.acpxRecordId);
    assert.equal(after?.acpx?.desired_config_options?.reasoning_effort," high ");
    assert.equal(after?.acpx?.current_model_id,model);
    x.savedSessionIdentityPreserved=true;x.savedSettingsPreserved=true;x.followupPaddedValuePreserved=true;
    x.passed=true;
  } finally {
    try{execCli(c,"close",newCli,[...c.base,"sessions","close","upgrade"])}
    catch(e){x.passed=false;x.closeError=e.message}
    cleanup(c);
  }
  return x;
}
function oldOwner() {
  const c=makeContext("old-owner");
  const x={id:"old-owner",passed:false,steps:c.steps};
  const release=path.join(c.root,"release.fixture");
  try {
    execCli(c,"old-create",oldCli,[...c.base,"sessions","new","--name","queued"]);
    const before=execCli(c,"old-show",oldCli,[...c.base,"sessions","show","queued"]).payload;
    assert(before?.acpxRecordId);
    const key=crypto.createHash("sha256").update(before.acpxRecordId).digest("hex").slice(0,24);
    const lock=path.join(c.home,".acpx","queues",key+".lock");
    execCli(c,"old-background-prompt",oldCli,[...c.base,"prompt","-s","queued","--no-wait","stream-wait-file "+release]);
    for(let i=0;i<120&&!fs.existsSync(lock);i++)pause();
    assert(fs.existsSync(lock),"Old owner queue lease was not retained");
    const owner=JSON.parse(fs.readFileSync(lock,"utf8"));
    assert.equal(owner.supportsCliConfigOptionIntent,undefined);
    assert.equal(owner.sessionId,before.acpxRecordId);
    assert(owner.ownerGeneration&&owner.pid,"Owner identity absent");
    const refusal=execCli(c,"new-reject-padded",newCli,[...c.base,"set","-s","queued","reasoning_effort"," high "],1);
    assert.match(refusal.body+"\n"+refusal.stderr,/QUEUE_CLI_CONFIG_OWNER_UNSUPPORTED/);
    assert.match(refusal.body+"\n"+refusal.stderr,/without closing the session/);
    assert(fs.existsSync(lock),"Old queue owner was unexpectedly retired");
    const same=JSON.parse(fs.readFileSync(lock,"utf8"));
    assert.equal(same.ownerGeneration,owner.ownerGeneration);
    fs.writeFileSync(release,"fixture released\n");
    const ordinary=execCli(c,"new-legacy-plain",newCli,[...c.base,"set","-s","queued","reasoning_effort","high"]).payload;
    assert.equal(ordinary?.value,"high");
    assert(fs.existsSync(lock),"Older owner did not remain after legacy-compatible control");
    const unchanged=JSON.parse(fs.readFileSync(lock,"utf8"));
    assert.equal(unchanged.ownerGeneration,owner.ownerGeneration);
    assert.equal(unchanged.pid,owner.pid);
    assert.equal(unchanged.supportsCliConfigOptionIntent,undefined);
    const after=execCli(c,"new-show",newCli,[...c.base,"sessions","show","queued"]).payload;
    assert.equal(after?.acpxRecordId,before.acpxRecordId);
    assert.equal(after?.acpx?.desired_config_options?.reasoning_effort,"high");
    x.expectedRefusalWithoutDispatch=true;
    x.legacyCompatibleControlAccepted=true;
    x.sameOlderOwnerGenerationAndPid=true;
    x.sessionIdentityPreserved=true;
    x.passed=true;
  } finally {
    if(!fs.existsSync(release))fs.writeFileSync(release,"cleanup\n");
    try{execCli(c,"new-close",newCli,[...c.base,"sessions","close","queued"])}
    catch(e){x.passed=false;x.closeError=e.message}
    cleanup(c);
  }
  return x;
}
try {
  for(const fn of [direct,upgrade,oldOwner])report.scenarios.push(fn());
  report.successful=report.scenarios.every(s=>s.passed);
} catch(error) {
  report.failure=String(error.message||error)
    .replaceAll(source,"<SOURCE>").replaceAll(oldPackage,"<PUBLISHED_PACKAGE>")
    .replace(/\/tmp\/acpx-shipped-r050-[^\s/'"]+/g,"<TEMP>");
} finally {
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,JSON.stringify(report,null,2)+"\n");
  console.log("RESULT",report.successful?"PASS":"FAIL",report.scenarios.length,"completed scenarios");
  if(!report.successful)process.exitCode=3;
}
