---
name: code-review-alpha
description: Review changes with the original all-in-one review prompt.
argument-hint: '[PR URL or number]'
---

Review the code changes made in the current conversation or session. If the user supplies a pull request URL or number, review that pull request instead.

1. Establish the stated goal from the conversation or pull request. Inspect the complete diff, relevant surrounding code, tests, and applicable instruction files. For a pull request, also inspect its description, linked context, discussion, and relevant checks when available.
2. Review the changes from five perspectives:
   - **Solution fit and reuse:** Determine whether the change is the right way to meet the stated goal, avoids unnecessary complexity, and reuses an existing solution or abstraction when the codebase already solves a similar problem.
   - **Clarity and consistency:** Determine whether the code is understandable and follows the repository's established architecture, naming, error-handling, testing, and implementation patterns. Apply the readability and reviewability criteria below.
   - **Performance and scale:** Identify concrete effects on time, memory, I/O, concurrency, startup, or hot paths, including inputs or operating conditions under which the change becomes materially worse.
   - **Language and instruction compliance:** Check applicable instruction files and idiomatic language guidance, including type safety, ownership or lifecycle rules, resource handling, API design, and language-specific best practices.
   - **Automated test appropriateness and sensitivity:** Determine whether added or changed tests directly validate the behavior, contract, or risk introduced by the production change, and whether they would fail for plausible corresponding defects in that production code. Apply the test-quality criteria below.
3. Report only evidence-based, actionable findings with affected locations, impact, triggering conditions, and the smallest appropriate fix. Prefer fewer, higher-signal comments over many minor stylistic nits. Significant readability and reviewability problems are high-signal correctness concerns, not mere style nits.
4. Validate every proposed finding against the current code and tests. Reconcile conflicts and remove duplicates.
5. Present the remaining findings in severity order. For each finding, include:
   - the review angle
   - file and line
   - the concrete problem and its impact
   - the conditions that trigger it
   - the smallest appropriate fix
6. If no significant findings remain, say so directly. Mention any perspective or validation that could not be completed.
7. Do not modify code or submit a GitHub review unless the user explicitly asks.

## Readability and Reviewability

Flag code that is technically correct but unnecessarily difficult to verify or maintain.

In particular, flag:

- Dense boolean expressions combining validation, narrowing, and return selection.
- Nested ternaries or compound conditions spanning several lines.
- Logic requiring the reviewer to mentally track multiple success and failure branches.
- Repeated property validation that should be expressed as a named type guard.
- Code whose intent would be clearer through early returns, named predicates, or extracted helpers.

Prefer named helpers that communicate intent, such as `isFileEditAttributionSource`, over large inline validation expressions.

Treat reviewability as a correctness concern: difficult-to-read validation code makes edge cases and unsafe dereferences easier to miss.

## Cross-Cutting Context and Reuse

When one value is threaded through multiple events, schemas, providers, or sinks, determine its ownership and lifetime before reviewing the mechanics.

- If the value is stable account, session, or process context, search for an existing common-context or enrichment mechanism. Prefer completing that mechanism across all forwarding boundaries over adding property-specific state, accessors, discriminators, and repeated call-site wiring.
- Treat reading a value from a service only to add it to data passed back into that service as a strong ownership smell.
- Treat repeated fields, classifications, object spreads, and feature-identifier branches for one conceptual value as evidence that the change may be operating at the wrong layer.
- When a change adds or expands identifier aliases, verify whether behavior genuinely depends on feature identity or whether the branch compensates for misplaced plumbing. Trace identifiers from their production definitions and callers rather than inferring them from tests or nearby names.
- Before recommending shared context, verify that the abstraction preserves replacement and clearing semantics, scope and lifetime, privacy classification, consent and routing gates, destination coverage, and collision precedence.

Keep explicit feature- or event-specific handling when the value's meaning, classification, lifetime, consent requirements, or destination genuinely differs. Do not request centralization based on repetition alone.

## Automated Test Quality

Evaluate test relevance before rewarding test quantity or conformity with nearby conventions.

- Map each added or changed test to a specific production behavior, contract, or risk in the diff. Exercising the same entry point, event, or forwarding path is not sufficient if the assertions only re-prove unchanged behavior.
- For identifiers, routing keys, and discriminators, trace fixtures to their production producer. Flag tests that repeat the implementation's new literal or predicate without exercising the producer-consumer contract or otherwise deriving the expectation independently.
- Check regression sensitivity by asking whether the test would fail against the pre-change production code or if the relevant production change were reverted. For an intentionally behavior-preserving refactor, do not require failure against the base version; instead test plausible semantic regressions that the refactor could introduce.
- Perform analytical mutation testing. Consider the smallest plausible defects related to the change, such as omitting a new branch or field, using the wrong mapped value, inverting a condition, mishandling a boundary, or bypassing an error or restriction. Verify that the test setup reaches the mutated path and that at least one assertion would fail. Report material mutations that would survive.
- Inspect whether mocks, fixtures, snapshots, duplicated implementation logic, or overly broad assertions allow the test to pass without observing the changed behavior.
- After behavior moves into a shared abstraction, prefer focused tests of that boundary and representative concrete sinks over retaining redundant per-event or per-provider assertions. Verify lifecycle transitions such as replacement and clearing when the context is mutable.
- Distinguish executable behavior from comments, annotations, schemas, generated declarations, and other declarative metadata. Prefer the repository's relevant static validator, linter, generator check, or build step for such changes. Do not credit an unrelated runtime unit test as coverage merely because repository convention places one nearby.
- If no practical automated test can validate the change, do not request or accept a fluff test. Recommend the smallest relevant validation only when it would catch a realistic regression.
