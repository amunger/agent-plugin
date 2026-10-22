---
name: prepare-verification
description: "Use when asked to prepare, schedule, or set up verification after a change or rollout. Plan the checks and schedule a self-deleting automation for one run; ask when to run if unspecified."
user-invocable: true
---

# Prepare Verification

1. Present a short, evidence-based plan: target/revision, checks and success criteria, a negative case, evidence sources, and access/rollout limitations. Do not execute yet.
2. If timing is unspecified, ask when to run using the user-input tool. Resolve the date, time, and time zone; confirm any ambiguity.
3. Call `listAutomations`; choose a provider with the workspace, access, verification and automation-management tools. Prefer native one-shot scheduling if exposed. Otherwise use recurrence only when its **first occurrence** matches the requested time, explaining self-deletion. Ask for an alternative if unsupported.
4. Create the automation **disabled**. Embed the complete plan, target, run time, prerequisites, reporting instructions, and lifecycle below. Add its returned automation/provider IDs to the prompt, then enable it. Verify saved configuration and next run time; disable and report any mismatch.
5. Report the scheduled time, provider, and automation ID. Do not create an MCP card.

## Automation run

- Using the saved ID, disable its schedule before verification; stop and report failure if that fails.
- Recheck deployment/access, execute only the plan, and report evidence, time windows/counts, failures and blocked checks. Missing data is not a pass. No unrelated changes, publishing, sign-ins, or subscription mutations.
- After this attempt, delete this automation by ID, even if verification failed or was blocked. Report cleanup failure; interrupted runs may remain disabled. Confirm deletion before claiming success.
