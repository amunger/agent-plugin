---
name: setup-agents-build-background
description: Install, repair, or update the persistent VS Code Insiders extension that refreshes the Agents window background after startup. Use when the user says "update my background", asks why the Agents background is stale, wants automatic refreshes after Insiders updates, or wants to change its machine label.
user-invocable: true
---

# Set Up the Agents Background Updater

Install or repair the bundled Windows VS Code Insiders extension that keeps the
Agents window background synchronized with the active build. Do not implement
this workflow by directly rewriting the complete Insiders `settings.json`,
installing a scheduled task, or leaving an agent-owned watcher running.

## Expected Behavior

The updater extension:

- Activates unconditionally when the extension host starts. Do not replace the
  `*` activation event with `onStartupFinished`; specialized Agents windows do
  not consistently dispatch that event.
- Enables the `agentsWindowActivation` API proposal and declares
  `capabilities.agentsWindow.supported: true`. VS Code filters code-executing
  extensions out of Agents windows unless both declarations are present.
- Requires the application-scoped `extensions.supportAgentsWindow` override
  below. Some Insiders builds still filter a locally packaged extension despite
  the proposal and capability declarations:

  ```json
  "extensions.supportAgentsWindow": {
    "amunger.agents-build-background": true
  }
  ```
- Reads metadata from the active `vscode.env.appRoot`, so staged but inactive
  Insiders application directories cannot be selected accidentally.
- Compares the active VS Code version, commit, build date, bundled Copilot
  version, bundled Copilot SDK version, update mode, and machine label with its
  last successful render.
- Generates and configures a fresh, never-reused SVG URI only when that metadata
  changed, the configured image is missing, or the user explicitly requests a
  refresh.
- Converts the generated global-storage path to a `file:` URI before updating
  the background setting using Node's `pathToFileURL`. Never configure the
  `vscode-userdata:` form of `ExtensionContext.globalStorageUri` or
  `vscode.Uri.file(...).toString()` output with an encoded Windows drive colon;
  the Agents renderer does not display either form.
- Updates only `chat.agentSessions.preferredDarkBackgroundImage` and
  `chat.agentSessions.backgroundImageLayout` through the VS Code configuration
  API. It never replaces or reparses the full user settings file.
- Contributes schemas for those internal Agents settings because some Insiders
  builds use them without registering them for extension-host configuration
  writes. This compatibility registration must remain in the extension
  manifest or `Configuration.update` fails with "not a registered
  configuration."
- Refreshes after an Insiders update becomes active and VS Code restarts. It
  does not poll for staged updates while an existing window remains open.
- Refreshes when `update.mode` or
  `agentsBuildBackground.machineLabel` changes.
- Exposes **Agents: Refresh Build Background** for a forced refresh.
- Records activation, checks, decisions, successful updates, and failures in a
  durable `activity.jsonl` file under its global storage. Exposes **Agents: Show
  Build Background Activity Log** to open it.

## Bundled Extension Source

The extension project is bundled in the same plugin repository at:

```text
extensions\agents-build-background
```

Locate the source plugin root using the plugin source-discovery rules from the
`manage-agent-customization` skill. Do not edit, build, or package the installed
plugin cache as though it were the source of truth. An installed cache may be
used as the extension source only for a normal end-user installation when no
editable source checkout is requested.

## Install or Repair

1. Confirm the target is Windows VS Code Insiders and locate:

   ```powershell
   $installRoot = Join-Path $env:LOCALAPPDATA "Programs\Microsoft VS Code Insiders"
   $cliPath = Join-Path $installRoot "bin\code-insiders.cmd"
   ```

   Require the CLI to exist and `& $cliPath --version` to succeed.

2. Locate the bundled `extensions\agents-build-background` project and validate
   that its `package.json`, `src\extension.ts`, and `tsconfig.json` exist.
   Verify that the manifest retains both the `agentsWindowActivation` proposal
   and the `capabilities.agentsWindow.supported` declaration.

3. In that extension directory, run:

   ```powershell
   npm install
   npm run package
   ```

   Surface installation, compilation, or packaging errors explicitly. Do not
   install dependencies at the plugin repository root.

4. Find the single generated
   `agents-build-background-<version>.vsix`. Fail if packaging produced zero or
   multiple matching VSIX files.

5. Install or replace the extension in both the default and Agents profiles:

   ```powershell
   & $cliPath --install-extension $vsixPath --force
   & $cliPath --install-extension $vsixPath --force --profile "Agents"
   ```

   Require both commands to succeed. Verify that
   `amunger.agents-build-background@<version>` appears in:

   ```powershell
   & $cliPath --list-extensions --show-versions
   & $cliPath --list-extensions --show-versions --profile "Agents"
   ```

6. Read the Insiders user settings as JSONC and ensure
   `extensions.supportAgentsWindow["amunger.agents-build-background"]` is
   `true`. Preserve every other key in an existing
   `extensions.supportAgentsWindow` object. Use a JSONC-aware edit when
   available; otherwise make a validated surgical insertion without
   reformatting or replacing unrelated settings. This setting is required even
   when the extension manifest declares Agents-window support because it takes
   precedence in the extension enablement service.

7. Delete only the generated VSIX after successful installation. Do not delete
   `package-lock.json`; it belongs with the source project and makes later
   packaging reproducible.

8. Tell the user that the updater becomes active after the extension host
   reloads. Do not trigger or imply a surprise reload. If the current window
   cannot see the new command yet, ask before reloading VS Code Insiders.

## Machine Label

The extension resolves the displayed label in this order:

1. `agentsBuildBackground.machineLabel`, when nonempty.
2. The label persisted by the extension after its last successful update.
3. The `<agents-background machine="...">` metadata in the currently
   configured SVG.
4. The lower-case computer name.

To change the label, update the extension setting through the VS Code settings
UI or configuration API. Do not rewrite `settings.json` directly. The extension
will refresh the background after observing the configuration change.

## Verification

After installation, report:

- Installed extension identifier and version.
- Active VS Code Insiders version and commit.
- Whether the Agents-window support override is present and true.
- Whether an extension-host reload is still required.

After the extension has activated, verify:

- The activity log contains `activated` and `checked` entries for the current
  startup and an `updated` or `unchanged` decision.
- The configured background is a file URI under the extension's global storage.
- The image exists and its displayed VS Code, short commit, Copilot, SDK,
  update-mode, and machine-label values match the active metadata.
- `chat.agentSessions.backgroundImageLayout` is `bottom-left`.
- The extension's image directory contains exactly one generated
  `agents-build-background-*.svg`.

## Error Handling

Do not claim that automatic updates are active until the VSIX installation and
extension-list verification succeed. If activation or rendering fails, inspect
the **Agents Build Background** output channel and surface its precise error.
Never recover by replacing the entire settings file, restoring a stale settings
snapshot, or creating a scheduled task without explicit user approval.
