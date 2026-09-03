# Agent Plugin

Personal agent customizations packaged as a Copilot plugin for use across repositories and machines.

## Components

| Component | Location | Included example |
| --- | --- | --- |
| Instructions | `instructions/` | Language guidance, customization maintenance, and pull request guidance |
| Slash commands | `commands/` | `/code-review-plus-plus` and `/keep-going` |
| Skills | `skills/` | Code reviews, GitHub notification triage, merge readiness, plugin customization routing, version reporting, active PR automation, telemetry guidance, direct Kusto REST querying, and Agents background setup |

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
