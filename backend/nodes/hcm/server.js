const path = require('path');
process.env.BRANCH_ID = 'HCM';
process.env.PORT = 3002;
process.env.DATA_DIR = path.join(__dirname, 'data');

const createNodeApp = require('../../shared/src/node_app');
const app = createNodeApp();
const PORT = process.env.PORT;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Branch Node [HCM] running on http://0.0.0.0:${PORT}`);
});
