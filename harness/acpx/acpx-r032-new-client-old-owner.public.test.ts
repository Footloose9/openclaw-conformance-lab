import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import test from "node:test";
import { trySetConfigOptionOnRunningOwner } from "../src/session/queue/ipc.js";
import { withTempHome } from "./queue-test-helpers.js";

type FixtureReply = {
  type: string;
  sessionId?: string;
  ownerGeneration?: number;
  calls?: Array<{ configId: string; value: string }>;
};
async function nextFixtureLine(lines: AsyncIterator<string>): Promise<FixtureReply> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const response = await Promise.race([
      lines.next(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("R032_FIXTURE_RESPONSE_TIMEOUT")), 5_000);
      }),
    ]);
    assert.equal(response.done, false, "owner fixture must emit complete evidence");
    return JSON.parse(response.value) as FixtureReply;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

test(
  "R032 actual patched queue client to old compiled owner refuses new kind; legacy works",
  { timeout: 17_000 },
  async () => {
    await withTempHome(async () => {
      const oldExecutable = path.join(
        process.cwd(), ".r032-old-dist-test", "test",
        "acpx-r032-old-executable-owner.public.fixture.js",
      );
      assert.ok(fs.statSync(oldExecutable).isFile(), "real old compiled owner fixture must exist");
      const sessionId = "r032-disjoint-owner-wire";
      const child = spawn(process.execPath, [oldExecutable, sessionId], {
        cwd: process.cwd(),
        env: { ...process.env },
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
      });
      assert.ok(child.stdin && child.stdout && child.stderr);
      let stderr = "";
      child.stderr.setEncoding("utf8");
      child.stderr.on("data", (value: string) => { stderr += value; });
      const output = readline.createInterface({ input: child.stdout });
      const iterator = output[Symbol.asyncIterator]();
      const ended = once(child, "exit");
      const safety = setTimeout(() => child.kill(), 14_000);
      safety.unref();
      try {
        const ready = await nextFixtureLine(iterator);
        assert.equal(ready.type, "ready");
        assert.equal(ready.sessionId, sessionId);
        assert.equal(typeof ready.ownerGeneration, "number");

        await assert.rejects(
          async () => {
            await trySetConfigOptionOnRunningOwner(
              sessionId, "engine", " model-b ", 2_000, false, undefined, true,
            );
          },
          (error: unknown) => {
            assert.ok(error instanceof Error);
            const observed = error as Error & { detailCode?: string; retryable?: boolean };
            // Old owner responds QUEUE_REQUEST_INVALID with requestId 'unknown';
            // current new client rejects the mismatched ID before surfacing the owner code.
            assert.equal(observed.detailCode, "QUEUE_PROTOCOL_MALFORMED_MESSAGE");
            assert.equal(observed.retryable, false);
            assert.match(observed.message, /outcome is unknown/);
            return true;
          },
        );

        const legacy = await trySetConfigOptionOnRunningOwner(
          sessionId, "verbosity", " compact ", 2_000, false,
        );
        assert.ok(legacy, "the same old owner must remain reachable");
        assert.deepEqual(legacy.value, { configOptions: [] });
        child.stdin.write("stop\n");
        const closed = await nextFixtureLine(iterator);
        assert.equal(closed.type, "closed");
        assert.deepEqual(closed.calls, [{ configId: "verbosity", value: " compact " }]);
        const [code] = await ended;
        assert.equal(code, 0, stderr);
        assert.equal(stderr, "");
      } finally {
        clearTimeout(safety);
        output.close();
        if (child.exitCode === null && child.signalCode === null) {
          child.stdin.write("stop\n");
          const forced = setTimeout(() => child.kill(), 2_000);
          forced.unref();
          try { await ended; } finally { clearTimeout(forced); }
        }
      }
    });
  },
);
