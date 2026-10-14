---
name: technical-explainer
description: Design and build evidence-backed technical explainers for complex systems. Use when creating an interactive HTML explainer, architecture walkthrough, worked lifecycle example, code execution trace, field reference, or standalone shareable artifact from source code, a PR, design docs, telemetry, logs, or observed behavior.
user-invocable: true
---

# Building Technical Explainers

Create explainers that connect:

1. what a user or external observer sees
2. what the implementation does
3. what state changes internally
4. what output or data is ultimately produced

The explainer must be an accurate projection of a verified implementation, not a
decorative restatement of a prompt.

## What this skill adds beyond prompting

A prompt can request a diagram or slideshow. This skill adds a repeatable
engineering workflow:

- refresh and inspect the source of truth before explaining it
- choose an explainer structure based on the reader's question
- keep behavior, code, state, and output synchronized
- represent uncertainty and semantic differences honestly
- separate source assets from the standalone artifact
- make every interaction keyboard and screen-reader accessible
- validate data, interactions, responsive layout, and artifact dependencies
- preserve prior artifacts unless the user explicitly asks to replace them

The primary value is not HTML boilerplate. It is preventing an attractive,
internally inconsistent explainer.

## When a skill is worthwhile

Use this skill when at least two of these are true:

- the system crosses several components or processes
- observable behavior differs from internal representation
- there are multiple flows, branches, providers, or lifecycle boundaries
- readers need to compare fields or outputs
- the implementation or PR is still changing
- the artifact will be shared beyond the current conversation
- accessibility and responsive behavior matter
- a text explanation alone has already proven difficult to follow

A skill is probably excessive for a one-off static diagram with one stable path
and no data semantics.

---

## Required workflow

### 1. Establish the source of truth

Do not build from memory or an earlier summary when current source is available.

1. Read the relevant design or migration documents.
2. Refresh the branch or PR without disturbing the user's worktree when possible.
3. Record the exact revision used by the explainer.
4. Inspect the implementation paths end to end.
5. Inspect tests for edge cases and intended invariants.
6. Inspect real observations, logs, telemetry, or examples when runtime behavior
   matters.
7. Compare the current implementation with any older explainer claims.

For a GitHub PR, prefer:

```powershell
gh pr view <number> --repo <owner/repo> --json headRefOid,headRefName,updatedAt,title,url,state
git fetch origin pull/<number>/head:refs/remotes/origin/pr-<number>
```

Read files from the fetched ref when switching branches would disrupt the
worktree:

```powershell
git show origin/pr-<number>:path/to/file.ts
```

Put the inspected revision in the explainer when source lines or signatures are
shown.

### 2. Write the explainer contract

Before choosing visuals, define:

- **Audience:** user, dashboard owner, reviewer, implementer, or maintainer
- **Question:** what should the reader understand or decide?
- **Perspective:** observable behavior, architecture, code execution, data
  contract, or comparison
- **Scope:** what is deliberately excluded?
- **Source revision:** which code state is represented?
- **Invariants:** facts that must remain true throughout the explainer
- **Illustrative data:** which values are examples rather than captured output?

Example:

```text
Audience: implementation reviewer
Question: where do two edit streams become one?
Perspective: code execution
Scope: long-term details only
Revision: PR head abc123
Invariants:
- one canonical entry per resource
- duplicate reloads add no transition
- one event per retained source row
```

### 3. Choose the explanatory structure

Use the reader's question to decide what leads.

| Reader's question | Primary structure | Supporting structure |
|---|---|---|
| What happens over time? | Worked example slideshow | Cumulative output table |
| Where does each part run? | Architecture diagram | Attached/headless or mode toggle |
| Which methods execute? | Debugger-style code trace | Compact architecture overview |
| What does each field mean? | Stable field reference | Applicability filters |
| Why do two systems report different values? | Same-input comparison | Measurement definitions |
| What branches or failure modes exist? | Selectable scenario trace | State/result panel |

Do not force every perspective into one visualization. Use coordinated tabs when
each perspective answers a different question.

### 4. Model the explanation as data

Keep scenario content outside renderer logic. The UI should render structured
data rather than embed scenario facts throughout DOM code.

Benefits:

- one fact changes in one place
- source and standalone artifacts use identical data
- tests can validate data independently of the browser
- alternate scenarios can reuse the same renderer
- accessibility text can derive from the same source

---

## Explainer structures

### A. Worked example slideshow

Use for connecting visible actions to state and emitted output.

Each slide should represent one **observable action**, not an arbitrary internal
phase:

- edit
- save
- commit
- switch branch
- open file
- close file
- accept completion

Show internal processing only when it directly explains the current result.

Recommended slide data:

```js
{
	title: 'Commit the unopened-file changes',
	action: 'Git commit',
	observed: 'The repository HEAD changes and closes Window 1.',
	document: ['<span class="source-agent">message: alpha beta</span>'],
	state: [
		['Window closed', 'Window 1'],
		['Trigger', 'hashChange'],
		['Events emitted now', '1 details row'],
	],
	emittedThrough: 1,
}
```

Recommended layout:

```text
fixed controls
progress

slide title + observable action

visible document       current state

cumulative events/output table
```

Rules:

- Keep Previous/Next controls outside changing-height content.
- Advance one observable action per slide.
- Keep the document, state panel, and output history synchronized.
- Show cumulative output when the timing of emission matters.
- If one operation emits multiple events, render multiple rows.
- Label illustrative identifiers as illustrative.

### B. Debugger-style code execution trace

Use when the reader wants to understand the implementation rather than the
product narrative.

The method signature must lead. A small "code location" footer is insufficient.

Recommended layout:

```text
┌ Call stack ─────┬ Current method ───────────┬ Frame data ───────┐
│ 01 listener     │ class.method              │ Arguments          │
│ 02 normalize    │ full signature            │ Return / next call │
│ 03 reconcile  → │ file.ts:217               │ State after frame  │
│ 04 project      │ highlighted source lines  │                    │
└─────────────────┴───────────────────────────┴────────────────────┘
```

Each frame should contain:

- class and method
- owning component
- full signature
- implementation file and line
- focused source excerpt
- highlighted relevant statements
- representative arguments
- return value or next call
- canonical state after the frame

Recommended data:

```js
{
	method: 'UnifiedDocumentReconciler.agentTransition',
	owner: 'Reconciler',
	file: 'src/.../unifiedDocumentReconciler.ts',
	line: 217,
	signature: `agentTransition(
	transition: IUnifiedDocumentAgentTransition<TSource>,
): IUnifiedDocumentReconcileResult<TSource>`,
	summary: 'Classify the candidate and append it when state connects.',
	excerptStart: 252,
	excerpt: [
		'if (this._model?.dirty) {',
		'\treturn this._result(\'skippedDirty\', changes);',
		'}',
		'changes.push(this._appendAgentTransition(transition));',
		'return this._result(\'applied\', changes);',
	],
	highlight: [0, 1, 3, 4],
	arguments: [
		['_content', '"before"'],
		['_model', 'undefined'],
	],
	returns: [
		['outcome', 'applied'],
		['changes', '[append]'],
	],
	state: [
		['transitions', '0 → 1'],
	],
}
```

Rules:

- Derive signatures and excerpts from the exact source revision.
- Use real method names; do not invent conceptual functions.
- Keep excerpts short enough to reveal the decision.
- Distinguish public calls, callbacks, helpers, and repeated invocations.
- Include important branches such as duplicate, conflict, dirty rejection, or
  coalescing—not only the happy path.
- Use explicit selectors when validating frame counts. Do not count generic
  `<li>` elements.

### C. Architecture diagram

Use for process boundaries, ownership, persistence, and alternate runtime modes.

Show:

- processes or runtime boundaries
- input evidence
- canonical state owner
- persistence path
- output path
- behavior with and without optional components

Prefer verbs on connections:

```text
Agent Host --writes--> disk
Agent Host --reports before/after--> workbench
model --observes reload--> reconciler
reconciler --publishes accepted transitions--> tracker
```

Use a mode toggle when the architecture meaningfully changes:

- attached vs. headless
- local vs. remote
- current vs. target

Do not mix a historical midpoint into a final-state architecture unless the
midpoint itself is the subject.

### D. Stable field reference

Use when readers need to compare what fields apply to different producers or
rows.

Keep the field list in a stable order. When a filter is selected:

- applicable fields remain enabled
- inapplicable fields remain visible but disabled
- disabled fields explain why they do not apply
- the details panel shows internal names only when useful

Recommended field data:

```js
{
	name: 'counts',
	appliesTo: ['agentHost', 'localChat', 'user', 'row'],
	where: 'Computed tracker measurements',
	meaning: 'Inserted activity, retained attribution, and retained total.',
	values: [
		'modifiedCount: retained attributed text',
		'deltaModifiedCount: attributed replacement new-text length',
		'totalModifiedCount: retained attributed text across sources',
	],
	example: 'The same semantic edit can differ when adapters supply different replacement geometry.',
}
```

Rules:

- Prefer a short top-level applicability taxonomy.
- Keep all fields visible for cross-comparison.
- Distinguish source identity fields from correlation context.
- Define measurement mechanics, not only friendly interpretations.
- Never hide a semantic shift behind matching field names.

### E. Same-input comparison

Use to explain parity gaps, adapters, providers, or modes.

Keep constant:

- semantic request
- input document
- lifecycle boundary
- output schema

Vary only the component under comparison.

Show:

```text
same semantic action
        │
  ┌─────┴─────┐
adapter A   adapter B
minimal     broad replacement
  │             │
counts A      counts B
```

Rules:

- State what is actually held constant.
- Explain the mechanism that causes the difference.
- Do not imply a difference is universal if it depends on a tool or adapter.
- Include a case where the variants converge.
- When possible, include measured live examples as well as a small pedagogical
  example.

---

## Visual hierarchy

First decide what should lead.

- In a worked example, the observable action leads.
- In a code trace, the method signature and source lead.
- In a field reference, the selected field meaning leads.
- In an architecture view, ownership and boundaries lead.

Supporting information should be visually quieter.

General rules:

- Keep chrome quiet at rest.
- Use stable geometry for controls and navigation.
- Use one consistent color per source, process, window, or semantic role.
- Use color plus text; never rely on color alone.
- Avoid decorative animation. Motion must orient, confirm, or connect.
- Honor `prefers-reduced-motion`.
- Avoid panels that all have equal visual weight.
- On narrow layouts, stack panes in reading order instead of shrinking text into
  illegibility.
- Text in constrained flex/grid cells needs `min-width: 0` and the complete
  ellipsis pattern.

---

## Correctness rules

### Explain actual representation, not intended meaning

If a system counts replacement new-text length, say that. Do not rewrite it as
"semantic characters introduced" unless the implementation actually normalizes
to that meaning.

### Distinguish these layers

- semantic user request
- tool input
- adapter representation
- canonical transition
- tracker representation
- emitted row
- downstream interpretation

Many apparent contradictions disappear once these layers are separated.

### Preserve event and row cardinality

If a tracking window emits one event per source, show separate rows. Do not
collapse them into one visual card that looks like one event.

### Keep totals scoped correctly

Clarify whether a total belongs to:

- one source
- one document
- one window
- one session
- one event batch

If every row repeats a window total, show that repetition.

### Mark inferred and illustrative values

Use labels such as:

- illustrative UUID
- inferred language
- representative arguments
- simplified source excerpt
- observed implementation behavior

### Audit every revision-sensitive claim

Before publishing:

- search for removed fields
- search for old midpoint terminology
- refresh method signatures and line references
- inspect new branches added since the last audit
- compare source and standalone artifacts

---

## Accessibility requirements

Interactive explainers must support:

- native buttons for actions and selectable steps
- visible keyboard focus
- logical Tab order
- arrow-key navigation for tabs, slides, and traces
- Home/End where a sequence supports it
- `aria-selected`, `aria-pressed`, and `aria-current` as appropriate
- a polite live region announcing scenario and step changes
- accessible names for tooltips and compact controls
- text alternatives for visual diagrams
- an accessible version/help dialog describing all controls and content
- no hover-only information
- no color-only distinctions
- reduced-motion behavior

For a visual code trace, the accessible description should include:

- available code paths
- navigation keys
- current method
- signature
- file and line
- source excerpt purpose
- arguments
- return/next call
- state changes

---

## Source assets and standalone artifacts

Treat these as different products:

### Canonical folder layout

Give each explainer its own folder. Keep editable source assets at the folder
root and put the distributable single-file artifact in a `shareable` subfolder:

```text
explainers/
  my-explainer/
    index.html
    architecture.html
    flows.js
    fields.js
    worked-example.js
    shareable/
      my-explainer.html
```

Use `index.html` as the source entry point so the folder itself is the stable
address. Give the shareable file a descriptive name because it will commonly be
copied out of its folder.

Keep only files that participate in the current explainer inside this folder.
Legacy concepts, backups, and independently named explainers should remain
outside it unless the user explicitly asks to migrate or delete them.

When cleaning up an existing explainer:

1. Inventory the current entry point and every local dependency.
2. Search the surrounding documentation and legacy pages for links to those
   files.
3. Move only the current source assets into the dedicated folder.
4. Rename the source entry point to `index.html`.
5. Move the self-contained bundle into `shareable`.
6. Update links into and out of the moved files.
7. Do not leave duplicate source or bundle files at the old location.
8. Validate the source and shareable paths after the move.

### Source version

May load sibling files:

```text
index.html
flows.js
fields.js
worked-example.js
architecture.html
```

### Standalone share artifact

Must inline all data/scripts and embed any sibling HTML, commonly as a data URL.
It belongs under `shareable/` and must not depend on its parent folder at
runtime.

Rebuild the standalone artifact after every source change.

Validate:

- one top-level request
- no sibling `src="./..."` dependencies
- embedded views still function
- source and standalone contain the same scenario data

Never synchronize independently named explainers by copying one over another
unless the user explicitly requests it. Static HTML files do not share content
automatically.

---

## Validation workflow

### 1. Static data validation

Check:

- scripts parse
- every scenario has required fields
- every highlighted source index exists
- expected scenario and frame counts match
- all referenced DOM IDs exist
- no removed terminology remains
- no stale global names remain

### 2. Browser validation

Use browser automation at minimum:

- desktop
- constrained tablet/laptop
- mobile

Verify:

- default tab and scenario
- every tab
- every scenario/path selector
- Previous/Next
- direct step/frame selection
- keyboard navigation
- output rows and representative values
- accessibility dialog
- embedded architecture
- field filters
- no console errors
- no page errors
- no failed requests
- no document-level horizontal overflow

### 3. Standalone dependency validation

Assert exactly one network request for the standalone file. Data URLs do not
count as network dependencies.

### 4. Validate precise selectors

Do not use broad selectors that mix semantic elements.

Bad:

```js
page.locator('li').count()
```

Good:

```js
page.locator('#call-stack-list > li > button.call-stack-frame').count()
```

When a validation result contradicts source data, investigate the validator
before changing the implementation.

---

## Common failure modes

### Behavior leads when the reader wants code

Symptom: a small "Code location" footer under a large conceptual card.

Fix: promote method signature, source excerpt, arguments, returns, and state into
the primary layout.

### Internal processing becomes a vague widget

Symptom: a box labeled "Internal processing" repeats generic prose.

Fix: either remove it or replace it with concrete code frames and state.

### Controls move as content changes

Symptom: Previous/Next buttons jump between slides.

Fix: put controls above or outside dynamic content.

### Similar events look like one event

Symptom: one card contains several source payloads.

Fix: use a cumulative event table with one row per actual event.

### Filtering destroys cross-comparison

Symptom: fields disappear and readers lose their relative positions.

Fix: keep the stable list and disable inapplicable fields.

### The architecture becomes separate navigation

Symptom: a related view feels like another artifact or destination.

Fix: integrate it into the same tab model unless it is independently owned.

### Source and standalone drift

Symptom: source HTML works, shared artifact shows old data.

Fix: rebuild after every source change and validate both.

### Earlier conceptual stages survive into final documentation

Symptom: an abandoned midpoint is described as a permanent architectural
distinction.

Fix: audit against the final implementation and remove migration-only concepts.

### A field definition is friendly but false

Symptom: "characters introduced" hides that the tracker sums broad replacement
new-text lengths.

Fix: state the mechanical definition, then explain its intended interpretation
and limitations.

---

## Recommended deliverables

For a substantial explainer, prefer:

1. source HTML
2. structured data modules
3. architecture subdocument when needed
4. self-contained share artifact
5. text-only Markdown counterpart for durable reference

The Markdown counterpart should preserve:

- source revision
- code paths or lifecycle flows
- signatures
- field semantics
- edge cases
- output cardinality
- known limitations

Do not treat the Markdown file as a transcript of the UI. It should be a readable
reference in its own right.

---

## Completion checklist

- [ ] Exact source revision recorded
- [ ] Current implementation and tests inspected
- [ ] Audience and primary question defined
- [ ] Correct explainer structure selected
- [ ] Scenario facts modeled as data
- [ ] Observable behavior and internal state remain synchronized
- [ ] Semantic differences documented mechanically
- [ ] Important error/duplicate/coalescing branches included
- [ ] Accessibility dialog and keyboard navigation updated
- [ ] Responsive layouts checked
- [ ] Source and standalone artifacts rebuilt
- [ ] Standalone has one request
- [ ] Browser validation uses precise selectors
- [ ] No old terminology or removed fields remain
- [ ] Existing independent artifacts were not overwritten
