import { writeFileSync } from "node:fs";
import { join } from "node:path";

const project = {
  // Inherit OpenClaw's official test-shard ambient declarations and real compiler options.
  // Narrow the root test list, not its declared environment.
  extends: "./test/tsconfig/tsconfig.core.test.shard.json",
  compilerOptions: {
    noEmit: true,
    tsBuildInfoFile: "./.artifacts/tsgo-cache/cloud-conformance-targeted.tsbuildinfo"
  },
  include: [
    "./src/agents/prepared-model-runtime.catalog-access.ts",
    "./src/agents/prepared-model-runtime.publication-events.ts",
    "./src/agents/prepared-model-runtime.publication-events.test.ts",
    "./src/gateway/server-methods/models-list.freshness.integration.test.ts"
  ]
};
writeFileSync(join("upstream", ".openclaw-conformance-tsconfig.json"),
  JSON.stringify(project, null, 2) + "\n");
console.log("Created narrowed OpenClaw official test-shard typecheck with real upstream ambient declarations");
