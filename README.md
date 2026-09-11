# Agent Plugin

Personal agent customizations packaged as a Copilot plugin for use across repositories and machines.

## Components

| Component | Location | Included example |
| --- | --- | --- |
| Instructions | `instructions/` | Language guidance, customization maintenance, and pull request guidance |
| Slash commands | `commands/` | `/code-review-plus-plus` and `/keep-going` |
| Skills | `skills/` | Code reviews, GitHub notification triage, merge readiness, plugin customization routing, version reporting, active PR automation, telemetry guidance, direct Kusto REST querying, and one-shot Agents background updates |

The `rules` entry in `plugin.json` maps plugin instructions to the `instructions/` directory. Keep the root manifest in the Copilot plugin format unless the component layout is deliberately migrated to another plugin specification.

`/agent-plugin:code-review-alpha` is the original all-in-one review. `/agent-plugin:code-review-bravo` runs six independent reviewer skills and reconciles their findings. Each Bravo reviewer can also be invoked directly:

- `/agent-plugin:code-review-behavior`
- `/agent-plugin:code-review-architecture`
- `/agent-plugin:code-review-runtime`
- `/agent-plugin:code-review-maintainability`
- `/agent-plugin:code-review-performance`
- `/agent-plugin:code-review-tests`

`/agent-plugin:notification-triage` reviews the GitHub notification inbox using conservative, versioned rules. It can automatically mark narrowly proven-safe threads Done, independently reviews other suggestions, and requires confirmation before acting on those suggestions. It uses the GitHub CLI and native Windows PowerShell; GitHub authentication needs the `notifications` scope.

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

Plugin skills, hooks, and MCP servers can execute code or expose tools. Review every change before updating installed copies. Do not commit credentials; reference environment variables or secure input mechanisms instead.
