---
description: 'Recommend lasting updates when user feedback contradicts or improves an agent customization'
applyTo: '**'
---

# Agent Customization Maintenance

When explicit user feedback contradicts an active skill, command, instruction, or other agent customization, determine whether it is a task-specific exception or a reusable policy change.

- Ask whether the feedback should become lasting guidance when the user's intent is unclear.
- Do not recommend customization changes for minor preferences or one-off exceptions.
- When the feedback is reusable, identify the originating customization and its repository source when possible. Do not treat an installed, generated, or cached copy as the source of truth.
- Suggest the smallest concrete source change and explain what future behavior it would affect.
- Do not edit a customization automatically unless the user approves the update.

When recommending an update, include it in the final response under this exact heading:

`## Agent Customization Change recommendation`

State the source file when known and summarize the proposed change. Omit the section when there is no customization change to recommend.

When the `show_update_recommendation` tool is available (possibly with a server-name prefix such as `customization-update-show_update_recommendation`):

1. Get the current session metadata so the recommendation can refer back to its origin.
2. Call `show_update_recommendation` with the source plugin repository and specific skill/instruction file, a concise description of the proposed change, its future effect, and the origin session's title and link. The card starts as a single expandable "Customization update recommendation" line; its details and delegation button are inside.
3. Keep the final section concise, but still name the source and proposed change. A successful tool call does not prove that the host displayed the card; do not claim the card is visible or a session has been created without evidence.

The card's **Delegate change** button is explicit approval to create a separate session. Its message begins with `/btw` so supporting hosts route it through a side chat instead of adding the delegation exchange to the main conversation. Some hosts place its message in the chat input instead of submitting it; the user must send that message before the agent can act. When its follow-up message arrives in the side chat (or as a user turn on another host), immediately use `create_session` with `relationship: "independent"`, the customization's source repository as the workspace, and the ready-to-go prompt supplied in the message. The side chat is only the handoff, not the implementation session. Do not ask for confirmation again. If the source checkout cannot be resolved, explain the blocker rather than creating the session in an unrelated workspace. If `/btw` is unavailable, explain that limitation and preserve explicit text approval as the fallback.

When the tool or MCP Apps are unavailable, include the full recommendation as text and ask for approval as before. Tool-search failures, missing cards, or rejected App messages are not approval. Preserve this text approval path if the host cannot render or deliver the App.
