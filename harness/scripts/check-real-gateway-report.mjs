import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const reportPath = join(root, "harness", "out", "real-gateway-integration.json");
const summaryPath = join(root, "harness", "out", "real-gateway-summary.json");
let report;
try {
  if (!existsSync(reportPath)) throw new Error("JSON_REPORT_NOT_GENERATED");
  report = JSON.parse(readFileSync(reportPath, "utf8"));
} catch (error) {
  console.error("GATEWAY_TEST_NOT_ESTABLISHED:", String(error));
  process.exitCode = 1;
}
if (report) {
  const suites = Number(report.numTotalTestSuites ?? 0);
  const tests = Number(report.numTotalTests ?? 0);
  const passed = Number(report.numPassedTests ?? 0);
  const failed = Number(report.numFailedTests ?? 0);
  const failures = (report.testResults ?? []).flatMap((suite) =>
    (suite.assertionResults ?? []).filter((item) => item.status === "failed").map((item) => ({
      name: String(item.fullName ?? item.title ?? "").slice(0, 240),
      diagnostic: String(item.failureMessages?.[0] ?? "").slice(0, 800)
    })));
  const verified = suites >= 1 && tests >= 3 && passed === tests &&
    failed === 0 && report.success === true;
  const result = {
    gate: "REAL_UPSTREAM_GATEWAY_DATABASE_WORKER_INTEGRATION",
    upstreamTest: "src/gateway/server-methods/models-list.freshness.integration.test.ts",
    testProject: "test/vitest/vitest.gateway-database-workers.config.ts",
    testedAtUtc: new Date().toISOString(), suites, tests, passed, failed,
    expectedMinimumTestCases: 3, zeroTestGuardPassed: tests >= 3,
    success: verified, failures
  };
  writeFileSync(summaryPath, JSON.stringify(result, null, 2) + "\n");
  console.log("GATEWAY_RESULT:", JSON.stringify(result));
  if (!verified) process.exitCode = 1;
}
