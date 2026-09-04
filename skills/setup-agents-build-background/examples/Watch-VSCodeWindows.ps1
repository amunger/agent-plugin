[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$generatorPath = Join-Path $PSScriptRoot "Update-AgentsBackground.ps1"

if (-not (Test-Path -LiteralPath $generatorPath -PathType Leaf)) {
    throw "Background generator not found: $generatorPath"
}

function Update-Background {
    & $generatorPath
}

Update-Background

function Get-VSCodeProcessIds {
    return @(
        Get-Process -Name "Code - Insiders" -ErrorAction SilentlyContinue |
            Select-Object -ExpandProperty Id
    )
}

$knownProcessIds = [Collections.Generic.HashSet[int]]::new(
    [int[]](Get-VSCodeProcessIds)
)

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

    if ($hasNewProcess) {
        Start-Sleep -Seconds 2
        Update-Background
    }

    $knownProcessIds = [Collections.Generic.HashSet[int]]::new(
        [int[]](Get-VSCodeProcessIds)
    )
}
