# Copilot-only model routing

This policy applies to Bravo and Charlie: every specialist, holistic Alpha reviewer, advisory consolidator, and the current top-level synthesis agent must use a model provided through GitHub Copilot. Never use bring-your-own-key (BYOK), direct vendor API, custom endpoint, or another non-Copilot provider for these workflows.

## Verify before sending review context

- Verify the current top-level agent's provider and every delegated route using authoritative host provider metadata or a documented Copilot-only execution path.
- Model family, display name, model ID, and availability in a model picker do not prove Copilot provenance. A GPT, Claude, or Gemini model can be offered through Copilot or a BYOK provider.
- Resolve provider identity together with model identity. If the same model appears under multiple providers, select only the verified GitHub Copilot route. An ambiguous unqualified ID is not sufficient unless the host guarantees it resolves through Copilot.
- Configured defaults, explicit model choices, substitutions, retries, and failover routes must satisfy this policy. Never retain a default merely because the provider cannot be inspected.
- Do not read API keys, inspect secret stores, configure external providers, or use vendor credentials to establish availability.
- If the top-level agent is non-Copilot or its provider cannot be verified, stop before launching reviewers. Explain that the user must run the workflow in a verified Copilot session; do not attempt to switch the current agent's provider.
- If any delegated route is non-Copilot, ambiguous, or unverifiable, do not send it the diff or other review context. Report the routing limitation and request a supported Copilot-only route. Do not offer BYOK as a fallback.

## Prefer the highest available version

When choosing a concrete delegated model, default to the highest available version within the selected model family and tier on verified GitHub Copilot routes. Resolve availability for the current account and host at review time, not from remembered model IDs or stale examples.

- Compare versions numerically using host version metadata where available, not lexicographic sorting of names. For example, prefer Opus 5.5 over Opus 4.8 if both are available through Copilot.
- Keep the chosen family and tier: Opus versions compete with Opus, Sonnet with Sonnet, and the chosen Gemini tier with that tier. Do not compare version numbers across vendors or replace model-family diversity with one newest model.
- Explicit user version pins and applicable host model-selection restrictions take precedence. In Bravo, preserve configured subagent preferences unless version selection is authorized; these suggestions do not authorize otherwise prohibited overrides.
- Do not choose an older version merely because it was used previously or appears in an example. Use an older version only for an explicit pin, supported routing limitation, or documented compatibility/capability constraint, and disclose why.
- If available versions cannot be ordered reliably, use authoritative host information or ask for clarification instead of inventing a version ranking. Copilot-only provenance remains mandatory regardless of version.
- Apply this preference to specialist, Alpha, and consolidator slots. The current top-level model remains unchanged; do not attempt to upgrade or replace the lead.

## Execution and reporting

Preserve the verified Copilot provider when selecting concrete models. If the host cannot pin the provider or guarantee that automatic fallback remains within Copilot, treat the route as unsupported and stop before delegation.

Record verified provider provenance for each slot alongside model coverage. If execution metadata contradicts the verified route, stop further delegation and report the unexpected provider use explicitly; do not claim compliance or conceal partial execution.

This is a mandatory workflow instruction, not a programmatic routing lock. Do not claim runtime enforcement unless the host actually supplies and applies a Copilot-only provider constraint. Unknown provenance is a blocker, not permission to proceed.
