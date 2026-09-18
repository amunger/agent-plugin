# Agents Build Background

Keeps the VS Code Insiders Agents window background synchronized with the
active VS Code, bundled Copilot, and bundled Copilot SDK versions.

The extension checks the active build after startup and writes a new background
only when its displayed metadata changes or the configured image is missing.
Run **Agents: Refresh Build Background** to force a refresh.

The extension activates unconditionally because specialized Agents windows do
not consistently dispatch `onStartupFinished`. It records activation, metadata
checks, refresh decisions, updates, and failures in `activity.jsonl` under its
global storage. Run **Agents: Show Build Background Activity Log** to inspect
that durable log.

Its manifest enables the `agentsWindowActivation` proposal and declares
`capabilities.agentsWindow.supported`. VS Code excludes code-executing
extensions from Agents windows unless both declarations are present.

The installer also adds the extension to the application-scoped
`extensions.supportAgentsWindow` override. This is required by Insiders builds
that still filter locally packaged extensions after reading the manifest.

The `agentsBuildBackground.machineLabel` setting controls the single machine
name shown at the top of the background and defaults to `copilot+ laptop`.

The extension contributes the internal Agents background configuration keys so
the VS Code configuration API can update them even when the active build does
not expose their schemas to extension hosts. This keeps updates scoped to those
keys and avoids direct user-settings file replacement.

Generated images are stored under extension global storage, but the configured
background value is always converted with Node's `pathToFileURL` to a standard
Windows `file:///C:/...` URI. The Agents renderer does not display the
`vscode-userdata:` URI returned by the global-storage API or a URI whose drive
colon is encoded as `c%3A`.
