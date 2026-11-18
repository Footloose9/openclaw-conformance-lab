# ACPX #1005 — source-bound CLI configuration value regression

**2026-11-18 UTC.** Public, credential-free conformance evidence for https://github.com/openclaw/acpx/issues/1005.

## Source and execution identity

- Upstream: openclaw/acpx at exact commit 48c1615057ae43893f80868f81cd3ee0445eb0ae, package version 0.22.0.
- The exact unmodified upstream production code was checked out on the standard GitHub-hosted Ubuntu 24.04 Actions runner. Only one synthetic TEST FILE was added; no production ACPX source was edited.
- Node 24.19.0, pnpm 11.27.1, frozen upstream dependency lockfile, install scripts disabled.
- Official upstream runtime build and Node test-source compilation passed.
- The test imports the actual registerSharedAgentSubcommands implementation and executes the actual Commander argument parser. ONLY the final command action is replaced with an assertion receiver. No ACP agent, session, CLI profile, production credential, MCP server or external provider is contacted.

## Accepted test result

| Case | Expected on unmodified source | Observed |
|---|---|---|
| Preserve the exact padded non-model select value (the string has one leading and one trailing space) | FAIL — demonstrates issue #1005 | FAIL |
| Ordinary non-model value remains unchanged | PASS | PASS |
| Existing config option key normalization is separate | PASS | PASS |

**Actual count:** 3 discovered, 2 passed, 1 precisely expected failure, 0 skipped or cancelled.

[Accepted GitHub Actions run 44409642327](https://github.com/Footloose9/openclaw-conformance-lab/actions/runs/44409642327) concluded SUCCESS because a strict verifier matched the actual case identities, exit status and summary counters. The raw TAP transcript and JSON verifier report were uploaded as artifact acpx-1005-baseline-evidence (artifact ID 14476702494; seven-day retention through November 25, 2026).

[Public test source](harness/acpx/acpx-cli-opaque-set.public-regression.test.ts) | [Exact failure verifier](harness/scripts/check-acpx-baseline.mjs) | [Manual-only workflow](.github/workflows/acpx-1005-value-fidelity.yml)

## Previous cloud setup attempts

- [Run 44409083368](https://github.com/Footloose9/openclaw-conformance-lab/actions/runs/44409083368) failed during test compilation because the test build was run before the normal upstream runtime build. No valid baseline assertion resulted.
- [Run 44409314504](https://github.com/Footloose9/openclaw-conformance-lab/actions/runs/44409314504) ran the real test and produced the exact 2-pass/1-fail pattern. Its evidence verifier was falsely red because Node TAP escapes the "#" character in case names. Only the verifier's permitted TAP-name unescape was corrected, and positive/negative controls on the real artifact passed.

## Scope, next tests, and maintainer routing

This validates the **CLI parsing defect**, not an ACP network end-to-end failure, a safe production fix, whole-repository acceptance, or any change to an installed agent.

A future correction must preserve non-model values verbatim without changing the current model-selector behavior; a model-category config ID can differ from the word "model". It must also cover fresh catalogs after reconnection, direct and owner-queued session paths, embedded runtime opaque identifiers, blank rejection, and upstream maintained tests. A parser-only shortcut is not justified by this result.

The issue currently allows queueable fixes, but this lab has not posted a comment or opened a PR in openclaw/acpx. Maintainer routing, duplicate/collision checks and disclosure review remain separate decisions. No private project inventions or protected architecture were published. This was executed on standard public GitHub Actions with no paid runner or production credentials.
