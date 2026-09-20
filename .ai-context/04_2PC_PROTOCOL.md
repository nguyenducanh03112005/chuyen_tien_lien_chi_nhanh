# Two-Phase Commit Protocol

## Transaction example
Transfer 100,000 VND:
`HN-A -> HCM-B`

## Phase 0 — Create
Coordinator:
- validates request format
- creates `transactionId`
- records participants `[HN, HCM]`
- records idempotency key

## Phase 1 — Prepare / Vote

Coordinator sends:
`PREPARE(transactionId, source, destination, amount)`

HN:
- verifies source account
- verifies available balance
- reserves 100,000 VND
- persists prepared transaction
- replies `YES`

HCM:
- verifies destination account
- prepares the receiving side
- persists prepared transaction
- replies `YES`

Only when ALL required participants vote YES can the coordinator decide COMMIT.

## Phase 2 — Commit

Coordinator sends:
`COMMIT(transactionId)`

HN:
- converts reservation into final debit.

HCM:
- applies final credit.

Participants report committed.

Coordinator marks transaction `COMMITTED`.

## Abort / rollback

If any participant:
- votes NO
- is offline
- times out during Prepare
- fails before global commit

Coordinator decides ABORT.

Coordinator sends:
`ABORT(transactionId)`

HN:
- releases reservation / restores prepared state.

HCM:
- removes/cancels prepared receiving state.

Coordinator marks transaction `ABORTED`.

## Important nuance: Commit-time failure
Once the coordinator has durably decided COMMIT, classic 2PC cannot safely pretend the decision never happened merely because one participant times out.

Therefore the implementation should distinguish:
- failure before global commit decision => ABORT
- failure after global commit decision => transaction remains COMMITTING/UNKNOWN until participant recovery and reconciliation

For an academic demo, this distinction is valuable and demonstrates that rollback is not incorrectly applied after a durable commit decision.

## State machine

```text
CREATED
   |
   v
PREPARING
   |
   +---- participant NO/timeout ----> ABORTING -> ABORTED
   |
   +---- all YES -------------------> COMMITTING -> COMMITTED
```

## Idempotency
Every request must include:
`Idempotency-Key: <UUIDv4>`

The Coordinator must return the existing transaction/result when the same key is submitted again rather than executing a second transfer.
