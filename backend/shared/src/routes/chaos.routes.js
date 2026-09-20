const express = require('express');
const router = express.Router();
const chaosController = require('../controllers/chaos.controller');

router.post('/', chaosController.setChaos);
router.get('/', chaosController.getChaos);

module.exports = router;
