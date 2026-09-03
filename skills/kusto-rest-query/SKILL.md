---
name: kusto-rest-query
description: Run Azure Data Explorer Kusto queries directly through the REST API with Azure CLI authentication, especially when a Kusto chat tool is unavailable. Covers authentication requirements, safe PowerShell execution, result extraction, and diagnostics for token, network, permission, and query failures.
user-invocable: true
---

# Kusto REST Query

Use this skill to execute KQL directly against Azure Data Explorer when an integrated Kusto query tool is unavailable or when its authentication needs to be diagnosed.

Prefer an available first-party Kusto query tool. Use this REST workflow as a fallback or diagnostic path. Never print, persist, or include bearer tokens in chat output.

## Requirements

- PowerShell 7 (`pwsh`) and Azure CLI (`az`) are installed.
- The user has data access to the target cluster and database.
- The user is signed into the tenant that owns or grants access to the cluster.
- Any required corporate VPN, compliant-device, or Conditional Access requirement is satisfied.
- The token audience is Azure Data Explorer: `https://kusto.kusto.windows.net`.

For a tenant-specific login, use:

```powershell
az login --tenant '<tenant-id>' --scope 'https://kusto.kusto.windows.net/.default'
```

Do not run `az logout` without user approval because it removes existing Azure CLI sessions. If the current account is wrong, ask the user to authenticate in another shell or use `az login` with the required tenant.

## Execute a Query

Set the connection values and KQL separately from the request. Keep the time filter near the start of queries over large telemetry tables.

```powershell
$cluster = 'https://<cluster-name>.kusto.windows.net'
$database = '<database-name>'
$tenantId = '<tenant-id>'

$query = @"
let Start = ago(2d);
MyTable
| where Timestamp >= Start
| summarize Rows=count() by Category
| order by Rows desc
"@

$token = az account get-access-token `
    --tenant $tenantId `
    --resource 'https://kusto.kusto.windows.net' `
    --query accessToken `
    --output tsv

if (-not $token) {
    throw 'Azure CLI did not return a Kusto access token.'
}

$body = @{
    db = $database
    csl = $query
    properties = '{}'
} | ConvertTo-Json -Compress

$response = Invoke-RestMethod `
    -Method Post `
    -Uri "$cluster/v2/rest/query" `
    -Headers @{
        Authorization = "Bearer $token"
        Accept = 'application/json'
        'x-ms-client-version' = 'PowerShellKustoRest/1.0'
    } `
    -ContentType 'application/json; charset=utf-8' `
    -Body $body

$primaryResult = $response | Where-Object {
    $_.FrameType -eq 'DataTable' -and $_.TableKind -eq 'PrimaryResult'
}

if (-not $primaryResult) {
    throw 'Kusto response did not contain a primary result table.'
}

$columns = @($primaryResult.Columns | ForEach-Object ColumnName)
$rows = $primaryResult.Rows | ForEach-Object {
    $row = [ordered]@{}
    for ($index = 0; $index -lt $columns.Count; $index++) {
        $row[$columns[$index]] = $_[$index]
    }
    [pscustomobject]$row
}

$rows | Format-Table -AutoSize
```

The `/v2/rest/query` endpoint returns framed JSON. Select the `DataTable` frame whose `TableKind` is `PrimaryResult` and map its positional row arrays through `Columns`.

For automation, return or serialize `$rows`, not formatted table text. Save raw responses only to an approved local artifact path, and ensure they contain no sensitive query results before sharing them.

## Diagnostics

Run the narrowest relevant diagnostic. Do not repeatedly retry an authentication failure with the same token.

### Confirm the active Azure account and tenant

```powershell
az account show --query '{name:name, tenantId:tenantId, user:user.name}' --output table
az account list --query '[].{name:name, tenantId:tenantId, isDefault:isDefault}' --output table
```

If the required tenant is absent, authenticate with `az login --tenant '<tenant-id>' --scope 'https://kusto.kusto.windows.net/.default'`.

### Verify token issuance without exposing the token

```powershell
$token = az account get-access-token `
    --tenant '<tenant-id>' `
    --resource 'https://kusto.kusto.windows.net' `
    --query accessToken `
    --output tsv

if ($token) { 'Kusto token acquired.' } else { 'No Kusto token returned.' }
```

`AADSTS53003` means Conditional Access blocked token issuance. Check the required VPN, device compliance, account, tenant, and sign-in policy. Do not work around the policy.

### Check DNS and HTTPS reachability

```powershell
$clusterHost = '<cluster-name>.kusto.windows.net'
Resolve-DnsName $clusterHost
Test-NetConnection $clusterHost -Port 443
```

A successful network check does not prove authentication or database authorization; it only isolates DNS and transport failures.

### Probe authentication and database access

Use the normal execution script with a minimal `print CurrentTime=now()` query. Then try `.show database schema` to confirm metadata access; it can be more restricted than the basic probe.

### Preserve useful HTTP error details

```powershell
try {
    # Invoke-RestMethod call
} catch {
    $statusCode = [int]$_.Exception.Response.StatusCode
    $details = $_.ErrorDetails.Message
    throw "Kusto request failed with HTTP $statusCode. $details"
}
```

| Symptom | Likely cause | Next step |
| --- | --- | --- |
| Token command fails with `AADSTS53003` | Conditional Access | Connect the required VPN, verify device compliance, and sign in to the correct tenant. |
| HTTP 401 | Missing, stale, wrong-tenant, or wrong-audience token | Acquire a fresh token for `https://kusto.kusto.windows.net` in the cluster's tenant. |
| HTTP 403 | Identity authenticated but lacks cluster/database permission | Ask the cluster administrator to verify viewer/database access. |
| HTTP 404 | Incorrect cluster URL or REST path | Use the canonical cluster URL and `/v2/rest/query`. |
| HTTP 429 | Query throttling | Reduce query cost and retry after the server-specified delay. |
| HTTP 5xx | Service or gateway failure | Retry once after checking Azure Data Explorer status; preserve the request/activity ID. |
| No `PrimaryResult` frame | Query failure or unexpected response mode | Inspect non-primary frames and query status without exposing sensitive row data. |
| Query times out | Expensive scan or unavailable network path | Narrow time and event filters, project only needed columns, then retry. |

## Query Troubleshooting

- Start exploration with a one-day window and `sample` or `take` to inspect shape.
- Use the table's ingestion/server timestamp for reliable time filtering.
- Verify property-bag keys with `bag_keys()` rather than assuming source-code casing.
- A missing dynamic property converts to null. Therefore, `countif(not(tobool(Properties['flag'])))` does not count missing values.
- Make nulls explicit when partitioning rows:

```kusto
| summarize
    Rows=count(),
    TrueRows=countif(Flag == true),
    FalseRows=countif(Flag == false),
    MissingOrInvalidRows=countif(isnull(Flag))
```

- If a new event or property is absent from a classified table, check the corresponding unclassified table when policy and access permit. Unclassified data commonly has shorter retention.
- Stop after three failed attempts that repeat the same class of failure. Report the exact stage, status code or AAD error, cluster/database, and diagnostics already completed.

## Reporting Results

Always report the cluster and database, exact KQL, time window and boundary semantics, returned aggregates or concise sample, and any null, sampling, retention, or classification caveats.

Never report a query as successful unless a primary result table was returned.
