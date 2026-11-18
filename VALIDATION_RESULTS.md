# Source-backed validation record

**Validated:** 2026-11-18 (UTC)
**Scope:** proposed OpenClaw model-catalog retry correction; public manual-only GitHub Actions lab.

- Pinned official upstream commit: `cf5cf7a8c609d8b26bd81495634eda973a2e4742`
- Three-file patch: `patches/openclaw-catalog-retry-r018.patch`
- Patch SHA-256: `E316D1BE4B6F0931987B159FC4A84E9CB3CD0ABF1F1AADDA58F1239F52B00C39`
- Hosting: standard GitHub-hosted Ubuntu runner, no secrets, no production Gateway access.

## Passed evidence

| Gate | Actual result | Evidence |
| --- | --- | --- |
| Baseline vs. corrected scoped real Vitest | Original: 4 passed, 2 expected failures. Corrected: 6 passed, 0 failed. | [Run 44395940911](https://github.com/Footloose9/openclaw-conformance-lab/actions/runs/44395940911) |
| Exact pnpm 12.15.0 frozen upstream lockfile/supply-chain policy | 1,753 entries verified; lockfile unchanged. | [Run 44397199202](https://github.com/Footloose9/openclaw-conformance-lab/actions/runs/44397199202) |
| Real upstream TypeScript compiler, selected patched module graph | Official compiler completed without errors with required workspace dependencies and test-shard ambient declarations. | [Run 44398578923](https://github.com/Footloose9/openclaw-conformance-lab/actions/runs/44398578923) |
| Official Gateway model-catalog freshness integration | **1 suite, 3 tests passed, 0 failed.** Full upstream workspace installed and normal runtime/plugin assets built. | [Run 44400227382](https://github.com/Footloose9/openclaw-conformance-lab/actions/runs/44400227382) |

The Gateway test is OpenClaw's original `src/gateway/server-methods/models-list.freshness.integration.test.ts` in its owning `gateway-database-workers` Vitest project. The three passing scenarios were:

- Aged provider listing, with sibling provider, non-getter-backed, and non-empty catalog.
- Aged provider listing, without sibling provider, getter-backed, and non-empty catalog.
- Aged provider listing, with sibling provider, non-getter-backed, and initially empty catalog.

The Gateway report was independently checked for nonzero discovery and expected test count. GitHub retained the `real-upstream-gateway-evidence` artifact through **2026-11-25 21:24 UTC** (seven days); the GitHub run link and job logs remain primary inspection points after artifact expiration.

## Evidence boundaries

A passing scoped typecheck does **not** equal a whole-repository TypeScript or lint pass. Three actual Gateway integration cases do **not** equal a complete upstream test-suite pass, compatibility across every operating system, a live production Gateway validation, or a deployment. The test fixture uses synthetic local provider endpoints and is not authorized to access real user credentials.

Earlier exploratory cloud attempts failed at dependency filtering, omitted ambient types, wrong Vitest shard ownership, or asset-build prerequisites before a valid Gateway assertion result. The final passing runs supersede those **test setup failures**, not historical observations.

This repository remains an independent review/testing environment. No fix has been submitted to the upstream OpenClaw project. Any upstream pull request is a separate decision and should be checked for issue/PR duplication and maintainer routing before publication.
