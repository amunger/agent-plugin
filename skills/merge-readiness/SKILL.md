---
name: merge-readiness
description: Determine whether a change is ready to merge by checking required validation and summarizing meaningful local or product validation without repeating routine CI coverage.
user-invocable: true
---

# Merge Readiness

Determine whether the current change or a supplied pull request is ready to merge. Do not merge it unless the user explicitly asks.

## Establish the requirements

1. Identify the change and its intended behavior from the current conversation, task tracking, worktree, pull request, linked issue, and review discussion.
2. Collect every validation task the user explicitly required. Treat these as merge requirements unless the user later waived or replaced them.
3. Inspect the validation already performed in the current session and other available evidence. Validation performed before the latest change may still count when that change was small and did not invalidate the scenario, but note that it predates the change. Otherwise, do not claim validation without direct evidence that it completed successfully against the current change.

## Validate readiness

1. Every user-required validation task should be completed before the change is declared ready. Report any incomplete or blocked task and do not declare the change ready.
2. Check the pull request state when one exists for merge conflicts, failed required checks, and unresolved required feedback. Do not treat draft state or missing approvals as blockers, and do not mention them; readiness here means the author-side due diligence is complete before requesting human review.
3. Give local testing against the product special weight for product behavior and user experience changes:
   - Prefer to perform the relevant local product scenario directly when the environment and available tools support it.
   - Verify the changed behavior and a meaningful nearby or regression scenario rather than only confirming that the product starts.
   - If credible local product testing is important but cannot be performed by the agent, determine whether the user already said they will test it.
   - When the user's intent is unknown and their testing or waiver is necessary for confidence, ask whether they want to test before merge. Do not assume that user testing is always required.
4. Do not perform a substitute code review as part of this skill. Determine which specific review skills, if any, have already reviewed the current change and include them in the validation summary. If none have run, say that no review skill has been performed.

Explicitly requested automated tests or static analyzers must still be completed even when CI runs them. If they succeed, do not list them as validation work; if they fail, report the failure as a blocker.

## Output

Start with exactly one verdict:

- `Ready to merge`
- `Not ready to merge`
- `Waiting for user validation`

Then report:

- Any unmet required validation, unresolved feedback, conflict, failed requirement, or other blocker.
- Meaningful validation performed so far, including completed review skills, local product testing, manual scenarios, visual inspection, environment-specific verification, or other work not automatically covered by routine CI.
- Whether additional user testing is required, optional, already planned, completed, or explicitly waived when that distinction matters.

If the user did not specify validation tasks, say so and list only the meaningful validation already performed, including specific review skills or the absence of one. Do not list successful automated tests, builds, linters, type checks, static analyzers, or other checks that routinely run in CI. Do not add a generic recommendation to rerun them.
