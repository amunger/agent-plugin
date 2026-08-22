---
name: code-review-bravo
description: Review changes with six independent specialist reviewers and a lead synthesis.
argument-hint: '[PR URL or number]'
---

Review the code changes made in the current conversation or session. If the user supplies a pull request URL or number, review that pull request instead.

## Establish shared context

Before delegating, establish the stated goal and inspect enough context to give every reviewer the same accurate scope:

- the complete diff and relevant surrounding code
- applicable repository instruction files
- changed and relevant existing tests
- for a pull request, its description, linked context, discussion, and relevant checks

Do not divide the diff by file. Every reviewer evaluates the complete change from a different perspective.

## Run the six reviewers

Launch six independent reviewers concurrently. Use a separate general-purpose agent for each reviewer, use the skill name as the agent name, and instruct it to invoke the named skill:

1. `code-review-behavior`
2. `code-review-architecture`
3. `code-review-runtime`
4. `code-review-maintainability`
5. `code-review-performance`
6. `code-review-tests`

Give each reviewer the shared scope, goal, and relevant context. Reviewers may inspect the repository and pull request as needed. They must not modify files or submit a GitHub review.

Each reviewer returns candidate findings only. A candidate must include:

- affected file and line
- concrete problem and impact
- triggering conditions
- smallest appropriate fix
- evidence used to validate the claim

Reviewers should return no findings rather than invent low-signal concerns outside their perspective.

## Lead synthesis

After all six reviewers finish:

1. Validate every candidate against the current code, surrounding code, and tests.
2. Reconcile conflicts between reviewers.
3. Merge duplicate findings, preserving the clearest impact and smallest correct fix.
4. Reject style preferences, speculative risks, and findings already prevented by existing code.
5. Assign severity from concrete impact and triggering conditions, not from which reviewer raised it.
6. Present the remaining findings in severity order. Include the originating reviewer perspective for each.
7. If no significant findings remain, say so directly.
8. Mention any reviewer that could not complete its review.

Do not modify code or submit a GitHub review unless the user explicitly asks.
