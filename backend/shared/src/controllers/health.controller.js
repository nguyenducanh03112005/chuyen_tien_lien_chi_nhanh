const getHealth = (req, res) => {
  res.json({
    status: 'UP',
    service: 'Mock Banking Server',
    branchId: process.env.BRANCH_ID || 'COORDINATOR'
  });
};

module.exports = {
  getHealth
};
