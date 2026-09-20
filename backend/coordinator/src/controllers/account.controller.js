const axios = require('axios');
const config = require('../config');

const getBranchUrl = (branchId) => {
  const node = config.nodes.find(n => n.branchId === branchId);
  return node ? node.url : null;
};

const getBranchIdFromAccountId = (accountId) => {
  if (accountId.startsWith('HN-')) return 'HN';
  if (accountId.startsWith('HCM-')) return 'HCM';
  if (accountId.startsWith('DN-')) return 'DN';
  return null;
};

const getAccounts = async (req, res) => {
  const { branchId } = req.query;

  if (branchId) {
    const url = getBranchUrl(branchId);
    if (!url) return res.status(404).json({ success: false, message: 'Branch not found' });
    try {
      const response = await axios.get(`${url}/api/accounts`);
      return res.json({ success: true, data: response.data.data || response.data });
    } catch (error) {
      return res.status(503).json({ success: false, message: `Node ${branchId} unavailable` });
    }
  }

  // Aggregate all
  try {
    const allAccounts = await Promise.all(config.nodes.map(async (node) => {
      try {
        const response = await axios.get(`${node.url}/api/accounts`, { timeout: 2000 });
        return response.data.data || response.data;
      } catch (e) {
        console.error(`Error fetching from ${node.branchId}:`, e.message);
        return [];
      }
    }));
    res.json({ success: true, data: allAccounts.flat() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAccountById = async (req, res) => {
  const { id } = req.params;
  const branchId = getBranchIdFromAccountId(id);
  const url = getBranchUrl(branchId);

  if (!url) return res.status(404).json({ success: false, error: { message: 'Account not found (Invalid branch prefix)' } });

  try {
    const response = await axios.get(`${url}/api/accounts/${id}`);
    res.json(response.data);
  } catch (error) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(503).json({ success: false, message: `Node ${branchId} unavailable` });
    }
  }
};

module.exports = {
  getAccounts,
  getAccountById,
  getBranchIdFromAccountId,
  getBranchUrl
};
