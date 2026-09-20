const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branch.controller');

router.get('/', branchController.getBranches);

module.exports = router;
