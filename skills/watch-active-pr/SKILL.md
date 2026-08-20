---
name: watch-active-pr
description: Set up or refresh an hourly automation that watches the active pull request, investigates failures and feedback, reruns likely flakes, fixes clear regressions, disables auto-merge when human judgment is needed, and stops after the PR merges.
user-invocable: true
---

# Watch Active Pull Request

Set up the watcher; do not perform the watch inline unless the user separately asks for an immediate run.

## Configure the automation

1. Verify that the current workspace is a Git repository with a GitHub remote, then obtain its canonical `owner/repository` name with `gh`. If this cannot be determined, surface the error and do not create an ambiguously targeted automation.
2. Use the automation name `Watch active PR: <owner/repository>`.
3. Call `listAutomations` before configuring anything.
4. If an automation with that exact name exists, update it with the prompt and settings below and retarget it to the current session. Otherwise, create it for the current session.
5. Configure it as enabled, hourly, in agent mode, with the `autopilot` permission level. The prompt's merge-safety rules are mandatory despite that permission level.
6. Report whether the automation was created or updated, that it runs hourly, and that it disables itself after the PR merges.

Use `configureAutomation`; do not substitute a GitHub Actions workflow, operating-system scheduler, or long-running local process. If the automation tools are unavailable, explain that limitation rather than creating a different mechanism.

## Automation prompt

Pass the following prompt verbatim:

```text
Watch the pull request associated with the current branch in this repository. This is a recurring caretaker run, so inspect the PR's current state rather than relying on conclusions from an earlier run.

Use gh for GitHub operations and invoke applicable installed skills, especially fix-ci-failures for failed checks and act-on-feedback for user feedback. Respect repository instructions and preserve unrelated worktree changes.

1. Establish scope
- Verify gh authentication and resolve only the PR associated with the current branch, including its current state. Do not select an unrelated PR.
- If that PR is merged, call listAutomations, find the automation named "Watch active PR: <owner/repository>" for this repository, and call configureAutomation with its stable ID and enabled set to false. Make no repository or GitHub changes. Finish with a concise summary that says the PR was merged and the watcher was disabled. If the automation cannot be found or disabling it fails, report that failure prominently instead of claiming it was disabled.
- If there is no PR for the current branch or its PR is closed without merge, make no repository or GitHub changes and finish with a concise "no active PR" summary.
- Read the PR description, current review state, unresolved review threads, issue comments, and check results. Ignore feedback already resolved or clearly addressed, and do not respond to bot noise unless it identifies an actionable problem.

2. Investigate failures and feedback
- Inspect failing check logs and relevant artifacts before deciding whether a failure is a likely flake, an actual regression, or ambiguous.
- Treat a failure as a likely flake only when there is concrete evidence of transient infrastructure, an established flaky test, or nondeterministic behavior unrelated to the PR. Rerun only the failed job or workflow when possible; do not repeatedly rerun a persistent failure.
- Treat a code or feedback change as obvious only when the requested behavior and root cause are clear, the fix is narrow and low risk, and targeted validation is available.
- A change is not obvious when it needs a product or design decision, has multiple plausible fixes, is broad or cross-cutting, cannot be reproduced or validated, conflicts with other feedback, depends on unavailable permissions or secrets, or would require speculation.

3. Act when the result is obvious
- For a likely flake, rerun the smallest failed unit supported by GitHub and report the dispatched rerun.
- For a clear regression or actionable review comment, make the precise fix, add or update tests when behavior changes, run the smallest relevant existing validation, review the diff, commit, and push to the PR branch.
- Respond to or resolve addressed review feedback when supported. Follow all active instructions for PR comment responses.
- Never merge the PR and never enable auto-merge.

4. Escalate safely when it is not obvious
- As soon as a failure, requested change, or failed validation requires human judgment, check whether auto-merge is enabled. If it is, disable it with gh before finishing. Never leave auto-merge enabled on an unresolved ambiguous or risky issue. If its state cannot be determined or disabling it fails, stop making changes and report that failure prominently in the action-required summary.
- Do not make speculative code changes, rerun checks without evidence of flakiness, or post a PR comment solely as a notification.
- Finish with a concise summary beginning with "ACTION REQUIRED:" that includes the evidence gathered, why the issue is not straightforward, whether auto-merge was disabled or was already off, and the recommended next decision. The automation run result is the user notification; if the environment cannot surface one, leave this summary in the automation session.

5. Finish every run with one concise status summary
- State the PR, failures and feedback inspected, actions taken, validation performed, commits or reruns dispatched, and auto-merge state.
- If an attempted obvious fix becomes uncertain or does not pass validation, follow the escalation rules before finishing.
```
