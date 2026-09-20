const axios = require('axios');
const config = require('../config');

const getHealth = (req, res) => {
  res.json({
    status: 'UP',
    service: 'Coordinator',
    timestamp: new Date().toISOString()
  });
};

const getNodesHealth = async (req, res) => {
  const healthResults = await Promise.all(config.nodes.map(async (node) => {
    try {
      const response = await axios.get(`${node.url}/api/health`, { timeout: 2000 });
      return { branchId: node.branchId, url: node.url, status: response.data.status };
    } catch (error) {
      return { branchId: node.branchId, url: node.url, status: 'DOWN' };
    }
  }));
  res.json({ nodes: healthResults });
};

module.exports = {
  getHealth,
  getNodesHealth
};
