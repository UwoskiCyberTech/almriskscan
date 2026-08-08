import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../../../.env' });

const app: Express = express();
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
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Direct Wallet Withdrawal Server',
    status: 'running',
    version: '1.0.0'
  });
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// API routes placeholder
app.get('/api/status', (req: Request, res: Response) => {
  res.json({
    server: 'online',
    database: process.env.DATABASE_URL ? 'configured' : 'not configured',
    blockchain: process.env.BLOCKCHAIN_NETWORK || 'not configured'
  });
});

// Start server
app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
  console.log(`⚡️[server]: Environment: ${process.env.NODE_ENV}`);
});
