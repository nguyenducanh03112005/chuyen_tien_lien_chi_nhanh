# Data Model

## Account

Suggested fields:
- `accountId`
- `branchId`
- `ownerName`
- `currency`
- `balance`
- `reservedBalance`
- `status`
- `createdAt`
- `updatedAt`

Available balance:

`availableBalance = balance - reservedBalance`

## Branch / Node

Suggested fields:
- `branchId`
- `name`
- `baseUrl`
- `status`
- `lastHeartbeat`

Statuses:
`ONLINE`, `OFFLINE`, `DEGRADED`

## DistributedTransaction

Suggested fields:
- `transactionId`
- `idempotencyKey`
- `sourceAccountId`
- `destinationAccountId`
- `sourceBranchId`
- `destinationBranchId`
- `amount`
- `currency`
- `status`
- `createdAt`
- `updatedAt`
- `commitDecision`

## TransactionParticipant

Suggested fields:
- `transactionId`
- `branchId`
- `role`
- `vote`
- `state`
- `errorCode`
- `errorMessage`
- `updatedAt`

## TransactionEvent

Suggested fields:
- `eventId`
- `transactionId`
- `branchId`
- `phase`
- `eventType`
- `message`
- `timestamp`

Useful event examples:
- `TRANSACTION_CREATED`
- `PREPARE_SENT`
- `PREPARE_RECEIVED`
- `VOTE_YES`
- `VOTE_NO`
- `PREPARE_TIMEOUT`
- `COMMIT_DECISION`
- `COMMIT_SENT`
- `COMMIT_ACK`
- `ABORT_DECISION`
- `ROLLBACK_SENT`
- `ROLLBACK_ACK`

## Money conservation audit
For every transaction, record:
- total system balance before
- total system balance after
- source delta
- destination delta
- reserved delta

Expected cross-node successful transfer:
- source: `-amount`
- destination: `+amount`
- total: `0`

Expected aborted transfer:
- source: `0`
- destination: `0`
- total: `0`
