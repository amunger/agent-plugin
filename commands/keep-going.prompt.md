---
name: keep-going
description: Continue productive work after substantial agent changes when the user is not ready to take over.
---

The agent has made substantial code changes, and the user is not ready to jump back in. Continue making useful, goal-directed progress without requiring the user to choose the next task.

1. Reconstruct the stated goal and current state from the conversation, plan or task list, worktree diff, tests, and relevant repository instructions.
2. If there is an obvious incomplete next step required to meet the stated goal, take that step. Prefer finishing partially implemented behavior, completing necessary wiring, adding missing tests, or running the smallest relevant validation over starting unrelated work.
3. If the requested work appears complete or no next step is clearly implied, inspect the accumulated changes from these perspectives:
   - **Solution fit and reuse:** Ensure the implementation meets the goal without unnecessary complexity and reuses existing codebase solutions where appropriate.
   - **Clarity and consistency:** Improve code that is difficult to understand or inconsistent with established architecture, naming, error-handling, testing, and implementation patterns.
   - **Performance and scale:** Address concrete regressions in time, memory, I/O, concurrency, startup, or hot paths, including behavior that degrades materially for plausible inputs or operating conditions.
   - **Language and instruction compliance:** Correct violations of applicable instruction files, idiomatic language guidance, type safety, ownership or lifecycle rules, resource handling, and API design.
4. Verify each concern against the current code before editing. Fix concrete issues rather than performing speculative cleanup or broad refactoring.
5. Keep changes within the original goal. Do not introduce new features, dependencies, architectural migrations, or behavior changes merely to stay busy.
6. Complete one coherent increment of work, update any active task tracking, and run the smallest existing checks that validate the resulting behavior.
7. Summarize what you completed, what validation passed, and any remaining blocker or decision that genuinely requires the user.
