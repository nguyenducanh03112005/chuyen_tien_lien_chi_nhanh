# Mobile UI Specification

## Navigation
Recommended tabs:
1. Home
2. Transfer
3. Tracker
4. Debug

## Home
Show:
- total balance
- branch cards
- account cards
- online/offline indicator
- transaction history entry point

## Transfer
Fields:
- source account
- destination branch
- destination account
- amount
- currency

Confirmation should show:
- source
- destination
- amount
- expected distributed nodes

After submit, navigate/open Tracker.

## Tracker
Use a stepper/timeline.

Example:
```text
✓ Transaction created
✓ Phase 1 — Prepare
  ✓ HN: PREPARED
  ✓ HCM: PREPARED
✓ Phase 2 — Commit
  ✓ HN: COMMITTED
  ✓ HCM: COMMITTED
✓ Transaction completed
```

Rollback example:
```text
✓ Transaction created
⚠ Phase 1 — Prepare
  ✓ HN: PREPARED
  ✕ HCM: VOTE_NO
↩ Phase 1 aborted
✓ HN: ROLLED_BACK
✕ Transaction ABORTED
```

## Debug
This screen may be hidden behind an "Advanced/Debug" entry in production-like UI.

Show:
- branch health
- failure switches
- recent injected faults
- reset chaos button

## UX rule
The UI must show distributed state clearly enough that a lecturer can understand the protocol without reading backend logs.
