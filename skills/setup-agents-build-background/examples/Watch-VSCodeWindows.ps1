[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$generatorPath = Join-Path $PSScriptRoot "Update-AgentsBackground.ps1"
$installRoot = Join-Path $env:LOCALAPPDATA "Programs\Microsoft VS Code Insiders"
$activeExecutablePath = Join-Path $installRoot "Code - Insiders.exe"
$logPath = Join-Path $PSScriptRoot "Watch-VSCodeWindows.log"
$retryDelay = [TimeSpan]::FromMinutes(1)
$installCheckInterval = [TimeSpan]::FromSeconds(30)

if (-not (Test-Path -LiteralPath $generatorPath -PathType Leaf)) {
    throw "Background generator not found: $generatorPath"
}

function Write-WatcherLog {
    param(
        [Parameter(Mandatory)][string]$Level,
        [Parameter(Mandatory)][string]$Message
    )

    $timestamp = [DateTimeOffset]::Now.ToString("o")
    Add-Content -LiteralPath $logPath -Value "$timestamp [$Level] $Message"
}

function Update-Background {
    param([Parameter(Mandatory)][string]$Trigger)

    try {
        & $generatorPath
        Write-WatcherLog -Level "INFO" -Message "Background updated ($Trigger)."
        return $true
    } catch {
        $message = $_.Exception.Message -replace "[\r\n]+", " "
        Write-WatcherLog -Level "ERROR" -Message "Background update failed ($Trigger): $message"
        return $false
    }
}

function Get-VSCodeProcessIds {
    return @(
        Get-Process -Name "Code - Insiders" -ErrorAction SilentlyContinue |
            Select-Object -ExpandProperty Id
    )
}

function Get-ActiveInstallFingerprint {
    $executable = Get-Item -LiteralPath $activeExecutablePath -ErrorAction SilentlyContinue
    if ($null -eq $executable) {
        return "missing"
    }

    return "$($executable.Length):$($executable.LastWriteTimeUtc.Ticks)"
}

Write-WatcherLog -Level "INFO" -Message "Watcher started."

$retryAt = if (Update-Background -Trigger "watcher-start") {
    [DateTimeOffset]::MaxValue
} else {
    [DateTimeOffset]::Now.Add($retryDelay)
}
$retryTrigger = "watcher-start retry"
$knownProcessIds = [Collections.Generic.HashSet[int]]::new(
    [int[]](Get-VSCodeProcessIds)
)
$knownInstallFingerprint = Get-ActiveInstallFingerprint
$nextInstallCheck = [DateTimeOffset]::Now.Add($installCheckInterval)

while ($true) {
    Start-Sleep -Seconds 1
    $currentProcessIds = Get-VSCodeProcessIds
    $hasNewProcess = $false
    foreach ($processId in $currentProcessIds) {
        if (-not $knownProcessIds.Contains($processId)) {
            $hasNewProcess = $true
            break
        }
    }

    $hasActiveInstallChange = $false
    if ([DateTimeOffset]::Now -ge $nextInstallCheck) {
        $currentInstallFingerprint = Get-ActiveInstallFingerprint
        $hasActiveInstallChange = $currentInstallFingerprint -ne $knownInstallFingerprint
        $knownInstallFingerprint = $currentInstallFingerprint
        $nextInstallCheck = [DateTimeOffset]::Now.Add($installCheckInterval)
    }

    $trigger = if ($hasActiveInstallChange) {
        "active-install-change"
    } elseif ($hasNewProcess) {
        "process-start"
    } elseif ([DateTimeOffset]::Now -ge $retryAt) {
        $retryTrigger
    } else {
        $null
    }

    if ($hasNewProcess -or $hasActiveInstallChange) {
        Start-Sleep -Seconds 2
    }

    if ($null -ne $trigger) {
        if (Update-Background -Trigger $trigger) {
            $retryAt = [DateTimeOffset]::MaxValue
        } else {
            $retryAt = [DateTimeOffset]::Now.Add($retryDelay)
            $retryTrigger = "$trigger retry"
        }
    }

    $knownProcessIds = [Collections.Generic.HashSet[int]]::new(
        [int[]](Get-VSCodeProcessIds)
    )
}
