const branches = require('../data/branches.json');

const getBranches = (req, res) => {
  res.json(branches);
};

module.exports = {
  getBranches
};
