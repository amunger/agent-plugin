---
name: codereview-pocock
description: Review a branch, pull request, session changes, or changes since a fixed point along Matt Pocock's two independent axes, repository standards and originating spec compliance. Use for a standalone Pocock review or as Bravo's additional reviewer.
user-invocable: true
---

# Pocock two-axis code review

Adapted from [Matt Pocock's code-review skill](https://github.com/mattpocock/skills/blob/main/skills/engineering/code-review/SKILL.md), under the MIT license. See [third-party notices](../../THIRD_PARTY_NOTICES.md).

Review the same complete change along two axes:

- **Standards:** compliance with documented repository conventions, plus evidence-backed code-smell heuristics.
- **Spec:** compliance with the originating issue or requirements, including omissions, incorrect behavior, and unrequested scope.

Keep the axes separate so passing one cannot mask a problem in the other.

## Establish scope and sources

1. Honor an explicitly supplied PR, session scope, or fixed point. For a fixed point, validate it with `git rev-parse --verify <fixed-point>` before reviewing; capture `git diff <fixed-point>...HEAD` and `git log <fixed-point>..HEAD --oneline` once. For session or work-in-progress scope, include the requested staged, unstaged, and relevant untracked changes rather than silently reviewing only committed changes. For a PR, use its base/head diff and commit list. Report invalid refs or an empty scope before delegation. If no scope or fixed point can be established, ask through the available user-input tool.
2. Locate the spec in this order: issue references in the scoped commits or PR, a user-supplied path, then matching files under `docs/`, `specs/`, or `.scratch/`. Use the repository's configured tracker or available authenticated tools; do not require upstream's `/setup-matt-pocock-skills` command. Session requirements supplied by the user also count as a spec. If nothing is found, ask where the spec is; if none exists, skip Spec and report "no spec available". Disclose inaccessible sources rather than treating them as proof of compliance.
3. Find applicable repository standards, including instructions, `CODING_STANDARDS.md` and `CONTRIBUTING.md` when present. Include relevant language or directory-specific guidance and surrounding code.

## Standards baseline

Documented repository standards override this baseline. Smells are judgment calls, never automatic violations; label them as "possible" smells and explain the concrete maintenance cost. Skip checks already enforced by tooling and avoid style-only comments. Do not prescribe a refactor without evidence that it improves the changed code.

- **Mysterious Name:** a name hides purpose; suggest a clearer name or clarify the design.
- **Duplicated Code:** repeated logic shapes; consider sharing the common behavior.
- **Feature Envy:** behavior relies more on another object's data; consider moving it to that owner.
- **Data Clumps:** fields or parameters repeatedly travel together; consider a cohesive type.
- **Primitive Obsession:** a primitive obscures a meaningful domain concept; consider a small domain type.
- **Repeated Switches:** repeated branching on the same kind; consider one shared mapping or polymorphism.
- **Shotgun Surgery:** one logical change requires scattered edits; consider gathering the responsibility.
- **Divergent Change:** one module changes for unrelated reasons; consider separating responsibilities.
- **Speculative Generality:** abstractions serve requirements that do not exist; consider removing them.
- **Message Chains:** callers navigate through internals; consider an operation at the owning boundary.
- **Middle Man:** a layer only forwards calls without value; consider calling the real owner.
- **Refused Bequest:** an implementation rejects much of its inherited contract; consider composition.

## Standalone execution

Read and apply the [Copilot-only model policy](../code-review-bravo/copilot-model-policy.md). Use configured subagent defaults unless explicit model selection is authorized.

Launch two independent general-purpose reviewers concurrently, named `pocock-standards` and `pocock-spec`. Skip the latter when no spec is available. Give both the identical complete scope, diff command or captured diff, commit list, and relevant context. Do not show either the other's findings. Neither may edit files, post a review, or delegate further.

- **Standards prompt:** include every standards-source path and the complete baseline above. Request documented violations with source file and rule, separately labeled possible smells with quoted hunks, and evidence explaining impact. Repository rules override heuristics; skip tooling-enforced checks. Keep the report under 400 words.
- **Spec prompt:** include the spec path or fetched contents. Request missing or partial requirements, unrequested behavior, and incorrectly implemented requirements. Quote the supporting requirement for each claim; separate unresolved intent from defects. Keep the report under 400 words.

Require file and line, concrete problem and impact, triggering conditions, an appropriate root-cause fix, and evidence for each candidate. No findings is a valid result. Report incomplete reviewers and evidence gaps explicitly.

Present lightly cleaned reports under `## Standards` and `## Spec`. Do not merge or rerank across axes. End with each axis's finding count and worst issue, or its skipped/incomplete status; do not choose a single winner across axes. Do not modify code or submit a GitHub review unless explicitly asked.

## Embedded Bravo reviewer

When Bravo supplies this skill in a reviewer prompt, use its pinned shared scope, standards, goal, and spec. Do not restart scope discovery, request a different baseline, invoke Bravo, or launch nested reviewers. Perform both axes within this single reviewer. If a necessary source is absent or inaccessible, report the gap; mark Spec "no spec available" when appropriate instead of blocking the other reviewers.

Return separate `## Standards` and `## Spec` sections, under 400 words each, with stable references `pocock-standards-1`, `pocock-spec-1`, and so on. Preserve the same evidence requirements, hard-rule-versus-heuristic distinction, and per-axis counts. Bravo may deduplicate a candidate against other reviewers, but must retain its axis and attribution and report each axis's result separately.
