# Test Plan

## Unit tests
### Coordinator
- participant discovery
- state transitions
- all YES => COMMIT
- one NO => ABORT
- timeout => ABORT before commit decision
- idempotency

### Node
- prepare with sufficient balance
- prepare with insufficient balance
- commit prepared transaction
- abort prepared transaction
- duplicate prepare/commit/abort
- invalid transaction ID

## Integration tests
1. HN -> HN local transfer
2. HN -> HCM successful 2PC
3. HN -> HCM Prepare failure
4. HN -> HCM timeout
5. HN -> HCM duplicate request
6. HN -> HCM participant recovery
7. Commit-time timeout/reconciliation

## Invariant tests
Before each test:
`T0 = sum(all account balances)`

After:
`T1 = sum(all account balances)`

For every completed transfer:
`T1 == T0`

Also verify transaction-level expected deltas.

## Manual demo checklist
- [ ] All nodes online
- [ ] Display balances
- [ ] Successful cross-node transfer
- [ ] Tracker shows Prepare and Commit
- [ ] Enable Prepare failure
- [ ] Repeat transfer
- [ ] Tracker shows Abort/Rollback
- [ ] Verify balances
- [ ] Disable failure
- [ ] Repeat successful transfer
