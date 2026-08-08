const express = require('express');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '../../../.env' });

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Basic route
app.get('/', (req, res) => {
  res.json({
    message: 'Direct Wallet Withdrawal Server',
    status: 'running',
    version: '1.0.0'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// API routes placeholder
app.get('/api/status', (req, res) => {
  res.json({
    server: 'online',
    database: process.env.DATABASE_URL ? 'configured' : 'not configured',
    blockchain: process.env.BLOCKCHAIN_NETWORK || 'not configured',
    telegram: process.env.TELEGRAM_BOT_TOKEN ? 'configured' : 'not configured'
  });
});

// Wallet endpoints placeholders
app.post('/api/wallet/connect', (req, res) => {
  res.json({
    message: 'Wallet connection endpoint',
    status: 'coming soon'
  });
});

app.get('/api/wallet/balance', (req, res) => {
  res.json({
    message: 'Wallet balance endpoint',
    status: 'coming soon'
  });
});

// Start server
app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
  console.log(`⚡️[server]: Environment: ${process.env.NODE_ENV}`);
  console.log(`⚡️[server]: Blockchain Network: ${process.env.BLOCKCHAIN_NETWORK || 'not configured'}`);
});
