import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import test from "node:test";
import {
  SessionQueueOwner,
  releaseQueueOwnerLease,
  tryAcquireQueueOwnerLease,
  trySetConfigOptionOnRunningOwner,
} from "../src/session/queue/ipc.js";
import { readQueueOwnerRecord } from "../src/session/queue/lease-store.js";
import {
  cleanupOwnerArtifacts,
  closeServer,
  createSingleRequestServer,
  listenServer,
  queuePaths,
  withTempHome,
  writeQueueOwnerLock,
} from "./queue-test-helpers.js";

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
  "R033 patched client refuses unadvertised intent before old owner dispatch; legacy works",
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
            // Preflight refuses before sending a novel request to the old owner.
            assert.equal(observed.detailCode, "QUEUE_CLI_CONFIG_OWNER_UNSUPPORTED");
            assert.equal(observed.retryable, false);
            assert.match(observed.message, /does not support CLI config option intent/);
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

test(
  "R033 new owner advertises a literal capability; malformed or absent values refuse CLI intent",
  { timeout: 12_000 },
  async () => {
    await withTempHome(async () => {
      const sessionId = "r033-new-owner";
      const lease = await tryAcquireQueueOwnerLease(sessionId);
      assert.ok(lease);
      const calls: Array<{ configId: string; value: string; cliModelInput?: true }> = [];
      const owner = await SessionQueueOwner.start(lease, {
        cancelPrompt: async () => false,
        closeSession: async () => false,
        setSessionMode: async () => {},
        setSessionModel: async () => undefined,
        setSessionConfigOption: async (configId, value, _timeoutMs, cliModelInput) => {
          calls.push({ configId, value, cliModelInput });
          return { configOptions: [] };
        },
      });
      const initial = await fsPromises.readFile(lease.lockPath, "utf8");
      try {
        assert.equal((await readQueueOwnerRecord(sessionId))?.supportsCliConfigOptionIntent, true);
        const approved = await trySetConfigOptionOnRunningOwner(
          sessionId, "verbosity", " compact ", 2000, false, undefined, true,
        );
        assert.deepEqual(approved?.value, { configOptions: [] });
        assert.deepEqual(calls, [{ configId: "verbosity", value: " compact ", cliModelInput: true }]);

        const baseline = JSON.parse(initial) as Record<string, unknown>;
        for (const variant of [undefined, false, "true", 1, null]) {
          const edited = { ...baseline, supportsCliConfigOptionIntent: variant };
          await fsPromises.writeFile(lease.lockPath, JSON.stringify(edited) + "\n", "utf8");
          assert.equal((await readQueueOwnerRecord(sessionId))?.supportsCliConfigOptionIntent, undefined);
          await assert.rejects(
            trySetConfigOptionOnRunningOwner(
              sessionId, "verbosity", " compact ", 2000, false, undefined, true,
            ),
            (error: unknown) => {
              assert.ok(error instanceof Error);
              assert.equal((error as Error & { detailCode?: string }).detailCode,
                "QUEUE_CLI_CONFIG_OWNER_UNSUPPORTED");
              return true;
            },
          );
          assert.equal(calls.length, 1, "a nonliteral capability cannot dispatch");
        }
      } finally {
        await fsPromises.writeFile(lease.lockPath, initial, "utf8");
        await owner.close();
        await releaseQueueOwnerLease(lease);
      }
    });
  },
);

test(
  "R033 an advertised owner cannot bypass strict request identity with an uncorrelated rejection",
  { timeout: 12_000 },
  async () => {
    await withTempHome(async (home) => {
      const sessionId = "r033-uncorrelated-reply";
      const paths = queuePaths(home, sessionId);
      const ownerGeneration = 123;
      let seen = 0;
      const server = createSingleRequestServer((socket, _request) => {
        seen += 1;
        socket.end(JSON.stringify({
          type: "error",
          requestId: "unknown",
          ownerGeneration,
          code: "RUNTIME",
          detailCode: "QUEUE_REQUEST_INVALID",
          origin: "queue",
          retryable: false,
          message: "Invalid queue request",
        }) + "\n");
      });
      await listenServer(server, paths.socketPath);
      try {
        await writeQueueOwnerLock({
          ...paths, pid: process.pid, sessionId, ownerGeneration,
        });
        const payload = JSON.parse(await fsPromises.readFile(paths.lockPath, "utf8")) as Record<string, unknown>;
        payload.supportsCliConfigOptionIntent = true;
        await fsPromises.writeFile(paths.lockPath, JSON.stringify(payload) + "\n", "utf8");

        await assert.rejects(
          trySetConfigOptionOnRunningOwner(
            sessionId, "engine", " model-b ", 2000, false, undefined, true,
          ),
          (error: unknown) => {
            assert.ok(error instanceof Error);
            const observed = error as Error & { detailCode?: string; retryable?: boolean };
            assert.equal(observed.detailCode, "QUEUE_PROTOCOL_MALFORMED_MESSAGE");
            assert.equal(observed.retryable, false);
            assert.match(observed.message, /outcome is unknown/);
            return true;
          },
        );
        assert.equal(seen, 1, "the fake server sent exactly one mismatched reply");
      } finally {
        await closeServer(server);
        await cleanupOwnerArtifacts(paths);
      }
    });
  },
);
