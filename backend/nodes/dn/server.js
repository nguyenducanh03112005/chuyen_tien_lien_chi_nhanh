const path = require('path');
process.env.BRANCH_ID = 'DN';
process.env.PORT = 3003;
process.env.DATA_DIR = path.join(__dirname, 'data');

const createNodeApp = require('../../shared/src/node_app');
const app = createNodeApp();
const PORT = process.env.PORT;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Branch Node [DN] running on http://0.0.0.0:${PORT}`);
});
