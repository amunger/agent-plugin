---
description: 'TypeScript coding conventions and best practices'
applyTo: '**/*.ts,**/*.tsx,**/tsconfig*.json'
---

# TypeScript Coding Conventions and Best Practices

Follow modern, idiomatic TypeScript while respecting the repository's existing architecture, compiler configuration, style, and testing conventions.

## General Instructions

- Prioritize correctness, readability, maintainability, and type safety.
- Keep strict compiler checks enabled. Do not weaken `tsconfig.json` to bypass an error.
- Prefer the narrowest useful types and let TypeScript infer local types when the result remains clear.
- Add explicit parameter and return types at public or exported API boundaries.
- Reuse existing project utilities, types, and patterns before adding new abstractions or dependencies.
- Keep modules and functions focused. Split code when responsibilities or control flow become difficult to follow.
- Avoid speculative abstractions and premature optimization.
- Ensure changed code compiles without warnings or type errors.

## Type Safety

- Do not use `any` unless an external boundary makes it unavoidable and the reason is documented.
- Use `unknown` for untrusted values and narrow it with type guards, schema validation, or runtime checks.
- Avoid unchecked type assertions. Prefer modeling the data accurately or validating it before use.
- Use discriminated unions for related states and make switches exhaustive.
- Use `interface` for extensible object contracts and `type` for unions, intersections, mapped types, and conditional types.
- Prefer `readonly`, `ReadonlyArray<T>`, and immutable updates when mutation is not required.
- Represent optional and nullable values deliberately; do not use non-null assertions to hide missing validation.
- Use `satisfies` when validating an expression against a type while preserving its inferred literal types.
- Use generic constraints that express the operations a generic implementation actually requires.

## Patterns to Follow

- Prefer `const`; use `let` only when reassignment is required.
- Use `async` and `await` for asynchronous control flow.
- Handle promises explicitly. Await them, return them, or intentionally mark fire-and-forget work according to project conventions.
- Treat caught errors as `unknown` and narrow them before reading properties.
- Propagate failures with useful context rather than returning success-shaped fallbacks.
- Use optional chaining and nullish coalescing only when absence is an expected state.
- Use type-only imports when required by the project's module and lint configuration.
- Dispose event listeners, subscriptions, timers, and other resources through the project's lifecycle abstractions.
- Keep side effects at clear boundaries and keep domain logic independently testable.

## Patterns to Avoid

- Do not suppress errors with `@ts-ignore`; fix the type issue or use a narrowly documented `@ts-expect-error` when testing an intentional error.
- Avoid broad casts such as `as any` or chained casts through `unknown`.
- Avoid Boolean parameters when a named options object or union would communicate intent more clearly.
- Avoid deeply nested conditionals; use early validation, helper functions, or exhaustive switches.
- Avoid floating promises and empty or overly broad catch blocks.
- Avoid global mutable state and hidden cross-module side effects.
- Avoid duplicating types that can be derived with indexed access, utility, mapped, or conditional types.
- Do not add barrel exports unless the repository already uses them and the dependency implications are understood.

## API Design

- Make invalid states difficult to represent.
- Prefer stable, intention-revealing names over abbreviations.
- Keep exported surfaces minimal; do not export implementation details without a consumer.
- Use options objects for functions with several optional or same-typed arguments.
- Preserve backward compatibility unless the task explicitly calls for a breaking change.
- Validate data at I/O, network, persistence, and extension boundaries.
- Document non-obvious invariants, error behavior, ownership, and lifecycle requirements.

## Testing and Validation

- Add or update tests for changed behavior, edge cases, and failure paths.
- Prefer behavioral assertions over implementation-detail assertions.
- Use the repository's existing test framework, mocks, fixtures, and teardown patterns.
- Run the smallest existing formatter, linter, type check, and test commands that cover the change.
- Do not add new validation tools when the repository already provides suitable commands.

## Quality Checklist

Before completing TypeScript work, ensure:

- [ ] No compiler strictness was weakened
- [ ] Untrusted values are validated or narrowed from `unknown`
- [ ] Public APIs have clear and accurate types
- [ ] Promises and disposable resources have explicit lifecycles
- [ ] Errors are surfaced with useful context
- [ ] Tests cover the changed behavior
- [ ] Targeted formatting, linting, type checking, and tests pass
