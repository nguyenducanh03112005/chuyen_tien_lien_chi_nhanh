const path = require('path');
// Set environment before requiring app logic
process.env.BRANCH_ID = 'HN';
process.env.PORT = 3001;
process.env.DATA_DIR = path.join(__dirname, 'data');

const createNodeApp = require('../../shared/src/node_app');
const app = createNodeApp();
const PORT = process.env.PORT;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Branch Node [HN] running on http://0.0.0.0:${PORT}`);
});
