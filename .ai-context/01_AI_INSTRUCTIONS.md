# AI Instructions — Mandatory Project Rules

## Before doing any task
1. Read `00_PROJECT_CONTEXT.md`.
2. Read the files relevant to the requested task.
3. Inspect the current repository/code before proposing changes.
4. Preserve existing architecture unless the user explicitly asks to redesign it.
5. Do not silently change technology, database strategy, API contracts, transaction semantics, or folder structure.
6. If an assumption is unavoidable, state it clearly.
7. Prefer small, testable changes over broad rewrites.

## Distributed transaction rules
- Cross-node transfers MUST go through the Transaction Coordinator.
- A transaction touching 2+ nodes MUST follow 2PC or a clearly equivalent protocol.
- Phase 1 must not be treated as a final commit.
- Participants must be able to prepare/hold changes and later commit or abort.
- If a required participant votes NO, times out, or becomes unavailable before commit, the coordinator must abort the global transaction.
- Rollback must undo all prepared/reserved effects.
- Never compensate by simply adding money unless the system records the corresponding prior reservation/debit state.
- Use a transaction ID and an idempotency key.
- Duplicate requests must not create duplicate money movements.

## Money conservation
Every code change affecting transfer logic must consider:
- source balance
- destination balance
- reserved/held amount
- transaction status
- participant state
- commit/rollback behavior
- retry/idempotency behavior

## Error handling
Use explicit states rather than ambiguous booleans.

Recommended transaction states:
`CREATED`
`PREPARING`
`PREPARED`
`COMMITTING`
`COMMITTED`
`ABORTING`
`ABORTED`
`FAILED`
`UNKNOWN` (only when genuinely unresolved)

Recommended participant states:
`INIT`
`PREPARING`
`PREPARED`
`VOTE_NO`
`COMMITTING`
`COMMITTED`
`ROLLING_BACK`
`ROLLED_BACK`
`TIMEOUT`
`OFFLINE`

## Testing rule
For any transfer feature, include at least:
- same-node success
- cross-node success
- insufficient source balance
- destination/account validation failure
- duplicate idempotency key
- participant Prepare failure
- participant timeout/offline
- Commit failure/timeout
- rollback verification
- total-money conservation verification

## Output rule
When reporting completed work, include:
- files changed
- what changed
- why
- how to run
- how to test
- known limitations
- next recommended step

Never claim a feature is tested if it was not actually tested.
