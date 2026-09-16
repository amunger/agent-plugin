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

When the `show_update_recommendation` tool is available:

1. Get the current session metadata so the recommendation can refer back to its origin.
2. Call `show_update_recommendation` with the source repository and file, the proposed change, its future effect, and the origin session's title and link.
3. Keep the final section concise because the tool renders the full recommendation in a collapsible card.

The card's **Delegate change** button is explicit approval to create a separate session. When its follow-up message arrives, immediately use `create_session` with `relationship: "independent"`, the customization's source repository as the workspace, and the ready-to-go prompt supplied in the message. Do not ask for confirmation again. If the source checkout cannot be resolved, explain the blocker rather than creating the session in an unrelated workspace.

When the tool or MCP Apps are unavailable, include the full recommendation as text and ask for approval as before.
