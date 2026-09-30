# Agent Plugin

Personal agent customizations packaged as a Copilot plugin for use across repositories and machines.

## Components

| Component | Location | Included example |
| --- | --- | --- |
| Instructions | `instructions/` | Language guidance, customization maintenance, long-response summaries, and pull request guidance |
| Slash commands | `commands/` | `/code-review-plus-plus` and `/keep-going` |
| Skills | `skills/` | Code reviews, agent Q&A and answering, GitHub notification triage, merge readiness, plugin customization routing, version reporting, active PR automation, telemetry guidance, direct Kusto REST querying, running JavaScript inspection with dbgjs, and persistent Agents background updater setup |

The `extensions/agents-build-background` project is installed by the
`setup-agents-build-background` skill. It refreshes the Agents background after
VS Code Insiders starts whenever the active build metadata changes, and updates
the background settings through the VS Code configuration API.

The `rules` entry in `plugin.json` maps plugin instructions to the `instructions/` directory. Keep the root manifest in the Copilot plugin format unless the component layout is deliberately migrated to another plugin specification.

[Long-response guidance](instructions/final-response-summary.instructions.md) requires final responses exceeding roughly 30 rendered screen lines to end with a clearly marked, short TL;DR answering the main query or giving the final conclusion, so the reader can quickly recover the chat's context.

`/agent-plugin:code-review-alpha` is the original all-in-one review. `/agent-plugin:code-review-bravo` runs six independent reviewers from private prompt templates and reconciles their findings. The reviewer templates are implementation details of Bravo rather than directly invocable skills, which keeps them out of the global skill catalog.

`/agent-plugin:notification-triage` reviews the GitHub notification inbox using conservative, versioned rules. It can automatically mark narrowly proven-safe threads Done, independently reviews other suggestions, and requires confirmation before acting on those suggestions. It uses the GitHub CLI and native Windows PowerShell; GitHub authentication needs the `notifications` scope.

`/agent-plugin:agent-qa` searches a private issue board for prior solutions when a skill or agent workflow is blocked. It records a free-form question when no useful answer exists, uses issue closure as the verified-resolution signal, and connects reusable outcomes back to skill maintenance.

`/agent-plugin:answer-agent-qa` investigates an issue on that board, posts guidance or additional diagnostic evidence, and reports the likely outcome tersely.

The Rust instructions are sourced from [github/awesome-copilot](https://github.com/github/awesome-copilot/blob/main/instructions/rust.instructions.md). See `THIRD_PARTY_NOTICES.md` for license details. Awesome Copilot does not currently provide framework-neutral TypeScript instructions, so this repository includes its own general-purpose TypeScript guidance rather than applying its MCP, Azure Functions, or Playwright instructions to every TypeScript project.

## Maintenance classification

`customization-catalog.json` classifies every command, instruction, and skill by the primary reason it is retained. It separately records whether each customization is standalone, orchestrates other customizations, or primarily serves as a component of another workflow. The catalog also records what should trigger reevaluation and the condition under which a customization can be retired.

| Category | Purpose |
| --- | --- |
| `personal-preference` | Matches how the plugin owner prefers to interact or work |
| `team-workflow` | Satisfies an organizational policy, convention, or operating constraint |
| `model-workaround` | Compensates for a demonstrated model limitation |
| `workflow-enhancement` | Adds rigor, capability, or automation missing from the vanilla workflow |
| `plugin-management` | Supports plugin and customization authoring, diagnostics, versioning, publishing, or source maintenance |
| `reference-utility` | Provides domain knowledge or an operational utility without primarily expressing behavioral policy |

| Integration role | Meaning |
| --- | --- |
| `standalone` | Operates independently rather than primarily as part of another customization |
| `orchestrator` | Coordinates named component customizations into a larger workflow |
| `component` | Primarily supports an orchestrator, even when it can also be invoked directly |

The catalog is maintenance metadata rather than runtime guidance, so classifications are not duplicated in customization frontmatter. The `manage-agent-customization` skill defines how to choose categories and requires catalog entries to stay synchronized as customizations change.

## Install in VS Code

1. Run **Chat: Install Plugin From Source** from the Command Palette.
2. Enter this repository's HTTPS or SSH Git URL.
3. Review the plugin contents and confirm installation.
4. Open **Chat: Open Customizations** to inspect the installed components or disable the plugin.

The plugin is installed in the current VS Code user profile and is available across workspaces where it is enabled.

## Install in Copilot CLI

```shell
copilot plugin install amunger/agent-plugin
copilot plugin list
```

## Update

1. Change the customization files.
2. Increment `version` in `plugin.json`.
3. Commit and push the changes.

In VS Code, run **Extensions: Check for Extension Updates** for an immediate check, or allow automatic extension updates to discover the new version. In Copilot CLI, run:

```shell
copilot plugin update agent-plugin
```

For a local development installation, reinstall the local path because Copilot CLI caches plugin contents:

```shell
copilot plugin install .
```

## Security

Plugin skills and hooks can execute code or expose tools. Review every change before updating installed copies. Do not commit credentials; reference environment variables or secure input mechanisms instead.
