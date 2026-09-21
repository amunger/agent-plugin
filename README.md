# Agent Plugin

Personal agent customizations packaged as a Copilot plugin for use across repositories and machines.

## Components

| Component | Location | Included example |
| --- | --- | --- |
| Instructions | `instructions/` | Language guidance, customization maintenance, long-response summaries, and pull request guidance |
| MCP Apps | `mcp/` | An inline customization update card with approval-gated session delegation |
| Slash commands | `commands/` | `/code-review-plus-plus` and `/keep-going` |
| Skills | `skills/` | Code reviews, GitHub notification triage, merge readiness, plugin customization routing, version reporting, active PR automation, telemetry guidance, direct Kusto REST querying, and persistent Agents background updater setup |

The `extensions/agents-build-background` project is installed by the
`setup-agents-build-background` skill. It refreshes the Agents background after
VS Code Insiders starts whenever the active build metadata changes, and updates
the background settings through the VS Code configuration API.

The `rules` entry in `plugin.json` maps plugin instructions to the `instructions/` directory. The `.mcp.json` file starts the bundled customization update MCP App without requiring an install-time package restore. Keep the root manifest in the Copilot plugin format unless the component layout is deliberately migrated to another plugin specification.

[Long-response guidance](instructions/final-response-summary.instructions.md) requires final responses exceeding roughly 30 rendered screen lines to end with a clearly marked, short TL;DR answering the main query or giving the final conclusion, so the reader can quickly recover the chat's context.

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

## Customization update App

The `show_update_recommendation` tool returns a single-line **Customization update
recommendation** disclosure on hosts that support MCP Apps. Expanding it shows
the specific skill/instruction file, source plugin repository, update description,
and **Delegate change** button. The collapsed card hides all details and actions.
The server only renders a recommendation: it does not edit files or create sessions.
The button sends the complete ready prompt and origin-session link to the host
using the standard `ui/message` request. The origin agent creates an independent
session only after receiving that approved message as a user turn.

Message delivery is host-dependent. VS Code's current `ui/message` handler puts
the request in an empty chat input; press **Send** to start delegation. The
message starts with `/btw` to route the handoff through a side chat on supporting
hosts, keeping the delegation exchange out of the main conversation. That side
chat is asked to create an **independent session** in the source repository, not
to implement the change itself. The ready prompt retains the original chat link
and is passed unchanged to the independent session.

The host rejects the request if the input already contains text. The App reports rejection and
allows retrying, rather than claiming a new session was created. MCP Apps do not
provide a direct session-creation API; the App uses the supported message handoff
without filesystem or session-management access. Hosts without `/btw` support
can use the explicit text-approval fallback.

The server provides the recommendation both as `structuredContent` and as a JSON
text content block. The App accepts either shape, for hosts that project only
content blocks. Loading failures remain visible outside the initially hidden
card. A successful tool invocation alone does not establish that a host rendered
the App. Keep the Markdown recommendation and explicit text approval fallback
when the tool, rendering, or message handoff is unavailable.

### Development and validation

```shell
npm install
npm run build
npm run check
npm run test:app
```

`check` includes a real stdio protocol test of the packaged server. `test:app`
uses an installed Microsoft Edge browser by default, or the executable specified
by `MCP_APP_BROWSER`. It loads the packaged resource in a sandboxed iframe with
the official MCP Apps `AppBridge`, clicks the controls, and verifies collapsed
details, a collapsed height of at most 32 CSS pixels at 320- and 700-pixel widths,
an expansion-only button, lossless `/btw` prompt delivery, text-only results,
visible errors, and retry.
The test host never creates real sessions. These tests do not substitute for
the host-specific manual checks below.

### Host-specific manual checks

Use an isolated, authenticated profile with this source checkout registered in
`chat.pluginLocations`. Start a fresh session and send:

> I want this to become lasting guidance: whenever a validation command fails, include the failing command in the final response. Recommend the appropriate customization update, but don't apply it in this session.

Verify each boundary separately:

1. The agent calls `get_current_session` and the recommendation tool, not merely
   tool search. A tool-search error is not a renderer failure.
2. The SDK start event carries `toolDescription._meta.ui.resourceUri`. The Agent
   Host must preserve MCP ownership and the resource channel in its tool state.
3. The workbench requests the HTML resource, mounts an iframe, and completes
   `ui/initialize`. Expand tool groups when diagnosing a missing card.
4. Only the disclosure line is visible initially. Expanding shows the
   customization, source plugin, description, and button. No delegation message
   is sent before clicking the button.
5. Clicking **Delegate change** hands off the full message. If it appears in the
   composer, verify it starts with `/btw`, then send it. Existing composer text
   must not be overwritten.
6. The side-chat user turn calls `create_session` with `relationship:
   "independent"`, the correct source checkout, and the unchanged ready prompt.
   Verify the origin-session link in that new session.

### Host readiness fix and manual results

Windows Insiders builds `046944034292b5479b4e9a50ad1a508033ffb64f` and
`a07c6dc37c` intermittently invoked the tool successfully without displaying its
App. A debugger and host logs identified the readiness race: a server became
`connected`/`ready`, then a late `mcp_servers_loaded` startup snapshot changed it
back to `pending`/`starting`. This revoked the resource channel required by the
App renderer even though the SDK could still call the tool.

The accompanying local VS Code source fix in `CopilotAgentSession` treats loaded
events as inventory invalidations and fetches current state with `rpc.mcp.list`.
Refreshes are serialized and retried when a lifecycle event overtakes an
in-flight request. Real failures, disablement, restarts, and removals still take
effect. A deterministic regression reproduced the missing channel before the
fix and passed afterward; the affected host suite passed all 497 tests.
This is a host change, not part of the plugin bundle: updating only the plugin
does not fix an unpatched Insiders installation.

Manual testing on the patched source host on 2026-09-18 verified:

- Three fresh sessions using the exact prompt above rendered the card, including
  a run after a window reload. A separate read-only delegation trial also
  rendered the card.
- Details began collapsed and could be expanded and collapsed.
- The read-only trial exercised **Delegate change**, **Send**, and the host's
  normal tool approval, then created an independent session in the source
  checkout. The submitted message matched `delegationRequest` exactly, and the
  delegated initial prompt matched `readyPrompt` exactly.
- The child read the first 40 lines of this README, reported `Agent Plugin`,
  and linked back to the origin session without editing files.

A separate source-workbench chat-switch disposal error interrupted navigation
while a tool approval was pending. Reloading recovered the session and its
App; that unrelated error was not changed as part of the readiness fix.

The compact-card follow-up also removes the host's hard-coded 100-pixel minimum
MCP App container height in `ChatMcpAppSubPart`. The host now honors the App's
reported size while retaining its existing initial height and maximum height.
Manual measurement verified both the collapsed document and the actual host
container were 28 CSS pixels tall; expansion resized the container to fit the
details. Unpatched hosts may still reserve extra blank space around the line.

The `/btw` handoff was tested through the real App button and **Send**:
VS Code opened a side chat, which called `create_session` with
`relationship: "independent"` in `Q:\src\agent-plugin`. The exact ready prompt
and original-session link were preserved. After the normal host permission
approval, the child read the first 40 lines of this README and returned its
heading and origin link without modifying files. The original chat retained
only its initial user turn; the delegation exchange stayed in the side chat.
The button itself still prepares the message rather than directly creating a
session or automatically submitting it.

The current VS Code source also reconstructs MCP App results from Agent Host
content blocks without `structuredContent`, and its `ui/message` handler fills
the composer rather than submitting a turn. The plugin handles text-only results
and explains the send step; it does not invent metadata to force eager loading,
automatically submit through private host APIs, or bypass user approval.

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
