---
name: use-dbgjs-for-inspecting-running-javascript
description: Use dbgjs for inspecting, debugging, profiling, or automating a running VS Code, Electron, browser, or Node.js process. Use it to discover and attach to targets, evaluate JavaScript, inspect page state and console output, interact with UI elements, capture screenshots, collect coverage or CPU profiles, and take heap snapshots.
user-invocable: true
---

# Use dbgjs for Inspecting Running JavaScript Applications

Use `@hediet/dbgjs` as the primary tool for inspecting and controlling running
VS Code, Electron, browser, and Node.js processes through the Chrome DevTools
Protocol.

Before using it, consult the upstream repository for the current installation
instructions, command syntax, examples, targeting model, and limitations:

https://github.com/hediet/dbgjs

Prefer the upstream documentation over remembered command syntax because the
package and CLI may change.

Typical tasks include:

- discovering and attaching to running processes or renderer targets;
- evaluating JavaScript in a selected target;
- inspecting page content and console output;
- interacting with UI elements;
- taking screenshots;
- collecting code coverage and CPU profiles;
- capturing V8 heap snapshots; and
- debugging VS Code or Electron windows.

Operate on the narrowest relevant target. Begin with read-only inspection, avoid
changing application state unless the user requests it, and report where any
generated captures are saved.

If the CLI is unavailable, use the installation command currently documented by
the upstream repository. Confirm with the user before installing or changing a
global package.
