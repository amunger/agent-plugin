---
description: 'Keep pull request descriptions focused on change intent'
applyTo: '**'
---

# Pull Request Descriptions

Describe what changed and the context reviewers need to evaluate it. Do not enumerate behavior, events, fields, identifiers, cadence, or semantics that remain unchanged. Mention unchanged behavior only when it is surprising, establishes a material compatibility guarantee, or prevents a likely reviewer misunderstanding.

Do not add a validation or testing section that merely lists checks enforced by CI or pre-commit hooks. Those routine checks do not add useful review context.

Include validation details only when they communicate information not already guaranteed by those automated checks, such as manual testing, environment-specific verification, intentionally skipped checks, or relevant limitations.

If no such additional validation was performed or needs to be disclosed, omit the validation or testing section entirely.
