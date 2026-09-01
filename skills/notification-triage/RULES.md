# Notification triage rules

Rules version: `1`

Every thread receives one action:

- `auto_done`: mark Done without another prompt.
- `candidate`: propose Done only after adversarial review and user confirmation.
- `keep`: leave in the inbox.

## Evaluation order

1. Suppress ledgered IDs with no activity after their recorded `actioned_at`.
2. Evaluate protected rule `KEEP-006`; a match stops evaluation.
3. Evaluate `AUTO-001`, `AUTO-003`, `AUTO-004`, and `AUTO-005`.
4. Evaluate `KEEP-001` through `KEEP-004`; a match stops evaluation.
5. Evaluate `AUTO-002`.
6. Evaluate all `CANDIDATE` rules, using the most specific match.
7. Fall back to `KEEP-005`.

Every condition of an automatic rule must be positively established. An API error, incomplete page, absent required field, or ambiguous human activity prevents the match.

## Automatic rules

### AUTO-001: merged after the user's final approval

Use `auto_done` only when all of these are established:

- The subject is a merged pull request.
- The authenticated user's latest valid, non-dismissed review is `APPROVED`.
- No commit is newer than that approval.
- Between the approval and merge, there is no human comment, review, review request, mention, reply, question, or other activity that may require the user's attention.
- Later events are limited to the merge, automatic closure, and routine machine status activity.
- Complete commits, reviews, issue comments, review comments, timeline, and CODENOTIFY history are available and chronologically consistent.

### AUTO-002: pull request closed without merge

Use `auto_done` when the subject is a closed, unmerged pull request and no directed follow-up or unanswered request remains. A request on a pull request authored by the user prevents the match.

### AUTO-003: bot closed a duplicate issue

Use `auto_done` only when:

- The subject is an issue closed as `duplicate`.
- It does not have `verification-needed`.
- Issue comment history is complete.
- The newest issue comment is a bot-generated duplicate closure.
- That comment contains neither a mention of the user nor CODENOTIFY.

### AUTO-004: bot closed an issue awaiting information

Use `auto_done` only when:

- The issue is closed as `not_planned`.
- It has `info-needed` and lacks `verification-needed`.
- Issue comment history is complete.
- The newest issue comment is a bot-generated stale information closure.
- That comment contains neither a mention of the user nor CODENOTIFY.

### AUTO-005: merged pull request with no discussion

Use `auto_done` only when the pull request is merged and complete histories prove that it has no issue comments, review comments, non-empty review bodies, mentions of the user, or CODENOTIFY notices.

## Candidate rules

### CANDIDATE-001: merged pull request

Use `candidate` for a merged pull request when its latest human activity is not addressed to the user.

### CANDIDATE-003: pull request awaiting automatic merge

Use `candidate` for an open pull request with auto-merge enabled and no directed follow-up.

### CANDIDATE-004: closed issue

Use `candidate` for a closed issue with no directed follow-up.

### CANDIDATE-005: latest comment is non-actionable bot output

Use `candidate` when the latest comment is from a bot and requests nothing from the user.

### CANDIDATE-006: status-only notification

Use `candidate` for `ci_activity`, a `CheckSuite`, or a subscribed `Release` with no mention or directed request.

## Keep rules

### KEEP-006: CODENOTIFY ownership notice

This protected rule matches whenever current or historical data contains CODENOTIFY, except for a pull request proven closed without merge. An incomplete history cannot prove absence. Do not automatically remove or propose removing a matching open or merged pull request.

### KEEP-001: active review or assignment request

Use `keep` for an open subject whose reason is `review_requested` or `assign`. Do not preserve a stale request reason after closure or merge.

### KEEP-002: direct mention or reply

Use `keep` for an open subject when the latest comment mentions, addresses, or replies to the user.

### KEEP-003: human request on an open subject

Use `keep` when the latest human contribution to an open pull request or issue asks a question or requests work.

### KEEP-004: response needed on the user's subject

Use `keep` when another human's latest contribution to a subject authored by the user asks the user a question or requests work. Do not match when the user has already supplied the latest response.

### KEEP-005: insufficient or unmatched evidence

Use `keep` when evidence is incomplete or ambiguous, or when no earlier rule matches. Explain the uncertainty in `why`.
