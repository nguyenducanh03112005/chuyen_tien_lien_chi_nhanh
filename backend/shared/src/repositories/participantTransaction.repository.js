const { readData, writeData } = require('../utils/fileDatabase');

const FILE_NAME = 'participant_transactions.json';

class ParticipantTransactionRepository {
  findAll() {
    return readData(FILE_NAME);
  }

  findById(id) {
    const transactions = this.findAll();
    return transactions.find(tx => tx.transactionId === id);
  }

  save(transaction) {
    const transactions = this.findAll();
    const index = transactions.findIndex(tx => tx.transactionId === transaction.transactionId);

    if (index !== -1) {
      transactions[index] = {
        ...transactions[index],
        ...transaction,
        updatedAt: new Date().toISOString()
      };
    } else {
      const now = new Date().toISOString();
      transactions.push({
        ...transaction,
        createdAt: now,
        updatedAt: now
      });
    }

    writeData(FILE_NAME, transactions);
    return this.findById(transaction.transactionId);
  }

  delete(id) {
    const transactions = this.findAll();
    const filtered = transactions.filter(tx => tx.transactionId !== id);
    if (transactions.length === filtered.length) return false;
    writeData(FILE_NAME, filtered);
    return true;
  }
}

module.exports = new ParticipantTransactionRepository();
