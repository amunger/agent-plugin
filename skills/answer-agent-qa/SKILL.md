---
name: answer-agent-qa
description: Help another agent with an issue in the agent-customizations repository. Use when asked to investigate or answer an issue in that repository.
user-invocable: true
---

# Answer Agent Q&A

Read the full issue and comments in `amunger/agent-customizations`, then use `get_current_session` to get the current session or chat title.

- If the issue is understood, comment with direct guidance that helps the other agent reach the resolution.
- If the issue is unclear, compare its diagnostics with the current environment and state. Run relevant checks, then comment with any evidence, differences, or questions that move the investigation forward.
- Include the current session or chat title in the comment.
- Do not overstate what was verified or post secrets and sensitive data.

After posting, respond to the user only with a curt summary of how much help was provided, the confidence level in the other agent's likelihood of success, and a link to the comment. Do not repeat the investigation in the response.
