# ACPX #1005 — redacted shipped-CLI qualification

Evidence for [upstream PR #1038](https://github.com/openclaw/acpx/pull/1038) at source revision `613e95c641a623d51710b8ee7b3ad954b3ae66b4` (previous revision `11245ab7f22bafbde56377e770466c8be9e92821`).

All Windows tests used actual compiled `dist/cli.js` CLI processes against the ACPX repository's synthetic ACP mock agent, Node 24.19.0, and isolated disposable HOME/project directories. No production credentials or external ACP provider were invoked.

## Direct command path

Seven commands exited 0: version, session create, `set reasoning_effort ' high '`, session read, `set model ' fast-model '`, session read, session close. The observed config-set response contained the exact value `' high '`; the model-set response contained `modelId='fast-model'`. Persisted-state assertions passed.

## Published package upgrade (0.22.0)

Ten commands exited 0. The published `acpx@0.22.0` created a session with saved effort `high` and model `fast-model`. The corrected CLI read **the same logical session record ID**, preserved both saved selections, then persisted padded effort `' high '` without changing the model. Session close passed.

## Retained published owner

Published `acpx@0.22.0` started a background queue owner with no new CLI-intent capability. The corrected CLI rejected the padded effort value with expected exit code 1 **before dispatch**, leaving the owner and session intact. The corrected CLI then set unpadded effort `high` via the existing protocol: the old owner's PID and generation were unchanged before and after the accepted control. Subsequent session read and close passed, with no queue locks or synthetic processes left.

## Independently verifiable qualification

[Linux public CI run #44457625530](https://github.com/Footloose9/openclaw-conformance-lab/actions/runs/44457625530) passed: baseline compatibility failure reproduced, R042 overlay applied with exact source blob hashes, 18/18 focused regressions, complete `pnpm run check`, built CLI smoke and evidence upload.

The [machine-readable redacted outcome matrix](acpx-r042-shipped-cli-evidence.json) records the command sequence, expected exit codes, tested revision, asserted results and SHA-256 digests of the local full receipts. Raw machine-specific paths, runtime IDs and unsanitized logs are deliberately excluded. Those digests are provenance markers, not substitutes for public raw-log access.

**Limits:** Tests cover synthetic ACP transport and local Windows process behavior, not a production provider. The deliberate refusal is a passing negative test, not a CLI outage. The new fallback preserves legacy-compatible plain values only; whitespace-sensitive values still fail closed on older owners, without changing generation or request-ID correlation.
