import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import test from "node:test";
import type { OutputFormatter } from "../src/types.js";
import {
  SessionQueueOwner,
  releaseQueueOwnerLease,
  tryAcquireQueueOwnerLease,
  trySetConfigOptionOnRunningOwner,
  trySubmitToRunningOwner,
} from "../src/session/queue/ipc.js";
import { readQueueOwnerRecord } from "../src/session/queue/lease-store.js";
import { queuePaths, withTempHome } from "./queue-test-helpers.js";

const NOOP_OUTPUT_FORMATTER: OutputFormatter = {
  setContext() {},
  onAcpMessage() {},
  onError() {},
  onPermissionEscalation() {},
  flush() {},
};

type ChildReply = {
  type: "ready" | "closed";
  sessionId?: string;
  ownerGeneration?: number;
  calls?: Array<{ configId: string; value: string }>;
};

async function nextChildReply(iterator: AsyncIterator<string>): Promise<ChildReply> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const next = await Promise.race([
      iterator.next(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("R034_CHILD_REPLY_TIMEOUT")), 5_000);
      }),
    ]);
    assert.equal(next.done, false, "original executable must produce a terminal reply");
    return JSON.parse(next.value) as ChildReply;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function withOriginalOwner(
  sessionId: string,
  run: (ready: ChildReply) => Promise<void>,
): Promise<void> {
  const executable = path.join(
    process.cwd(), ".r032-old-dist-test", "test",
    "acpx-r032-old-executable-owner.public.fixture.js",
  );
  assert.ok((await fs.stat(executable)).isFile(), "pinned pre-patch executable must exist");
  const child = spawn(process.execPath, [executable, sessionId], {
    cwd: process.cwd(),
    env: { ...process.env },
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
  });
  assert.ok(child.stdin && child.stdout && child.stderr);
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (text: string) => { stderr += text; });
  const reader = readline.createInterface({ input: child.stdout });
  const iterator = reader[Symbol.asyncIterator]();
  const finished = once(child, "exit");
  const deadline = setTimeout(() => child.kill(), 13_000);
  deadline.unref();
  try {
    const ready = await nextChildReply(iterator);
    assert.equal(ready.type, "ready");
    assert.equal(ready.sessionId, sessionId);
    assert.equal(typeof ready.ownerGeneration, "number");
    await run(ready);
    child.stdin.write("stop\n");
    const closed = await nextChildReply(iterator);
    assert.equal(closed.type, "closed");
    assert.deepEqual(closed.calls, [], "old owner must receive no incompatible config control");
    const [code] = await finished;
    assert.equal(code, 0, stderr);
    assert.equal(stderr, "");
  } finally {
    clearTimeout(deadline);
    reader.close();
    if (child.exitCode === null && child.signalCode === null) {
      child.stdin.write("stop\n");
      const emergency = setTimeout(() => child.kill(), 2_000);
      emergency.unref();
      try { await finished; } finally { clearTimeout(emergency); }
    }
  }
}

test("R034 absent owner -> old binary refusal -> new owner reconnect is non-retrying", { timeout: 22_000 }, async () => {
  await withTempHome(async () => {
    const sessionId = "r032-reconnect-to-new";
    const absent = await trySetConfigOptionOnRunningOwner(
      sessionId, "engine", " model-b ", 2_000, false, undefined, true,
    );
    assert.equal(absent, undefined, "no owner leaves direct routing to the caller");
    let oldGeneration: number | undefined;
    await withOriginalOwner(sessionId, async (ready) => {
      oldGeneration = ready.ownerGeneration;
      const record = await readQueueOwnerRecord(sessionId);
      assert.equal(record?.supportsCliConfigOptionIntent, undefined);
      await assert.rejects(
        trySetConfigOptionOnRunningOwner(
          sessionId, "engine", " model-b ", 2_000, false, undefined, true,
        ),
        (error: unknown) => {
          assert.ok(error instanceof Error);
          assert.equal((error as Error & { detailCode?: string }).detailCode,
            "QUEUE_CLI_CONFIG_OWNER_UNSUPPORTED");
          return true;
        },
      );
    });
    assert.equal(await readQueueOwnerRecord(sessionId), undefined, "old lease was retired");

    const lease = await tryAcquireQueueOwnerLease(sessionId);
    assert.ok(lease, "new generation may acquire after verified old release");
    assert.notEqual(lease.ownerGeneration, oldGeneration, "reconnect must select new owner generation");
    const calls: Array<{ configId: string; value: string; cliModelInput?: true }> = [];
    const owner = await SessionQueueOwner.start(lease, {
      cancelPrompt: async () => false,
      closeSession: async () => false,
      setSessionMode: async () => {},
      setSessionModel: async () => undefined,
      setSessionConfigOption: async (configId, value, _timeout, cliModelInput) => {
        calls.push({ configId, value, cliModelInput });
        return { configOptions: [] };
      },
    });
    try {
      assert.equal((await readQueueOwnerRecord(sessionId))?.supportsCliConfigOptionIntent, true);
      const result = await trySetConfigOptionOnRunningOwner(
        sessionId, "engine", " model-b ", 2_000, false, undefined, true,
      );
      assert.deepEqual(result?.value, { configOptions: [] });
      assert.deepEqual(calls, [
        { configId: "engine", value: " model-b ", cliModelInput: true },
      ], "one request only, with exact opaque value");
    } finally {
      await owner.close();
      await releaseQueueOwnerLease(lease);
    }
    assert.equal(await readQueueOwnerRecord(sessionId), undefined, "new owner also retired cleanly");
  });
});

test("R034 synthetic active queue remains isolated from permitted CLI config control", { timeout: 12_000 }, async () => {
  await withTempHome(async () => {
    const sessionId = "r034-active-queue";
    const lease = await tryAcquireQueueOwnerLease(sessionId);
    assert.ok(lease);
    let controlCount = 0;
    const owner = await SessionQueueOwner.start(lease, {
      cancelPrompt: async () => false,
      closeSession: async () => false,
      setSessionMode: async () => {},
      setSessionModel: async () => undefined,
      setSessionConfigOption: async (id, value, _timeout, cliModelInput) => {
        assert.equal(id, "verbosity");
        assert.equal(value, " padded ");
        assert.equal(cliModelInput, true);
        controlCount += 1;
        return { configOptions: [] };
      },
    });
    const abort = new AbortController();
    let notifyAccepted!: () => void;
    const accepted = new Promise<void>((resolve) => { notifyAccepted = resolve; });
    const submission = trySubmitToRunningOwner({
      sessionId,
      requestId: "r034-prompt-active",
      requireSharedRuntime: true,
      message: "synthetic prompt only",
      permissionMode: "deny-all",
      outputFormatter: NOOP_OUTPUT_FORMATTER,
      waitForCompletion: true,
      signal: abort.signal,
      onQueueAccepted: notifyAccepted,
    });
    void submission.catch(() => {});
    try {
      await accepted;
      const task = await owner.nextTask(1_000);
      assert.ok(task, "active queue task must remain accounted for");
      assert.equal(task.requestId, "r034-prompt-active");
      assert.equal(owner.queueDepth(), 0);
      const result = await trySetConfigOptionOnRunningOwner(
        sessionId, "verbosity", " padded ", 2_000, false, undefined, true,
      );
      assert.deepEqual(result?.value, { configOptions: [] });
      assert.equal(controlCount, 1);
      assert.equal(owner.queueDepth(), 0, "config control must not enqueue another prompt");
      owner.completeTask(task);
      abort.abort(new Error("synthetic observer detached"));
      await assert.rejects(submission, /synthetic observer detached/);
    } finally {
      abort.abort();
      await Promise.allSettled([submission]);
      await owner.close();
      await releaseQueueOwnerLease(lease);
    }
  });
});

test("R034 forged capability on a genuine old binary cannot bypass request-ID checks", { timeout: 19_000 }, async () => {
  await withTempHome(async (home) => {
    const sessionId = "r032-forged-advertisement";
    const { lockPath } = queuePaths(home, sessionId);
    await withOriginalOwner(sessionId, async () => {
      const original = await fs.readFile(lockPath, "utf8");
      const metadata = JSON.parse(original) as Record<string, unknown>;
      try {
        metadata.supportsCliConfigOptionIntent = true;
        await fs.writeFile(lockPath, JSON.stringify(metadata) + "\n", "utf8");
        assert.equal((await readQueueOwnerRecord(sessionId))?.supportsCliConfigOptionIntent, true);
        await assert.rejects(
          trySetConfigOptionOnRunningOwner(
            sessionId, "engine", " model-b ", 2_000, false, undefined, true,
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
      } finally {
        await fs.writeFile(lockPath, original, "utf8");
      }
    });
    assert.equal(await readQueueOwnerRecord(sessionId), undefined);
  });
});
