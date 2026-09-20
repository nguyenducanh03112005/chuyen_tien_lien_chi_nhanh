# Backend Structure

Suggested Node.js structure:

```text
backend/
  coordinator/
    src/
      controllers/
      services/
      domain/
      repositories/
      routes/
      middleware/
      config/
  nodes/
    hn/
    hcm/
    dn/
  shared/
    types/
    errors/
    utils/
```

Alternative if one process simulates all nodes:
```text
backend/
  src/
    coordinator/
    nodes/
      hn/
      hcm/
      dn/
    shared/
```

## Coordinator service
Core modules:
- TransferService
- TwoPhaseCommitService
- IdempotencyService
- TransactionRepository
- ParticipantClient
- TransactionStateMachine
- ChaosService

## Node service
Core modules:
- AccountService
- ParticipantTransactionService
- LocalTransactionRepository
- ChaosController

## Important
Do not put account ownership logic in the mobile app.

Do not let the Coordinator directly mutate a branch database if the architecture claims that branch nodes own their data. The Coordinator should communicate through participant APIs.
