# Agent Plugin

Personal agent customizations packaged as a Copilot plugin for use across repositories and machines.

## Components

| Component | Location | Included example |
| --- | --- | --- |
| Instructions | `instructions/` | Language guidance, customization maintenance, and pull request guidance |
| Slash commands | `commands/` | `/code-review-alpha`, `/code-review-bravo`, and `/keep-going` |
| Skills | `skills/` | Specialist code reviewers, plugin version reporting, active PR automation, and telemetry guidance |

The `rules` entry in `plugin.json` maps plugin instructions to the `instructions/` directory. Keep the root manifest in the Copilot plugin format unless the component layout is deliberately migrated to another plugin specification.

`/code-review-alpha` is the original all-in-one review. `/code-review-bravo` runs six independent reviewer skills and reconciles their findings. Each Bravo reviewer can also be invoked directly:

- `/code-review-behavior`
- `/code-review-architecture`
- `/code-review-runtime`
- `/code-review-maintainability`
- `/code-review-performance`
- `/code-review-tests`

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
