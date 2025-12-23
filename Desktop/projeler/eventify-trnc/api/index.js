// Vercel Serverless Function Entry Point
// This file exports the Express app for Vercel serverless functions

// Set Vercel environment flag before requiring server
process.env.VERCEL = '1';

// Load environment variables from server/.env if exists
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Try to load .env from server directory
const envPath = path.join(__dirname, '..', 'server', '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  // Fallback to root .env
  dotenv.config();
}

// Now require the server
// Use absolute path to avoid issues
const serverPath = path.join(__dirname, '..', 'server', 'server.js');
const app = require(serverPath);

// Export Express app for Vercel (support both module and handler signatures)
module.exports = app;
module.exports.default = app;
module.exports.handler = (req, res) => app(req, res);

