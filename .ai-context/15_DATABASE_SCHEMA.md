# Database Schema

## Goal
Each branch node owns its account data. The Coordinator owns distributed transaction metadata.

## Node database

### accounts
```sql
CREATE TABLE accounts (
    account_id VARCHAR(50) PRIMARY KEY,
    branch_id VARCHAR(20) NOT NULL,
    owner_name VARCHAR(100) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'VND',
    balance DECIMAL(19,2) NOT NULL,
    reserved_balance DECIMAL(19,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
```

Invariant:
`balance >= reserved_balance >= 0`

Available:
`balance - reserved_balance`

### participant_transactions
```sql
CREATE TABLE participant_transactions (
    transaction_id VARCHAR(100) PRIMARY KEY,
    branch_id VARCHAR(20) NOT NULL,
    state VARCHAR(30) NOT NULL,
    amount DECIMAL(19,2) NOT NULL,
    source_account_id VARCHAR(50),
    destination_account_id VARCHAR(50),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
```

## Coordinator database

### distributed_transactions
```sql
CREATE TABLE distributed_transactions (
    transaction_id VARCHAR(100) PRIMARY KEY,
    idempotency_key VARCHAR(100) NOT NULL UNIQUE,
    source_account_id VARCHAR(50) NOT NULL,
    destination_account_id VARCHAR(50) NOT NULL,
    source_branch_id VARCHAR(20) NOT NULL,
    destination_branch_id VARCHAR(20) NOT NULL,
    amount DECIMAL(19,2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    status VARCHAR(30) NOT NULL,
    commit_decision VARCHAR(20),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
```

### transaction_participants
```sql
CREATE TABLE transaction_participants (
    transaction_id VARCHAR(100) NOT NULL,
    branch_id VARCHAR(20) NOT NULL,
    role VARCHAR(20) NOT NULL,
    vote VARCHAR(10),
    state VARCHAR(30) NOT NULL,
    error_code VARCHAR(100),
    error_message VARCHAR(500),
    updated_at TIMESTAMP NOT NULL,
    PRIMARY KEY (transaction_id, branch_id)
);
```

## Important
Do not make the Coordinator's transaction table the authoritative account balance.

The branch node remains authoritative for its own accounts.
