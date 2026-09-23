const axios = require('axios');
const config = require('../config');
const accountController = require('./account.controller');
const distributedTransactionService = require('../services/distributedTransaction.service');

const createTransfer = async (req, res) => {
  const idempotencyKey = req.headers['idempotency-key'];
  const { sourceAccountId, destinationAccountId, amount, currency } = req.body;

  if (!idempotencyKey) {
    return res.status(400).json({ success: false, message: 'Missing Idempotency-Key header' });
  }

  const sourceBranch = accountController.getBranchIdFromAccountId(sourceAccountId);
  const destBranch = accountController.getBranchIdFromAccountId(destinationAccountId);

  // 1. Same-branch transfer routing (Keep existing local behavior)
  if (sourceBranch === destBranch && sourceBranch) {
    console.log(`\n[COORDINATOR] POST /api/transfers: Local transfer within ${sourceBranch} (${sourceAccountId} -> ${destinationAccountId}, amount: ${amount} ${currency})`);
    const url = accountController.getBranchUrl(sourceBranch);
    try {
      const response = await axios.post(`${url}/api/transfers`, req.body, {
        headers: { 'Idempotency-Key': idempotencyKey }
      });
      return res.json(response.data);
    } catch (error) {
      if (error.response) return res.status(error.response.status).json(error.response.data);
      return res.status(503).json({ success: false, message: `Node ${sourceBranch} unavailable` });
    }
  }

  // 2. Cross-branch transfer (Distributed Transaction Model)
  if (!sourceBranch || !destBranch) {
    return res.status(400).json({ success: false, message: 'Invalid account ID format' });
  }

  console.log(`\n[COORDINATOR] POST /api/transfers: Cross-branch 2PC transfer (${sourceAccountId} -> ${destinationAccountId}, amount: ${amount} ${currency})`);

  try {
    let transaction = distributedTransactionService.createTransaction({
      idempotencyKey,
      sourceAccountId,
      destinationAccountId,
      sourceBranchId: sourceBranch,
      destinationBranchId: destBranch,
      amount: parseInt(amount),
      currency
    });

    // If transaction is already beyond CREATED, just return it (Idempotency)
    if (transaction.status !== 'CREATED') {
      return res.json(transaction);
    }

    // Run Prepare Phase
    transaction = await distributedTransactionService.runPreparePhase(transaction.transactionId);

    // If PREPARED, proceed to COMMIT
    if (transaction.status === 'PREPARED') {
      transaction = await distributedTransactionService.runCommitPhase(transaction.transactionId);
    }

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTransferById = (req, res) => {
  const { id } = req.params;

  // Try to find in distributed transactions first
  const distTx = distributedTransactionService.getTransaction(id);
  if (distTx) return res.json({ success: true, data: distTx });

  // For same-branch, we'd need to search all nodes or know which node owned it.
  // This is a known limitation of the current mock/foundation setup.
  res.status(404).json({ success: false, message: 'Transaction not found or not a distributed transaction' });
};

const getTransfers = async (req, res) => {
  try {
    // 1. Get all distributed transactions from Coordinator's repository
    const distributedTransactions = distributedTransactionService.getAllTransactions();

    // 2. Aggregate local transactions from all branch nodes
    const nodeTransactions = await Promise.all(config.nodes.map(async (node) => {
      try {
        const response = await axios.get(`${node.url}/api/transfers`, { timeout: 2000 });
        return response.data.data || [];
      } catch (e) {
        console.error(`Error fetching transactions from ${node.branchId}:`, e.message);
        return [];
      }
    }));

    // 3. Combine and sort by createdAt descending
    const allTransactions = [...distributedTransactions, ...nodeTransactions.flat()];
    allTransactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, data: allTransactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const recoverTransfer = async (req, res) => {
  const { id } = req.params;
  try {
    const transaction = await distributedTransactionService.recoverTransaction(id);
    res.json({ success: true, data: transaction });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const recoverAllTransfers = async (req, res) => {
  try {
    const result = await distributedTransactionService.recoverTransactions();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createTransfer,
  getTransferById,
  getTransfers,
  recoverTransfer,
  recoverAllTransfers
};
