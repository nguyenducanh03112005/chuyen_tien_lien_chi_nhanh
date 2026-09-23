const twoPhaseCommitService = require('../services/twoPhaseCommit.service');

const prepare = async (req, res) => {
  const { transactionId } = req.params;
  const branchId = process.env.BRANCH_ID || 'NODE';
  try {
    const result = await twoPhaseCommitService.prepare(transactionId, req.body);
    console.log(`[${branchId}] POST /api/internal/transactions/${transactionId}/prepare -> Vote ${result.vote}${result.reason ? ' (' + result.reason + ')' : ''}`);
    res.json(result);
  } catch (error) {
    console.error(`[${branchId}] POST /api/internal/transactions/${transactionId}/prepare -> Vote NO (${error.message})`);
    res.status(500).json({ vote: 'NO', reason: 'INTERNAL_ERROR', message: error.message });
  }
};

const abort = async (req, res) => {
  const { transactionId } = req.params;
  const branchId = process.env.BRANCH_ID || 'NODE';
  try {
    const result = await twoPhaseCommitService.abort(transactionId);
    console.log(`[${branchId}] POST /api/internal/transactions/${transactionId}/abort -> ${result.status}`);
    res.json(result);
  } catch (error) {
    console.error(`[${branchId}] POST /api/internal/transactions/${transactionId}/abort -> FAILED (${error.message})`);
    res.status(500).json({ status: 'FAILED', message: error.message });
  }
};

const commit = async (req, res) => {
  const { transactionId } = req.params;
  const branchId = process.env.BRANCH_ID || 'NODE';
  try {
    const result = await twoPhaseCommitService.commit(transactionId);
    console.log(`[${branchId}] POST /api/internal/transactions/${transactionId}/commit -> ${result.status}`);
    res.json(result);
  } catch (error) {
    console.error(`[${branchId}] POST /api/internal/transactions/${transactionId}/commit -> FAILED (${error.message})`);
    res.status(500).json({ status: 'FAILED', message: error.message });
  }
};

module.exports = {
  prepare,
  abort,
  commit
};

