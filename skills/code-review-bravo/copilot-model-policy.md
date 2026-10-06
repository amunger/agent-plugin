# Copilot-only model routing

This policy applies to Bravo and Charlie: every specialist, holistic Alpha reviewer, advisory consolidator, and the current top-level synthesis agent must use a model provided through GitHub Copilot. Never use bring-your-own-key (BYOK), direct vendor API, custom endpoint, or another non-Copilot provider for these workflows.

## Use built-in delegation without a provenance approval gate

For a review requested in VS Code Copilot or Copilot CLI, use the current session's built-in general-purpose task/subagent tool. Do not create an external provider, start a separate vendor client, or switch to another session provider. Bravo uses configured subagent defaults subject to applicable instructions; Charlie selects its model mix through that same built-in tool.

Inspect provider information when the host already exposes it. If a model entry is explicitly labeled BYOK, custom endpoint, or non-Copilot, reject it. When the picker exposes multiple provider routes for the same model, choose the Copilot entry, not the external entry.

If the built-in tool exposes only model IDs or configured defaults, proceed through that tool without asking the user for provider attestation. Missing provider metadata, an absent provider-pin argument, or unknown automatic fallback behavior is not by itself a reason to block normal built-in delegation. This is an accepted host-routing assumption, not proof of the underlying provider; do not claim otherwise.

Known BYOK configuration is still a blocker. If the current session or a delegated route is reported as BYOK or non-Copilot, stop before sending it further review context and explain the concrete conflict. Do not ask for permission to bypass this policy or offer BYOK as a fallback.

## Concrete CLI and SDK checks

- The installed CLI's `copilot help providers` documents that `COPILOT_PROVIDER_BASE_URL` activates BYOK. For a new standalone CLI process launched by the workflow, check whether that variable is set in the process's actual launch environment, without printing its value; do not launch the review in BYOK mode. Prefer built-in delegation instead of introducing a new CLI process.
- The [SDK BYOK documentation](https://github.com/github/copilot-sdk/blob/main/docs/auth/byok.md) shows custom provider routing through session `provider` configuration, including a required `baseUrl`. Do not supply custom provider configuration or register external model routes when creating review sessions. If exposed session configuration identifies such a route, reject it.
- A shell subprocess's environment does not establish the running VS Code/SDK host's environment or session configuration. Do not use an empty shell variable as proof of the parent or all subagents' routing.
- Model names and session IDs do not prove provider identity. Do not read API keys, inspect secret stores, probe unrelated process internals, or invent an attestation API.
- Apply the same rules to explicit model choices, substitutions, retries, and any fallback the workflow itself controls. Preserve the current top-level agent; if it is known to be non-Copilot, explain that the review must run in a Copilot session rather than trying to switch it.

## Prefer the highest available version

When choosing a concrete delegated model, default to the highest available version within the selected model family and tier through the built-in Copilot route described above. Resolve availability for the current account and host at review time, not from remembered model IDs or stale examples.

- Compare versions numerically using host version metadata where available, not lexicographic sorting of names. For example, prefer Opus 5.5 over Opus 4.8 if both are available through Copilot.
- Keep the chosen family and tier: Opus versions compete with Opus, Sonnet with Sonnet, and the chosen Gemini tier with that tier. Do not compare version numbers across vendors or replace model-family diversity with one newest model.
- Explicit user version pins and applicable host model-selection restrictions take precedence. In Bravo, preserve configured subagent preferences unless version selection is authorized; these suggestions do not authorize otherwise prohibited overrides.
- Do not choose an older version merely because it was used previously or appears in an example. Use an older version only for an explicit pin, supported routing limitation, or documented compatibility/capability constraint, and disclose why.
- If available versions cannot be ordered reliably, use authoritative host information or ask for clarification instead of inventing a version ranking. The no-BYOK routing rules apply regardless of version.
- Apply this preference to specialist, Alpha, and consolidator slots. The current top-level model remains unchanged; do not attempt to upgrade or replace the lead.

## Execution and reporting

Run the complete workflow without a separate routing confirmation when built-in delegation is available and no known BYOK conflict exists. Do not substitute a direct single-agent review for Bravo's specialists and consolidator merely because provider metadata is absent.

Record the model selection and provider information when available. Distinguish explicit Copilot metadata from use of built-in delegation whose provider is not exposed. If execution reports a non-Copilot route, stop further delegation and report that unexpected routing and any partial execution.

This policy prohibits intentional or known BYOK use; it is not a programmatic routing lock. Hidden provider configuration and fallback remain the host's responsibility. Missing metadata does not block built-in delegation, but it also does not establish an independently verified Copilot-only guarantee.
