const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const repository = require('../repositories/distributedTransaction.repository');
const config = require('../config');

const States = {
  CREATED: 'CREATED',
  PREPARING: 'PREPARING',
  PREPARED: 'PREPARED',
  COMMITTING: 'COMMITTING',
  COMMITTED: 'COMMITTED',
  ABORTING: 'ABORTING',
  ABORTED: 'ABORTED',
  FAILED: 'FAILED',
  UNKNOWN: 'UNKNOWN'
};

const ParticipantStatus = {
  PENDING: 'PENDING',
  PREPARED: 'PREPARED',
  COMMITTED: 'COMMITTED',
  ABORTED: 'ABORTED',
  FAILED: 'FAILED',
  UNKNOWN: 'UNKNOWN'
};

const ValidTransitions = {
  [States.CREATED]: [States.PREPARING, States.ABORTING, States.FAILED],
  [States.PREPARING]: [States.PREPARED, States.ABORTING, States.FAILED],
  [States.PREPARED]: [States.COMMITTING, States.ABORTING, States.FAILED],
  [States.COMMITTING]: [States.COMMITTED, States.UNKNOWN],
  [States.ABORTING]: [States.ABORTED, States.UNKNOWN],
  // Final states - no transitions out (allow self-transitions for idempotency)
  [States.COMMITTED]: [States.COMMITTED],
  [States.ABORTED]: [States.ABORTED],
  [States.FAILED]: [States.FAILED],
  [States.UNKNOWN]: [States.COMMITTING, States.ABORTING] // For recovery
};

class DistributedTransactionService {
  get States() { return States; }

  createTransaction(data) {
    const {
      idempotencyKey,
      sourceAccountId,
      destinationAccountId,
      sourceBranchId,
      destinationBranchId,
      amount,
      currency
    } = data;

    const existing = repository.findByIdempotencyKey(idempotencyKey);
    if (existing) return existing;

    const transactionId = `tx-${uuidv4()}`;
    const transaction = {
      transactionId,
      idempotencyKey,
      sourceAccountId,
      destinationAccountId,
      sourceBranchId,
      destinationBranchId,
      amount,
      currency,
      status: States.CREATED,
      type: 'DISTRIBUTED',
      decision: null,
      participants: [
        {
          branchId: sourceBranchId,
          role: 'SOURCE',
          status: ParticipantStatus.PENDING
        },
        {
          branchId: destinationBranchId,
          role: 'DESTINATION',
          status: ParticipantStatus.PENDING
        }
      ]
    };

    return repository.save(transaction);
  }

  getTransaction(transactionId) {
    return repository.findById(transactionId);
  }

  getAllTransactions() {
    return repository.findAll();
  }

  transitionTransaction(transactionId, nextState) {
    const transaction = repository.findById(transactionId);
    if (!transaction) throw new Error('TRANSACTION_NOT_FOUND');

    const currentState = transaction.status;
    if (currentState === nextState) {
      return transaction;
    }

    const allowed = ValidTransitions[currentState] || [];

    if (!allowed.includes(nextState)) {
      throw new Error(`INVALID_STATE_TRANSITION: ${currentState} -> ${nextState}`);
    }

    // Critical 2PC Rule: Once COMMITTED, cannot ABORT
    if (currentState === States.COMMITTED && (nextState === States.ABORTING || nextState === States.ABORTED)) {
      throw new Error('CRITICAL_2PC_VIOLATION: Cannot abort a committed transaction');
    }

    transaction.status = nextState;
    return repository.save(transaction);
  }

  updateParticipantStatus(transactionId, branchId, status) {
    const transaction = repository.findById(transactionId);
    if (!transaction) throw new Error('TRANSACTION_NOT_FOUND');

    const participant = transaction.participants.find(p => p.branchId === branchId);
    if (!participant) throw new Error('PARTICIPANT_NOT_FOUND');

    participant.status = status;
    participant.updatedAt = new Date().toISOString();

    return repository.save(transaction);
  }

  setGlobalDecision(transactionId, decision) {
    const transaction = repository.findById(transactionId);
    if (!transaction) throw new Error('TRANSACTION_NOT_FOUND');
    transaction.decision = decision;
    transaction.updatedAt = new Date().toISOString();
    return repository.save(transaction);
  }

  async runPreparePhase(transactionId) {
    let transaction = repository.findById(transactionId);
    if (!transaction) throw new Error('TRANSACTION_NOT_FOUND');

    // If already prepared or aborted, just return
    if (transaction.status === States.PREPARED || transaction.status === States.ABORTED) {
      return transaction;
    }

    // 1. CREATED -> PREPARING
    if (transaction.status === States.CREATED) {
      transaction = this.transitionTransaction(transactionId, States.PREPARING);
    }

    console.log(`[COORDINATOR] Phase 1 (Prepare): Broadcasting PREPARE for ${transactionId} to [${transaction.participants.map(p => p.branchId).join(', ')}]`);

    const preparePromises = transaction.participants.map(async (participant) => {
      const node = config.nodes.find(n => n.branchId === participant.branchId);
      if (!node) return { branchId: participant.branchId, vote: 'NO', reason: 'NODE_CONFIG_NOT_FOUND' };

      try {
        const response = await axios.post(`${node.url}/api/internal/transactions/${transactionId}/prepare`, {
          sourceAccountId: transaction.sourceAccountId,
          destinationAccountId: transaction.destinationAccountId,
          amount: transaction.amount,
          currency: transaction.currency,
          role: participant.role
        }, { timeout: 5000 });

        console.log(`[COORDINATOR] Phase 1 (Prepare): Participant ${participant.branchId} voted -> ${response.data.vote}`);
        return { ...response.data, branchId: participant.branchId };
      } catch (error) {
        console.error(`[COORDINATOR] Phase 1 (Prepare): Participant ${participant.branchId} failed:`, error.message);
        return { branchId: participant.branchId, vote: 'NO', reason: 'NODE_UNAVAILABLE', message: error.message };
      }
    });

    const results = await Promise.all(preparePromises);

    // Update participant statuses in Coordinator
    results.forEach(res => {
      this.updateParticipantStatus(transactionId, res.branchId, res.vote === 'YES' ? ParticipantStatus.PREPARED : ParticipantStatus.FAILED);
    });

    const allYes = results.every(r => r.vote === 'YES');

    if (allYes) {
      console.log(`[COORDINATOR] Phase 1 Result: All participants voted YES. Transitioning to PREPARED.`);
      // 2. PREPARING -> PREPARED
      return this.transitionTransaction(transactionId, States.PREPARED);
    } else {
      console.log(`[COORDINATOR] Phase 1 Result: Vote NO detected. Global Decision = ABORT. Broadcasting ABORT...`);
      // 3. PREPARING -> ABORTING -> ABORTED
      this.setGlobalDecision(transactionId, 'ABORT');
      this.transitionTransaction(transactionId, States.ABORTING);

      // Send Abort to all participants that might have prepared (best effort for this PART)
      await Promise.all(transaction.participants.map(async (p) => {
        const node = config.nodes.find(n => n.branchId === p.branchId);
        if (node) {
          try {
            await axios.post(`${node.url}/api/internal/transactions/${transactionId}/abort`, {}, { timeout: 2000 });
          } catch (e) {
            console.error(`[COORDINATOR] Failed to send abort to ${p.branchId}:`, e.message);
          }
        }
      }));

      return this.transitionTransaction(transactionId, States.ABORTED);
    }
  }

  async runCommitPhase(transactionId) {
    let transaction = repository.findById(transactionId);
    if (!transaction) throw new Error('TRANSACTION_NOT_FOUND');

    // Idempotent: If already COMMITTED, return immediately
    if (transaction.status === States.COMMITTED) {
      return transaction;
    }

    // Only commit if decision is null (first time) or already COMMIT
    if (transaction.decision === 'ABORT') {
      throw new Error('CRITICAL_ERROR: Cannot commit aborted transaction');
    }

    // 1. Durably persist Global Decision = COMMIT
    if (!transaction.decision) {
      this.setGlobalDecision(transactionId, 'COMMIT');
    }

    // 2. Transition to COMMITTING
    if (transaction.status === States.PREPARED) {
      transaction = this.transitionTransaction(transactionId, States.COMMITTING);
    }

    console.log(`[COORDINATOR] Phase 2 (Commit): Global Decision = COMMIT. Broadcasting COMMIT to [${transaction.participants.map(p => p.branchId).join(', ')}]`);

    const commitPromises = transaction.participants.map(async (participant) => {
      // Skip if already committed
      if (participant.status === ParticipantStatus.COMMITTED) return { branchId: participant.branchId, status: 'COMMITTED' };

      const node = config.nodes.find(n => n.branchId === participant.branchId);
      try {
        const response = await axios.post(`${node.url}/api/internal/transactions/${transactionId}/commit`, {}, { timeout: 5000 });
        console.log(`[COORDINATOR] Phase 2 (Commit): Participant ${participant.branchId} committed successfully.`);
        return { ...response.data, branchId: participant.branchId };
      } catch (error) {
        console.error(`[COORDINATOR] Phase 2 (Commit): Participant ${participant.branchId} failed:`, error.message);
        return { branchId: participant.branchId, status: 'UNKNOWN', message: error.message };
      }
    });

    const results = await Promise.all(commitPromises);

    // 3. Update participant statuses
    results.forEach(res => {
      if (res.status === 'COMMITTED') {
        this.updateParticipantStatus(transactionId, res.branchId, ParticipantStatus.COMMITTED);
      } else {
        this.updateParticipantStatus(transactionId, res.branchId, ParticipantStatus.UNKNOWN);
      }
    });

    // 4. If all participants COMMITTED -> Global state COMMITTED
    transaction = repository.findById(transactionId);
    const allCommitted = transaction.participants.every(p => p.status === ParticipantStatus.COMMITTED);

    if (allCommitted) {
      console.log(`[COORDINATOR] Transaction ${transactionId} -> COMMITTED.`);
      return this.transitionTransaction(transactionId, States.COMMITTED);
    } else {
      console.warn(`[COORDINATOR] Transaction ${transactionId} incomplete (COMMITTING/UNKNOWN). Pending crash recovery.`);
      return transaction;
    }
  }

  async recoverTransactions() {
    console.log('[RECOVERY] Scanning for unfinished transactions...');
    const transactions = repository.findAll();
    const unfinished = transactions.filter(tx =>
      tx.status === States.COMMITTING ||
      tx.status === States.UNKNOWN ||
      tx.status === States.ABORTING ||
      (tx.status === States.PREPARED && tx.decision !== null)
    );

    if (unfinished.length === 0) {
      console.log('[RECOVERY] No unfinished transactions found.');
      return { recoveredCount: 0, transactions: [] };
    }

    console.log(`[RECOVERY] Found ${unfinished.length} unfinished transactions. Starting recovery...`);

    const results = [];
    for (const tx of unfinished) {
      try {
        const recovered = await this.recoverTransaction(tx.transactionId);
        results.push(recovered);
      } catch (e) {
        console.error(`[RECOVERY] Failed to recover transaction ${tx.transactionId}:`, e.message);
      }
    }
    console.log(`[RECOVERY] Scan complete. Recovered ${results.length} transactions.`);
    return { recoveredCount: results.length, transactions: results };
  }

  async recoverTransaction(transactionId) {
    const tx = repository.findById(transactionId);
    if (!tx) throw new Error('TRANSACTION_NOT_FOUND');

    // Idempotent: If already in final state, return as is
    if (tx.status === States.COMMITTED || tx.status === States.ABORTED) {
      return tx;
    }

    console.log(`[RECOVERY] Recovering ${transactionId} (Global Decision: ${tx.decision}, Status: ${tx.status})...`);

    if (tx.decision === 'COMMIT') {
      return await this.runCommitPhase(transactionId);
    } else if (tx.decision === 'ABORT') {
      // Implement runAbortPhase if needed, or similar logic
      return await this.runAbortPhase(transactionId);
    } else {
      // No decision yet? If it's old and stuck in PREPARING, we might want to abort it
      if (tx.status === States.PREPARING || tx.status === States.CREATED) {
        console.log(`[RECOVERY] Aborting undecided transaction ${transactionId}`);
        return await this.abortUndecidedTransaction(transactionId);
      }
    }
  }

  async abortUndecidedTransaction(transactionId) {
    this.setGlobalDecision(transactionId, 'ABORT');
    this.transitionTransaction(transactionId, States.ABORTING);

    const tx = repository.findById(transactionId);
    await Promise.all(tx.participants.map(async (p) => {
      const node = config.nodes.find(n => n.branchId === p.branchId);
      if (node) {
        try {
          await axios.post(`${node.url}/api/internal/transactions/${transactionId}/abort`, {}, { timeout: 2000 });
          this.updateParticipantStatus(transactionId, p.branchId, ParticipantStatus.ABORTED);
        } catch (e) {
          console.error(`[RECOVERY] Failed to send abort to ${p.branchId}:`, e.message);
        }
      }
    }));

    return this.transitionTransaction(transactionId, States.ABORTED);
  }

  // Explicit Abort phase for recovery
  async runAbortPhase(transactionId) {
    let tx = repository.findById(transactionId);
    if (tx.status === States.ABORTED) return tx;

    if (tx.status !== States.ABORTING) {
      this.transitionTransaction(transactionId, States.ABORTING);
    }

    await Promise.all(tx.participants.map(async (p) => {
      if (p.status === ParticipantStatus.ABORTED) return;
      const node = config.nodes.find(n => n.branchId === p.branchId);
      if (node) {
        try {
          await axios.post(`${node.url}/api/internal/transactions/${transactionId}/abort`, {}, { timeout: 2000 });
          this.updateParticipantStatus(transactionId, p.branchId, ParticipantStatus.ABORTED);
        } catch (e) {
          console.error(`[RECOVERY] Failed to send abort to ${p.branchId}:`, e.message);
        }
      }
    }));

    tx = repository.findById(transactionId);
    const allAborted = tx.participants.every(p => p.status === ParticipantStatus.ABORTED);
    if (allAborted) {
      return this.transitionTransaction(transactionId, States.ABORTED);
    }
    return tx;
  }
}

module.exports = new DistributedTransactionService();
