---
name: code-review-charlie
description: Review a change with explicit assumptions, subjective tradeoffs, Bravo review, and reproduction and regression verification. Use when the user asks for code-review-charlie.
user-invocable: true
---

# Code Review Charlie

- State the intended behavior and any assumptions about it. Judge whether each assumption is supported, reasonable but unconfirmed, or questionable.
- Identify other subjective decisions in the change and explain their tradeoffs.
- Judge whether the demonstrated benefit outweighs complexity, maintenance, performance, and test runtime/flakiness costs; consider simpler alternatives.
- Check relevant history and discussion for rationale, rejected approaches, and prior regressions that could change the judgment.
- Attempt to reproduce the issue before the fix, and document relevant existing behavior to prepare a check for regressions with the fix.
- Apply the fix locally within the user's authorized scope, or evaluate the already-applied fix. Verify both the expected improvement and the identified existing behavior.
- Run [code-review-bravo](../code-review-bravo/SKILL.md), or reuse a completed review of similar or greater scrutiny that covers the current diff.
- Summarize the evidence, unresolved concerns, and anything that could not be reproduced or verified. Distinguish observed results from assumptions.
- Keep feedback and proposed actions local with the user by default. Do not publish feedback, submit a review or approval, or merge without the user's go-ahead; a local verdict is not permission to do so.
- End the response with a verdict: **Approve / Approve if assumptions hold / Needs Work / Reject**. Choose one and briefly explain it; for conditional approval, name the assumptions that must hold.
