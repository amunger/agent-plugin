---
description: 'Keep pull request descriptions focused on change intent'
applyTo: '**'
---

# Pull Request Descriptions

Describe what changed and the context reviewers need to evaluate it. Lead with the real-world outcomes the change is intended to produce, not the implementation used to produce them. Include high level before-and-after examples of resulting behavior, output, payloads, or user experience when they make the change easier to understand.

When both are useful, separate **what is changing** from **how it is changing**. The "what" explains the goal and externally meaningful results; the "how" contains implementation details reviewers need to assess the approach.

Do not enumerate behavior, events, fields, identifiers, cadence, or semantics that remain unchanged. Mention unchanged behavior only when it is surprising, establishes a material compatibility guarantee, or prevents a likely reviewer misunderstanding.

Do not add a validation or testing section that merely lists checks enforced by CI or pre-commit hooks. Do not state that routine compile, type-check, lint, build, or test validation was deferred to pull request CI; reviewers already expect CI to run those checks.

Include validation details only when they communicate information not already guaranteed by those automated checks, such as manual testing, environment-specific verification, intentionally skipped checks, or relevant limitations.

If no such additional validation was performed or needs to be disclosed, omit the validation or testing section entirely.
