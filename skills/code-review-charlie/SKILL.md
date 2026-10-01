---
name: code-review-charlie
description: Run an extra-deep multi-model code review with 16 specialist reviewers, one holistic Alpha reviewer, advisory consolidation, and final top-level synthesis.
user-invocable: true
---

Review the code changes made in the current conversation or session. If the user supplies a pull request URL or number, review that pull request instead. This is the expensive, explicit-only alternative to Bravo: 17 independent first-stage reviewers, one advisory consolidator, and final synthesis in the current top-level agent.

## Reuse shared review guidance

Read these files relative to this skill before delegation:

- [Bravo orchestration](../code-review-bravo/SKILL.md), for shared context, candidate requirements, root-cause fix guidance, advisory consolidation, and final top-level synthesis.
- [Alpha review](../code-review-alpha/SKILL.md), for the independent holistic review.
- All seven templates in [Bravo reviewers](../code-review-bravo/reviewers/).
- [Bravo consolidation template](../code-review-bravo/synthesis/consolidator.md).

Do not invoke the Bravo workflow or ask a subagent to run it: reuse its guidance and templates with Charlie's reviewer matrix below, not an additional seven-reviewer run. Do not copy or fork the shared templates.

Establish the same complete diff, goal, surrounding code, repository instructions, tests, and relevant pull request context for every reviewer. Include session decisions and constraints that would otherwise be lost in delegation. Every reviewer examines the whole change; never partition it by file.

## Confirm model routing

Charlie requires actual cross-model review, not multiple agents with unknown or identical models. Resolve the suggested slots to concrete model IDs supported by the current host before launching. Respect explicit user model choices and applicable model-selection restrictions.

The following is a starting selection, not a benchmarked ranking or a guarantee of model availability. Example IDs to check are `gpt-5.5`, `claude-opus-4.7`, and `gemini-3.5-flash`. Prefer the user's chosen available versions; reassess these examples after model releases.

| Perspective | Count | Suggested model families |
| --- | --- | --- |
| Behavior | 3 | GPT reasoning, Claude Opus, Gemini |
| Architecture | 2 | Claude Opus, GPT reasoning |
| Runtime | 3 | GPT reasoning, Claude Opus, Gemini |
| Maintainability | 3 | Claude Opus, GPT reasoning, Gemini |
| Performance | 2 | GPT reasoning, Gemini |
| Tests | 1 | Gemini |
| Skeptic | 2 | Claude Opus, Gemini |
| Holistic Alpha | 1 | Claude Opus |

The seven core perspectives total 16 specialist reviewers; Alpha adds one, for 17 first-stage reviews. The advisory consolidator is an additional agent, not a replacement for a reviewer.

For each multi-model perspective, use distinct model families as suggested unless the user explicitly approves a different mix. Different reasoning settings or separate agents on the same model do not count as different models.

If concrete models have not already been authorized, propose the resolved reviewer-to-model mapping and ask the user to approve the named models before supplying model overrides. Do not silently fall back to configured defaults: if routing is unsupported, a required model is unavailable, or its identity cannot be verified, explain the limitation and ask whether to choose supported models, reduce coverage, or use Bravo instead. Do not claim Charlie's multi-model coverage was achieved without verifying the actual routing.

Suggest a strong consolidator from a different family than the current top-level agent: GPT reasoning when the lead uses Claude, or Claude Opus when it uses GPT or Gemini. Include the consolidator in routing approval. If the lead's identity is unknown, make that limitation explicit rather than claiming verified model contrast. The final lead remains the current top-level agent.

## Run independent reviewers

Launch the approved 16 specialist slots and one Alpha slot concurrently, subject to host concurrency limits. If the host requires waves, keep each review independent and retain every result; do not reduce the matrix to fit the concurrency limit.

For each specialist slot:

1. Use a separate general-purpose agent named for its perspective and model, such as `behavior-gpt`.
2. Include the complete relevant Bravo template, shared scope and goal, and relevant context in its prompt.
3. Require evidence-based candidate findings with location, impact, triggering conditions, an appropriate root-cause fix with scope and tradeoffs, and evidence. No significant findings is a valid result.

For the one holistic slot:

1. Use a separate general-purpose agent named `alpha-holistic`.
2. Provide the same shared scope and context, and ask it to invoke `code-review-alpha` for one all-in-one review. If the skill cannot be invoked in that agent, provide the complete Alpha instructions already read and disclose that execution used the source prompt.
3. Explicitly apply Charlie's root-cause fix policy to this run: recommend a coherent, appropriate fix rather than optimizing for Alpha's "smallest appropriate fix" wording. This does not alter the standalone Alpha skill.
4. Return evidence-based candidates to the lead, not a GitHub review.

Do not show reviewers other reviewers' findings or preliminary consolidation. No reviewer may modify files, submit a GitHub review, or launch additional reviewers.

Assign stable candidate references including perspective and model, such as `runtime-gpt-1` or `alpha-opus-1`. Retain all original responses, no-finding results, open questions, and incomplete-review status. Record the requested and actual model for each slot when the host exposes them; distinguish a verified model selection from an unverified request.

## Advisory consolidation

After every first-stage slot has finished or reported that it could not complete, launch one general-purpose agent named `consolidator` using the approved model and the complete Bravo consolidation template.

Supply the shared scope and context, all 17 original review responses or explicit incomplete-slot status, stable candidate references, and actual coverage information. Ask it to reconcile both cross-perspective and cross-model findings and reconsider fixes at the scale needed to address root causes.

Agreement among models is not proof; a finding raised by only one reviewer is not automatically weaker. Require code and test evidence for proposed retention, merging, rejection, severity, and revised fixes. Preserve distinct defects even when they share a correction.

Wait for the advisory notes before final synthesis. If consolidation cannot complete, report that limitation and continue top-level synthesis using all original responses.

## Final top-level synthesis

Apply Bravo's final top-level synthesis procedure to all original reviews plus the consolidator's advisory notes. Independently validate every candidate, including proposed rejections and new concerns from consolidation. The consolidator's opinion is additional input, not a verdict or a replacement for any review.

Present validated findings in severity order with appropriate root-cause fixes, justified scope and tradeoffs, and originating perspectives and models when known. Avoid repetition and vote-based severity. Keep evidenced product objections separate from implementation defects and missing-context questions.

Include a compact coverage summary comparing the requested matrix with completed slots and verified model selections. Report unavailable models, incomplete reviewers, and any consolidation limitation. If no significant findings remain, say so directly.

Evaluate this workflow by validated unique findings, rejected candidates, latency, and cost when available, not raw finding count. Do not modify code or submit a GitHub review unless the user explicitly asks.
