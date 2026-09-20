# Presentation / Demo Script

## Scene 1 — Introduce the problem
Show three branches:
- HN
- HCM
- DN

Explain:
"Account data is partitioned across independent branch nodes. A transfer between branches becomes a distributed transaction."

## Scene 2 — Successful transfer
Example:
HN-001 has 1,000,000 VND.
HCM-001 has 500,000 VND.

Transfer:
100,000 VND HN -> HCM.

On Tracker:
1. Created
2. Prepare
3. HN = YES
4. HCM = YES
5. Commit
6. Both committed

After:
HN = 900,000
HCM = 600,000

Total remains 1,500,000.

## Scene 3 — Failure
Turn HCM Prepare failure ON.

Start the same transfer.

Show:
- HN prepares/reserves.
- HCM votes NO or times out.
- Coordinator decides ABORT.
- HN rolls back/releases reservation.
- HCM does not receive money.

After:
HN = original balance
HCM = original balance

## Scene 4 — Explain the key property
Say:
"The important property is not merely that the app reports failure. We verify that no participant keeps a partial monetary effect."

Then show the before/after audit.

## Scene 5 — Recovery
Turn HCM back online.

Repeat the transfer.

Show successful 2PC again.

## Scene 6 — Idempotency
Submit the same request twice with the same Idempotency-Key.

Show:
- same transaction ID/result
- no second debit

## Questions the lecturer may ask

### Why not simply debit A then credit B?
Because a failure between those operations can leave an inconsistent state.

### Why 2PC?
It separates Prepare from the final Commit decision and gives the coordinator a global commit/abort decision.

### What happens if one node fails during Prepare?
The coordinator cannot obtain unanimous YES, so it aborts and asks prepared participants to roll back.

### What if a node fails after Commit was decided?
Do not blindly rollback. The system must recover/reconcile the durable commit decision.

### How do you prove no money is created/lost?
Compare the sum of all authoritative account balances before and after, plus transaction-level source/destination deltas.
