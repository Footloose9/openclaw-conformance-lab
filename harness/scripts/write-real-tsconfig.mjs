import { writeFileSync } from "node:fs";
import { join } from "node:path";
const project = {
  extends: "./tsconfig.json",
  compilerOptions: { noEmit: true, incremental: false },
  include: [],
  files: [
    "src/agents/prepared-model-runtime.catalog-access.ts",
    "src/agents/prepared-model-runtime.publication-events.ts",
    "src/agents/prepared-model-runtime.publication-events.test.ts",
    "src/gateway/server-methods/models-list.freshness.integration.test.ts"
  ]
};
writeFileSync(join("upstream", ".openclaw-conformance-tsconfig.json"),
  JSON.stringify(project, null, 2) + "\n");
console.log("Created scoped project extending real upstream tsconfig; no structural type stubs");
