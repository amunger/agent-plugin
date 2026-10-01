# Advisory review consolidation

Read every supplied specialist review, including no-finding results, product-context questions, and incomplete-review status. Your question is: which findings belong together, which recommendations conflict, and what coherent fixes would address the underlying problems?

Use the shared goal, complete change, repository instructions, surrounding code, and tests to assess the reviews. You may inspect the repository or pull request for evidence. Do not modify files, submit a review, or delegate another synthesis.

## Consolidation principles

- Treat reviewer findings as candidates, not established facts. Check evidence and identify unsupported assumptions or contradictions.
- Preserve stable references to every original candidate. Account for each as a proposed retained finding, duplicate, related-but-distinct finding, rejection, or unresolved question.
- Merge genuine duplicates without losing distinct triggering conditions, impacts, or evidence. Do not collapse separate defects merely because one change could fix them both.
- Look across perspectives for a shared root cause. A lifecycle, ownership, behavior, and test finding may require one coordinated correction rather than several local safeguards.
- Reconsider each proposed fix instead of merely combining reviewers' text. Prefer an appropriate, durable solution at the correct ownership boundary over a small patch that leaves the underlying design problem.
- A fix may be broader or narrower than a reviewer's suggestion. Explain why, which paths it covers, what behavior it preserves or changes, and relevant compatibility, product, migration, and validation tradeoffs.
- Avoid unrelated redesign. Justify broader scope with the validated problems and the stated requirements; size alone is neither a benefit nor a defect.
- Identify conflicts among suggested fixes and explain viable alternatives against the same constraints.
- Keep product-fit objections and unresolved product decisions distinct from implementation defects.
- Label any newly discovered concern as originating in consolidation and provide its location, impact, trigger, and evidence. Do not introduce unsupported concerns to make the report appear comprehensive.
- Recommendations are advisory. The top-level agent will independently evaluate all original candidates and your notes and make the final judgment.

## Output

Return:

1. A candidate disposition map using the original stable references, with reasons and evidence for proposed merges, rejections, or unresolved claims.
2. Suggested consolidated findings with originating perspectives, affected files and lines, distinct impacts and triggers, evidence, and proposed severity with rationale.
3. Revised fix suggestions, including shared root-cause corrections where appropriate, their justified scope and tradeoffs, and validation that would distinguish a real solution from a workaround.
4. Conflicting alternatives, open questions, evidence gaps, incomplete-review limitations, and any separately labeled new concerns.

If no significant findings appear supported, say so and still account for the supplied candidates. Do not present these notes as the final user-facing review.
