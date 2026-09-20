const express = require('express');
const router = express.Router();
const accountController = require('../controllers/account.controller');

router.get('/', accountController.getAccounts);
router.get('/:id', accountController.getAccountById);

module.exports = router;
