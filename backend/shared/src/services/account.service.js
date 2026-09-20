const accountRepository = require('../repositories/account.repository');

class AccountService {
  constructor() {
    this.nodeBranchId = process.env.BRANCH_ID;
  }

  _checkOwnership(account) {
    if (this.nodeBranchId && account && account.branchId !== this.nodeBranchId) {
      return false;
    }
    return true;
  }

  getAllAccounts(branchId) {
    if (branchId) {
      if (this.nodeBranchId && branchId !== this.nodeBranchId) {
        return [];
      }
      return accountRepository.findByBranchId(branchId);
    }
    return accountRepository.findAll();
  }

  getAccountById(id) {
    const account = accountRepository.findById(id);
    if (account && !this._checkOwnership(account)) {
      return null;
    }
    return account;
  }

  createAccount(accountData) {
    const existing = accountRepository.findById(accountData.id);
    if (existing) {
      throw new Error('ACCOUNT_ALREADY_EXISTS');
    }

    if (accountData.balance < 0) {
      throw new Error('INVALID_BALANCE');
    }

    return accountRepository.save(accountData);
  }

  updateAccount(id, accountData) {
    const existing = accountRepository.findById(id);
    if (!existing) {
      throw new Error('ACCOUNT_NOT_FOUND');
    }

    if (accountData.balance !== undefined && accountData.balance < 0) {
      throw new Error('INVALID_BALANCE');
    }

    // ID cannot be changed
    delete accountData.id;

    return accountRepository.save({ ...existing, ...accountData });
  }

  deleteAccount(id) {
    const deleted = accountRepository.delete(id);
    if (!deleted) {
      throw new Error('ACCOUNT_NOT_FOUND');
    }
    return true;
  }
}

module.exports = new AccountService();
