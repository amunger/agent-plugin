---
name: migrate-agent-host-tunnel
description: Migrate a Windows VS Code Insiders remote machine from code-insiders agent --tunnel to code-insiders tunnel or its persistent service. Use when restarting an Agent Host tunnel, replacing the legacy tunnel path, cleaning up orphaned tunnel processes, or diagnosing reconnect loops, stale tunnel IDs, and Agent Host gateway selection timeouts.
user-invocable: true
---

# Migrate an Agent Host Tunnel on Windows

Move a legacy Agent Host-specific tunnel to the regular VS Code tunnel path
without deleting working registrations or mistaking a connected relay for a
working Agent Host connection.

This workflow is based on Windows Insiders migrations in October 2026. CLI
behavior changes between builds: verify supported syntax and observed behavior,
not just success messages. For other operating systems, collect a baseline but
do not apply Windows process, service, or metadata cleanup commands.

## Interaction and safety

- Guide a user-operated remote machine one checkpoint at a time. Batch useful
  diagnostics; do not make the user repeatedly shuttle help text. Inspect help
  locally when available, but treat the remote CLI's version and syntax as
  authoritative if behavior differs.
- Follow the user's preferred interaction style for pasted terminal results.
  Do not repeatedly prompt through a question UI merely to collect output.
- Require independent access through RDP, SSH, PowerShell remoting, or physical
  console before stopping the tunnel. A terminal reached through that tunnel
  is not an independent control path. An investigating agent hosted beneath the
  old process will also be stopped; give the user the next checkpoint first.
- Confirm acceptable disruption, save/pause work, and close connected clients
  before shutdown. Closing a client does not necessarily stop agent turns.
- Do not equate a missing parent PID with a disposable process. A functioning
  detached host can have a parent that already exited.
- Never kill by executable name, stop unrelated editor/Node processes, delete
  session data, or replace a working Agent Host as an exploratory repair.
- Do not publish raw endpoint registry files or `agent endpoints` output: they
  contain connection tokens. Sanitize logs and command lines before sharing.
- Estimates are not guarantees: a clean cutover can take 5-10 minutes; orphan
  cleanup, installation updates, and reboot verification may take longer.

## 1. Establish the baseline

On the target machine, under the account owning the tunnel:

```powershell
Get-Command code-insiders | Select-Object Source
code-insiders --version
code-insiders tunnel status
code-insiders agent ps

Get-CimInstance Win32_Process |
  Where-Object { $_.Name -eq 'code-tunnel-insiders.exe' } |
  Select-Object ProcessId,ParentProcessId,CreationDate,ExecutablePath,CommandLine |
  Format-List
```

Distinguish legacy `agent --tunnel` / `agent host --tunnel`, local/editor Agent
Hosts, dedicated gateway supervisors, interactive tunnels, service
`tunnel service internal-run` processes, and log viewers. Additional local Agent
Hosts are not necessarily duplicate tunnel owners.

Resolve effective CLI and user-data paths from command lines and
`VSCODE_CLI_DATA_DIR`, `VSCODE_APPDATA`, and `VSCODE_PORTABLE` overrides. Default
Insiders CLI metadata is `$HOME\.vscode-insiders\cli`; endpoint discovery usually
uses `$env:APPDATA\Code - Insiders`. Do not assume these defaults when overridden.
Read only name/ID/cluster from `code_tunnel.json`; compare with status if available.

If duplicates, unexpected launchers, or persistence questions exist, inspect
the relevant parent processes, `Win32_Service` definitions, Scheduled Task actions,
and startup entries. Match action arguments as well as task names/executables;
a PowerShell wrapper may launch the tunnel. Do not disable unrelated tasks.
Never assume the CLI's word "service" guarantees a Windows service or startup
mechanism: verify the actual installation.

Important baseline distinctions:

- `{"tunnel":null,"service_installed":false}` can coexist with a working legacy
  Agent Host tunnel; it does not prove that relay is dead.
- A registration file does not prove the remote resource exists.
- Old CLI session labels can disagree with the UI. Decode status flags from
  reliable version-specific evidence rather than guessing.
- Existing-session usability does not establish that a new connection works.

## 2. Quiesce sessions and stop the legacy owner

Let turns finish or stop them through the client. When needed, check
`code-insiders agent stop --help`, then cancel each known session with:

```powershell
code-insiders agent stop <session-uri>
```

If labels remain stale, explain the discrepancy and confirm the user accepts
interrupting remaining work rather than waiting indefinitely or silently killing.
Do not promise all independent tool processes are cancelled by stopping a turn.

Re-inventory the target immediately before shutdown. Record its executable,
command line, creation time, and descendant tree for later verification.

For a single discovered legacy standalone host:

```powershell
code-insiders agent kill
```

When multiple hosts are registered, use the verified legacy instance's
`--instance-id`; do not kill every registration just to satisfy the CLI.
If a regular tunnel/service also exists, use the supported
`tunnel service uninstall` / `tunnel kill` commands for the intended owner.
Disable a verified respawning launcher before force cleanup, with approval.

**Verify actual exit.** Repeat the process inventory and inspect the previously
recorded descendants. In the observed migrations, `agent kill` reported
"Killed agent host", yet the original process and server/Agent Host descendants
remained with their original start times. Service uninstall/kill likewise left
multiple `internal-run` processes alive.

If the verified legacy tree survives, explain the impact and obtain approval
for force termination. Recheck root PID, creation time, and command line to
avoid PID reuse, then use a numeric PID (substitute the verified value):

```powershell
taskkill.exe /PID <verified-root-pid> /T /F
```

This terminates the target and descendants, including runtime/tool processes,
not their persisted files. If access is denied, use an elevated terminal under
the appropriate account. Re-inventory afterward; treat errors or leftovers
explicitly. Do not start a replacement while an old competing owner remains.

## 3. Start exactly one regular tunnel owner

Preserve registration and authentication initially. In particular, **do not
delete the client-side tunnel or run `tunnel unregister` as routine cleanup**:
removing a tunnel resource can leave surviving hosts retrying a deleted ID.

Use the same account and CLI-data directory. Confirm the actual tunnel name
instead of copying an example. Choose one mode based on the user's intent:

- Interactive test: `code-insiders tunnel --name <existing-name>`.
- Persistent installation, when requested and supported:

```powershell
code-insiders tunnel service install `
  --name <existing-name> `
  --accept-server-license-terms
```

Include license acceptance only with the user's agreement. Do not overlap
interactive and service owners. If CLI data is overridden, carry the explicit
`--cli-data-dir` into every relevant command using the installed CLI's syntax.

After a short startup interval:

```powershell
code-insiders tunnel status

Get-CimInstance Win32_Process |
  Where-Object { $_.Name -eq 'code-tunnel-insiders.exe' } |
  Select-Object ProcessId,ParentProcessId,CreationDate,CommandLine |
  Format-List
```

Expect `Connected`, the intended name/registration, no current failure, and
exactly one intended tunnel owner. For service mode, expect one `internal-run`.
Inspect `code-insiders tunnel service log` for failures; Ctrl+C stops viewing
the log, not the installed service.

## 4. Verify Agent Host access separately

Reconnect from a fresh client without deleting the preserved tunnel connection.
Verify previous sessions are available and a new short message completes.
Do not claim full success based only on relay status or SSH authentication.

- Individual client/channel disconnects are not necessarily host-relay failures.
- Filtering an unreachable endpoint registry entry means a stale pipe/socket
  was ignored; it is not by itself evidence the working host needs replacement.
- `gateway selection acknowledgement timed out after 30000ms` concerns Agent
  Host selection, not necessarily relay health. If current sessions and fresh
  turns work, a one-off failed attempt need not trigger disruptive cleanup.
- If new connections repeatedly fail, correlate client error timestamps with
  bounded fresh service logs, endpoint reachability, host startup, user-data
  directory, and CLI/client versions. Existing connections alone do not prove
  selection is healthy.

Do not prescribe `agent host --replace` merely because a stale entry exists.
It can interrupt working sessions. Starting a standalone local host with the
correct user-data directory is a diagnostic option only after confirming the
gateway lacks a usable endpoint, supported syntax, and acceptable disruption.
Do not add another `--tunnel` owner.

## 5. Handle proven stale state, not speculative cleanup

For repeating host-token lookup HTTP 404 errors:

1. Check whether the remote tunnel resource was deleted.
2. Compare the ID in live status/logs with the registration file.
3. Inventory all owners first. A valid new disk registration with an old runtime
   ID points to surviving old processes or differing account/data contexts.
4. Stop the appropriate launcher and verified old process trees. Do not keep
   reinstalling: that can accumulate service processes and duplicate logs.
5. Only when no relevant owner holds them, rotate an identified stale lock and
   accumulated log to timestamped backups. Default filenames observed were
   `tunnel-insider.lock` and `tunnel-service.log`; confirm actual paths first.
6. If the registration itself is proven stale, attempt supported unregister
   and verify its result. Back up only `code_tunnel.json` if a targeted reset is
   necessary, then recreate/adopt the intended registration. Do not recursively
   remove the CLI directory or delete token/session/endpoint files wholesale.

Do not recommend logout/login for a deleted resource simply because the log
says "Error refreshing access token": successful identity refresh followed by
host-resource HTTP 404 is different from failed authentication.

Historical log replay and multiple log viewers can duplicate displayed lines.
Confirm process counts, request IDs, and timestamps before diagnosing multiple
owners from repeated text alone.

## 6. Report completion and remaining checks

Functional migration is verified when the legacy owner is gone, the intended
regular owner is connected without competing instances, and fresh Agent Host
messages complete with expected session recovery. Persisted session files do
not guarantee every in-flight operation resumes.

Report installation updates and persistence separately:

- Changing the hosting path does not upgrade the installed Insiders CLI or
  guarantee automatic updates. Record installed version/commit, inspect the
  normal Insiders update mechanism, and verify versions after an approved update
  and restart. Do not promise the migration alone fixes update freshness.
- Service installation does not prove reboot/logoff survival. Inspect the actual
  startup mechanism and account context, then perform an approved restart test
  when convenient. Verify `Connected`, one owner, and a fresh working turn again.
- Retain targeted backups until verification; remove only explicitly identified
  backups when approved. No further metadata cleanup is needed on a healthy host.

Summarize what was verified, any remaining update/persistence checks, and concrete
failures without stretching hypotheses into root causes.

Public investigation reference:
[VS Code tunnel restart difficulty](https://github.com/microsoft/vscode/issues/340380).
