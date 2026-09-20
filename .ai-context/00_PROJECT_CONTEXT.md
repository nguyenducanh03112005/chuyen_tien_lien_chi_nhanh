# Project Context — Digital Banking Distributed Transfer

## 1. Project
Build a **mobile digital-banking simulation** for inter-branch account transfers. Accounts are partitioned by branch and stored/managed by separate nodes.

The central academic requirement is **distributed transaction correctness**:
- A transfer touching at least 2 nodes must use **Two-Phase Commit (2PC) or an equivalent distributed commit protocol**.
- If any participating node fails during the transaction, the system must perform a **global rollback/abort**.
- The system must demonstrate the invariant: **money is neither lost nor created**.

## 2. Demo scenario
Example branches/nodes:
- Branch HN
- Branch HCM
- Branch DN

Example:
`Account HN-A -> Account HCM-B`

The app must make the distributed behavior visible rather than hiding it behind a normal transfer API.

## 3. Mobile app screens
1. Home & Balances
   - List accounts grouped by branch/node.
   - Show available balance.
2. Transfer Flow
   - Select source account.
   - Select destination branch/account.
   - Enter amount.
   - Validate and confirm.
3. Distributed Transaction Tracker
   - Show Phase 1: Prepare/Vote.
   - Show Phase 2: Commit or Rollback.
   - Show participating nodes and their states in real time.
4. Debug / Chaos Control
   - Toggle branch online/offline.
   - Inject Prepare failure.
   - Inject Commit timeout/failure.

## 4. Technology direction
Preferred:
- Flutter OR React Native Expo
- Backend: Node.js with Express/Fastify OR lightweight Go
- Local/LAN deployment is acceptable.
- Database/storage can be local per node as long as node isolation and transaction semantics are demonstrable.

## 5. Eight-week plan
### Week 1
Initialize mobile project, mock server, JSON contract.

### Week 2
Account/branch dashboard and transaction history.

### Week 3
Local transfer flow, validation, UUIDv4 idempotency key.

### Week 4
Chaos/Branch Health Monitor.

### Week 5
2PC transaction tracker and rollback visualization.

### Week 6
Integrate mobile app with Transaction Coordinator.

### Week 7
Failure testing and money-conservation verification.

### Week 8
UI polish, APK/build, report, presentation and demo script.

## 6. Demo sequence
1. Normal transfer succeeds.
2. Disable one node.
3. Start cross-branch transfer.
4. Show Prepare/Vote failure or timeout.
5. Show global rollback/abort.
6. Verify source balance is restored and destination balance is unchanged.
7. Re-enable node.
8. Repeat successful transfer.

## 7. Critical invariant
For every completed transaction:

`total_money_after == total_money_before`

For an aborted transaction:

`source_balance_after == source_balance_before`
and
`destination_balance_after == destination_balance_before`

unless a separate, explicitly documented concurrent transaction affects those accounts.

## 8. AI working rule
Any AI working on this project must read this file and the relevant project-specific `.md` files before modifying code or making architectural decisions.
