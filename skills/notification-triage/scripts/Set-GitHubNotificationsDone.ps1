[CmdletBinding(SupportsShouldProcess = $true)]
param(
	[Parameter(Mandatory = $true)]
	[ValidateNotNullOrEmpty()]
	[string[]]$ThreadId,

	[Parameter(Mandatory = $true)]
	[ValidateSet('Auto', 'Confirmed')]
	[string]$Method,

	[Parameter(Mandatory = $true)]
	[ValidateScript({ Test-Path -LiteralPath $_ -PathType Leaf })]
	[string]$ClassificationPath,

	[int]$RulesVersion = 1,

	[string]$StateDirectory = $(if ($env:LOCALAPPDATA) {
		Join-Path $env:LOCALAPPDATA 'Copilot\agent-plugin\notification-triage'
	} else {
		Join-Path $HOME '.copilot\agent-plugin\notification-triage'
	})
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
	throw 'GitHub CLI (gh) is required and was not found on PATH.'
}

New-Item -ItemType Directory -Path $StateDirectory -Force | Out-Null
$ledgerPath = Join-Path $StateDirectory 'actioned-done-ids.tsv'
if (-not (Test-Path -LiteralPath $ledgerPath)) {
	Set-Content -LiteralPath $ledgerPath -Value "id`tactioned_at`tmethod" -Encoding UTF8
}

$failures = New-Object 'System.Collections.Generic.List[string]'
$succeeded = 0
$classifiedById = @{}

foreach ($line in Get-Content -LiteralPath $ClassificationPath) {
	if ([string]::IsNullOrWhiteSpace($line)) {
		continue
	}
	try {
		$record = $line | ConvertFrom-Json
	} catch {
		throw "Classification file '$ClassificationPath' contains invalid JSON: $($_.Exception.Message)"
	}
	if ($record.record_type -eq 'notification' -and $record.id) {
		$classifiedById[[string]$record.id] = $record
	}
}

foreach ($id in $ThreadId) {
	if ($id -notmatch '^\d+$') {
		$failures.Add("$id`: invalid notification thread ID")
		continue
	}

	$classification = $classifiedById[$id]
	if ($null -eq $classification) {
		$failures.Add("$id`: no record exists in the classified snapshot")
		continue
	}
	if ($classification.rules_version -ne $RulesVersion) {
		$failures.Add("$id`: classification uses rules version $($classification.rules_version), expected $RulesVersion")
		continue
	}
	if ($Method -eq 'Auto' -and $classification.action -ne 'auto_done') {
		$failures.Add("$id`: classification is not auto_done")
		continue
	}
	if (
		$Method -eq 'Confirmed' -and
		(
			$classification.action -ne 'candidate' -or
			$classification.reviewed -ne $true -or
			$classification.review_verdict -ne 'uphold'
		)
	) {
		$failures.Add("$id`: classification is not a reviewed, upheld candidate")
		continue
	}

	$liveOutput = & gh api "/notifications/threads/$id" 2>&1
	if ($LASTEXITCODE -ne 0) {
		$failures.Add("$id`: live notification check failed: $($liveOutput -join [Environment]::NewLine)")
		continue
	}
	try {
		$liveThread = ($liveOutput -join [Environment]::NewLine) | ConvertFrom-Json
	} catch {
		$failures.Add("$id`: live notification response was invalid JSON: $($_.Exception.Message)")
		continue
	}
	if (-not $classification.updated_at -or $liveThread.updated_at -ne $classification.updated_at) {
		$failures.Add("$id`: notification activity changed after classification")
		continue
	}

	if (-not $PSCmdlet.ShouldProcess("GitHub notification thread $id", 'Mark Done')) {
		continue
	}

	$output = & gh api -X DELETE "/notifications/threads/$id" 2>&1
	if ($LASTEXITCODE -ne 0) {
		$failures.Add("$id`: $($output -join [Environment]::NewLine)")
		continue
	}

	$timestamp = [DateTimeOffset]::UtcNow.ToString('o')
	Add-Content -LiteralPath $ledgerPath -Value "$id`t$timestamp`t$($Method.ToLowerInvariant())" -Encoding UTF8
	Write-Output "done: $id"
	$succeeded++
}

Write-Output "marked done: $succeeded; failed: $($failures.Count)"
foreach ($failure in $failures) {
	Write-Error $failure -ErrorAction Continue
}

if ($failures.Count -gt 0) {
	throw "$($failures.Count) notification thread(s) could not be marked Done."
}
