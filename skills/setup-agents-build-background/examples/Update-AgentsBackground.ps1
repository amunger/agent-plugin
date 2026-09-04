[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$settingsPath = Join-Path $env:APPDATA "Code - Insiders\User\settings.json"
$installRoot = Join-Path $env:LOCALAPPDATA "Programs\Microsoft VS Code Insiders"
$cliPath = Join-Path $installRoot "bin\code-insiders.cmd"
$outputDirectory = "Q:\artifacts\backimg"
$backgroundSetting = "chat.agentSessions.preferredDarkBackgroundImage"
$devbox = "cp1"

function ConvertTo-XmlText {
    param([Parameter(Mandatory)][string]$Value)

    return [System.Security.SecurityElement]::Escape($Value)
}

$mutex = [Threading.Mutex]::new($false, "Local\AgentsBuildBackground")
$lockAcquired = $false
try {
    try {
        $lockAcquired = $mutex.WaitOne([TimeSpan]::FromSeconds(30))
    } catch [Threading.AbandonedMutexException] {
        $lockAcquired = $true
    }
    if (-not $lockAcquired) {
        throw "Timed out waiting for another background update to finish."
    }

    if (-not (Test-Path -LiteralPath $settingsPath -PathType Leaf)) {
        throw "VS Code Insiders settings not found: $settingsPath"
    }
    if (-not (Test-Path -LiteralPath $cliPath -PathType Leaf)) {
        throw "VS Code Insiders CLI not found: $cliPath"
    }

    $activeVersion = @(& $cliPath --version)
    if ($LASTEXITCODE -ne 0 -or $activeVersion.Count -lt 2) {
        throw "Unable to determine the active VS Code Insiders commit from $cliPath"
    }
    $activeCommit = [string]$activeVersion[1]

    $appCandidates = Get-ChildItem -LiteralPath $installRoot -Directory |
        Where-Object {
            Test-Path -LiteralPath (Join-Path $_.FullName "resources\app\product.json")
        } |
        ForEach-Object {
            $appRoot = Join-Path $_.FullName "resources\app"
            $product = Get-Content -Raw -LiteralPath (Join-Path $appRoot "product.json") |
                ConvertFrom-Json
            [pscustomobject]@{
                AppRoot = $appRoot
                Product = $product
                BuildDate = [datetime]$product.date
            }
        } |
        Sort-Object BuildDate -Descending

    $currentApp = $appCandidates |
        Where-Object { [string]$_.Product.commit -eq $activeCommit } |
        Select-Object -First 1
    if ($null -eq $currentApp) {
        throw "The active VS Code Insiders commit $activeCommit was not found under $installRoot"
    }

    $appPackage = Get-Content -Raw -LiteralPath (Join-Path $currentApp.AppRoot "package.json") |
        ConvertFrom-Json
    $copilotVersion = $appPackage.dependencies.'@github/copilot'
    if ([string]::IsNullOrWhiteSpace($copilotVersion)) {
        throw "The installed Copilot version was not found in the VS Code package metadata."
    }
    $copilotSdkVersion = $appPackage.dependencies.'@github/copilot-sdk'
    if ([string]::IsNullOrWhiteSpace($copilotSdkVersion)) {
        throw "The installed Copilot SDK version was not found in the VS Code package metadata."
    }
    $settingsText = Get-Content -Raw -LiteralPath $settingsPath
    $updateModeMatch = [regex]::Match(
        $settingsText,
        '"update\.mode"\s*:\s*"(?<mode>[^"]+)"'
    )
    $updateMode = if ($updateModeMatch.Success) {
        $updateModeMatch.Groups["mode"].Value
    } else {
        "default"
    }

    $version = ConvertTo-XmlText ([string]$appPackage.version)
    $copilotVersion = ConvertTo-XmlText ([string]$copilotVersion)
    $sdkVersion = ConvertTo-XmlText ([string]$copilotSdkVersion)
    $mode = ConvertTo-XmlText $updateMode.ToUpperInvariant()
    $modeColor = if ($updateMode -eq "default") {
        "#71ff8d"
    } else {
        "#ffad42"
    }
    $buildDate = ConvertTo-XmlText $currentApp.BuildDate.ToString("MMM d, yyyy h:mm tt")
    $updatedAt = ConvertTo-XmlText (Get-Date).ToString("MMM d, yyyy h:mm tt")
    $commit = [string]$currentApp.Product.commit
    $shortCommit = ConvertTo-XmlText $commit.Substring(0, [math]::Min(10, $commit.Length))
    $devboxText = ConvertTo-XmlText $devbox

    $svg = @"
<svg xmlns="http://www.w3.org/2000/svg" width="220" height="253" viewBox="0 0 220 253">
  <defs>
    <radialGradient id="screen" cx="50%" cy="45%" r="75%">
      <stop offset="0" stop-color="#08230f"/>
      <stop offset="0.72" stop-color="#031308"/>
      <stop offset="1" stop-color="#010704"/>
    </radialGradient>
    <linearGradient id="scanlines" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#000" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#000" stop-opacity="0.2"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.2"/>
    </linearGradient>
    <pattern id="scanlinePattern" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="4" height="4" fill="url(#scanlines)"/>
    </pattern>
    <filter id="phosphorGlow" x="-20%" y="-30%" width="140%" height="160%">
      <feGaussianBlur stdDeviation="1.1" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect x="1" y="1" width="218" height="251" rx="9" fill="#020503" stroke="#174d25" stroke-width="2"/>
  <rect x="6" y="6" width="208" height="241" rx="5" fill="url(#screen)"/>
  <g fill="#71ff8d" font-family="Cascadia Mono, Consolas, monospace" filter="url(#phosphorGlow)">
    <text x="17" y="23" font-size="12" letter-spacing="2">DEVBOX</text>
    <text x="16" y="48" font-size="24" font-weight="700" letter-spacing="1.5">$($devboxText.ToUpperInvariant())</text>
    <line x1="17" y1="56" x2="203" y2="56" stroke="#71ff8d" stroke-width="1" opacity="0.65"/>
    <g font-size="12.5">
      <text x="17" y="79">&gt; <tspan fill="$modeColor">$mode</tspan> update mode</text>
      <text x="17" y="101">&gt; VS CODE</text>
      <text x="29" y="119">$version</text>
      <text x="17" y="140">&gt; $shortCommit</text>
      <text x="17" y="161" font-size="11.5">&gt; $buildDate</text>
      <text x="17" y="188">&gt; copilot: $copilotVersion</text>
      <text x="17" y="209">&gt; copilot-sdk:</text>
      <text x="29" y="227">$sdkVersion</text>
    </g>
    <text x="203" y="242" text-anchor="end" font-size="9" opacity="0.65">updated $updatedAt</text>
  </g>
  <rect x="6" y="6" width="208" height="241" rx="5" fill="url(#scanlinePattern)" pointer-events="none"/>
</svg>
"@

    [IO.Directory]::CreateDirectory($outputDirectory) | Out-Null
    $outputId = (Get-Date).ToString("yyyyMMdd-HHmmssfff")
    $outputPath = Join-Path $outputDirectory "agents-build-background-$outputId.svg"
    [IO.File]::WriteAllText(
        $outputPath,
        $svg,
        [Text.UTF8Encoding]::new($false)
    )

    $outputUri = ([Uri]$outputPath).AbsoluteUri
    $settingPattern = [regex]::new(
        '("' + [regex]::Escape($backgroundSetting) + '"\s*:\s*)"(?:\\.|[^"\\])*"'
    )
    if (-not $settingPattern.IsMatch($settingsText)) {
        throw "The $backgroundSetting setting was not found in $settingsPath"
    }

    $updatedSettings = $settingPattern.Replace(
        $settingsText,
        {
            param($match)
            return $match.Groups[1].Value + '"' + $outputUri + '"'
        },
        1
    )
    $temporarySettingsPath = "$settingsPath.agents-background.tmp"
    [IO.File]::WriteAllText(
        $temporarySettingsPath,
        $updatedSettings,
        [Text.UTF8Encoding]::new($false)
    )
    Move-Item -LiteralPath $temporarySettingsPath -Destination $settingsPath -Force

    Get-ChildItem -LiteralPath $outputDirectory -Filter "agents-build-background-*.svg" |
        Where-Object FullName -ne $outputPath |
        Remove-Item -Force
} finally {
    if ($lockAcquired) {
        $mutex.ReleaseMutex()
    }
    $mutex.Dispose()
}
