import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import test from "node:test";
import { promisify } from "node:util";
import {
  SessionQueueOwner,
  releaseQueueOwnerLease,
  tryAcquireQueueOwnerLease,
} from "../src/session/queue/ipc.js";
import { withTempHome } from "./queue-test-helpers.js";

const execFileAsync = promisify(execFile);

// This subprocess sends one synthetic queue wire message to the real old-source
// owner socket. It is not an ACP adapter, a shipped CLI, or a live provider.
const WIRE_CHILD = [
  "const net = require('node:net');",
  "const socket = net.createConnection(process.argv[1]);",
  "let output = '';",
  "socket.setEncoding('utf8');",
  "socket.setTimeout(2500);",
  "socket.once('connect', () => socket.write(process.argv[2] + '\\n'));",
  "socket.on('data', (chunk) => { output += chunk; });",
  "socket.once('end', () => process.stdout.write(output));",
  "socket.once('timeout', () => { socket.destroy(); process.exitCode = 4; });",
  "socket.once('error', (error) => { console.error(error.message); process.exitCode = 3; });",
].join("\n");

type WireMessage = {
  type: string;
  requestId?: string;
  detailCode?: string;
  retryable?: boolean;
  origin?: string;
  response?: { configOptions: unknown[] };
};

async function sendFromChild(socketPath: string, request: object): Promise<WireMessage[]> {
  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    ["-e", WIRE_CHILD, socketPath, JSON.stringify(request)],
    { timeout: 4000, maxBuffer: 16_384, windowsHide: true },
  );
  assert.equal(stderr, "", "synthetic wire child must exit without diagnostic errors");
  assert.ok(stdout.trim(), "old owner must return a structured socket response");
  return stdout
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as WireMessage);
}

test(
  "R031 old-source owner rejects the new CLI kind across a live process socket before dispatch",
  { timeout: 12_000 },
  async () => {
    await withTempHome(async () => {
      const lease = await tryAcquireQueueOwnerLease("r031-old-owner-unknown-kind");
      assert.ok(lease);
      let controlCalls = 0;
      const owner = await SessionQueueOwner.start(lease, {
        cancelPrompt: async () => { controlCalls += 1; return false; },
        closeSession: async () => { controlCalls += 1; return false; },
        setSessionMode: async () => { controlCalls += 1; },
        setSessionModel: async () => { controlCalls += 1; return undefined; },
        setSessionConfigOption: async () => { controlCalls += 1; return { configOptions: [] }; },
      });
      try {
        const reply = await sendFromChild(lease.socketPath, {
          type: "set_cli_config_option",
          requestId: "r031-new-wire-kind",
          ownerGeneration: lease.ownerGeneration,
          configId: "engine",
          value: " model-b ",
        });
        assert.equal(reply.length, 1, "one terminal reply, not an acceptance or retry");
        assert.equal(reply[0]?.type, "error");
        assert.equal(reply[0]?.detailCode, "QUEUE_REQUEST_INVALID");
        assert.equal(reply[0]?.requestId, "unknown");
        assert.equal(reply[0]?.retryable, false);
        assert.equal(reply[0]?.origin, "queue");
        assert.equal(controlCalls, 0, "no control handler can see this new request");
        assert.equal(owner.queueDepth(), 0);
        assert.equal(await owner.nextTask(5), undefined);
      } finally {
        await owner.close();
        await releaseQueueOwnerLease(lease);
      }
    });
  },
);

test(
  "R031 old-source owner still handles legacy exact-value controls after child process admission",
  { timeout: 12_000 },
  async () => {
    await withTempHome(async () => {
      const lease = await tryAcquireQueueOwnerLease("r031-old-owner-legacy");
      assert.ok(lease);
      const calls: Array<{ id: string; value: string }> = [];
      const owner = await SessionQueueOwner.start(lease, {
        cancelPrompt: async () => false,
        closeSession: async () => false,
        setSessionMode: async () => {},
        setSessionModel: async () => undefined,
        setSessionConfigOption: async (id, value) => {
          calls.push({ id, value });
          return { configOptions: [] };
        },
      });
      try {
        const reply = await sendFromChild(lease.socketPath, {
          type: "set_config_option",
          requestId: "r031-legacy",
          ownerGeneration: lease.ownerGeneration,
          configId: "verbosity",
          value: " compact ",
        });
        assert.deepEqual(reply.map((entry) => entry.type), ["accepted", "set_config_option_result"]);
        assert.deepEqual(calls, [{ id: "verbosity", value: " compact " }]);
        assert.deepEqual(reply[1]?.response, { configOptions: [] });
      } finally {
        await owner.close();
        await releaseQueueOwnerLease(lease);
      }
    });
  },
);
