---
name: manage-agent-customization
description: Find the right amunger plugin source repository before adding or modifying an agent plugin skill or instruction. Use when the user asks to create, update, or relocate plugin customizations.
user-invocable: true
---

# Manage Agent Customizations

Before changing a plugin skill or instruction:

1. Inspect installed plugin manifests and consider plugins whose repository is owned by `amunger`. Use installed copies only to discover the source repository; never edit an installed or cached copy.
2. Choose the source repository:
   - `agent-plugin` is the default for stable, broadly useful instructions and skills.
   - `agent-lab` is for experimental, fast-changing, or heavy explicit-only workflows.
   - `agent-customizations` is for sensitive or otherwise private-only guidance.
3. Treat the current workspace as strong evidence when it is one of those plugin repositories and its Git remote matches. Otherwise, look for the chosen repository in a sibling directory and verify its remote.
4. If no source checkout exists, recommend cloning `amunger/<repository>` beside the current workspace and opening or working in that checkout. Explain any extra authentication or cross-repository steps instead of editing the installed copy.
5. Search the chosen repository for related customizations before adding a new one, then follow its layout, documentation, versioning, and validation conventions.

If repository ownership or the public, experimental, or private classification is unclear, ask the user before making changes.

## Publishing

- Use judgment to either publish completed changes or leave them ready locally.
- Before pushing, compare the plugin manifest version with the latest remote `main`. Bump it when it still matches `main` or repository conventions otherwise require a new version. Do not bump again when the current work already contains an appropriate unreleased bump.
- Verify the resulting state, then end the completion summary with one of these, or an alternate summary as appropriate:
  - `Changes have been pushed on a new version.` when the change and bumped version are on remote `main`.
  - `Changes are local and ready to be pushed.` when they remain local.
