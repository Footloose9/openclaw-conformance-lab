# OpenClaw Conformance Lab

Public, independent reproduction and regression-testing workspace for a proposed OpenClaw model-catalog retry fix. This is **not** the official OpenClaw repository, a production Gateway, or a source of operational authority.

## Scope

- Official upstream: https://github.com/openclaw/openclaw
- Pinned upstream commit: `cf5cf7a8c609d8b26bd81495634eda973a2e4742`
- Proposed three-file upstream patch: `patches/openclaw-catalog-retry-r018.patch`
- Patch SHA-256: `E316D1BE4B6F0931987B159FC4A84E9CB3CD0ABF1F1AADDA58F1239F52B00C39`
- Expected scoped Vitest outcome: unmodified baseline **4 passed, 2 failed**; proposed correction **6 passed, 0 failed**.

The manual GitHub Actions workflow fetches that public upstream revision at runtime. The committed repository contains only the patch, minimal test harness, synthetic logging/listener/error stand-ins, fixed dependency manifest, and test instructions. No credentials, real user data, proprietary application source, wallets, or production configurations are needed. Upstream OpenClaw material is MIT-licensed; see `UPSTREAM_OPENCLAW_LICENSE.txt`.

## Run policy

The workflow is **manual-only** (`workflow_dispatch`), uses a standard GitHub-hosted `ubuntu-24.04` runner, read-only contents permission, a ten-minute job timeout, no live credentials, and short-lived report artifacts. Standard GitHub-hosted runners in public repositories are free under GitHub's published policy; see `COST_AND_EXECUTION_POLICY.md`.

The first workflow checks exact patch applicability and six actual Vitest tests using synthetic service boundaries. It is **not** a claim that OpenClaw's complete upstream test suite, whole-source TypeScript check, or running-Gateway end-to-end tests passed. Those require separate evidence.

Any contribution or pull request to the upstream OpenClaw project requires distinct review and authorization. This repository neither signs ledger transactions nor performs production operations.
