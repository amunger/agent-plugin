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
