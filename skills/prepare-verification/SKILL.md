---
name: prepare-verification
description: "Use when asked to prepare verification, set up verification, or explain what should be verified after a change or rollout. Present a high-level evidence-based plan and a same-chat Go Ahead and Verify button; wait for approval before executing."
user-invocable: true
---

# Prepare Verification

Prepare a verification handoff in the current chat. Planning is not execution.

## Prepare

1. Identify the change, its intended outcome, and what is deliberately out of scope. Use the current conversation; read the referenced issue/PR and relevant source when needed.
2. Establish the target: local build, published release, deployment, platform, or data cohort. For rollout checks, use exact deployed revisions and allow for adoption and ingestion delay; a version label or merge alone does not establish deployment.
3. Choose a small set of observable checks that directly test the changed behavior. Include the important regression/negative case, evidence source, and success criteria. Distinguish missing evidence from a failed check.
4. Note access requirements, human steps, risks, and known limitations. Ask only when an unresolved choice materially changes the plan.
5. Do not run tests, builds, live scenarios, production queries, sign-ins, or mutations during preparation. Read-only context inspection is sufficient; do not start background verification.

## Present

Give a concise, plain-English overview rather than a command checklist:

- **Goal and target:** what will be verified and where.
- **Checks:** a few high-level checks, each with its evidence and expected result.
- **Limits/readiness:** what this cannot establish and any prerequisites.

Keep the complete plan in the conversation so approval needs no hidden state or separate session. Do not create a plan file unless requested.

As the final rendered item, call `show_verification_plan` with:

- `title`: a short name for this verification;
- `summary`: the goal and exact target/cohort;
- `checks`: concise check/evidence/expected-result statements;
- `limitations`: prerequisites and boundaries, or an explicit statement that none are currently known.

The tool renders the overview with **Go Ahead and Verify** at the bottom. Do not append prose after the card or claim a button exists if the tool was unavailable. If MCP Apps/the tool are unavailable, present the same overview as text and finish with: `Reply "go ahead and verify" to run this plan in this chat.`

## After Approval

The button sends exactly `go ahead and verify` as a user message through the host to the same chat. Typing that phrase has the same meaning.

- Execute the most recent unambiguous verification plan in this chat; do not render the planning card again or delegate to a new chat/session.
- Recheck the target and prerequisites. If the plan is missing, superseded ambiguously, or materially changed, clarify rather than execute a stale plan.
- Use applicable testing, UI-validation, or telemetry-query guidance during execution. Approval does not authorize unrelated changes, publishing, destructive actions, or bypassing access controls.
- Report actual results, denominators/time windows where relevant, and blocked or untested cases. Never call absent data a pass.
