---
name: setup-agents-build-background
description: Set up or troubleshoot a self-updating VS Code Agents window background on Windows that displays VS Code, Copilot, SDK, update-mode, machine, and refresh metadata.
user-invocable: true
---

# Set Up an Agents Build Background

Use this skill to install the Windows-based Agents window background used on
the reference machine, adapt it for another machine, or diagnose why it is not
refreshing.

## Constraints

- This implementation targets VS Code Insiders on Windows.
- The Agents window filters out executable user-installed extensions by
  default. A manual command extension works only when
  `extensions.supportAgentsWindow` explicitly allows its extension ID. Do not
  mistake the `agentsWindowActivation` API proposal for a startup activation
  event; it only enables the `capabilities.agentsWindow` manifest property.
- User-level tasks with `"runOn": "folderOpen"` are loaded but are not selected
  for automatic execution. A workspace task works, but ties the setup to that
  workspace.
- A limited user may receive `Access denied` from
  `Register-CimIndicationEvent` for `Win32_ProcessStartTrace`. Use the polling
  watcher in this skill instead of requiring elevation.
- The Agents renderer caches image URIs. Generate a never-reused filename and
  change `chat.agentSessions.preferredDarkBackgroundImage` to the new URI.

## Files

The working example is in this skill's `examples/` directory:

- `Update-AgentsBackground.ps1` reads installed metadata, generates the SVG,
  updates the setting, and removes the previous generated SVG.
- `Watch-VSCodeWindows.ps1` polls Insiders process IDs and runs the generator
  when it observes a new process.
- `command-extension/` is a self-contained VSIX template that contributes a
  manual update command to the Agents window.

## Setup

1. Ask the user for the desired devbox label and output directory. Suggested
   defaults are the lower-case computer name and
   `$HOME\.copilot\agents-build-background\images`.
2. Copy both example scripts to:

   ```text
   $HOME\.copilot\agents-build-background
   ```

3. In `Update-AgentsBackground.ps1`, update:

   ```powershell
   $outputDirectory = "Q:\artifacts\backimg"
   $devbox = "cp1"
   ```

   Also adjust `$settingsPath` and `$installRoot` if the target does not use
   the normal user-scoped VS Code Insiders installation.

4. Ensure the target Insiders `settings.json` already contains:

   ```json
   "chat.agentSessions.preferredDarkBackgroundImage": "<any valid file URI>",
   "chat.agentSessions.backgroundImageLayout": "bottom-left"
   ```

   The generator deliberately requires the image setting to exist and replaces
   only its string value, preserving the rest of a JSON-with-comments file.

5. Run the generator directly and verify it succeeds:

   ```powershell
   & "C:\Program Files\PowerShell\7\pwsh.exe" `
     -NoLogo -NoProfile -NonInteractive `
     -File "$HOME\.copilot\agents-build-background\Update-AgentsBackground.ps1"
   ```

## Manual Command in the Agents Window

Use the extension example when the user wants a manual trigger in the
folderless Agents window. A user task is not sufficient there because user
tasks are not discovered without a workspace folder.

1. Copy `examples/command-extension` to:

   ```text
   $HOME\.copilot\agents-build-background-extension
   ```

2. Confirm that `extension/package.json`:

   - contributes `agentsBuildBackground.update`;
   - declares `"extensionKind": ["ui"]` so PowerShell runs on the local
     machine;
   - uses `onStartupFinished` to update automatically and retains the command
     activation event for manual updates.

3. Add the extension to the Agents-window support override in the Insiders
   user settings. Preserve other entries if the setting already exists:

   ```json
   "extensions.supportAgentsWindow": {
     "aamunger-local.agents-build-background": true
   }
   ```

   Executable extensions do not appear in the Agents window without this
   override, even when the Extensions editor reports them as installed.

4. Package the self-contained VSIX:

   ```powershell
   $root = Join-Path $HOME ".copilot\agents-build-background-extension"
   $vsix = Join-Path $root "agents-build-background-0.0.1.vsix"

   Compress-Archive `
     -LiteralPath `
       (Join-Path $root "[Content_Types].xml"), `
       (Join-Path $root "extension.vsixmanifest"), `
       (Join-Path $root "extension") `
     -DestinationPath $vsix
   ```

   When rebuilding an existing version, delete only that exact VSIX first or
   increment the version in both manifests and use the matching filename.

5. Install it into the default Insiders profile. The internal Agents profile
   shares the default profile's extension inventory:

   ```powershell
   $code = Join-Path $env:LOCALAPPDATA `
     "Programs\Microsoft VS Code Insiders\bin\code-insiders.cmd"
   & $code --install-extension $vsix --force --profile "Default"
   ```

6. Run **Developer: Reload Window** in the Agents window. The extension runs
   the generator after startup and shows a diagnostic success notification.
   Run **Agents: Update Agents Build Background** from the Command Palette to
   trigger another update manually.

7. Verify registration:

   ```powershell
   & $code --list-extensions --show-versions --profile "Agents" |
     Select-String "^aamunger-local\.agents-build-background@"
   ```

   Also verify that the command produces a fresh image URI. If the command
   fails, inspect **Output: Agents Build Background**. The extension surfaces
   generator stderr and does not report success for a nonzero exit.

The extension coalesces overlapping startup and manual invocations. Keep the
watcher below only when refreshes must also occur while the extension is
disabled or unavailable.

## Automatic Watcher

Register the watcher for the current user:

```powershell
$taskName = "Agents Build Background"
$pwsh = "C:\Program Files\PowerShell\7\pwsh.exe"
$watcher = Join-Path $HOME ".copilot\agents-build-background\Watch-VSCodeWindows.ps1"
$userId = "$env:USERDOMAIN\$env:USERNAME"

$action = New-ScheduledTaskAction `
  -Execute $pwsh `
  -Argument "-NoLogo -NoProfile -NonInteractive -WindowStyle Hidden -File `"$watcher`""
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $userId
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit ([TimeSpan]::Zero) `
  -MultipleInstances IgnoreNew `
  -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal `
  -UserId $userId `
  -LogonType Interactive `
  -RunLevel Limited

Register-ScheduledTask `
  -TaskName $taskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Principal $principal `
  -Description "Refreshes the VS Code Agents background when VS Code Insiders windows start." `
  -Force

Start-ScheduledTask -TaskName $taskName
```

## Verification

Confirm the task remains alive:

```powershell
$task = Get-ScheduledTask -TaskName "Agents Build Background"
$info = Get-ScheduledTaskInfo -TaskName "Agents Build Background"
$task.State
"0x{0:X}" -f $info.LastTaskResult
```

Expected while running:

```text
Running
0x41301
```

`0x41301` means the scheduled task is currently running; it is not an error.

Test detection without opening a visible window:

```powershell
$settingsPath = Join-Path $env:APPDATA "Code - Insiders\User\settings.json"
$settings = Get-Content -Raw $settingsPath | ConvertFrom-Json
$before = $settings.'chat.agentSessions.preferredDarkBackgroundImage'

& "$env:LOCALAPPDATA\Programs\Microsoft VS Code Insiders\Code - Insiders.exe" --version
Start-Sleep -Seconds 6

$settings = Get-Content -Raw $settingsPath | ConvertFrom-Json
$after = $settings.'chat.agentSessions.preferredDarkBackgroundImage'

if ($before -eq $after) {
    throw "The watcher did not generate a fresh background URI."
}
```

Also verify:

- Exactly one `agents-build-background-*.svg` remains in the output directory.
- The URI in `settings.json` points to that file.
- The SVG parses as XML.
- The bottom-right `updated` text reflects the latest run.

## Behavior and Cost

The watcher starts once at user logon and remains as a hidden PowerShell
process. It sleeps for one second between `Get-Process` calls. When it detects a
new `Code - Insiders` PID, it waits two seconds to debounce the startup burst,
then invokes the generator. The generator uses the
`Local\AgentsBuildBackground` mutex so simultaneous triggers cannot race.

The watcher can refresh for helper-process restarts as well as true window
opens. This is harmless and preferable to requiring administrator privileges
for process-start event subscriptions.

## Removal

```powershell
Stop-ScheduledTask -TaskName "Agents Build Background" -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName "Agents Build Background" -Confirm:$false
```

Then restore or remove
`chat.agentSessions.preferredDarkBackgroundImage` and delete the copied scripts
and generated SVGs if requested.
