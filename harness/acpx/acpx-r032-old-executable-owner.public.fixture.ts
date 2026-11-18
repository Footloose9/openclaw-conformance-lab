import { SessionQueueOwner, releaseQueueOwnerLease, tryAcquireQueueOwnerLease } from "../src/session/queue/ipc.js";

// Compiled ONLY from the pristine, pinned ACPX source. Separate child process;
// no ACP provider, credentials, external session or caller authentication claim.
const sessionId = process.argv[2];
if (!sessionId || !/^r032-[a-z0-9-]+$/.test(sessionId)) {
  throw new Error("R032_FIXTURE_INVALID_SESSION");
}
const lease = await tryAcquireQueueOwnerLease(sessionId);
if (!lease) {
  throw new Error("R032_FIXTURE_OWNER_LEASE_UNAVAILABLE");
}
const calls: Array<{ configId: string; value: string }> = [];
const owner = await SessionQueueOwner.start(lease, {
  cancelPrompt: async () => { throw new Error("unexpected cancel"); },
  closeSession: async () => { throw new Error("unexpected close"); },
  setSessionMode: async () => { throw new Error("unexpected mode"); },
  setSessionModel: async () => { throw new Error("unexpected model"); },
  setSessionConfigOption: async (configId, value) => {
    calls.push({ configId, value });
    return { configOptions: [] };
  },
});

process.stdout.write(JSON.stringify({
  type: "ready",
  sessionId,
  socketPath: lease.socketPath,
  ownerGeneration: lease.ownerGeneration,
}) + "\n");

try {
  await new Promise<void>((resolve) => {
    process.stdin.once("data", () => resolve());
    process.stdin.once("end", () => resolve());
  });
} finally {
  await owner.close();
  await releaseQueueOwnerLease(lease);
  process.stdout.write(JSON.stringify({ type: "closed", calls }) + "\n");
}
