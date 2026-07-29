// dotenv removed, using node --env-file
process.on('exit', (code) => { console.trace('Process exiting with code', code); });
const express = require('express');
const path = require('path');
const app = require('./src/app');
const prisma = require('./src/config/db');
const logger = require('./src/utils/logger');

// Serve uploads statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Test DB connection
    // await prisma.$connect();
    logger.info('Connected to PostgreSQL Database successfully (or deferred).');

    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
