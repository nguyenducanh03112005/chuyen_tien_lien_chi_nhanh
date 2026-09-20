const express = require('express');
const cors = require('cors');
const healthRoutes = require('./routes/health.routes');
const branchRoutes = require('./routes/branch.routes');
const accountRoutes = require('./routes/account.routes');
const transferRoutes = require('./routes/transfer.routes');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transfers', transferRoutes);

// 4. Listen on 0.0.0.0:3000
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Mock Server running on http://0.0.0.0:${PORT}`);
});
