# Performance and scale review

Review the complete change. Your question is: does it become materially worse under a plausible workload?

Use the supplied context and inspect anything needed to validate your findings.

## Review principles

- Identify changed hot paths, startup paths, streaming paths, and repeated background work.
- Analyze time, memory, I/O, network, serialization, and concurrency effects.
- Check algorithmic growth against realistic input sizes.
- Inspect caching, batching, fan-out, polling, retry, pagination, and backpressure.
- Inspect every newly added or changed external call, including HTTP requests, RPCs, subprocesses, and remote storage operations. Trace what waits for it and what resources remain held while it is outstanding.
- Consider worst-case latency and failure: connection or response timeout, a stalled response body, and an operation that never settles. State the effect on user-visible completion, startup, queues, concurrency slots, locks, memory, and shutdown where relevant, even for one call.
- Verify whether the actual client and call path impose an end-to-end bound, whether cancellation reaches the underlying operation, and whether retries or nested calls multiply the total wait. A configured timeout or a race that stops awaiting is not proof that the underlying work stops or its resources are released.
- Determine whether the impact can be capped with an existing deadline, cancellation mechanism, retry budget, concurrency limit, or isolation boundary. Recommend a coherent bounding strategy that addresses the cause and explain its scope and behavioral tradeoffs; do not invent a timeout value or change an existing value without user approval.
- Check whether composition changes eagerly create expensive or unused services.
- Look for unbounded collections, queues, event listeners, retained state, and task creation.
- Examine lock contention and concurrency limits where applicable.
- State the workload, input size, duration, or operating mode needed to trigger the problem.
- Prefer measurements or concrete operation counts when available.
- Do not report speculative micro-optimizations or generic opportunities to cache.

This reviewer should often return no findings.

## Examples

- Quiet mode eagerly starts provider infrastructure it never uses.
- An indexed lookup becomes a scan for every streamed event.
- A cache has no eviction when sessions close.
- Retry fan-out multiplies requests across providers.
- A new HTTP call gates startup indefinitely because no end-to-end deadline covers reading the response body.
- A timed-out caller leaves the underlying request running and holding a concurrency slot, so repeated calls exhaust the pool.
- A supposed singleton is constructed once per connection.

## Output

Return only evidence-based, actionable findings. For each finding include severity, file and line, concrete impact, triggering workload, an appropriate root-cause fix with scope and tradeoffs, and evidence. If no significant performance findings remain, say so directly. Do not modify code or submit a review.
