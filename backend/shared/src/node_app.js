const express = require('express');
const cors = require('cors');
const healthRoutes = require('./routes/health.routes');
const branchRoutes = require('./routes/branch.routes');
const accountRoutes = require('./routes/account.routes');
const transferRoutes = require('./routes/transfer.routes');
const internalRoutes = require('./routes/internal.routes');
const chaosRoutes = require('./routes/chaos.routes');

function createNodeApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Branch nodes might have their own health logic if needed,
  // but for now we reuse the health route which returns status: UP
  app.use('/api/health', healthRoutes);
  app.use('/api/branches', branchRoutes);
  app.use('/api/accounts', accountRoutes);
  app.use('/api/internal', internalRoutes);
  app.use('/api/chaos', chaosRoutes);

  // Same-branch transfers can still work locally on the node
  app.use('/api/transfers', transferRoutes);

  return app;
}

module.exports = createNodeApp;
