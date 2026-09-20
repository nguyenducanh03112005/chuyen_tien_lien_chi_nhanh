const { readData, writeData } = require('../utils/fileDatabase');

const FILE_NAME = 'accounts.json';

class AccountRepository {
  findAll() {
    return readData(FILE_NAME);
  }

  findByBranchId(branchId) {
    const accounts = this.findAll();
    return accounts.filter(acc => acc.branchId === branchId);
  }

  findById(id) {
    const accounts = this.findAll();
    return accounts.find(acc => acc.id === id);
  }

  save(account) {
    const accounts = this.findAll();
    const index = accounts.findIndex(acc => acc.id === account.id);

    if (index !== -1) {
      // Update
      accounts[index] = { ...accounts[index], ...account, updatedAt: new Date().toISOString() };
    } else {
      // Create
      const now = new Date().toISOString();
      accounts.push({
        ...account,
        createdAt: now,
        updatedAt: now
      });
    }

    writeData(FILE_NAME, accounts);
    return this.findById(account.id);
  }

  delete(id) {
    const accounts = this.findAll();
    const filtered = accounts.filter(acc => acc.id !== id);
    if (accounts.length === filtered.length) {
      return false;
    }
    writeData(FILE_NAME, filtered);
    return true;
  }
}

module.exports = new AccountRepository();
