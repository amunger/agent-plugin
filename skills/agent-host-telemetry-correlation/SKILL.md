---
name: agent-host-telemetry-correlation
description: Categorize and correlate Agent Host identifiers across VS Code and Copilot SDK runtime telemetry, including AHP, model-call, GitHub/Copilot service, and OpenTelemetry events. Use when joining events, explaining session/request/subagent IDs, or auditing new correlation telemetry.
---

# Agent Host Telemetry Correlation

Use this skill when tying together Agent Host events across telemetry pipelines or deciding which identifiers a new event should carry.

This guidance applies to both VS Code Agent Host telemetry and Copilot SDK runtime telemetry. Treat differences in event names and field casing across those pipelines as mappings to verify, not evidence that identifiers have the same or different meanings.

Do not infer identity from a field name alone. `sessionId` and `requestId` are overloaded across layers; establish the producer, scope, and value mapping before joining.

## Identity Hierarchy

The usual hierarchy is:

```text
device/account
  -> telemetry process
    -> Agent Host session
      -> chat
        -> request/turn
          -> tool call or SDK subagent
          -> model call
            -> provider/service request
```

OpenTelemetry adds a parallel `traceId -> spanId -> parentSpanId` hierarchy.

## Stable Meanings

| Scope | Fields commonly seen | Meaning and join guidance |
|---|---|---|
| Device | `common.devDeviceId`, `dev_device_id`, `client_deviceid` | Pseudonymous device identifier. Agent Host reuses the workbench's resolved ID when it is forwarded. This is not a chat or turn ID and should not be described as a definitive user ID. |
| Machine | `common.machineId`, `client_machineid` | Pseudonymous machine identifier. Like the device ID, it is a common property rather than an operation-level correlation key. |
| Copilot account | `copilot_tracking_id`, `copilot_trackingId`, `common.tid` | Copilot token `tid` claim. This is the closest account/user-level correlation key, but it is pipeline- and policy-dependent and may be absent. |
| Telemetry process | `sessionID`, `client_sessionid`, `common.vscodesessionid` | Generated when the telemetry service starts. In Agent Host telemetry it identifies a telemetry/process lifetime, not an Agent Host conversation. |
| Agent Host session | `agentSessionId`; often `conversationId` in compatible Copilot events | Raw provider session ID extracted from the Agent Host session URI. Join with `provider` unless the event contract guarantees global uniqueness. |
| Chat within a session | `chatSessionId` | Identifies the default chat, a peer chat, or a subagent chat within an Agent Host session. Treat it as nested under `agentSessionId`; a default-chat value or hash is not globally unique by itself. |
| Request/turn | `turnId`; sometimes `requestId`, `messageId`, `vscodeRequestId`, or `telemetryMessageId` | One request/response cycle. For workbench-originated Agent Host turns, the protocol `turnId` is the chat request's `requestId`. Queued, imported, and subagent turns can be host-generated. Only treat another field as an alias after verifying its emitter. |
| Tool invocation | `toolCallId` | One invocation of a tool. Do not confuse it with `toolId`, which usually names the tool definition. |
| Provider SDK session | `sdkSessionId`, `sdk_session_id`, sometimes SDK `session_id` | Provider SDK conversation/session. It often matches the default Agent Host session ID, but peer chats, forks, resumes, and provider implementations can make it differ. |
| Provider SDK event | `sdkEventId`, SDK event `id` | Unique event identifier. |
| SDK event chain | `sdkParentEventId`, SDK event `parentId` | The chronologically preceding event in the SDK session log. It is a linked-list predecessor, not necessarily a semantic parent operation. |
| SDK subagent | `sdkAgentId`, SDK event `agentId` | Stable provider-SDK subagent instance ID. It is absent for root-agent and session-level events. |
| Failure episode | `clientFailureId` | Correlates all detections, recovery outcome, and affected-turn events for one provider-client failure/recovery episode. |
| Individual telemetry event | `unique_id` | Fresh ID for one GitHub-shaped telemetry envelope. It addresses the event; it does not identify the enclosing turn or operation. |

## Model-Call Identifiers

A single Agent Host turn can make multiple model calls because of tool rounds, retries, compaction, subagents, or MCP sampling. Preserve both turn-level and model-call-level identifiers.

| Field | Exact scope |
|---|---|
| `model_call_id` / `modelCallId` | SDK-native model-call correlation identifier. |
| `clientRequestId` / `headerRequestId` | Client-minted `x-request-id`, when surfaced by the provider SDK. |
| `providerCallId` | GitHub/provider request tracing ID, normally `x-github-request-id`. Some raw SDK events call this `requestId`. |
| `serviceRequestId` | Copilot service request ID, normally `x-copilot-service-request-id`. |
| `apiCallId` | Provider completion/response identifier, such as an OpenAI-compatible completion ID. |
| `interactionId` / `interaction_id` | CAPI interaction ID connecting an assistant turn or message to upstream telemetry. |
| `engagementId` / `engagement_id` | Higher-level SDK engagement rollup. Do not assume it is one Agent Host turn. |

Do not equate these merely because they all describe a "request." If two event families use different names, verify whether the value is copied, translated, or independently generated.

## Subagent Correlation

There are two related subagent identities:

1. **AHP/UI subagent chat**: derived from the spawning `toolCallId`, represented internally as a subagent chat/session URI, and assigned its own Agent Host `turnId`.
2. **Provider SDK subagent**: represented by SDK `agentId`/telemetry `sdkAgentId`.

The provider's `subagent.started` event supplies the bridge between the SDK `agentId` and the spawning `toolCallId`. Nested subagents may additionally need the immediate parent tool-call relationship.

There is no universal provider-neutral `subagentId` field. An `isSubagentSession` boolean only identifies the category; it cannot identify which subagent ran. If an event must join to a particular subagent, carry an explicit subagent/chat identity or the documented `sdkAgentId <-> toolCallId` bridge.

## OpenTelemetry Correlation

Agent Host OTel uses:

- `traceId`: trace-wide identity
- `spanId`: one operation
- `parentSpanId`: semantic span parent
- `traceparent`/`tracestate`: cross-boundary propagation
- `gen_ai.conversation.id`: provider conversation/session identity
- `vscode.agent_host.session.uri`: Agent Host session anchor

The Agent Host creates a stable OTel parent context per provider session and scopes provider SDK operations under it. Use OTel IDs to join spans within that trace; use conversation/session attributes to bridge OTel to non-OTel events. Do not assume a standard telemetry event carries `traceId` unless the emitter explicitly adds it.

## Recommended Join Strategy

Start with the narrowest known ID and widen only as needed:

1. Identify the telemetry pipeline and event contract.
2. Restrict to the device/account when investigating one user's history.
3. Restrict to the telemetry process only when process lifecycle matters.
4. Join the Agent Host session with `provider + agentSessionId`.
5. Add `chatSessionId` when a session can contain peer or subagent chats.
6. Add `turnId` for a specific user request or host-generated turn.
7. Add `toolCallId` or `sdkAgentId` for a tool/subagent branch.
8. Add `sdkSessionId` and `sdkEventId` when crossing into SDK events.
9. Add the appropriate model/provider/service request ID for one inference call.
10. For OTel, use `traceId`/`spanId` and bridge through conversation/session attributes.

Prefer an exact tuple over a time-only join:

```text
provider + agentSessionId + chatSessionId + turnId
```

For Copilot SDK failures, extend it with:

```text
sdkSessionId + sdkAgentId? + sdkEventId + providerCallId? + serviceRequestId?
```

Use timestamps only to disambiguate candidates after matching stable IDs.

## Common Traps

- `sessionID` is a telemetry process session, not an Agent Host session.
- `conversationId` often aliases `agentSessionId`; it does not necessarily identify a nested chat.
- `chatSessionId` has had different shapes in older event families, including raw session IDs, full URIs, and telemetry-safe hashes. Inspect the emitter before joining across event names.
- A telemetry-safe hash is deterministic but may be scoped and collision-prone. Join it with its owning session, never alone.
- `requestId` may mean an Agent Host turn, SDK request, HTTP request, tool/input request, or JSON-RPC request.
- `parentId` on SDK events is chronological; `parentSpanId` in OTel is semantic.
- `toolId` and `toolCallId` are different.
- Root-agent SDK events intentionally have no `agentId`.
- Missing IDs should remain absent, not become `''`; empty values create false joins.
- Presence in source and tests proves emission intent, not production ingestion. Verify the telemetry backend separately before claiming data availability.

## How to Retrieve and Verify the Information

Use a source-first investigation. Do not begin with a name-based guess.

### 1. Find telemetry schemas

Search classified event definitions to learn the declared scope:

```text
rg -n "agentSessionId|chatSessionId|turnId|requestId|sdkSessionId|sdkAgentId|providerCallId|serviceRequestId" src/vs/platform/agentHost
```

Start with:

- `src/vs/platform/agentHost/node/agentHostTelemetryReporter.ts`
- provider-specific telemetry reporters under `src/vs/platform/agentHost/node/`
- workbench adapter telemetry under `src/vs/workbench/contrib/chat/browser/agentSessions/agentHost/`

Classification comments are useful documentation, but confirm them against the emitted value.

### 2. Follow each value to its producer

For every candidate ID:

1. Find the event emission.
2. Find the report object or callback feeding it.
3. Trace the value back to where it is generated or parsed.
4. Record whether it is copied, normalized, hashed, or independently generated.

Important producers include:

- `src/vs/platform/telemetry/common/commonProperties.ts`
- `src/vs/platform/agentHost/common/agentHostTelemetryEnv.ts`
- `src/vs/platform/agentHost/common/agentService.ts`
- `src/vs/platform/agentHost/common/state/sessionState.ts`
- `src/vs/platform/agentHost/node/agentHostTelemetryService.ts`
- `src/vs/platform/agentHost/node/agentHostRestrictedTelemetry.ts`

### 3. Inspect installed SDK types

Provider SDK generated declarations are the source of truth for event-envelope semantics and header mappings. For the Copilot SDK, inspect:

- `node_modules/@github/copilot-sdk/dist/generated/session-events.d.ts`
- `node_modules/@github/copilot-sdk/dist/generated/rpc.d.ts`
- `node_modules/@github/copilot-sdk/dist/copilotRequestHandler.d.ts`

Examples of facts that must come from these types:

- SDK event `id` is a UUID.
- SDK event `parentId` is the chronologically preceding event.
- SDK event `agentId` is absent for the root agent.
- `clientRequestId`, provider `requestId`, and `serviceRequestId` map to different HTTP headers.

Do not install or update the SDK merely to inspect it; use the version already resolved by the repository.

### 4. Inspect translation and forwarding layers

These files reveal aliases that schemas alone cannot:

- `src/vs/platform/agentHost/node/copilot/copilotGitHubTelemetryForwarder.ts`
- `src/vs/platform/agentHost/node/copilot/copilotAgentSession.ts`
- `src/vs/platform/agentHost/common/otel/agentHostOTelService.ts`
- `src/vs/platform/agentHost/node/otel/agentHostOTelService.ts`

For example, a forwarder may copy a notification's SDK session into both `session_id` and `sdk_session_id`, or translate SDK `requestId` into telemetry `providerCallId`.

### 5. Use tests as executable mappings

Search targeted tests for complete expected event objects:

```text
rg -n "agentHost\.turn|copilotModelCallFailure|copilotSdkSessionError|chatSessionId|sdkAgentId" src/vs/platform/agentHost/test
```

Tests are especially useful for proving:

- which aliases contain identical values
- whether IDs are optional
- how peer/subagent chats are represented
- whether empty upstream IDs are omitted

### 6. Audit relevant pull requests

When a PR introduces or consumes correlation fields, inspect its metadata, diff, tests, and review comments:

```text
gh pr view <number> --repo microsoft/vscode --json title,body,files,commits
gh pr diff <number> --repo microsoft/vscode
gh api repos/microsoft/vscode/pulls/<number>/comments --paginate
gh api repos/microsoft/vscode/issues/<number>/comments --paginate
```

Review comments often expose telemetry-cleaning, privacy, or empty-value problems not obvious from the happy-path implementation.

### 7. Verify production data separately

After source analysis establishes the intended contract, query the relevant telemetry backend to confirm:

- the event is ingested
- the field survives scrubbing
- optional IDs are populated at the expected rate
- aliases have the expected equality/cardinality
- joins do not collapse on empty or default values

Follow the repository's Kusto/telemetry instructions and use the telemetry data specialist when available. Clearly distinguish source/test verification from production verification.
