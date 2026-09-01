[CmdletBinding()]
param(
	[switch]$All,
	[int]$RulesVersion = 1,
	[string]$StateDirectory = $(if ($env:LOCALAPPDATA) {
		Join-Path $env:LOCALAPPDATA 'Copilot\agent-plugin\notification-triage'
	} else {
		Join-Path $HOME '.copilot\agent-plugin\notification-triage'
	})
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2

function Invoke-GhJson {
	param(
		[Parameter(Mandatory = $true)]
		[string[]]$Arguments
	)

	$output = & gh @Arguments 2>&1
	if ($LASTEXITCODE -ne 0) {
		throw "gh $($Arguments -join ' ') failed: $($output -join [Environment]::NewLine)"
	}

	$text = $output -join [Environment]::NewLine
	if ([string]::IsNullOrWhiteSpace($text)) {
		return $null
	}

	return $text | ConvertFrom-Json
}

function Invoke-GhPagedArray {
	param(
		[Parameter(Mandatory = $true)]
		[string]$Endpoint
	)

	$result = Invoke-GhJson -Arguments @('api', '--paginate', '--slurp', $Endpoint)
	$items = @()
	foreach ($page in @($result)) {
		if ($page -is [System.Array]) {
			$items += @($page)
		} elseif ($null -ne $page) {
			$items += $page
		}
	}
	return @($items)
}

function Test-GitHubApiUrl {
	param([AllowNull()][string]$Url)
	return $Url -and $Url.StartsWith('https://api.github.com/', [StringComparison]::OrdinalIgnoreCase)
}

function Get-PropertyValue {
	param(
		[AllowNull()]$Object,
		[Parameter(Mandatory = $true)]
		[string]$Name
	)

	if ($null -eq $Object) {
		return $null
	}
	$property = $Object.PSObject.Properties[$Name]
	if ($null -eq $property) {
		return $null
	}
	return $property.Value
}

function Test-HasProperties {
	param(
		[Parameter(Mandatory = $true)]$Object,
		[Parameter(Mandatory = $true)][string[]]$Names
	)

	foreach ($name in $Names) {
		if ($null -eq $Object.PSObject.Properties[$name]) {
			return $false
		}
	}
	return $true
}

function Get-Login {
	param([AllowNull()]$User)
	return Get-PropertyValue -Object $User -Name 'login'
}

function Get-UserType {
	param([AllowNull()]$User)
	return Get-PropertyValue -Object $User -Name 'type'
}

function Get-BodySignal {
	param(
		[AllowNull()][string]$Body,
		[Parameter(Mandatory = $true)]
		[string]$Login
	)

	$text = if ($Body) { $Body } else { '' }
	return [ordered]@{
		mentions_me = $text.IndexOf("@$Login", [StringComparison]::OrdinalIgnoreCase) -ge 0
		code_notify = $text.IndexOf('CODENOTIFY', [StringComparison]::OrdinalIgnoreCase) -ge 0
		snippet = (($text -replace '[\r\n]+', ' ').Trim()).Substring(0, [Math]::Min(500, (($text -replace '[\r\n]+', ' ').Trim()).Length))
	}
}

function Get-PagedResource {
	param(
		[AllowNull()][string]$Url,
		[Parameter(Mandatory = $true)]
		[string]$Name,
		[Parameter(Mandatory = $true)]
		[AllowEmptyCollection()]
		[System.Collections.Generic.List[string]]$Errors
	)

	if (-not (Test-GitHubApiUrl $Url)) {
		$Errors.Add("$Name URL is missing or is not a GitHub API URL")
		return [ordered]@{ complete = $false; items = @() }
	}

	try {
		$separator = if ($Url.Contains('?')) { '&' } else { '?' }
		$items = Invoke-GhPagedArray -Endpoint "$Url${separator}per_page=100"
		return [ordered]@{ complete = $true; items = @($items) }
	} catch {
		$Errors.Add("$Name fetch failed: $($_.Exception.Message)")
		return [ordered]@{ complete = $false; items = @() }
	}
}

function Convert-Comment {
	param(
		[Parameter(Mandatory = $true)]$Comment,
		[Parameter(Mandatory = $true)][string]$Login
	)

	$body = Get-PropertyValue $Comment 'body'
	$signals = Get-BodySignal -Body $body -Login $Login
	return [ordered]@{
		id = Get-PropertyValue $Comment 'id'
		author = Get-Login (Get-PropertyValue $Comment 'user')
		author_type = Get-UserType (Get-PropertyValue $Comment 'user')
		created_at = Get-PropertyValue $Comment 'created_at'
		updated_at = Get-PropertyValue $Comment 'updated_at'
		in_reply_to_id = Get-PropertyValue $Comment 'in_reply_to_id'
		pull_request_review_id = Get-PropertyValue $Comment 'pull_request_review_id'
		mentions_me = $signals.mentions_me
		code_notify = $signals.code_notify
		body = if ($body) { $body } else { '' }
		body_snippet = $signals.snippet
	}
}

function Convert-Review {
	param(
		[Parameter(Mandatory = $true)]$Review,
		[Parameter(Mandatory = $true)][string]$Login
	)

	$body = Get-PropertyValue $Review 'body'
	$signals = Get-BodySignal -Body $body -Login $Login
	return [ordered]@{
		id = Get-PropertyValue $Review 'id'
		author = Get-Login (Get-PropertyValue $Review 'user')
		author_type = Get-UserType (Get-PropertyValue $Review 'user')
		state = Get-PropertyValue $Review 'state'
		submitted_at = Get-PropertyValue $Review 'submitted_at'
		commit_id = Get-PropertyValue $Review 'commit_id'
		mentions_me = $signals.mentions_me
		code_notify = $signals.code_notify
		body = if ($body) { $body } else { '' }
		body_snippet = $signals.snippet
	}
}

function Convert-TimelineEvent {
	param(
		[Parameter(Mandatory = $true)]$Event,
		[Parameter(Mandatory = $true)][string]$Login
	)

	$body = Get-PropertyValue $Event 'body'
	$signals = Get-BodySignal -Body $body -Login $Login
	return [ordered]@{
		id = Get-PropertyValue $Event 'id'
		event = Get-PropertyValue $Event 'event'
		actor = Get-Login (Get-PropertyValue $Event 'actor')
		actor_type = Get-UserType (Get-PropertyValue $Event 'actor')
		created_at = Get-PropertyValue $Event 'created_at'
		submitted_at = Get-PropertyValue $Event 'submitted_at'
		requested_reviewer = Get-Login (Get-PropertyValue $Event 'requested_reviewer')
		mentions_me = $signals.mentions_me
		code_notify = $signals.code_notify
		body = if ($body) { $body } else { '' }
		body_snippet = $signals.snippet
	}
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
	throw 'GitHub CLI (gh) is required and was not found on PATH.'
}

New-Item -ItemType Directory -Path $StateDirectory -Force | Out-Null

$me = Get-PropertyValue (Invoke-GhJson -Arguments @('api', 'user')) 'login'
if (-not $me) {
	throw 'The authenticated GitHub login could not be determined.'
}

$notificationEndpoint = if ($All) {
	'notifications?all=true&per_page=100'
} else {
	'notifications?per_page=100'
}
$notifications = Invoke-GhPagedArray -Endpoint $notificationEndpoint
$notifications = @($notifications)
$timestamp = [DateTimeOffset]::UtcNow.ToString('yyyyMMddTHHmmssfffZ')
$outputPath = Join-Path $StateDirectory "notifications-$timestamp.ndjson"
$cachedById = @{}
$requiredCachedFields = @(
	'rules_version',
	'rule_id',
	'action',
	'why',
	'subject_complete',
	'latest_comment_complete',
	'issue_comments_complete',
	'issue_comments',
	'review_comments_complete',
	'review_comments',
	'reviews_complete',
	'reviews',
	'commits_complete',
	'commits',
	'timeline_complete',
	'timeline',
	'code_notify_history_complete',
	'code_notify_history',
	'enrichment_errors',
	'reason',
	'type',
	'state',
	'state_reason',
	'merged',
	'merged_at',
	'labels',
	'latest_comment_author',
	'latest_comment_author_type',
	'latest_comment_mentions_me',
	'latest_comment_code_notify',
	'latest_comment_body'
)
$latestClassified = Get-ChildItem -LiteralPath $StateDirectory -Filter 'classified-*.ndjson' -File |
	Sort-Object LastWriteTimeUtc -Descending |
	Select-Object -First 1
if ($latestClassified) {
	foreach ($line in Get-Content -LiteralPath $latestClassified.FullName) {
		if ([string]::IsNullOrWhiteSpace($line)) {
			continue
		}
		try {
			$cached = $line | ConvertFrom-Json
		} catch {
			throw "Cached classification '$($latestClassified.FullName)' contains invalid JSON: $($_.Exception.Message)"
		}
		if ((Get-PropertyValue $cached 'record_type') -eq 'notification' -and (Get-PropertyValue $cached 'id')) {
			$cachedById[[string](Get-PropertyValue $cached 'id')] = $cached
		}
	}
}

$meta = [ordered]@{
	record_type = 'meta'
	me = $me
	count = $notifications.Count
	scope = if ($All) { 'all' } else { 'unread' }
	fetched_at = [DateTimeOffset]::UtcNow.ToString('o')
}
Set-Content -LiteralPath $outputPath -Value ($meta | ConvertTo-Json -Compress) -Encoding UTF8

$index = 0
foreach ($notification in $notifications) {
	$index++
	$notificationId = [string](Get-PropertyValue $notification 'id')
	$cached = $cachedById[$notificationId]
	if (
		$null -ne $cached -and
		(Get-PropertyValue $cached 'updated_at') -eq (Get-PropertyValue $notification 'updated_at') -and
		(Get-PropertyValue $cached 'rules_version') -eq $RulesVersion -and
		(Test-HasProperties -Object $cached -Names $requiredCachedFields)
	) {
		$cached.unread = Get-PropertyValue $notification 'unread'
		if ($null -eq $cached.PSObject.Properties['cache_reused']) {
			$cached | Add-Member -NotePropertyName 'cache_reused' -NotePropertyValue $true
		} else {
			$cached.cache_reused = $true
		}
		Add-Content -LiteralPath $outputPath -Value ($cached | ConvertTo-Json -Depth 12 -Compress) -Encoding UTF8
		Write-Progress -Activity 'Enriching GitHub notifications' -Status "$index of $($notifications.Count)" -PercentComplete (($index / [Math]::Max(1, $notifications.Count)) * 100)
		continue
	}

	$errors = New-Object 'System.Collections.Generic.List[string]'
	$subjectType = Get-PropertyValue (Get-PropertyValue $notification 'subject') 'type'
	$subjectUrl = Get-PropertyValue (Get-PropertyValue $notification 'subject') 'url'
	$latestCommentUrl = Get-PropertyValue (Get-PropertyValue $notification 'subject') 'latest_comment_url'
	$subject = $null
	$latestComment = $null
	$subjectComplete = $false
	$latestCommentComplete = -not $latestCommentUrl

	if (Test-GitHubApiUrl $subjectUrl) {
		try {
			$subject = Invoke-GhJson -Arguments @('api', $subjectUrl)
			$subjectComplete = $true
		} catch {
			$errors.Add("subject fetch failed: $($_.Exception.Message)")
		}
	} else {
		$errors.Add('subject URL is missing or is not a GitHub API URL')
	}

	if ($latestCommentUrl) {
		if (Test-GitHubApiUrl $latestCommentUrl) {
			try {
				$latestComment = Invoke-GhJson -Arguments @('api', $latestCommentUrl)
				$latestCommentComplete = $true
			} catch {
				$errors.Add("latest comment fetch failed: $($_.Exception.Message)")
			}
		} else {
			$errors.Add('latest comment URL is not a GitHub API URL')
		}
	}

	$comments = Get-PagedResource -Url (Get-PropertyValue $subject 'comments_url') -Name 'issue comments' -Errors $errors
	$reviewComments = [ordered]@{ complete = $null; items = @() }
	$reviews = [ordered]@{ complete = $null; items = @() }
	$commits = [ordered]@{ complete = $null; items = @() }
	$timeline = [ordered]@{ complete = $false; items = @() }

	$number = Get-PropertyValue $subject 'number'
	$repository = Get-PropertyValue (Get-PropertyValue $notification 'repository') 'full_name'
	if ($repository -and $number) {
		$timeline = Get-PagedResource -Url "https://api.github.com/repos/$repository/issues/$number/timeline" -Name 'timeline' -Errors $errors
	} else {
		$errors.Add('timeline URL could not be constructed')
	}

	if ($subjectType -eq 'PullRequest') {
		$reviewComments = Get-PagedResource -Url (Get-PropertyValue $subject 'review_comments_url') -Name 'review comments' -Errors $errors
		$reviews = Get-PagedResource -Url "$subjectUrl/reviews" -Name 'reviews' -Errors $errors
		$commits = Get-PagedResource -Url "$subjectUrl/commits" -Name 'commits' -Errors $errors
	}

	$issueCommentRecords = @($comments.items | ForEach-Object { Convert-Comment -Comment $_ -Login $me })
	$reviewCommentRecords = @($reviewComments.items | ForEach-Object { Convert-Comment -Comment $_ -Login $me })
	$reviewRecords = @($reviews.items | ForEach-Object { Convert-Review -Review $_ -Login $me })
	$timelineRecords = @($timeline.items | ForEach-Object { Convert-TimelineEvent -Event $_ -Login $me })
	$latestSignals = Get-BodySignal -Body (Get-PropertyValue $latestComment 'body') -Login $me
	$newestIssueComment = @($issueCommentRecords | Sort-Object created_at | Select-Object -Last 1)
	$newestIssueComment = if ($newestIssueComment.Count) { $newestIssueComment[0] } else { $null }
	$newestIssueBody = if ($newestIssueComment) { $newestIssueComment.body } else { '' }
	$labels = @((Get-PropertyValue $subject 'labels') | ForEach-Object { Get-PropertyValue $_ 'name' })
	$historyComplete = $comments.complete -and (
		$subjectType -ne 'PullRequest' -or
		($reviewComments.complete -and $reviews.complete -and $timeline.complete)
	)
	$historyRecords = @($issueCommentRecords) + @($reviewCommentRecords) + @($reviewRecords) + @($timelineRecords)
	$codeNotifyHistory = if ($historyComplete) {
		@($historyRecords | Where-Object { $_.code_notify }).Count -gt 0
	} else {
		$null
	}

	$commitRecords = @($commits.items | ForEach-Object {
		[ordered]@{
			sha = Get-PropertyValue $_ 'sha'
			author = Get-Login (Get-PropertyValue $_ 'author')
			authored_at = Get-PropertyValue (Get-PropertyValue (Get-PropertyValue $_ 'commit') 'author') 'date'
			committed_at = Get-PropertyValue (Get-PropertyValue (Get-PropertyValue $_ 'commit') 'committer') 'date'
		}
	})
	$nonemptyReviewBodies = @($reviewRecords | Where-Object { $_.body })

	$record = [ordered]@{
		record_type = 'notification'
		id = Get-PropertyValue $notification 'id'
		reason = Get-PropertyValue $notification 'reason'
		unread = Get-PropertyValue $notification 'unread'
		type = $subjectType
		title = Get-PropertyValue (Get-PropertyValue $notification 'subject') 'title'
		repo = $repository
		updated_at = Get-PropertyValue $notification 'updated_at'
		subject_complete = $subjectComplete
		subject_author = Get-Login (Get-PropertyValue $subject 'user')
		state = Get-PropertyValue $subject 'state'
		state_reason = Get-PropertyValue $subject 'state_reason'
		merged = Get-PropertyValue $subject 'merged'
		merged_at = Get-PropertyValue $subject 'merged_at'
		draft = Get-PropertyValue $subject 'draft'
		auto_merge = $null -ne (Get-PropertyValue $subject 'auto_merge')
		labels = $labels
		number = $number
		html_url = Get-PropertyValue $subject 'html_url'
		latest_comment_complete = $latestCommentComplete
		latest_comment_author = Get-Login (Get-PropertyValue $latestComment 'user')
		latest_comment_author_type = Get-UserType (Get-PropertyValue $latestComment 'user')
		latest_comment_mentions_me = $latestSignals.mentions_me
		latest_comment_code_notify = $latestSignals.code_notify
		latest_comment_body = if (Get-PropertyValue $latestComment 'body') { Get-PropertyValue $latestComment 'body' } else { '' }
		latest_comment_snippet = $latestSignals.snippet
		issue_comments_complete = $comments.complete
		issue_comment_count = if ($comments.complete) { $issueCommentRecords.Count } else { $null }
		issue_comments = $issueCommentRecords
		newest_issue_comment = $newestIssueComment
		newest_issue_comment_is_duplicate_close = $newestIssueBody -match '(?i)same as another (one|issue)'
		newest_issue_comment_is_info_needed_close = $newestIssueBody -match '(?i)closed.+info-needed'
		review_comments_complete = $reviewComments.complete
		review_comment_count = if ($reviewComments.complete) { $reviewCommentRecords.Count } else { $null }
		review_comments = $reviewCommentRecords
		reviews_complete = $reviews.complete
		nonempty_review_body_count = if ($reviews.complete) { $nonemptyReviewBodies.Count } else { $null }
		reviews = $reviewRecords
		commits_complete = $commits.complete
		commits = $commitRecords
		timeline_complete = $timeline.complete
		timeline = $timelineRecords
		code_notify_history_complete = $historyComplete
		code_notify_history = $codeNotifyHistory
		enrichment_errors = @($errors)
		cache_reused = $false
	}

	Add-Content -LiteralPath $outputPath -Value ($record | ConvertTo-Json -Depth 12 -Compress) -Encoding UTF8
	Write-Progress -Activity 'Enriching GitHub notifications' -Status "$index of $($notifications.Count)" -PercentComplete (($index / [Math]::Max(1, $notifications.Count)) * 100)
}

Write-Progress -Activity 'Enriching GitHub notifications' -Completed
Write-Output "me: $me"
Write-Output "notifications: $($notifications.Count)"
Write-Output "output: $outputPath"
