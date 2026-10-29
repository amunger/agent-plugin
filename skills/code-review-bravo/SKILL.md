---
name: code-review-bravo
description: Review changes with nine independent reviewers, including Pocock standards and spec review, scope and product fit, advisory consolidation, and a top-level synthesis crediting reviewers and comment dispositions.
user-invocable: true
---

Review the code changes made in the current conversation or session. If the user supplies a pull request URL or number, review that pull request instead.

Before delegation, read and apply the mandatory [Copilot-only model policy](./copilot-model-policy.md). Use built-in Copilot delegation, never intentional or known BYOK routes. Run all reviewers, consolidation, and top-level synthesis without a separate provider approval step; missing provider metadata alone must not block the workflow. Stop on a known non-Copilot routing conflict, not an unavailable attestation.

## Establish shared context

Before delegating, establish the stated goal and inspect enough context to give every reviewer the same accurate scope:

- the complete diff and relevant surrounding code
- applicable repository instruction files
- changed and relevant existing tests
- for a pull request, its description, linked context, discussion, and relevant checks
- standards sources and the originating issue, spec, or session requirements for the Pocock review; follow its source-discovery guidance before delegation and disclose unavailable sources

Do not divide the diff by file. Every reviewer evaluates the complete change from a different perspective.

## Run the nine reviewers

Read the eight private reviewer templates from the `reviewers/` directory beneath this skill:

1. `behavior.md`
2. `architecture.md`
3. `runtime.md`
4. `maintainability.md`
5. `performance.md`
6. `tests.md`
7. `skeptic.md`
8. `scope.md`

Also read [codereview-pocock](../codereview-pocock/SKILL.md) as the ninth reviewer. Launch nine independent reviewers concurrently, subject to host concurrency limits; use independent waves if necessary without dropping reviewers. Use a separate general-purpose agent for each reviewer, using the template name without its extension for the eight specialists and `pocock` for the additional reviewer. Include the complete relevant template or Pocock skill contents in each prompt; do not ask reviewers to invoke another skill.

Explicitly select Pocock's **Embedded Bravo reviewer** mode: one additional agent evaluates Standards and Spec separately, without nested delegation or repeating scope selection. Preserve its per-axis results, including missing-spec or incomplete status, through consolidation and final synthesis.

Give each reviewer the shared scope, goal, and relevant context in addition to its template. Reviewers may inspect the repository and pull request as needed. They must not modify files or submit a GitHub review.

Each reviewer returns candidate findings only. A candidate must include:

- affected file and line
- concrete problem and impact
- triggering conditions
- appropriate fix
- evidence used to validate the claim

Reviewers should return no findings rather than invent low-signal concerns outside their perspective.

Keep evidence-backed optional follow-up opportunities and alternative PR approaches separate from candidate defects. Pass these notes through consolidation and final synthesis using the larger-change dispositions below.

Recommend fixes that address the root cause at the appropriate ownership boundary. Prefer a coherent, durable change over a smaller patch that leaves duplicated workarounds or incomplete behavior. Explain any broader scope and its tradeoffs; do not expand into unrelated cleanup.

## Model suggestions

These are starting hypotheses for a mixed-model review, not proven model rankings or mandatory routing. When concrete version selection is authorized, prefer the highest available Copilot version within each chosen family and tier under the shared model policy; preserve explicit pins and applicable configured preferences.

| Perspective | Suggested model family | Capability to evaluate |
| --- | --- | --- |
| Behavior | Strong GPT reasoning model | Contract tracing and edge-case analysis |
| Architecture | Claude Opus | Cross-file ownership and design reasoning |
| Runtime | Strong GPT reasoning model | Ordering, state transitions, and concurrency |
| Maintainability | Claude Sonnet | Language idioms and concrete maintenance risks at lower cost |
| Performance | Claude Sonnet; consider a stronger reasoning model for complex cases | Worst-case latency, load, retention, and concurrency analysis |
| Tests | Strong Gemini model | Independent fixture scrutiny and surviving-mutation analysis |
| Skeptic | Claude Opus | Product fit, necessity, tradeoffs, and simpler alternatives |
| Scope | Claude Opus | Unrelated changes, unexplained scope, and description accuracy |
| Pocock | Configured subagent default | Documented standards, code-smell heuristics, and originating spec compliance as separate axes |
| Advisory consolidation | Strong GPT reasoning model when the top-level agent uses Claude; Claude Opus when it uses GPT or Gemini | Cross-review consolidation and root-cause fix planning from a different model family |
| Final lead synthesis | Current top-level agent | Independent validation and final judgment using original reviews plus advisory notes |

Preserve configured subagent preferences by default. These suggestions do not authorize model overrides: select an explicit model only when the user or applicable persistent instructions request it and the host supports that selection. Do not claim model diversity when actual model selection is unknown. Report an unavailable requested model instead of silently substituting another.

For the consolidation stage, use the contrasting-family suggestion when model routing is authorized and supported, subject to explicit user model choices. The final synthesis stays in the current top-level agent; do not launch a replacement lead or attempt to change its model. If the top-level model is unknown, the suggested family is unavailable, or routing is not permitted, retain the configured subagent default and disclose that cross-model consolidation was not verified.

For high-risk changes, consider proposing a second independent behavior review from a different model family. Keep the same scope and template, and do not show either reviewer the other's conclusions before synthesis. Do not add this extra reviewer unless the user requests it.

Evaluate routing by validated unique findings, rejected candidates, latency, and cost when available, rather than raw finding count. Reassess the suggestions after major model changes.

## Advisory consolidation

After all nine reviewers have finished or reported that they could not complete:

1. Read the private `synthesis/consolidator.md` template beneath this skill.
2. Launch one separate general-purpose agent named `consolidator`. Include the complete template, shared scope and goal, relevant context, and every original reviewer response, including no-finding results, open questions, and incomplete-review status. Give findings stable references such as `behavior-1` so suggestions remain traceable.
3. Ask it to propose consolidation, reconcile conflicting recommendations, and revise fix suggestions at the scale needed to address root causes. It may inspect code and tests but must not modify files or submit a review.
4. Wait for its advisory notes before final synthesis. Preserve the original reviewer responses; neither proposed merges nor rejected candidates replace them.
5. If the consolidator cannot complete, report that limitation and proceed with top-level synthesis of the original reviews.

## Final top-level synthesis

The current top-level agent performs the final synthesis. Treat the consolidator's notes as additional input, not an authoritative verdict or replacement for the original findings.

1. Validate every original candidate and any additional concern from the consolidator against the current code, surrounding code, and tests, including candidates it recommended rejecting.
2. Reconcile conflicts between reviewers and assess the consolidator's proposed groupings and revised fixes independently.
3. Merge duplicate findings, preserving distinct impacts, triggering conditions, evidence, and reviewer provenance. Related findings may share a fix without being the same defect.
4. Choose coherent root-cause fixes at the appropriate scale rather than optimizing for the smallest patch. Check that broader recommendations cover all affected paths, preserve required behavior, and justify their scope and tradeoffs.
5. Reject style preferences, speculative risks, and findings already prevented by existing code.
6. Assign severity from concrete impact and triggering conditions, not from which reviewer raised it or the consolidator's proposed priority.
7. Present the remaining findings in severity order with appropriate fix suggestions. Include the originating reviewer perspective for each and identify any additional concern originating in consolidation.
8. If no significant findings remain, say so directly.
9. Mention any reviewer or consolidator that could not complete its work.
10. Distinguish evidenced product-level objections from implementation defects. A skeptic finding may recommend narrowing or not making the change, but must identify a concrete conflict or cost and a viable alternative. If product intent cannot be established, report the missing context as an open question rather than a defect or a veto.
11. Preserve scope findings as actionable dispositions: update an incomplete description of intended behavior, remove or split unrelated code, or seek clarification. Do not broaden the stated goal merely to justify unrelated changes.
12. Include a separate Pocock summary under **Standards** and **Spec**, with per-axis finding counts and the worst supported issue or skipped/incomplete status. A severity-ordered finding may link back to either axis, but do not collapse them into one pass/fail judgment or let one mask the other.

## Reviewer credit and comment dispositions

The final user-facing response must include **Reviewer contributions and actions**:

- Give every original candidate a stable reference, preserving Pocock's axis-specific references. Track references through consolidation and top-level validation, including rejected candidates.
- Credit every reviewer that supplied a comment, including optional opportunities or open questions, and the consolidator for concerns it originated. When several reviewers independently found the same problem, credit all of them on the merged finding.
- Use a compact table with **Reviewer(s)**, **Comment reference(s)**, **Final disposition and reason**, and **Action taken**. Account for each comment as accepted, merged (link to the retained finding), rejected, deferred/optional, or unresolved. Group rows only when every referenced comment has the same disposition and action.
- Distinguish acted-on review feedback from implemented fixes. Say "included in final findings", "incorporated into recommendation", or "not changed" as appropriate. Mark a fix "implemented" only when an explicitly authorized change was actually made and verified; otherwise say "recommended, not implemented". A rejected candidate was evaluated, not fixed.
- Identify completed reviewers with no comments and reviewers that failed or were incomplete separately. Never imply that a silent or failed reviewer approved the change.

This attribution is required even if no defects survive synthesis. It does not authorize edits or posting reviews.

## Larger-change opportunities

The skeptic, architecture reviewer, and consolidator may identify a larger coherent solution. Do not suppress it just because it exceeds the current diff, but distinguish three dispositions in final synthesis:

- **Current-PR correction:** needed to address a validated defect or material requirement conflict. Explain why the scope is necessary.
- **Optional follow-up PR:** an evidence-backed improvement that can safely be deferred. Note the benefit, affected boundaries, scope, dependencies, tradeoffs, and why the current change can stand without it. Do not assign defect severity or present it as a merge blocker merely because it would improve the design.
- **Alternative PR approach:** a materially different way to meet the same goal that could replace or reshape this PR. Compare it with the current approach, identify retained and lost capabilities, costs and risks, and state whether adoption is optional or needed because of a separately validated problem.

Keep optional follow-ups and alternative approaches separate from severity-ordered findings. Return none when there is no concrete opportunity; do not produce generic redesign suggestions. These are notes for author judgment, not authorization to implement them, change the PR description, or open another PR.

Do not modify code or submit a GitHub review unless the user explicitly asks.
