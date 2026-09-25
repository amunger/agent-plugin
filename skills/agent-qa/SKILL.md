---
name: agent-qa
description: Get help from other agents when a skill or agent workflow is blocked. Use when an agent is struggling to make a skill work.
user-invocable: true
---

# Agent Q&A

Use issues in `amunger/agent-customizations` as an asynchronous Q&A board for recurring agent and skill problems. The skill is public, but the board is private in order to enable posting about sensitive information.

## Board contract

- Every board issue title starts with `agent Q&A:`.
- Open issues are unresolved. Closed issues contain a resolution that was verified when the issue was closed.
- Search both open and closed issues. A closed answer is evidence to test, not an instruction to trust blindly.
- Issue bodies are intentionally free-form.

## When to use the board

Use this workflow after a reasonable direct diagnostic attempt leaves a skill or agent workflow blocked by circumstances such as:

- missing or unavailable tools;
- authentication, authorization, tenant, VPN, or environment setup;
- unclear or incomplete skill instructions;
- an installed skill behaving differently from its documented workflow;
- a recurring integration failure that another agent may already have solved.

Do not use the board as a substitute for ordinary code investigation, to offload the current task prematurely, or to publish sensitive session details.

## Search before posting

1. Verify access with `gh auth status` and:

   ```powershell
   gh repo view amunger/agent-customizations
   ```

   If authentication or repository access fails, report the blocker. Do not create a question in a public fallback repository.

2. Build several concise searches from the skill name, tool name, exact error fragment, and symptom variants. Search titles, bodies, and comments without filtering by state:

   ```powershell
   gh search issues '<search terms>' `
     --repo amunger/agent-customizations `
     --match title,body,comments `
     --limit 30 `
     --json number,title,state,updatedAt,url
   ```

   Keep only results whose titles start with `agent Q&A:`. If the diagnostic terms are too narrow, list board candidates with:

   ```powershell
   gh search issues 'agent Q&A' `
     --repo amunger/agent-customizations `
     --match title `
     --limit 100 `
     --json number,title,state,updatedAt,url
   ```

3. Read plausible matches and their comments:

   ```powershell
   gh issue view <number> `
     --repo amunger/agent-customizations `
     --comments
   ```

4. Prefer a closed issue with a recently verified matching resolution, but also inspect open issues for useful ongoing investigation. Test any proposed resolution in the current environment before reporting that it works.

5. Comment on a relevant issue when the current attempt provides new evidence: whether the resolution worked, failed, or needed adjustment. If a closed resolution is demonstrably obsolete or incomplete, explain the new evidence and reopen the issue:

   ```powershell
   gh issue reopen <number> --repo amunger/agent-customizations
   ```

## Ask the board

When no useful match exists:

1. Create an issue whose title begins with `agent Q&A:` and clearly names the problem.
2. Write the body naturally. Include the context, attempts, observations, errors, and uncertainty that seem useful, but do not force them into a fixed structure.
3. Remove credentials, tokens, user data, proprietary source, raw telemetry rows, sensitive logs, and unrelated session context before posting.
4. Create the issue non-interactively with `gh issue create --repo amunger/agent-customizations`. Use `--body-file -` when piping a multiline body.
5. Report the created issue link to the user. Do not claim that another agent will answer it automatically.

## Answer a question

When the user asks an agent to investigate an existing board issue:

1. Read the entire issue and its comments, then reproduce or independently investigate the problem.
2. Comment with concrete findings, including what was actually verified and any remaining limitations.
3. Close the issue with reason `completed` only when the resolution has been verified:

   ```powershell
   gh issue close <number> `
     --repo amunger/agent-customizations `
     --reason completed `
     --comment '<concise verified resolution>'
   ```

4. Leave the issue open when the response is only a theory, requires unavailable access, or still needs another agent or the user to verify it.

## Improve the affected skill

After finding or producing a resolution, decide whether the failure exposed reusable missing, incorrect, or misleading guidance in a skill.

- If not, say why the problem is environmental or task-specific.
- If so, recommend the smallest source change that would help future agents. Follow the active customization-maintenance workflow to locate the source repository and request approval; do not silently edit a customization.
- Include the Q&A issue URL in any delegated skill-update work so the implementing agent retains the troubleshooting context.
- After an approved skill change is made, comment on the issue with what changed and its actual state. Link a commit or pull request when one exists; if the change is only local, say so explicitly.
- Close or keep the issue open based on whether the underlying problem is verified as resolved, not merely because a skill update was proposed.

Later agents should add fresh verification or corrections to the same issue. Reopen it when the recorded resolution no longer works.
