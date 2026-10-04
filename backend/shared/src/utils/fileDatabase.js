const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');

const readData = (fileName) => {
  const filePath = path.join(DATA_DIR, fileName);
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${fileName}:`, error);
    return [];
  }
};

const writeData = (fileName, data) => {
  const filePath = path.join(DATA_DIR, fileName);
  try {
    // Write to a temp file then rename, so a crash mid-write never leaves a
    // truncated JSON file behind (rename is atomic on the same filesystem).
    const tmpPath = `${filePath}.${process.pid}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmpPath, filePath);
    return true;
  } catch (error) {
    // Surface write failures: callers (e.g. a 2PC vote) must not report
    // success for state that was never persisted.
    console.error(`Error writing ${fileName}:`, error);
    throw error;
  }
};

module.exports = {
  readData,
  writeData
};
