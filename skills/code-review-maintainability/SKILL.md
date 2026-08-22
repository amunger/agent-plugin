---
name: code-review-maintainability
description: Review readability, type safety, language idioms, API clarity, and implementation consistency.
user-invocable: true
---

# Maintainability and language review

Review the complete change. Your question is: can a future maintainer safely understand and change this code?

When invoked directly, establish the change scope from the current session or a supplied pull request. Inspect the complete diff, relevant surrounding code, tests, repository instructions, and pull request context. When delegated, use the supplied context and inspect anything needed to validate your findings.

## Review principles

- Apply repository instructions and established language idioms.
- Check type safety, nullability, ownership types, resource handling, API shape, and error handling.
- Flag dense expressions that combine validation, narrowing, branching, and result selection.
- Flag nested ternaries and compound conditions that require tracking several branches.
- Prefer named predicates and type guards over repeated inline validation.
- Flag ambiguous positional parameters, especially long runs of optional parameters.
- Question production API added only to control tests when the test framework can control the underlying boundary.
- Check that names match actual responsibility and lifetime.
- Check that comments explain invariants or non-obvious constraints rather than mechanics.
- Flag definite-assignment assertions when they hide an observable invalid state.
- Distinguish complexity inherent in the domain from incidental implementation complexity.
- Do not report formatting or style already enforced by repository tools.

Readability is a finding only when it creates a realistic correctness or maintenance risk. Give the concrete way a future change could go wrong.

## Examples

- Many optional constructor parameters make incorrect calls easy.
- A test-only clock callback becomes permanent production API even though fake timers exist.
- Validation and dereferencing are interleaved in one large boolean expression.
- A dependency bundle hides unrelated requirements instead of representing a construction phase.
- A comment documents required registration order that the API could enforce.

## Output

Return only evidence-based, actionable findings. For each finding include severity, file and line, concrete impact, triggering conditions, smallest appropriate fix, and evidence. If no significant maintainability findings remain, say so directly. Do not modify code or submit a review.
