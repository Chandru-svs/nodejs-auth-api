const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const stateFile = path.join(os.tmpdir(), 'nodejs-auth-api-mongodb-memory-server.json');

module.exports = async () => {
  try {
    await fs.readFile(stateFile, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw new Error(`Unable to read MongoDB Memory Server state: ${error.message}`);
    }

    return;
  }

  try {
    if (global.__MONGODB_MEMORY_SERVER__) {
      await global.__MONGODB_MEMORY_SERVER__.stop();
    }
  } finally {
    await fs.rm(stateFile, { force: true });
  }
};
