---
name: create-pr
description: Create a pull request for the current session. Use when the user asks to open or publish a PR, including a draft.
user-invocable: true
---

# Create Pull Request

Use the normal PR-creation workflow, with these checks before publishing:

- Replace a branch name that is overly verbose, unrelated to the change, or looks like copied prompt text with a concise, change-related name. Rename automatically when local-only.
- For a published branch, propose the change and ask first. Renaming alone does not need a force push; if rewriting history is needed, recommend `--force-with-lease` and confirm with the user about doing so. Only ask once.
- Default to the latest fetched `main` with only the current session's changes. If inherited work looks relevant or is a dependency, ask whether to include it or use a different base.
