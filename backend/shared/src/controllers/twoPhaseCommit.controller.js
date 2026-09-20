const twoPhaseCommitService = require('../services/twoPhaseCommit.service');

const prepare = async (req, res) => {
  const { transactionId } = req.params;
  try {
    const result = await twoPhaseCommitService.prepare(transactionId, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ vote: 'NO', reason: 'INTERNAL_ERROR', message: error.message });
  }
};

const abort = async (req, res) => {
  const { transactionId } = req.params;
  try {
    const result = await twoPhaseCommitService.abort(transactionId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ status: 'FAILED', message: error.message });
  }
};

const commit = async (req, res) => {
  const { transactionId } = req.params;
  try {
    const result = await twoPhaseCommitService.commit(transactionId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ status: 'FAILED', message: error.message });
  }
};

module.exports = {
  prepare,
  abort,
  commit
};
