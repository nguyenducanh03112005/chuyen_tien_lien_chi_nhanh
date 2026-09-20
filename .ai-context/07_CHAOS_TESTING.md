# Chaos / Failure Testing

## Purpose
The Chaos screen exists to make distributed failure behavior deterministic and visible during demonstration.

## Controls
### Node status
For each branch:
- Online
- Offline

### Inject failures
- Prepare failure
- Prepare timeout
- Commit failure
- Commit timeout

## Test Case 1 — Cross-node success
Initial:
- HN source = 1,000,000
- HCM destination = 500,000

Transfer:
100,000

Expected:
- HN = 900,000
- HCM = 600,000
- total unchanged
- status = COMMITTED

## Test Case 2 — Prepare failure
Set HCM:
`Prepare failure = ON`

Transfer 100,000.

Expected:
- HN reservation is released.
- HN final balance unchanged.
- HCM final balance unchanged.
- status = ABORTED.
- App shows rollback.

## Test Case 3 — Participant offline before/during Prepare
Set HCM:
`OFFLINE`

Transfer.

Expected:
- timeout/unavailable vote.
- Coordinator decides ABORT.
- Prepared state on HN is released.
- no money is transferred.

## Test Case 4 — Duplicate request
Send the same `Idempotency-Key` twice.

Expected:
- same transaction is returned.
- no second debit/credit.

## Test Case 5 — Commit timeout
Inject timeout after the coordinator has sent COMMIT.

Expected behavior depends on implementation, but it MUST NOT blindly issue a rollback after a durable global COMMIT decision.

Preferred state:
`COMMITTING` or `UNKNOWN`

Then reconcile after participant recovery.

## Evidence to capture
For the report/demo:
- balances before
- transfer request
- Phase 1 UI
- failure injection
- rollback UI
- balances after
- transaction log
- total-money conservation result
