const express = require('express');
const router = express.Router();
const twoPhaseCommitController = require('../controllers/twoPhaseCommit.controller');

router.post('/transactions/:transactionId/prepare', twoPhaseCommitController.prepare);
router.post('/transactions/:transactionId/abort', twoPhaseCommitController.abort);
router.post('/transactions/:transactionId/commit', twoPhaseCommitController.commit);

module.exports = router;
