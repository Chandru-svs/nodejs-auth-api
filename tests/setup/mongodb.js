const mongoose = require('mongoose');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const stateFile = path.join(os.tmpdir(), 'nodejs-auth-api-mongodb-memory-server.json');
let databaseName;

beforeAll(async () => {
  const { uri } = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  databaseName = `test_${process.pid}_${process.env.JEST_WORKER_ID || 'worker'}_${crypto.randomUUID()}`;

  await mongoose.connect(uri, { dbName: databaseName });
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
  }
  await mongoose.disconnect();
});
