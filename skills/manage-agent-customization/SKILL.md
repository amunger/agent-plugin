---
name: manage-agent-customization
description: Find the right amunger plugin source repository and maintain classification metadata when adding, modifying, or relocating plugin customizations.
user-invocable: true
---

# Manage Agent Customizations

Before changing a plugin command, skill, instruction, or other customization:

1. Inspect installed plugin manifests and consider plugins whose repository is owned by `amunger`. Use installed copies only to discover the source repository; never edit an installed or cached copy.
2. Choose the source repository:
   - `agent-plugin` is the default for stable, broadly useful instructions and skills.
   - `agent-lab` is for experimental, fast-changing, or heavy explicit-only workflows.
   - `agent-customizations` is for sensitive or otherwise private-only guidance.
3. Treat the current workspace as strong evidence when it is one of those plugin repositories and its Git remote matches. Otherwise, look for the chosen repository in a sibling directory and verify its remote.
4. If no source checkout exists, recommend cloning `amunger/<repository>` beside the current workspace and opening or working in that checkout. Explain any extra authentication or cross-repository steps instead of editing the installed copy.
5. Search the chosen repository for related customizations before adding a new one, then follow its layout, documentation, versioning, and validation conventions.

If repository ownership or the public, experimental, or private classification is unclear, ask the user before making changes.

## Maintenance classification

When the source repository contains `customization-catalog.json`, keep it synchronized with the customization files. The catalog is the classification source of truth; do not add maintenance-only metadata to runtime frontmatter or prompt bodies.

Classify each customization by the primary reason it should be retained:

- `personal-preference`: matches how the plugin owner prefers to interact or work.
- `team-workflow`: satisfies an organizational policy, convention, or operating constraint.
- `model-workaround`: compensates for a demonstrated model limitation.
- `workflow-enhancement`: adds useful rigor, capability, or automation missing from the vanilla workflow.
- `plugin-management`: supports plugin and customization authoring, diagnostics, versioning, publishing, or source maintenance.
- `reference-utility`: provides domain knowledge or an operational utility without primarily expressing behavioral policy.

Use this decision order when categories appear to overlap:

1. If it would be unnecessary when the model reliably behaves correctly, use `model-workaround`.
2. If an external team or organizational requirement mandates it, use `team-workflow`.
3. If it primarily supports plugin or customization authoring, diagnostics, versioning, publishing, or source maintenance, use `plugin-management`.
4. If an ideal model would still need the added process or capability, use `workflow-enhancement`.
5. If it primarily reflects how the owner wants to interact with the agent, use `personal-preference`.
6. Otherwise, when it mainly supplies knowledge or an operational capability, use `reference-utility`.

Assign one primary category based on why the customization exists, not what its implementation does. If one file contains independently maintainable policies with materially different rationales and review lifecycles, consider splitting it instead of assigning several categories.

Classify integration separately from purpose:

- `standalone`: operates independently and does not primarily exist as part of another customization.
- `orchestrator`: coordinates named component customizations into a larger workflow.
- `component`: exists primarily to be invoked by an orchestrator, even when it is also directly invocable.

An integration role does not replace the primary category. For example, a specialist reviewer can be both a `workflow-enhancement` and a `component`. Record orchestrator dependencies in `uses` and component parents in `usedBy`, using repository-relative catalog paths in both directions.

For every source customization file under `commands/`, `instructions/`, or `skills/`, maintain one catalog entry containing:

- its repository-relative `path`;
- its primary `category`;
- its `integrationRole`;
- a `rationale` explaining why it is retained;
- the events in `reviewOn` that should trigger reassessment;
- a concrete `retirementTest`;
- the `lastReviewed` date.

Supporting examples and assets belong to their parent customization and do not need separate entries. When adding, renaming, moving, deleting, or composing a customization, make the matching catalog change. When behavior, motivation, or integration changes, reassess the entry rather than only updating its date.

Before finishing:

- Verify every catalog path exists.
- Verify every source customization has exactly one entry and no removed file remains listed.
- Verify each category is defined by the catalog.
- Verify each integration role is defined by the catalog.
- Verify every `uses` and `usedBy` path exists in the catalog and the relationships are reciprocal.
- Reassess `model-workaround` entries after major model changes.
- Reassess `workflow-enhancement` entries after major model or vanilla workflow changes.
- Reassess `team-workflow` entries only against the applicable organizational policy, not model quality alone.

## Publishing

- Use judgment to either publish completed changes or leave them ready locally.
- Before pushing, compare the plugin manifest version with the latest remote `main`. Bump it when it still matches `main` or repository conventions otherwise require a new version. Do not bump again when the current work already contains an appropriate unreleased bump.
- Verify the resulting state, then end the completion summary with one of these, or an alternate summary as appropriate:
  - `Changes have been pushed on a new version.` when the change and bumped version are on remote `main`.
  - `Changes are local and ready to be pushed.` when they remain local.

When changes are local and ready to be pushed, and the
`show_plugin_publish_recommendation` MCP App tool is available:

1. Get the current session metadata.
2. Call `show_plugin_publish_recommendation` with the source repository,
   `plugin.json` as the source file, the verified local state, the concrete
   publish plan, the expected synchronized outcome, and the origin session
   title and link.
3. Keep the completion summary explicit that changes remain local. A successful
   tool call does not prove the card rendered or that publishing started.

The card's **Publish plugin update** button is approval to delegate only the
existing local update's review, version check, commit, rebase, push, and final
sync verification. Its `/btw` handoff should create an independent session in
the source repository using the supplied ready prompt. Do not reinterpret it as
approval for unrelated source edits or force-pushing.

Do not show the publish card when changes are already pushed, validation has
not established a publishable state, the source repository is unresolved, or
human input is still required. When the tool or MCP Apps are unavailable,
retain the explicit text status so the user can ask to publish normally.
