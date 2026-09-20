const { v4: uuidv4 } = require('uuid');
const accountRepository = require('../repositories/account.repository');
const transactionRepository = require('../repositories/transaction.repository');

class TransferService {
  async performLocalTransfer(idempotencyKey, transferData) {
    const { sourceAccountId, destinationAccountId, amount, currency } = transferData;

    // 1. Idempotency check
    const existingTx = transactionRepository.findByIdempotencyKey(idempotencyKey);
    if (existingTx) {
      console.log(`Duplicate request with Idempotency-Key: ${idempotencyKey}. Returning existing transaction.`);
      return existingTx;
    }

    // 2. Validation
    if (sourceAccountId === destinationAccountId) {
      throw new Error('SAME_ACCOUNT_TRANSFER');
    }

    if (amount <= 0) {
      throw new Error('INVALID_AMOUNT');
    }

    if (currency !== 'VND') {
      throw new Error('UNSUPPORTED_CURRENCY');
    }

    const sourceAcc = accountRepository.findById(sourceAccountId);
    const destAcc = accountRepository.findById(destinationAccountId);

    if (!sourceAcc) throw new Error('SOURCE_ACCOUNT_NOT_FOUND');
    if (!destAcc) throw new Error('DESTINATION_ACCOUNT_NOT_FOUND');

    if (sourceAcc.status !== 'ACTIVE') throw new Error('SOURCE_ACCOUNT_INACTIVE');
    if (destAcc.status !== 'ACTIVE') throw new Error('DESTINATION_ACCOUNT_INACTIVE');

    if (sourceAcc.balance < amount) {
      throw new Error('INSUFFICIENT_BALANCE');
    }

    // 3. Perform transfer
    const transactionId = `TX-${uuidv4().substring(0, 8).toUpperCase()}`;

    try {
      // Debit source
      sourceAcc.balance -= amount;
      accountRepository.save(sourceAcc);

      // Credit destination
      destAcc.balance += amount;
      accountRepository.save(destAcc);

      // 4. Persist transaction
      const transactionRecord = {
        transactionId,
        idempotencyKey,
        sourceAccountId,
        destinationAccountId,
        amount,
        currency,
        status: 'COMPLETED',
        type: 'LOCAL' // Marking it as local because both accounts are in the same store
      };

      return transactionRepository.save(transactionRecord);
    } catch (error) {
      console.error('Transfer failed:', error);
      // In a real database we'd use a transaction rollback.
      // Here, we'd need manual compensation if one save succeeded and the other didn't.
      // For this PART, we assume file write atomicity or simple sequential writes.
      throw new Error('TRANSFER_EXECUTION_FAILED');
    }
  }

  // Maintaining old method name for compatibility during refactor if needed,
  // but we will move to performLocalTransfer
  createMockTransfer(sourceAccountId, destinationAccountId, amount, currency) {
    return {
      transactionId: `TX-${uuidv4().substring(0, 8).toUpperCase()}`,
      status: 'PREPARING',
      sourceAccountId,
      destinationAccountId,
      amount,
      currency
    };
  }
}

module.exports = new TransferService();
