import assert from "node:assert/strict";
import test from "node:test";
import { parseQueueRequest } from "../src/session/queue/messages.js";

// Execute ONLY against pristine pinned ACPX 48c1615 before applying R030 patch.
test("acpx old-owner: dedicated CLI config request kind is unrecognized", () => {
  const request = parseQueueRequest({
    type: "set_cli_config_option",
    requestId: "public-old-owner-negative",
    ownerGeneration: 1,
    configId: "engine",
    value: " model-b ",
  });
  assert.equal(request, null);
});

test("acpx old-owner control: familiar queue config request remains valid", () => {
  const request = parseQueueRequest({
    type: "set_config_option",
    requestId: "public-old-owner-legacy",
    ownerGeneration: 1,
    configId: "engine",
    value: " model-b ",
  });
  assert.ok(request && request.type === "set_config_option");
  assert.equal(request.value, " model-b ");
});
