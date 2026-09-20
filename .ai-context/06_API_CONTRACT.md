# API Contract

This document is the shared contract between Mobile App, Coordinator, and Nodes.

## Mobile -> Coordinator

### Create transfer
`POST /api/transfers`

Headers:
```http
Idempotency-Key: <UUIDv4>
Content-Type: application/json
```

Body:
```json
{
  "sourceAccountId": "HN-001",
  "destinationAccountId": "HCM-001",
  "amount": 100000,
  "currency": "VND"
}
```

Response example:
```json
{
  "transactionId": "tx-123",
  "status": "PREPARING"
}
```

### Transaction status
`GET /api/transfers/:transactionId`

Example:
```json
{
  "transactionId": "tx-123",
  "status": "COMMITTED",
  "phase": "COMMIT",
  "participants": [
    {
      "branchId": "HN",
      "vote": "YES",
      "state": "COMMITTED"
    },
    {
      "branchId": "HCM",
      "vote": "YES",
      "state": "COMMITTED"
    }
  ]
}
```

## Coordinator -> Node

### Prepare
`POST /internal/transactions/:transactionId/prepare`

```json
{
  "transactionId": "tx-123",
  "sourceAccountId": "HN-001",
  "destinationAccountId": "HCM-001",
  "amount": 100000,
  "currency": "VND"
}
```

Response:
```json
{
  "vote": "YES",
  "state": "PREPARED"
}
```

### Commit
`POST /internal/transactions/:transactionId/commit`

### Abort
`POST /internal/transactions/:transactionId/abort`

## Chaos API
Recommended:
- `GET /api/debug/nodes`
- `POST /api/debug/nodes/:branchId/status`
- `POST /api/debug/failures`

Example:
```json
{
  "type": "PREPARE_FAILURE",
  "branchId": "HCM",
  "enabled": true
}
```

## API rules
- Use consistent HTTP status codes.
- Return machine-readable error codes.
- Never expose internal stack traces to the mobile app.
- Preserve transaction ID in all relevant error responses.
