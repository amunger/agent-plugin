---
name: code-review-tests
description: Review whether tests and validation catch realistic defects introduced by a change.
user-invocable: true
---

# Test and validation review

Review the complete change. Your question is: would the tests fail for realistic defects introduced by this change?

When invoked directly, establish the change scope from the current session or a supplied pull request. Inspect the complete diff, production code, relevant tests, repository instructions, and pull request context. When delegated, use the supplied context and inspect anything needed to validate your findings.

## Review principles

- Map every added or changed test to a production behavior, contract, or risk.
- Verify the setup reaches the changed production path and assertions observe its result.
- Ask whether reverting or mutating the relevant production logic would make an assertion fail.
- For behavior-preserving refactors, test plausible semantic regressions rather than requiring failure against the base version.
- Perform analytical mutation testing: omit a branch or field, use the wrong value, invert a condition, mishandle a boundary, bypass a restriction, or skip cleanup.
- Trace fixture identifiers, routing keys, and discriminators to their production producers.
- Flag tests that copy implementation literals or predicates without independently observing the producer-consumer contract.
- Check whether mocks, fixtures, snapshots, or broad assertions hide the changed behavior.
- Prefer the production composition boundary over direct construction or a duplicated test graph.
- When dependency registration matters, use a test container as strict as production and dispose it correctly.
- After behavior moves into a shared abstraction, prefer focused boundary tests plus representative consumers over redundant copies.
- Test replacement, clearing, restart, failure, and disposal when state is mutable.
- Use relevant static validators for schemas, generated declarations, and other declarative metadata.
- Do not request a test that cannot catch a realistic regression.

## Examples

- A composition test asserts only that one convenient object exists.
- A mock repeats the same discriminator typo as production.
- Unit tests call a constructor while production uses a factory that performs essential setup.
- A test proves initial context population but not replacement or clearing.
- A fixture reuses host-owned configuration keys for unrelated mock behavior.

## Output

Return only evidence-based, actionable findings. For each finding include severity, file and line, concrete impact, surviving mutation or missed regression, smallest appropriate fix, and evidence. If no significant test findings remain, say so directly. Do not modify code or submit a review.
