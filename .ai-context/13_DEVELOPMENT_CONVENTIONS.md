# Development Conventions

## General
- Prefer readable, maintainable code over clever abstractions.
- Keep business logic out of UI components.
- Keep Coordinator logic separate from Node participant logic.
- Use async error handling consistently.
- Use environment variables for URLs/ports.
- Never hard-code production secrets.

## Naming
Use descriptive names:
- `transactionId`
- `idempotencyKey`
- `sourceAccountId`
- `destinationAccountId`
- `branchId`
- `participantState`

Avoid vague names such as `data`, `obj`, `temp`, `x` for important domain objects.

## API
- JSON request/response.
- Consistent error shape.
- Every distributed error should include `transactionId` when available.
- Validate all client input on the backend.
- Do not trust branch IDs or balances supplied by the mobile client.

Recommended error shape:
```json
{
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "Source account has insufficient available balance.",
    "transactionId": "tx-123"
  }
}
```

## Logging
Every distributed transaction log should make it possible to answer:
- Which transaction?
- Which node?
- Which phase?
- What event?
- What decision?
- When?
- Why did it fail?

Never log secrets or sensitive credentials.

## Mobile
- UI state should represent backend transaction state.
- Do not fake successful commit merely because an API request returned HTTP 200.
- Disable duplicate submission while an operation is being created, but still rely on idempotency server-side.
