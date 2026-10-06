---
name: code-review-charlie
description: Run an extra-deep multi-model code review with 17 specialist reviewers, one holistic Alpha reviewer, advisory consolidation, and final top-level synthesis.
user-invocable: true
---

Review the code changes made in the current conversation or session. If the user supplies a pull request URL or number, review that pull request instead. This is the expensive, explicit-only alternative to Bravo: 18 independent first-stage reviewers, one advisory consolidator, and final synthesis in the current top-level agent.

## Reuse shared review guidance

Read these files relative to this skill before delegation:

- [Bravo orchestration](../code-review-bravo/SKILL.md), for shared context, candidate requirements, root-cause fix guidance, advisory consolidation, and final top-level synthesis.
- [Alpha review](../code-review-alpha/SKILL.md), for the independent holistic review.
- All eight templates in [Bravo reviewers](../code-review-bravo/reviewers/).
- [Bravo consolidation template](../code-review-bravo/synthesis/consolidator.md).
- [Copilot-only model policy](../code-review-bravo/copilot-model-policy.md), mandatory for every reviewer, consolidator, and the current top-level lead. Use built-in Copilot delegation; reject known BYOK routes without demanding unavailable provider attestation.

Do not invoke the Bravo workflow or ask a subagent to run it: reuse its guidance and templates with Charlie's reviewer matrix below, not an additional eight-reviewer run. Do not copy or fork the shared templates.

Establish the same complete diff, goal, surrounding code, repository instructions, tests, and relevant pull request context for every reviewer. Include session decisions and constraints that would otherwise be lost in delegation. Every reviewer examines the whole change; never partition it by file.

## Resolve model routing

Charlie requires actual cross-model review, not multiple agents with unknown or identical models. Resolve the suggested slots to concrete model IDs supported by the current host before launching. Respect explicit user model choices and applicable model-selection restrictions.

Invoking Charlie authorizes its documented model-family mix, including the advisory consolidator, without a separate routine approval prompt. Resolve concrete IDs from models supported by the built-in Copilot delegation tool and select the highest available versions automatically within those families and tiers, subject to applicable model-selection restrictions and the shared no-BYOK policy. Explicit user model choices take precedence only within that policy. Announce the resolved mapping and proceed; do not wait for provider attestation or a second confirmation.

The following is a starting selection, not a benchmarked ranking or a guarantee of model availability. Do not depend on hard-coded version examples: apply the shared policy's highest-available-version rule using supported Copilot versions exposed by the current host.

| Perspective | Count | Suggested model families |
| --- | --- | --- |
| Behavior | 3 | GPT reasoning, Claude Opus, Gemini |
| Architecture | 2 | Claude Opus, GPT reasoning |
| Runtime | 3 | GPT reasoning, Claude Opus, Gemini |
| Maintainability | 3 | Claude Opus, GPT reasoning, Gemini |
| Performance | 2 | GPT reasoning, Gemini |
| Tests | 1 | Gemini |
| Skeptic | 2 | Claude Opus, Gemini |
| Scope | 1 | Claude Opus |
| Holistic Alpha | 1 | Claude Opus |

The eight core perspectives total 17 specialist reviewers; Alpha adds one, for 18 first-stage reviews. The advisory consolidator is an additional agent, not a replacement for a reviewer.

For each multi-model perspective, use distinct model families as suggested unless the user explicitly approves a different mix. Different reasoning settings or separate agents on the same model do not count as different models.

Ask only when built-in model selection is unsupported, a known BYOK conflict exists, the required model-family diversity cannot be achieved, or an explicit user model choice cannot be honored. Do not silently fall back to configured defaults: explain the concrete limitation and ask whether to choose supported built-in models, reduce coverage, or use Bravo instead. Missing provider metadata alone is not a routing failure. If clarification cannot be obtained, report the unresolved limitation and that the review has not started; do not label it completed. Do not claim Charlie's multi-model coverage was achieved without selecting distinct supported models; report actual model identity when exposed and distinguish it from the requested selection.

Select a strong consolidator from a different family than the current top-level agent: GPT reasoning when the lead uses Claude, or Claude Opus when it uses GPT or Gemini. If the lead's identity is unknown, select an available Claude Opus consolidator and disclose that contrast with the lead is unverified; this alone does not require approval. The final lead remains the current top-level agent.

## Run independent reviewers

Launch the resolved 17 specialist slots and one Alpha slot concurrently, subject to host concurrency limits. If the host requires waves, keep each review independent and retain every result; do not reduce the matrix to fit the concurrency limit.

For each specialist slot:

1. Use a separate general-purpose agent named for its perspective and model, such as `behavior-gpt`.
2. Include the complete relevant Bravo template, shared scope and goal, and relevant context in its prompt.
3. Require evidence-based candidate findings with location, impact, triggering conditions, an appropriate root-cause fix with scope and tradeoffs, and evidence. No significant findings is a valid result.

Keep the scope review's dispositions and any evidence-backed optional opportunities or alternative approaches separate from candidate defects, and retain them for consolidation and final synthesis.

For the one holistic slot:

1. Use a separate general-purpose agent named `alpha-holistic`.
2. Provide the same shared scope and context, and ask it to invoke `code-review-alpha` for one all-in-one review. If the skill cannot be invoked in that agent, provide the complete Alpha instructions already read and disclose that execution used the source prompt.
3. Explicitly apply Charlie's root-cause fix policy to this run: recommend a coherent, appropriate fix rather than optimizing for Alpha's "smallest appropriate fix" wording. This does not alter the standalone Alpha skill.
4. Return evidence-based candidates to the lead, not a GitHub review.

Do not show reviewers other reviewers' findings or preliminary consolidation. No reviewer may modify files, submit a GitHub review, or launch additional reviewers.

Assign stable candidate references including perspective and model, such as `runtime-gpt-1` or `alpha-opus-1`. Retain all original responses, no-finding results, open questions, and incomplete-review status. Record the built-in delegation route and requested model for each slot, plus actual model and provider metadata when exposed; do not present unexposed metadata as verified.

## Advisory consolidation

After every first-stage slot has finished or reported that it could not complete, launch one general-purpose agent named `consolidator` using the resolved model and the complete Bravo consolidation template.

Supply the shared scope and context, all 18 original review responses or explicit incomplete-slot status, stable candidate references, and actual coverage information. Ask it to reconcile both cross-perspective and cross-model findings and reconsider fixes at the scale needed to address root causes.

Agreement among models is not proof; a finding raised by only one reviewer is not automatically weaker. Require code and test evidence for proposed retention, merging, rejection, severity, and revised fixes. Preserve distinct defects even when they share a correction.

Wait for the advisory notes before final synthesis. If consolidation cannot complete, report that limitation and continue top-level synthesis using all original responses.

## Final top-level synthesis

Apply Bravo's final top-level synthesis procedure to all original reviews plus the consolidator's advisory notes. Independently validate every candidate, including proposed rejections and new concerns from consolidation. The consolidator's opinion is additional input, not a verdict or a replacement for any review.

Present validated findings in severity order with appropriate root-cause fixes, justified scope and tradeoffs, and originating perspectives and models when known. Avoid repetition and vote-based severity. Keep evidenced product objections separate from implementation defects and missing-context questions.

Apply Bravo's scope dispositions and larger-change classification: current-PR corrections, optional follow-up PR opportunities, and alternative PR approaches. Keep optional opportunities separate from severity-ordered findings and explain evidence, scope, tradeoffs, and whether deferral is safe.

Include a compact coverage summary comparing the requested matrix with completed slots and verified model selections. Report unavailable models, incomplete reviewers, and any consolidation limitation. If no significant findings remain, say so directly.

Evaluate this workflow by validated unique findings, rejected candidates, latency, and cost when available, not raw finding count. Do not modify code or submit a GitHub review unless the user explicitly asks.
