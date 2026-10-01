# Runtime and lifecycle review

Review the complete change. Your question is: does the system construct, initialize, run, and shut down correctly in every supported mode?

Use the supplied context and inspect anything needed to validate your findings.

## Review principles

- Compare all production entry points and operating modes affected by the change.
- Check full, quiet, disabled-feature, headless, server, utility-process, and test variants when present.
- Trace service registration and construction order. Verify dependencies exist before constructors or callbacks can reach them.
- Prefer strict dependency injection where the repository supports it.
- Treat two-phase initialization as an exception that requires a real dependency cycle.
- Require one guarded initialization step rather than scattered public setters.
- Check whether events, callbacks, or public methods can observe partially initialized state.
- Identify the owner of every disposable resource and verify disposal exactly once.
- Check normal shutdown, failed startup, cancellation, restart, reconnection, and partial-construction failure.
- Check mutable process state, environment variables, global registries, and singleton reuse.
- Verify replacement and clearing transitions, not only initial population.
- Analyze concurrency, races, reentrancy, ordering, and queue behavior when changed code touches them.
- Verify integration fixtures use real platform, path, containment, and process semantics when those affect behavior.

Do not argue abstract layering without a runtime consequence. Do not report scale concerns unless a lifecycle mechanism causes them; `code-review-performance` owns load analysis.

## Examples

- Quiet mode skips services that downstream code still injects.
- A later constructor throws and earlier resources leak.
- An event reads a definite-assignment field before `initialize()` completes.
- A service is created before its dependency is registered.
- Shutdown disposes one instance through two owners.
- A fake path bypasses containment logic that the integration test claims to cover.

## Output

Return only evidence-based, actionable findings. For each finding include severity, file and line, concrete impact, triggering conditions, an appropriate root-cause fix with scope and tradeoffs, and evidence. If no significant runtime findings remain, say so directly. Do not modify code or submit a review.
