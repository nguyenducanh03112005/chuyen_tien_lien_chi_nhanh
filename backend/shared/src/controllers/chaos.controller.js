const chaosService = require('../services/chaos.service');

const setChaos = (req, res) => {
  const { enabled, failurePoint, failureMode } = req.body;
  chaosService.setChaos(enabled, failurePoint, failureMode);
  res.json({ success: true, config: chaosService.getChaos() });
};

const getChaos = (req, res) => {
  res.json({ success: true, config: chaosService.getChaos() });
};

module.exports = {
  setChaos,
  getChaos
};
