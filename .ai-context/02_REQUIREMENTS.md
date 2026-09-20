# Functional & Non-Functional Requirements

## Functional requirements
### Account
- View accounts.
- Group accounts by branch.
- View available balance.
- View transaction history.

### Transfer
- Select source and destination accounts.
- Enter amount.
- Validate amount > 0.
- Validate account existence.
- Validate sufficient available balance.
- Generate UUIDv4 `Idempotency-Key`.
- Create a unique distributed transaction ID.
- Show transaction progress.

### Local transfer
If source and destination belong to the same node, use a local database transaction.

### Cross-node transfer
If source and destination belong to different nodes:
1. Coordinator creates transaction.
2. Coordinator asks all participants to Prepare.
3. Participants validate and reserve/hold the required state.
4. Coordinator collects votes.
5. If all vote YES, coordinator sends Commit.
6. If any vote NO/timeout/offline occurs before global commit, coordinator sends Abort/Rollback.
7. App displays the final distributed state.

### Chaos
Admin/debug mode can:
- set branch online/offline
- fail Prepare
- timeout Prepare
- fail Commit
- timeout Commit

## Non-functional requirements
- No money creation/loss.
- Idempotent transfer requests.
- Observable transaction state.
- Deterministic demo behavior.
- Clear separation between Coordinator and Node/Participant services.
- Easy local/LAN deployment.
- Logs sufficient for academic demonstration.

## Academic acceptance criteria
A successful demo should visibly prove:
1. One-node/local transaction works.
2. Two-node transaction uses 2PC.
3. A failed participant causes global abort/rollback.
4. Balances before and after are consistent.
5. Repeated request does not duplicate the transfer.
