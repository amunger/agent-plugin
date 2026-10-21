# Agent Plugin

Personal agent customizations packaged as a Copilot plugin for use across repositories and machines.

## Components

| Component | Location | Included example |
| --- | --- | --- |
| Instructions | `instructions/` | Language guidance, customization maintenance, long-response summaries, and pull request guidance |
| Slash commands | `commands/` | `/code-review-plus-plus` and `/keep-going` |
| Skills | `skills/` | Disk cleanup, code reviews, agent Q&A and answering, GitHub notification triage, merge readiness, plugin customization routing, version reporting, active PR automation, telemetry guidance, direct Kusto REST querying, running JavaScript inspection with dbgjs, and persistent Agents background updater setup |
| MCP apps | `mcp/` | Disk cleanup review and same-chat verification approval |

The `extensions/agents-build-background` project is installed by the
`setup-agents-build-background` skill. It refreshes the Agents background after
VS Code Insiders starts whenever the active build metadata changes, and updates
the background settings through the VS Code configuration API.

The `rules` entry in `plugin.json` maps plugin instructions to the `instructions/` directory. Keep the root manifest in the Copilot plugin format unless the component layout is deliberately migrated to another plugin specification.

[Long-response guidance](instructions/final-response-summary.instructions.md) requires final responses exceeding roughly 30 rendered screen lines to end with a clearly marked, short TL;DR answering the main query or giving the final conclusion, so the reader can quickly recover the chat's context.

`/agent-plugin:skeptical-eye` gives a PR a focused net-benefit check after a quick glance: it weighs added complexity, performance costs, and test-suite runtime and flakiness against the benefit, checks relevant history and discussion, and gives a short verdict on whether it is an obvious "just check this in" change. It reuses a current review from the session or runs Bravo against the same PR when needed. It does not approve or merge the PR. See the [skill](skills/skeptical-eye/SKILL.md).

`/agent-plugin:code-review-alpha` is the original all-in-one review. `/agent-plugin:code-review-bravo` runs eight independent reviewers covering behavior, architecture, runtime, maintainability, performance, tests, product fit, and scope. An additional advisory consolidation agent examines all reviews and proposes grouped findings and coherent root-cause fixes, including changes at a different scale than individual reviewers suggested. The current top-level agent then independently synthesizes the original reviews plus those notes. Performance review includes worst-case external-call latency and whether its impact is bounded. The product skeptic challenges necessity, product consistency, and alternatives using evidence rather than personal preference. Bravo includes optional model-family suggestions, with a contrasting family recommended for consolidation when authorized and supported; the final synthesis stays in the current top-level model. Configured subagent preferences remain the default unless explicit model selection is requested. The reviewer and consolidation templates are implementation details of Bravo rather than directly invocable skills, which keeps them out of the global skill catalog.

`/agent-plugin:code-review-charlie` is the extra-deep, explicit-only review targeting multiple model families. It reuses Bravo's templates with three models each for behavior, runtime, and maintainability; two each for architecture, performance, and product skepticism; and one each for tests and scope (Claude Opus for scope). One independent holistic Alpha review brings the first stage to 18 reviewers, followed by one advisory consolidator and final top-level synthesis. Charlie starts without confirmation or clarification questions, including model-selection approval. When permitted, it selects supported GPT, Claude Opus, and Gemini versions automatically. If host instructions require user-named models or model routing is unavailable, it uses permitted built-in routes or configured subagent defaults for all review slots and consolidation, disclosing reduced or unverified model diversity. It reports known BYOK conflicts or unavailable delegation as blockers without requesting a bypass. This is a higher-cost alternative to Bravo, not a claim of benchmarked review superiority.

Both workflows use built-in Copilot delegation for reviewers and consolidation, without a separate provider-attestation or routing-approval step. Intentional or known BYOK and external-provider routes are prohibited, but missing provider metadata alone does not block the review. The shared policy documents concrete CLI environment and SDK provider-configuration checks without treating a shell environment as proof of the running host's routing. When concrete version selection is authorized, default to the highest available version within each selected family and tier rather than a stale example; explicit pins and routing constraints take precedence. This is a workflow policy, not a programmatic routing lock or independent guarantee about hidden host configuration.

Both Bravo and Charlie check for changes unrelated to the goal, recommending description corrections for intended but unexplained scope, removal or splitting for unrelated code, or author clarification. Their synthesis separates necessary current-PR corrections from optional follow-up PR opportunities and alternative approaches that could reshape the PR; optional redesign is not treated as a defect or merge blocker.

`/agent-plugin:notification-triage` reviews the GitHub notification inbox using conservative, versioned rules. It can automatically mark narrowly proven-safe threads Done, independently reviews other suggestions, and requires confirmation before acting on those suggestions. It uses the GitHub CLI and native Windows PowerShell; GitHub authentication needs the `notifications` scope.

`/agent-plugin:agent-qa` searches a private issue board for prior solutions when a skill or agent workflow is blocked. It records a free-form question when no useful answer exists, uses issue closure as the verified-resolution signal, and connects reusable outcomes back to skill maintenance.

`/agent-plugin:answer-agent-qa` investigates an issue on that board, posts guidance or additional diagnostic evidence, and reports the likely outcome tersely.

`/agent-plugin:prepare-verification` outlines the target, high-level checks, success criteria, and limitations before doing verification. Its inline card ends with **Go Ahead and Verify**, which sends exactly `go ahead and verify` to the same chat; it does not create a new session. Rendering the plan runs no tests or queries. Hosts without MCP Apps receive a text fallback. The latest unambiguous plan is rechecked before execution, and a delivery timeout does not automatically resend the request.

`/agent-plugin:migrate-agent-host-tunnel` guides Windows migrations from the legacy
Agent Host-specific tunnel to the regular VS Code tunnel or its persistent
service. It verifies process-tree shutdown, preserves working registrations,
handles proven orphan/stale-state failures, and checks fresh Agent Host messages
separately from relay connectivity. Insiders updates and reboot persistence are
explicit follow-up checks, not assumed consequences of installing the service.

The Rust instructions are sourced from [github/awesome-copilot](https://github.com/github/awesome-copilot/blob/main/instructions/rust.instructions.md). See `THIRD_PARTY_NOTICES.md` for license details. Awesome Copilot does not currently provide framework-neutral TypeScript instructions, so this repository includes its own general-purpose TypeScript guidance rather than applying its MCP, Azure Functions, or Playwright instructions to every TypeScript project.

## Disk cleanup app

Ask for disk cleanup or invoke `/agent-plugin:disk-cleanup`; no root selection is
required. The default scope is the full current inspection host across its local
drives. It checks capacity first and focuses on drives **over 80% used**, highest
usage percentage first; other drives remain secondary. If none exceeds 80%, it
looks across all local drives for high-impact cleanup locations. Exactly 80% does
not trigger prioritization, and an explicitly narrower scope is honored. Network
shares and other hosts are not scanned by default; coverage gaps are reported.
This discovery default never expands a cleanup confirmation beyond selected paths.
The skill is available for automatic invocation as well as explicit use.
The agent measures directories, verifies their purpose and preservation evidence,
and presents compact rows with sizes, inactivity and risk status.

Old worktrees are investigated first and combined into one entry and checkbox per
canonical `repositoryPath`, ranked by combined size before caches and other
artifacts. Checking a repository selects all its reviewed candidate worktrees,
not the main checkout or unreviewed worktrees. Details lists each member's full
path, size, activity, safety evidence and recovery procedure. Any risky member
makes its repository entry risky. **Select recoverable** only adds entries whose
members are all recoverable, never part of a repository.

Worktrees qualify after **more than 7 days** of inactivity when removal is
recoverable, or **more than 30 days** with an explicit possible-data-loss warning.
Commit age and stale remote-tracking refs do not establish inactivity or safety.
All selections start unchecked. Parent/child overlap is rejected to avoid double
counting and ambiguous removal scope. Reproducible build artifacts, caches and
dependency trees are also supported.

**Clean up selected** uses the MCP Apps `ui/message` API to hand a user prompt to
the current chat. The prompt contains only "Confirmed cleanup for the following
entries:" and the selected directory paths, one per line, retaining review context
in the same chat. The host may require pressing Send in the composer.
Predictable preservation questions are resolved before selection. Selecting entries
and clicking **Clean up selected** is the only confirmation for their described
scope; risk labels and Details are informational, with no acknowledgement checkbox.
The server and app cannot delete anything: the agent rechecks only selected paths
before acting. Unknown or newly discovered risks block affected entries, not
unrelated safe selections. If review context is unavailable, the agent must not
guess. Worktree removal preserves branches.

The bundled stdio server is registered through [.mcp.json](.mcp.json) and requires
Node.js 22+ on the plugin host. Bundles under [mcp/dist](mcp/dist) are checked in, so
plugin installation needs no npm install or dependency download. Enable/trust the
`disk-cleanup` server if VS Code prompts, then start a new chat after updating.
Remote sessions inspect the MCP server's machine, not necessarily the computer
displaying the app.

This workflow moved from `amunger/agent-lab` in Agent Plugin 0.1.45. Update Agent Lab
to 0.2.1 or newer as well if both are installed, so only Agent Plugin registers the
cleanup tools and skill.

### Develop and preview the cleanup app

```powershell
npm ci
npm run build
npm run check
npm test
npm run test:app
npm run preview
```

Browser tests use installed Microsoft Edge or the executable specified by
`MCP_APP_BROWSER`. The loopback preview uses illustrative data and captures the
cleanup prompt instead of sending it to a chat or deleting files. Open the printed
URL and stop the server when finished. Its self-contained HTML can also be saved
and opened offline.

When changing app code, rebuild and include generated bundles with the source.
Runtime dependency licenses are collected in
[mcp/dist/THIRD_PARTY_LICENSES.txt](mcp/dist/THIRD_PARTY_LICENSES.txt).

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
