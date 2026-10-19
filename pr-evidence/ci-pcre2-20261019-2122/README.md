# CI-only PCRE2 provisioning follow-up

PR: https://github.com/infiniflow/ragflow/pull/21109
Source: `6944eaf50c20edf591443e4351412c9061d57291`

## Before / after

Before: the generic integration tier links on the runner, while its tokenizer
archive is built in another container. Runner PCRE2 development-library
provisioning was implicit in unrelated per-engine server builds.
Old-head job https://github.com/infiniflow/ragflow/actions/runs/39256308907/job/118072784145
failed before affected test binaries linked: `unable to find library -lpcre2-8`.

After: the nine-line workflow-only step explicitly runs apt update and installs
only `libpcre2-dev` with --no-install-recommends, before native build/tests.
Permissions, labels, test commands, job dependencies and skip/approval gates
are unchanged. No application code, production library version or test
assertion changed. The full feature PR now has 20 files.

Actual new-head integration job:
https://github.com/infiniflow/ragflow/actions/runs/39262753479/job/118094800909
completed successfully at `2026-10-19T13:49:32Z`.
The new run used a DIFFERENT runner from the failed job. Its apt log reports
PCRE2 already installed; provisioning succeeded idempotently. This proves
current-head hosted integration success, NOT a missing-library install or
same-runner causal before/after experiment.

Full hosted workflow: https://github.com/infiniflow/ragflow/actions/runs/39262753479
Status at evidence capture: `completed/success`.
Native correctness/race and bot results must be read from the actual current
head; pending or skipped jobs are not counted as passes.

## Reproducible local checks

`python3 verify-ci-step.py --repo /path/to/existing/ragflow-checkout`
requires existing Python 3/PyYAML, not Go/frontend dependencies.
With `--revision 9dc68a1b14cf3adca9bca00afd0195b2325fb444`, all seven structural
checks fail because the provisioning step is absent. Current source passes
all seven. These are workflow/shell fixtures: sudo is mocked; they do not
install host packages, execute Linux Go integration or claim application
regressions. Success, apt-update failure and apt-install failure are tested;
the workflow fails closed and preserves every pre-existing YAML value.

Normal repository pre-commit and diff checks passed. Full actionlint has
11 baseline vs 11 current diagnostics, zero new, not an all-green lint result.
Shellcheck/pyflakes are unavailable and disabled for both compared versions.
The native-job needs-expression diagnostic is retained as a static-tool
baseline observation, not proof that the hosted native job cannot run.

This is a CI-only repair. No new screenshot/video or UI effect is claimed;
the actual linked hosted logs are the execution evidence. Prior application
test results and screenshots retain their original commit provenance.
Earlier head approval is not current-head human/required CODEOWNER approval.
AI-assisted with OpenAI Codex; no human self-review or merge is claimed.
