---
name: code-review-performance
description: Review concrete time, memory, I/O, startup, concurrency, and scaling effects.
user-invocable: true
---

# Performance and scale review

Review the complete change. Your question is: does it become materially worse under a plausible workload?

When invoked directly, establish the change scope from the current session or a supplied pull request. Inspect the complete diff, relevant surrounding code, tests, repository instructions, and pull request context. When delegated, use the supplied context and inspect anything needed to validate your findings.

## Review principles

- Identify changed hot paths, startup paths, streaming paths, and repeated background work.
- Analyze time, memory, I/O, network, serialization, and concurrency effects.
- Check algorithmic growth against realistic input sizes.
- Inspect caching, batching, fan-out, polling, retry, pagination, and backpressure.
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
- A supposed singleton is constructed once per connection.

## Output

Return only evidence-based, actionable findings. For each finding include severity, file and line, concrete impact, triggering workload, smallest appropriate fix, and evidence. If no significant performance findings remain, say so directly. Do not modify code or submit a review.
