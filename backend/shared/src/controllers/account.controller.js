const accountService = require('../services/account.service');

const getAccounts = (req, res) => {
  const { branchId } = req.query;
  try {
    const accounts = accountService.getAllAccounts(branchId);
    res.json({ success: true, data: accounts });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const getAccountById = (req, res) => {
  const { id } = req.params;
  const account = accountService.getAccountById(id);
  if (!account) {
    return res.status(404).json({
      success: false,
      error: { code: 'ACCOUNT_NOT_FOUND', message: `Account ${id} not found` }
    });
  }
  res.json({ success: true, data: account });
};

const createAccount = (req, res) => {
  try {
    const account = accountService.createAccount(req.body);
    res.status(201).json({ success: true, data: account });
  } catch (error) {
    if (error.message === 'ACCOUNT_ALREADY_EXISTS') {
      return res.status(409).json({ success: false, error: { code: error.message, message: 'Account ID already exists' } });
    }
    if (error.message === 'INVALID_BALANCE') {
      return res.status(400).json({ success: false, error: { code: error.message, message: 'Balance must be >= 0' } });
    }
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};

const updateAccount = (req, res) => {
  const { id } = req.params;
  try {
    const account = accountService.updateAccount(id, req.body);
    res.json({ success: true, data: account });
  } catch (error) {
    if (error.message === 'ACCOUNT_NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: error.message, message: `Account ${id} not found` } });
    }
    if (error.message === 'INVALID_BALANCE') {
      return res.status(400).json({ success: false, error: { code: error.message, message: 'Balance must be >= 0' } });
    }
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};

const deleteAccount = (req, res) => {
  const { id } = req.params;
  try {
    accountService.deleteAccount(id);
    res.json({ success: true, message: `Account ${id} deleted successfully` });
  } catch (error) {
    if (error.message === 'ACCOUNT_NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: error.message, message: `Account ${id} not found` } });
    }
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

module.exports = {
  getAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount
};
