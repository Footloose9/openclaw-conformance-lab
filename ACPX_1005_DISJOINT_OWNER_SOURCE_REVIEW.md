# ACPX #1005 — R030 disjoint owner request, source-qualified only

**Status: REVIEW-ONLY. NOT DEPLOYABLE OR MERGED UPSTREAM.**

This independently maintained public conformance lab tested a bounded source-only candidate against [openclaw/acpx issue #1005](https://github.com/openclaw/acpx/issues/1005), pinned to upstream commit `48c1615057ae43893f80868f81cd3ee0445eb0ae`. The candidate is intended to preserve exact non-model CLI configuration values without silently changing embedded ACP callers or model selection against the connected session catalog.

**New versus R029:** Instead of attaching an optional `cliModelInput` flag to the existing `set_config_option` queue message, the candidate uses a **distinct** `set_cli_config_option` request type. The original upstream parser must reject that previously unknown request; the new parser accepts it explicitly, and legacy messages continue to preserve their opaque values.

## Exactly qualified results

[Manual Actions run 44413945776](https://github.com/Footloose9/openclaw-conformance-lab/actions/runs/44413945776) — **SUCCESS**.

| Source revision / test | Result |
|---|---|
| Unmodified old source rejects the new request type and still accepts legacy type | 2/2 passed |
| R027 CLI parser regression on the R030 candidate | 3/3 passed |
| R028 source-level model/queue contracts | 8/8 passed |
| R030 distinct request, non-model and embedded caller tests | 9/9 passed |
| Selected maintained ACPX tests | 58/58 passed |
| TypeScript typecheck, source format of all 13 edited files | Both passed |

**22/22 source-level conformance tests across old and new source, plus 58/58 selected maintained tests.** Tests and source were taken from the exact pinned upstream revision and installed with the frozen dependency lockfile on a standard public GitHub Actions runner, without production sessions or credentials. The strict identity/count oracle was checked with both positive and deliberately corrupted synthetic results.

[Source-only patch for review](patches/acpx-cli-model-intent-r030.patch) — SHA-256 `31D4D280E9702F5C3710B44C168093C74ADF886063B44769CDC57A3A22C911C4`. [Workflow](.github/workflows/acpx-disjoint-r030.yml) | [Old-source negative fixture](harness/acpx/acpx-old-owner-queue-reject.public.test.ts) | [New-source fixture](harness/acpx/acpx-cli-model-intent-r030.public.test.ts).

## Remaining release gate

The old-source proof executes ACPX's original `parseQueueRequest` on synthetic input. It shows the parser rejects the new request kind. It does **not** yet reproduce a real pre-existing owner process, socket admission/error propagation, an in-flight request, or side-effect absence across mixed-version executable processes. Release qualification must exercise an old owner with a new CLI and confirm the control is explicitly refused before dispatch, with no silent fallback, accidental control, duplicate effect, or unapproved restart.

Further coverage is also needed for real direct/idle/active owner pathways, reconnect to changed catalogs, unsupported and ambiguous models, and lifecycle cleanup. This is not full repository acceptance, provider E2E, an upstream PR, or protected private Root acceptance. No non-public intellectual property or credentials are required to reproduce these tests.
