# ACPX #1005 — candidate qualification (R029, review-only)

**Status: NOT DEPLOYABLE. NOT AN UPSTREAM PULL REQUEST.**

This public conformance lab contains a source-only 13-file candidate patch for [acpx issue #1005](https://github.com/openclaw/acpx/issues/1005), tested against upstream commit `48c1615057ae43893f80868f81cd3ee0445eb0ae`. The patch aims to preserve exact non-model configuration values while normalizing CLI model selections against the session's currently advertised model control. It does not modify an installed agent or any production ACPX environment.

The [final manual GitHub Actions run](https://github.com/Footloose9/openclaw-conformance-lab/actions/runs/44412546676) completed successfully: 3/3 original regression tests, 8/8 source contract tests, 7/7 new candidate tests (**18/18 total**), 58/58 selected maintained ACPX tests, upstream source TypeScript typecheck and source formatting. The workflow pinned the upstream commit and the patch checksum, performed a frozen-lockfile install and used a standard hosted runner without credentials.

[Patch for examination only](patches/acpx-cli-model-intent-r029.patch) — SHA-256 `BD430DADFD56BB33B7B5868A9F5CB9A7A5DDAB56436456B7D396B385B6D5626E`. [Manual workflow](.github/workflows/acpx-model-intent-r029.yml). [Strict oracle](harness/scripts/check-acpx-model-intent-r029.mjs).

## Release blocker — mixed-version queue owners

The candidate adds an optional CLI-only intent property to the existing `set_config_option` IPC request. A **previously started older queue owner** recognizes that request type but ignores unknown properties, so it could process a padded CLI model value without the new normalization intent. This can cause unintended behavior or rejection depending on the adapter. The successful tests above **did not exercise a live old-owner/new-CLI combination**. No release or upstream submission should be made on that basis.

A safer follow-up is a **distinct IPC request kind**, such as `set_cli_config_option`, which the previous owner's strict parser will reject as unknown before executing a control. The new owner must explicitly recognize it, obtain the *fresh* connected catalog and normalize only genuine model selectors, leaving existing `set_config_option` behavior and embedded callers unchanged. Negative tests must verify old-owner refusal, no silent downgrade/fallback, direct and queued route equivalence, and explicit handling of owner replacement/reconnect.

**Evidence boundaries:** this is a source-verified candidate with scoped tests, not a full upstream suite, live provider test, proven mixed-version compatibility, protected local Root acceptance, or a product release. No upstream ACPX PR or issue comment has been created from this candidate. The public evidence contains only synthetic ACPX examples and no private architecture or credentials.
