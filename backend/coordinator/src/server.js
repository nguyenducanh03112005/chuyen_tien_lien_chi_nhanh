const express = require('express');
const cors = require('cors');
const config = require('./config');
const healthRoutes = require('./routes/health.routes');
const branchRoutes = require('./routes/branch.routes');
const accountRoutes = require('./routes/account.routes');
const transferRoutes = require('./routes/transfer.routes');
const chaosRoutes = require('../../shared/src/routes/chaos.routes');

const app = express();
const PORT = config.port || 3000;

const distributedTransactionService = require('./services/distributedTransaction.service');

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/chaos', chaosRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Coordinator running on http://0.0.0.0:${PORT}`);

  // Trigger recovery on startup
  setTimeout(() => {
    distributedTransactionService.recoverTransactions();
  }, 5000); // Wait 5s for participants to be potentially ready
});
