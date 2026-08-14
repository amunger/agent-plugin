---
description: 'Separate draft pull request creation from review readiness'
applyTo: '**'
---

# Pull Request Readiness

When asked to open a draft pull request, do not require the full local test, lint, or build suite to finish first when equivalent checks will run in pull request CI. Perform only validation needed to avoid publishing a clearly broken or malformed change, then create the draft so the user can review it while CI runs. Do not mention routine validation deferred to pull request CI in the pull request description.

Before marking a pull request ready for review, require all applicable pull request checks to pass. If checks are failing or pending, leave the pull request in draft state and report what remains.