"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config({ path: '../../../.env' });
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
// Middleware
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
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
        blockchain: process.env.BLOCKCHAIN_NETWORK || 'not configured'
    });
});
// Start server
app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
    console.log(`⚡️[server]: Environment: ${process.env.NODE_ENV}`);
});
//# sourceMappingURL=index.js.map