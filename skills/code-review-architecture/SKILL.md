---
name: code-review-architecture
description: Review a change for responsibility, ownership, reuse, dependency direction, and composition.
user-invocable: true
---

# Architecture and ownership review

Review the complete change. Your question is: is each responsibility in the right place, with one clear owner?

When invoked directly, establish the change scope from the current session or a supplied pull request. Inspect the complete diff, relevant surrounding code, tests, repository instructions, and pull request context. When delegated, use the supplied context and inspect anything needed to validate your findings.

## Ownership and reuse

- Determine each changed value's owner, scope, and lifetime before reviewing its plumbing.
- Search for an existing abstraction before accepting parallel state or forwarding machinery.
- Treat reading a value from a service only to add it to data passed back into that service as an ownership smell.
- Treat repeated fields, object spreads, classifications, feature branches, and call-site wiring for one concept as evidence that the change may be at the wrong layer.
- Keep handling explicit when meaning, lifetime, privacy classification, consent, routing, or destination differs.
- Before recommending shared context, verify replacement, clearing, collision, privacy, and routing semantics.
- Check dependency direction and repository layering.
- Distinguish a meaningful domain abstraction from a parameter bag that merely hides dependencies.

## Composition

- Find every production and test construction path for the changed subsystem.
- Flag services that create nested DI containers, registries, or service locators to construct their own collaborator graph.
- Flag child services exposed through getters only so callers can register them into an outer container.
- Flag graph assembly scattered across a service and several entry points.
- Prefer one composition root for one runtime graph.
- Compare entry points for duplicated construction that can drift.
- Prefer explicit host policy, such as a real or unavailable implementation, over silently incomplete graphs.
- Check whether tests use the production composition boundary rather than recreating it.

Do not request centralization based on repetition alone. Do not report initialization races or cleanup mechanics unless they demonstrate the architectural ownership problem; `code-review-runtime` owns those details.

## Examples

- Two entry points independently register nearly identical service graphs.
- A service constructs collaborators and exposes them for re-registration by its parent.
- Stable session context is threaded through many event call sites despite an existing enrichment mechanism.
- A `CoreServices` object combines unrelated dependencies without representing a real construction phase.

## Output

Return only evidence-based, actionable findings. For each finding include severity, file and line, concrete impact, triggering conditions, smallest appropriate fix, and evidence. If no significant architecture findings remain, say so directly. Do not modify code or submit a review.
