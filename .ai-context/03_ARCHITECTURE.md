# System Architecture

## Logical components

```text
                 Mobile App
                     |
                     v
             API Gateway / Coordinator
                     |
          +----------+----------+
          |          |          |
          v          v          v
       Node HN    Node HCM    Node DN
       DB HN      DB HCM      DB DN
```

## Responsibilities

### Mobile App
- User interaction.
- Display balances and history.
- Submit transfer request.
- Display 2PC progress.
- Provide debug/chaos controls.
- Must NOT implement distributed commit decisions itself.

### Transaction Coordinator
- Owns distributed transaction orchestration.
- Creates transaction ID.
- Determines participating nodes.
- Runs Prepare phase.
- Collects participant votes.
- Decides Commit or Abort.
- Sends final decision.
- Exposes transaction status to mobile app.

### Branch Node / Participant
Each node owns accounts assigned to that branch.
It exposes participant operations such as:
- prepare
- commit
- abort/rollback
- account/balance query
- transaction status

A node must not directly modify another node's data.

## Data ownership
Example:
- HN Node owns HN accounts.
- HCM Node owns HCM accounts.
- DN Node owns DN accounts.

The Coordinator owns transaction coordination metadata, not the authoritative balance of branch accounts.

## Important design principle
The mobile app talks to the Coordinator for cross-node transfers.

Do NOT implement:
`Mobile -> HN -> HCM`

Prefer:
`Mobile -> Coordinator -> HN + HCM`

This makes the 2PC responsibility explicit and easier to demonstrate.
