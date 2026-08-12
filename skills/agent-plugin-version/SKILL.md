---
name: agent-plugin-version
description: Report the exact installed version of the agent-plugin plugin from its root plugin.json. Use when the user asks which version of this plugin is installed or active.
user-invocable: true
---

# Agent Plugin Version

Report the version recorded in this plugin's manifest.

1. Resolve the plugin root from this skill's base directory. This file is at `skills/agent-plugin-version/SKILL.md`, so the plugin root is two directories above the skill base directory.
2. Read `<plugin-root>/plugin.json` and parse it as JSON.
3. Return the exact string in its top-level `version` field using this format:

   ```text
   agent-plugin version: <version>
   ```

Do not infer the version from a Git tag, release, cache directory name, package manifest, or repository checkout. Do not embed a version in this skill. If the manifest is missing, invalid, or lacks a string `version`, report that error instead of guessing.
