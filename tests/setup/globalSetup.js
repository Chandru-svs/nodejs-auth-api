const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { MongoMemoryServer } = require('mongodb-memory-server');

const stateFile = path.join(os.tmpdir(), 'nodejs-auth-api-mongodb-memory-server.json');

module.exports = async () => {
  let mongoServer;

  try {
    mongoServer = await MongoMemoryServer.create();
    await fs.writeFile(stateFile, JSON.stringify({ uri: mongoServer.getUri() }), 'utf8');
    global.__MONGODB_MEMORY_SERVER__ = mongoServer;
  } catch (error) {
    if (mongoServer) {
      await mongoServer.stop().catch(() => {});
    }

    throw new Error(`Unable to start MongoDB Memory Server: ${error.message}`);
  }
};
