import assert from "node:assert/strict";
import test from "node:test";
import { modelStateFromConfigOptions } from "../src/acp/model-config-state.js";
import {
  assertRequestedModelSupported,
  resolveRequestedConfigOption,
  resolveRequestedModelId,
} from "../src/acp/model-support.js";
import { parseNonEmptyValue } from "../src/cli/flags.js";
import { parseQueueRequest } from "../src/session/queue/messages.js";
import { advertisedModelState } from "../src/session/model-state.js";

// Public, deliberately synthetic values. No ACP session, agent process, or
// credential is needed to exercise these production parsing and model contracts.
function advertised(configId: string, available = ["model-a", "model-b"]) {
  return [{
    id: configId,
    name: "Public synthetic model choice",
    type: "select" as const,
    category: "model" as const,
    currentValue: available[0]!,
    options: available.map(value => ({ value, name: value })),
  }];
}

test("acpx model-control: nonliteral model category is discovered", () => {
  const models = modelStateFromConfigOptions(advertised("engine"));
  assert.ok(models);
  assert.equal(models.configId, "engine");
  assert.deepEqual(models.availableModels.map(model => model.modelId), ["model-a", "model-b"]);
});

test("acpx model-control: non-model input remains byte-exact at runtime", () => {
  const models = modelStateFromConfigOptions(advertised("engine"));
  const original = " compact ";
  const result = resolveRequestedConfigOption({
    configId: "verbosity", value: original, models, agentCommand: "node synthetic-public-agent",
  });
  assert.equal(result.resolvedValue, original);
  assert.equal(result.modelConfigId, "engine");
});

test("acpx model-control: advertised model applies under a nonliteral config ID", () => {
  const models = modelStateFromConfigOptions(advertised("engine"));
  const result = resolveRequestedConfigOption({
    configId: "engine", value: "model-b", models, agentCommand: "node synthetic-public-agent",
  });
  assert.equal(result.modelConfigId, "engine");
  assert.equal(result.resolvedValue, "model-b");
  assert.equal(assertRequestedModelSupported({
    requestedModel: result.resolvedValue, models,
    agentCommand: "node synthetic-public-agent", context: "apply",
  }), undefined);
});

test("acpx model-control: embedded opaque model value is not implicitly trimmed", () => {
  const models = modelStateFromConfigOptions(advertised("engine"));
  const value = " model-a ";
  const result = resolveRequestedConfigOption({
    configId: "engine", value, models, agentCommand: "node synthetic-public-agent",
  });
  assert.equal(result.resolvedValue, value);
  assert.throws(() => assertRequestedModelSupported({
    requestedModel: result.resolvedValue, models,
    agentCommand: "node synthetic-public-agent", context: "apply",
  }), /did not advertise|not advertise|unadvertised/i);
});

test("acpx model-control: refreshed catalog overrides an obsolete model config ID", () => {
  const before = modelStateFromConfigOptions(advertised("engine", ["model-a"]));
  const after = modelStateFromConfigOptions(advertised("llm", ["model-b"]));
  assert.equal(before?.configId, "engine");
  assert.equal(after?.configId, "llm");
  const resolved = resolveRequestedConfigOption({
    configId: "llm", value: "model-b", models: after,
    agentCommand: "node synthetic-public-agent",
  });
  assert.equal(resolved.modelConfigId, "llm");
  assert.equal(resolved.resolvedValue, "model-b");
  assert.throws(() => assertRequestedModelSupported({
    requestedModel: "model-a", models: after,
    agentCommand: "node synthetic-public-agent", context: "apply",
  }), /did not advertise|not advertise|unadvertised/i);
});

test("acpx model-control: queue parser preserves padded non-model option values", () => {
  const request = parseQueueRequest({
    type: "set_config_option",
    requestId: "synthetic-control-request",
    ownerGeneration: 1,
    configId: "verbosity",
    value: " compact ",
  });
  assert.ok(request);
  if (request.type !== "set_config_option") throw new Error("Unexpected synthetic queue control type");
  assert.equal(request.value, " compact ");
  assert.equal(request.configId, "verbosity");
});

test("acpx model-control: queue rejects whitespace-only values", () => {
  const request = parseQueueRequest({
    type: "set_config_option",
    requestId: "synthetic-blank-request",
    ownerGeneration: 1,
    configId: "verbosity",
    value: "   ",
  });
  assert.equal(request, null);
});

test("acpx model-control: existing CLI model parser and shorthand normalization remain distinct", () => {
  assert.equal(parseNonEmptyValue("Model", " model-b "), "model-b");
  assert.throws(() => parseNonEmptyValue("Model", "  "), /must not be empty/);
  const models = modelStateFromConfigOptions(advertised("engine"));
  assert.equal(resolveRequestedModelId({
    requestedModel: "model-b", models, agentCommand: "node synthetic-public-agent",
  }), "model-b");
  assert.equal(advertisedModelState({ config_options: advertised("engine") })?.configId, "engine");
});
