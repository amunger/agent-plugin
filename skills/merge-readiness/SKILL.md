---
name: merge-readiness
description: Determine whether a change is ready to merge, complete explicitly required validation, and summarize meaningful local or product validation without repeating routine CI coverage.
user-invocable: true
---

# Merge Readiness

Determine whether the current change or a supplied pull request is ready to merge. Do not merge it unless the user explicitly asks.

## Establish the requirements

1. Identify the change and its intended behavior from the current conversation, task tracking, worktree, pull request, linked issue, and review discussion.
2. Collect every validation task the user explicitly required. Treat these as merge requirements unless the user later waived or replaced them.
3. Inspect the validation already performed in the current session and other available evidence. Do not claim validation without direct evidence that it completed successfully against the current change.

## Validate readiness

1. Complete every outstanding user-required validation task before declaring the change ready. If a task cannot be completed, report the blocker and do not declare the change ready.
2. Check the pull request state when one exists, including merge conflicts, required checks, unresolved required feedback, and required approvals. Routine automated tests and static analysis must pass, but successful CI coverage is not validation work to enumerate.
3. Give local testing against the product special weight for product behavior and user experience changes:
   - Prefer to perform the relevant local product scenario directly when the environment and available tools support it.
   - Verify the changed behavior and a meaningful nearby or regression scenario rather than only confirming that the product starts.
   - If credible local product testing is important but cannot be performed by the agent, determine whether the user already said they will test it.
   - When the user's intent is unknown and their testing or waiver is necessary for confidence, ask whether they want to test before merge. Do not assume that user testing is always required.
4. Review the complete current diff and confirm that the implementation matches the stated goal, contains no known blockers, and includes any necessary documentation or release-facing updates.

Explicitly requested automated tests or static analyzers must still be completed even when CI runs them. If they succeed, do not list them as validation work; if they fail, report the failure as a blocker.

## Output

Start with exactly one verdict:

- `Ready to merge`
- `Not ready to merge`
- `Waiting for user validation`

Then report:

- Any unmet required validation, unresolved feedback, conflict, failed requirement, or other blocker.
- Meaningful validation performed so far, limited to local product testing, manual scenarios, visual inspection, environment-specific verification, or other work not automatically covered by routine CI.
- Whether additional user testing is required, optional, already planned, completed, or explicitly waived when that distinction matters.

If the user did not specify validation tasks, say so and list only the meaningful validation already performed. Do not list successful automated tests, builds, linters, type checks, static analyzers, or other checks that routinely run in CI. Do not add a generic recommendation to rerun them.
