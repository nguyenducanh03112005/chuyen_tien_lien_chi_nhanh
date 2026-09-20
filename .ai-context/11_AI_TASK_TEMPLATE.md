# AI Task Execution Template

When the user gives a task, use this procedure.

## 1. Understand
Write internally:
- requested outcome
- affected component
- relevant files
- constraints
- acceptance criteria

## 2. Read context
At minimum read:
- `00_PROJECT_CONTEXT.md`
- `01_AI_INSTRUCTIONS.md`

Then read relevant files:
- requirements
- architecture
- 2PC protocol
- API contract
- data model
- mobile UI
- backend structure
- testing/chaos

## 3. Inspect repository
Before editing:
- identify current framework
- identify entry points
- inspect existing implementation
- identify dependencies
- avoid replacing working code unnecessarily

## 4. Implement
Make the smallest coherent change that satisfies the request.

## 5. Validate
Run appropriate:
- formatter
- linter
- type checker
- unit tests
- integration tests
- build

## 6. Check distributed invariants
If the task touches transfer behavior, verify:
- idempotency
- transaction states
- participant states
- commit/abort semantics
- money conservation

## 7. Report
Return:
```text
Implemented:
- ...

Files changed:
- ...

Validation:
- ...

How to run/test:
- ...

Known limitations:
- ...

Next step:
- ...
```

## Never
- claim tests passed without running them
- silently change API contracts
- silently replace 2PC with a simple sequential debit/credit
- rollback after a durable global COMMIT decision without a correct recovery design
- create money to "fix" a balance inconsistency
