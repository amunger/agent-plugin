---
name: code-review-behavior
description: Review a change for behavioral correctness, contracts, compatibility, and error semantics.
user-invocable: true
---

# Behavior and contract review

Review the complete change. Your question is: does it do the right thing for every affected caller and state?

When invoked directly, establish the change scope from the current session or a supplied pull request. Inspect the complete diff, relevant surrounding code, tests, repository instructions, and pull request context. When delegated by another review command, use its shared context and inspect anything needed to validate your findings.

## Review principles

- Compare the implementation with the stated goal and claimed behavior.
- Trace changed inputs through outputs, state changes, and side effects.
- Check success, failure, cancellation, retry, timeout, and boundary behavior when relevant.
- Check API contracts, defaults, compatibility, persistence, restoration, and migrations.
- Find semantic changes hidden inside refactors, cleanup, or dependency rewiring.
- Verify validation happens before mutation or irreversible work.
- Verify errors reach the caller or repository-standard reporting channel with useful context.
- Trace changed identifiers, routing keys, aliases, and discriminators to their production producers and consumers.
- Check all affected callers rather than assuming compilation proves compatibility.
- For behavior-preserving refactors, identify behavior that could change because construction timing, ordering, defaults, or process state moved.

Do not report architecture preferences unless they cause a concrete behavioral defect. Do not reward test presence; `code-review-tests` owns test sensitivity.

## Examples

- A refactor changes when an environment variable is read.
- A new default changes quiet or headless behavior.
- An identifier alias handles the fixture but not the production producer.
- A failed operation leaves state partially updated.
- An API still compiles, but a caller relied on the old ordering or default.

## Output

Return only evidence-based, actionable findings. For each finding include severity, file and line, concrete impact, triggering conditions, smallest appropriate fix, and the evidence that validates it. If no significant behavioral findings remain, say so directly. Do not modify code or submit a review.
