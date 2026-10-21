---
name: skeptical-eye
description: "Give a PR a skeptical net-benefit check after a quick glance: weigh added complexity and performance costs, and check relevant history and discussion."
user-invocable: true
---

# Skeptical Eye

The user is broadly comfortable with the PR and wants to know whether it is an obvious net good through a thorough inspection of the change's consequences. Be skeptical without inventing objections.

1. Identify the supplied PR, or use the active PR if none was supplied. Read its description, complete diff, relevant surrounding code, linked issue, and PR discussion. Establish the concrete benefit and who experiences it; do not assume the author's claims are proven.
   - Reuse a recent code review in this session only if it covers this PR's current diff. Otherwise, run `code-review-alpha` against this same PR and use its findings as context. Keep the final response in the concise format below rather than repeating the full review. If the review cannot run, disclose that limitation.
2. Weigh that benefit against added branches, abstractions, dependencies, state, lifecycle obligations, maintenance burden, and potential regressions. Look for an existing or substantially simpler solution. Distinguish necessary complexity from costs disproportionate to the problem.
3. Trace affected execution paths for added CPU, allocations, memory retention, I/O, network calls, startup work, or repeated work. Consider frequency, input size, and worst-case behavior. Use existing measurements and tests where relevant; distinguish measured costs from code-based estimates. Do not demand benchmarks for an evidently negligible change, or claim unmeasured performance is proven safe.
4. Inspect recent relevant commits and blame for the changed logic, then follow pertinent earlier PRs and issues. Read their review threads and comments for rationale, rejected approaches, regressions, and prior attempts at this problem. Focus on history that could change the decision; verify whether older concerns still apply to the current diff.
5. Decide whether the demonstrated benefit outweighs the concrete costs. Report only material concerns, with code or discussion links, triggering conditions, and the smallest useful next step. Missing evidence is not itself a defect, but disclose unavailable history or unresolved material uncertainty rather than giving an unsupported all-clear.

## Output

Start with one verdict:

- **Just check this in** - clear benefit, proportionate complexity, no material performance concern, and no unresolved historical objection.
- **Take a closer look** - a specific tradeoff or evidence gap needs resolution before calling this obvious.
- **Not a net good as written** - concrete costs outweigh the benefit; explain what would change that assessment.

Follow with at most five short bullets covering the benefit, complexity/performance balance, relevant history, and any decisive concern or limitation. Even a clean result should cite the key code and historical evidence inspected. This is a net-benefit judgment, not certification that CI, approvals, or merge requirements are satisfied.

Do not edit code, post a review, approve, or merge unless explicitly asked.
