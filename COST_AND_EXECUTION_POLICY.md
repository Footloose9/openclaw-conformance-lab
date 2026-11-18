# Public GitHub Actions execution and cost policy

This repository is public and uses **standard GitHub-hosted** runners. Under GitHub's current published policy, those runs are free and unlimited for public repositories. Sources:

- https://docs.github.com/en/actions/reference/runners/github-hosted-runners
- https://docs.github.com/en/actions/concepts/billing-and-usage

**Do not configure larger billed runners, paid third-party CI, cloud service accounts, self-hosted machines, or credentials.** Public visibility does not license paid runners. The workflow remains manual-only, limited to one concurrent run with a ten-minute timeout and short artifact retention. Anyone can inspect the workflow and public run logs, so log only synthetic or public test data.

A failed test is evidence, not a reason to disable security controls or modify production accounts. Run history, test outputs, and upstream code changes must be independently verified. The project owner can change or disable Actions at any time. The initial scoped workflow is not a full production Gateway test.
