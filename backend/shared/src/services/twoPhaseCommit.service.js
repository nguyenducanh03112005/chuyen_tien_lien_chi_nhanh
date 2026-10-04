const accountRepository = require('../repositories/account.repository');
const participantTxRepository = require('../repositories/participantTransaction.repository');
const chaosService = require('./chaos.service');
const { parseAmount } = require('../utils/amount');

class TwoPhaseCommitService {
  async prepare(transactionId, data) {
    const { sourceAccountId, destinationAccountId, amount, currency, role } = data;
    const branchId = process.env.BRANCH_ID;

    // Chaos Injection
    await chaosService.applyFailure('PREPARE', `Node ${branchId} preparing ${transactionId}`);
    const existing = participantTxRepository.findById(transactionId);
    if (existing) {
      // Aborted earlier (possibly before this PREPARE arrived): never vote YES
      if (existing.status === 'ABORTED') {
        return { vote: 'NO', reason: 'ALREADY_ABORTED' };
      }
      // If already prepared with different data, reject
      if (existing.amount !== amount || existing.role !== role) {
        return { vote: 'NO', reason: 'CONFLICTING_PREPARE_DATA' };
      }
      return { vote: 'YES', status: existing.status };
    }

    // 2. Validation
    if (parseAmount(amount) !== amount) return { vote: 'NO', reason: 'INVALID_AMOUNT' };
    if (role !== 'SOURCE' && role !== 'DESTINATION') return { vote: 'NO', reason: 'INVALID_ROLE' };

    const accountId = role === 'SOURCE' ? sourceAccountId : destinationAccountId;
    const account = accountRepository.findById(accountId);

    if (!account) return { vote: 'NO', reason: 'ACCOUNT_NOT_FOUND' };
    if (account.branchId !== branchId) return { vote: 'NO', reason: 'WRONG_BRANCH' };
    if (account.status !== 'ACTIVE') return { vote: 'NO', reason: 'ACCOUNT_NOT_ACTIVE' };
    if (account.currency !== currency) return { vote: 'NO', reason: 'CURRENCY_MISMATCH' };

    if (role === 'SOURCE') {
      const reserved = account.reservedBalance || 0;
      const available = account.balance - reserved;
      if (available < amount) {
        return { vote: 'NO', reason: 'INSUFFICIENT_BALANCE' };
      }

      // 3. Reserve funds for SOURCE
      account.reservedBalance = reserved + amount;
      accountRepository.save(account);
    }

    // 4. Persist participant transaction state
    const participantTx = {
      transactionId,
      branchId,
      role,
      accountId,
      amount,
      currency,
      status: 'PREPARED',
      reservedAmount: role === 'SOURCE' ? amount : 0
    };

    participantTxRepository.save(participantTx);

    return {
      vote: 'YES',
      transactionId,
      branchId,
      role,
      status: 'PREPARED'
    };
  }

  // Abort logic (needed if Prepare fails globally)
  async abort(transactionId) {
    const participantTx = participantTxRepository.findById(transactionId);
    if (!participantTx) {
      // Record a tombstone so a delayed PREPARE for this transaction votes NO
      // instead of reserving funds that nobody will ever release.
      participantTxRepository.save({
        transactionId,
        branchId: process.env.BRANCH_ID,
        status: 'ABORTED',
        reservedAmount: 0
      });
      return { status: 'ABORTED', message: 'NOT_FOUND' };
    }

    if (participantTx.status === 'COMMITTED') {
      throw new Error('CANNOT_ABORT_COMMITTED_TRANSACTION');
    }

    if (participantTx.role === 'SOURCE' && participantTx.status === 'PREPARED') {
      const account = accountRepository.findById(participantTx.accountId);
      if (account) {
        account.reservedBalance = (account.reservedBalance || 0) - participantTx.reservedAmount;
        if (account.reservedBalance < 0) account.reservedBalance = 0;
        accountRepository.save(account);
      }
    }

    participantTx.status = 'ABORTED';
    participantTxRepository.save(participantTx);

    return { status: 'ABORTED' };
  }

  async commit(transactionId) {
    const participantTx = participantTxRepository.findById(transactionId);
    if (!participantTx) return { status: 'FAILED', message: 'TRANSACTION_NOT_FOUND' };

    const branchId = process.env.BRANCH_ID;

    // Chaos Injection
    await chaosService.applyFailure('COMMIT', `Node ${branchId} committing ${transactionId}`);
    if (participantTx.status === 'COMMITTED') {
      return { status: 'COMMITTED', message: 'ALREADY_COMMITTED' };
    }

    if (participantTx.status !== 'PREPARED') {
      return { status: 'FAILED', message: `INVALID_STATUS_FOR_COMMIT: ${participantTx.status}` };
    }

    // 2. Load Account
    const account = accountRepository.findById(participantTx.accountId);
    if (!account) return { status: 'FAILED', message: 'ACCOUNT_NOT_FOUND' };

    // 3. Apply Money Movement
    if (participantTx.role === 'SOURCE') {
      // Final Debit
      account.balance -= participantTx.amount;
      // Release Reservation
      account.reservedBalance = (account.reservedBalance || 0) - participantTx.reservedAmount;
      if (account.reservedBalance < 0) account.reservedBalance = 0;
    } else if (participantTx.role === 'DESTINATION') {
      // Final Credit
      account.balance += participantTx.amount;
    }

    // 4. Update Participant Transaction state
    participantTx.status = 'COMMITTED';

    // 5. Persist both
    accountRepository.save(account);
    participantTxRepository.save(participantTx);

    return {
      status: 'COMMITTED',
      transactionId,
      branchId: participantTx.branchId,
      role: participantTx.role
    };
  }
}

module.exports = new TwoPhaseCommitService();
