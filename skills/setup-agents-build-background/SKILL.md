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
- The Agents window filters out ordinary user-installed extensions, so do not
  depend on an extension's `onStartupFinished` activation.
- User-level tasks with `"runOn": "folderOpen"` are loaded but are not selected
  for automatic execution. A workspace task works, but ties the setup to that
  workspace.
- A limited user may receive `Access denied` from
  `Register-CimIndicationEvent` for `Win32_ProcessStartTrace`. Use the polling
  watcher in this skill instead of requiring elevation.
- The Agents renderer caches image URIs. Generate a never-reused filename and
  change `chat.agentSessions.preferredDarkBackgroundImage` to the new URI.
- Insiders updates can leave newer staged application directories beside the
  active build. Resolve the active commit with `code-insiders.cmd --version`;
  do not assume the newest `product.json` date is the running version.

## Files

The working example is in this skill's `examples/` directory:

- `Update-AgentsBackground.ps1` reads installed metadata, generates the SVG,
  updates the setting, and removes the previous generated SVG.
- `Watch-VSCodeWindows.ps1` polls Insiders process IDs and runs the generator
  when it observes a new process.

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

6. Register the watcher for the current user:

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
     -RestartCount 3 `
     -RestartInterval (New-TimeSpan -Minutes 1) `
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

## Troubleshooting

Start with the scheduled task. Do not change VS Code source code or the
background renderer until the external updater has been ruled out.

Inspect the task status, last result, restart policy, watcher process, current
setting, generated file timestamp, and active Insiders commit:

```powershell
$taskName = "Agents Build Background"
$task = Get-ScheduledTask -TaskName $taskName
$info = Get-ScheduledTaskInfo -TaskName $taskName
$settingsPath = Join-Path $env:APPDATA "Code - Insiders\User\settings.json"
$settings = Get-Content -Raw -LiteralPath $settingsPath | ConvertFrom-Json
$background = [uri]$settings.'chat.agentSessions.preferredDarkBackgroundImage'
$cliPath = Join-Path $env:LOCALAPPDATA `
  "Programs\Microsoft VS Code Insiders\bin\code-insiders.cmd"
$activeVersion = @(& $cliPath --version)
$watcher = Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -eq "pwsh.exe" -and
    $_.CommandLine -match '-File\s+"?[^"]*Watch-VSCodeWindows\.ps1'
  }

[pscustomobject]@{
  TaskState = $task.State
  LastRunTime = $info.LastRunTime
  LastTaskResult = "0x{0:X8}" -f ($info.LastTaskResult -band 0xffffffffL)
  RestartCount = $task.Settings.RestartCount
  RestartInterval = $task.Settings.RestartInterval
  WatcherProcessId = $watcher.ProcessId -join ","
  Background = $background.AbsoluteUri
  BackgroundExists = Test-Path -LiteralPath $background.LocalPath
  BackgroundLastWriteTime = if (Test-Path -LiteralPath $background.LocalPath) {
    (Get-Item -LiteralPath $background.LocalPath).LastWriteTime
  }
  ActiveVersion = $activeVersion[0]
  ActiveCommit = $activeVersion[1]
}
```

Interpret the result as follows:

- `Running` with `0x00041301` means the long-running watcher is healthy.
- `Ready` with `0x00000001` and no watcher process means the watcher exited
  with an error. A stale generated-file timestamp confirms that refreshes
  stopped.
- A running watcher with a stale image requires the process-detection test in
  the Verification section.
- If the SVG commit differs from `ActiveCommit`, check whether the generator
  selected the newest staged application directory instead of the directory
  matching the CLI-reported active commit. Update the generator from this
  skill's example and run it directly.

When the task has exited, run the generator directly before changing the task.
This surfaces metadata, installation-layout, settings, and output-path errors:

```powershell
& "C:\Program Files\PowerShell\7\pwsh.exe" `
  -NoLogo -NoProfile -NonInteractive `
  -File "$HOME\.copilot\agents-build-background\Update-AgentsBackground.ps1"
```

If the generator succeeds, ensure the existing task has a restart policy and
start it again:

```powershell
$task = Get-ScheduledTask -TaskName "Agents Build Background"
$task.Settings.RestartCount = 3
$task.Settings.RestartInterval = "PT1M"
Set-ScheduledTask -InputObject $task | Out-Null
Start-ScheduledTask -TaskName "Agents Build Background"
Start-Sleep -Seconds 4

$task = Get-ScheduledTask -TaskName "Agents Build Background"
$info = Get-ScheduledTaskInfo -TaskName "Agents Build Background"
if ($task.State -ne "Running" -or $info.LastTaskResult -ne 0x41301) {
  throw "The Agents background watcher did not remain running."
}
```

If the generator fails, fix the reported error instead of masking it with
additional task restarts. After any repair, verify that the setting references
a newly generated file and that the watcher remains running.

## Verification

Confirm the task remains alive:

```powershell
$task = Get-ScheduledTask -TaskName "Agents Build Background"
$info = Get-ScheduledTaskInfo -TaskName "Agents Build Background"
$task.State
"0x{0:X}" -f $info.LastTaskResult
$task.Settings.RestartCount
$task.Settings.RestartInterval
```

Expected while running:

```text
Running
0x41301
3
PT1M
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
- The SVG commit matches the second line from `code-insiders.cmd --version`.
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
