const express = require('express');
const router = express.Router();
const transferController = require('../controllers/transfer.controller');

router.post('/', transferController.createTransfer);
router.get('/', transferController.getTransfers);
router.get('/:id', transferController.getTransferById);

module.exports = router;
