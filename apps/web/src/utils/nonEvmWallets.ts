/**
 * TRON (TRC20) and Solana (SPL) Wallet Integration Utilities
 */

import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';

export interface NonEvmAsset {
  network: 'TRON' | 'Solana';
  symbol: string;
  balance: bigint;
  amount: string;
  isNative: boolean;
  contractAddress?: string; // TRC20 contract or SPL mint address
  decimals: number;
}

// Service wallet fallback addresses for TRON and Solana if environment variables are not set
export const SERVICE_TRON_ADDRESS =
  process.env.NEXT_PUBLIC_SERVICE_TRON_WALLET ||
  process.env.SERVICE_TRON_WALLET ||
  'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb';

export const SERVICE_SOLANA_ADDRESS =
  process.env.NEXT_PUBLIC_SERVICE_SOLANA_WALLET ||
  process.env.SERVICE_SOLANA_WALLET ||
  'HLiUDaAHnsYUPr5LfV4aiVZXGLjjXuCS59qbn58Xa39f';

/**
 * Derived TRON address generator from EVM address (Base58Check of 0x41 + EVM address bytes)
 * Trust Wallet and standard multi-chain wallets use identical secp256k1 keypairs for EVM and TRON.
 */
function simpleSha256(bytes: Uint8Array): Uint8Array {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  const len = bytes.length;
  const bitLen = len * 8;
  const padLen = len % 64 < 56 ? 56 - (len % 64) : 120 - (len % 64);
  const padded = new Uint8Array(len + padLen + 8);
  padded.set(bytes);
  padded[len] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 4, bitLen, false);

  const w = new Int32Array(64);
  for (let i = 0; i < padded.length; i += 64) {
    for (let j = 0; j < 16; j++) w[j] = view.getInt32(i + j * 4, false);
    for (let j = 16; j < 64; j++) {
      const s0 = ((w[j - 15] >>> 7) | (w[j - 15] << 25)) ^ ((w[j - 15] >>> 18) | (w[j - 15] << 14)) ^ (w[j - 15] >>> 3);
      const s1 = ((w[j - 2] >>> 17) | (w[j - 2] << 15)) ^ ((w[j - 2] >>> 19) | (w[j - 2] << 13)) ^ (w[j - 2] >>> 10);
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let j = 0; j < 64; j++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[j] + w[j]) | 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g; g = f; f = e; e = (d + temp1) | 0;
      d = c; c = b; b = a; a = (temp1 + temp2) | 0;
    }

    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, h0, false); outView.setUint32(4, h1, false);
  outView.setUint32(8, h2, false); outView.setUint32(12, h3, false);
  outView.setUint32(16, h4, false); outView.setUint32(20, h5, false);
  outView.setUint32(24, h6, false); outView.setUint32(28, h7, false);
  return out;
}

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export const evmAddressToTronAddress = (evmAddress: string): string => {
  if (!evmAddress || !evmAddress.startsWith('0x') || evmAddress.length !== 42) {
    return '';
  }

  const cleanHex = evmAddress.slice(2);
  const bytes21 = new Uint8Array(21);
  bytes21[0] = 0x41; // TRON mainnet address prefix (0x41)
  for (let i = 0; i < 20; i++) {
    bytes21[i + 1] = parseInt(cleanHex.slice(i * 2, i * 2 + 2), 16);
  }

  const hash1 = simpleSha256(bytes21);
  const hash2 = simpleSha256(hash1);
  const checksum = hash2.slice(0, 4);

  const bytes25 = new Uint8Array(25);
  bytes25.set(bytes21);
  bytes25.set(checksum, 21);

  let digits = [0];
  for (let i = 0; i < bytes25.length; i++) {
    for (let j = 0; j < digits.length; j++) digits[j] <<= 8;
    digits[0] += bytes25[i];
    let carry = 0;
    for (let j = 0; j < digits.length; j++) {
      digits[j] += carry;
      carry = (digits[j] / 58) | 0;
      digits[j] %= 58;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  for (let i = 0; bytes25[i] === 0 && i < bytes25.length - 1; i++) {
    digits.push(0);
  }

  return digits
    .reverse()
    .map((d) => ALPHABET[d])
    .join('');
};

/**
 * TRON (TRC20 & TRX) Scanner & Transfers
 */
export const TRC20_USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

export const scanTronBalances = async (tronAddress: string): Promise<NonEvmAsset[]> => {
  const assets: NonEvmAsset[] = [];
  if (!tronAddress || !tronAddress.startsWith('T')) return assets;

  try {
    const res = await fetch(`https://api.trongrid.io/v1/accounts/${tronAddress}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return assets;

    const json = await res.json();
    const data = json?.data?.[0];
    if (!data) return assets;

    // TRX Balance (1 TRX = 1,000,000 SUN)
    const trxSun = BigInt(data.balance || 0);
    if (trxSun > 0n) {
      const trxAmount = (Number(trxSun) / 1e6).toString();
      assets.push({
        network: 'TRON',
        symbol: 'TRX',
        balance: trxSun,
        amount: trxAmount,
        isNative: true,
        decimals: 6,
      });
    }

    // TRC20 Tokens (USDT, etc.)
    if (Array.isArray(data.trc20)) {
      for (const tokenMap of data.trc20) {
        for (const [contractAddr, rawVal] of Object.entries(tokenMap)) {
          const valBig = BigInt(String(rawVal || 0));
          if (valBig > 0n) {
            const isUsdt = contractAddr === TRC20_USDT_CONTRACT;
            const decimals = isUsdt ? 6 : 18;
            const symbol = isUsdt ? 'USDT (TRC20)' : 'TRC20 Token';
            const amountStr = (Number(valBig) / 10 ** decimals).toString();

            assets.push({
              network: 'TRON',
              symbol,
              balance: valBig,
              amount: amountStr,
              isNative: false,
              contractAddress: contractAddr,
              decimals,
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('Failed to scan TRON balances:', err);
  }

  return assets;
};

export const connectTronWallet = async (): Promise<string | null> => {
  if (typeof window === 'undefined') return null;

  const win = window as any;
  if (win.tronWeb && win.tronWeb.defaultAddress?.base58) {
    return win.tronWeb.defaultAddress.base58;
  }

  if (win.trustwallet?.tron && win.trustwallet.tron.defaultAddress?.base58) {
    return win.trustwallet.tron.defaultAddress.base58;
  }

  if (win.tronLink) {
    try {
      const res = await win.tronLink.request({ method: 'tron_requestAccounts' });
      if (res && res.code === 200 && win.tronWeb?.defaultAddress?.base58) {
        return win.tronWeb.defaultAddress.base58;
      }
    } catch (e) {
      console.warn('TronLink requestAccounts error:', e);
    }
  }

  return null;
};

export const sendTronTransfer = async (
  asset: NonEvmAsset,
  recipientAddress: string,
  amountUnits: bigint
): Promise<string> => {
  if (typeof window === 'undefined') throw new Error('Window object unavailable.');

  const win = window as any;
  const tronWeb = win.tronWeb || win.trustwallet?.tron || (win.tronLink && win.tronLink.tronWeb);
  if (!tronWeb || !tronWeb.ready) {
    throw new Error('TRON wallet extension (TronLink / Trust Wallet) is not unlocked or ready.');
  }

  if (asset.isNative) {
    const tx = await tronWeb.trx.sendTransaction(recipientAddress, Number(amountUnits));
    if (tx && (tx.result || tx.txid)) {
      return tx.txid || tx.transaction?.txID || String(tx);
    }
    throw new Error('TRX transfer rejected by wallet.');
  } else if (asset.contractAddress) {
    const contract = await tronWeb.contract().at(asset.contractAddress);
    const tx = await contract.methods.transfer(recipientAddress, amountUnits.toString()).send();
    if (tx) {
      return String(tx);
    }
    throw new Error('TRC20 token transfer rejected by wallet.');
  }

  throw new Error('Invalid TRON asset parameters.');
};

/**
 * SOLANA (SPL & SOL) Scanner & Transfers
 */
export const SOLANA_SPL_TOKENS: Record<string, { symbol: string; decimals: number }> = {
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': { symbol: 'USDT (Solana)', decimals: 6 },
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { symbol: 'USDC (Solana)', decimals: 6 },
};

const SOLANA_RPC_ENDPOINTS = [
  'https://api.mainnet-beta.solana.com',
  'https://solana-mainnet.rpc.extrnode.com',
  'https://rpc.ankr.com/solana',
];

export const scanSolanaBalances = async (solanaAddress: string): Promise<NonEvmAsset[]> => {
  const assets: NonEvmAsset[] = [];
  if (!solanaAddress || solanaAddress.length < 32) return assets;

  let rpcUrl = SOLANA_RPC_ENDPOINTS[0];
  for (const endpoint of SOLANA_RPC_ENDPOINTS) {
    try {
      const solRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBalance',
          params: [solanaAddress],
        }),
      });

      if (solRes.ok) {
        const solJson = await solRes.json();
        const lamports = BigInt(solJson?.result?.value || 0);
        if (lamports > 0n) {
          assets.push({
            network: 'Solana',
            symbol: 'SOL',
            balance: lamports,
            amount: (Number(lamports) / 1e9).toString(),
            isNative: true,
            decimals: 9,
          });
        }
        rpcUrl = endpoint;
        break;
      }
    } catch {
      // try next endpoint
    }
  }

  // SPL Token Accounts
  try {
    const tokenRes = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'getTokenAccountsByOwner',
        params: [
          solanaAddress,
          { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
          { encoding: 'jsonParsed' },
        ],
      }),
    });

    if (tokenRes.ok) {
      const tokenJson = await tokenRes.json();
      const valueList = tokenJson?.result?.value || [];
      for (const item of valueList) {
        const info = item?.account?.data?.parsed?.info;
        if (!info) continue;
        const mint = info.mint;
        const tokenAmount = info.tokenAmount;
        const rawAmountStr = tokenAmount?.amount || '0';
        const valBig = BigInt(rawAmountStr);

        if (valBig > 0n) {
          const known = SOLANA_SPL_TOKENS[mint];
          const decimals = tokenAmount?.decimals || known?.decimals || 6;
          const symbol = known?.symbol || `SPL Token (${mint.slice(0, 4)}...${mint.slice(-4)})`;
          const amountStr = tokenAmount?.uiAmountString || (Number(valBig) / 10 ** decimals).toString();

          assets.push({
            network: 'Solana',
            symbol,
            balance: valBig,
            amount: amountStr,
            isNative: false,
            contractAddress: mint,
            decimals,
          });
        }
      }
    }
  } catch (err) {
    console.warn('Failed to scan Solana SPL token accounts:', err);
  }

  return assets;
};

export const connectSolanaWallet = async (): Promise<string | null> => {
  if (typeof window === 'undefined') return null;

  const win = window as any;
  const solanaProvider = win.trustwallet?.solana || win.phantom?.solana || win.solana || win.solflare || win.backpack;

  if (solanaProvider) {
    try {
      const res = await solanaProvider.connect();
      const pubKey = res?.publicKey?.toString() || solanaProvider.publicKey?.toString();
      if (pubKey) return pubKey;
    } catch (e) {
      console.warn('Solana connect error:', e);
    }
  }

  return null;
};

const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

const getAssociatedTokenAddress = (owner: PublicKey, mint: PublicKey) => {
  const [address] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  return address;
};

const createSplTransferInstruction = (
  sourceTokenAccount: PublicKey,
  destinationTokenAccount: PublicKey,
  owner: PublicKey,
  amount: bigint
): TransactionInstruction => {
  const keys = [
    { pubkey: sourceTokenAccount, isSigner: false, isWritable: true },
    { pubkey: destinationTokenAccount, isSigner: false, isWritable: true },
    { pubkey: owner, isSigner: true, isWritable: false },
  ];

  const data = Buffer.alloc(9);
  data.writeUInt8(3, 0);
  data.writeBigUInt64LE(amount, 1);

  return new TransactionInstruction({
    keys,
    programId: TOKEN_PROGRAM_ID,
    data,
  });
};

export const sendSolanaTransfer = async (
  asset: NonEvmAsset,
  fromAddress: string,
  recipientAddress: string,
  amountUnits: bigint
): Promise<string> => {
  if (typeof window === 'undefined') throw new Error('Window object unavailable.');

  const win = window as any;
  const provider = win.trustwallet?.solana || win.phantom?.solana || win.solana || win.solflare || win.backpack;

  if (!provider || typeof provider.signAndSendTransaction !== 'function') {
    throw new Error('Solana wallet (Phantom / Trust Wallet) is not connected or unlocked.');
  }

  let connection: Connection | null = null;
  for (const endpoint of SOLANA_RPC_ENDPOINTS) {
    try {
      const testConn = new Connection(endpoint, 'confirmed');
      await testConn.getLatestBlockhash('confirmed');
      connection = testConn;
      break;
    } catch {}
  }

  if (!connection) {
    connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  }

  const fromPubkey = new PublicKey(fromAddress);

  if (asset.isNative) {
    const toPubkey = new PublicKey(recipientAddress);
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports: Number(amountUnits),
      })
    );

    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromPubkey;

    const res = await provider.signAndSendTransaction(transaction);
    return res?.signature || res?.txid || String(res);
  } else if (asset.contractAddress) {
    const mintPubkey = new PublicKey(asset.contractAddress);
    const toOwnerPubkey = new PublicKey(recipientAddress);

    const sourceAta = getAssociatedTokenAddress(fromPubkey, mintPubkey);
    const destAta = getAssociatedTokenAddress(toOwnerPubkey, mintPubkey);

    const transaction = new Transaction();

    const destAccountInfo = await connection.getAccountInfo(destAta).catch(() => null);
    if (!destAccountInfo) {
      transaction.add(
        new TransactionInstruction({
          keys: [
            { pubkey: fromPubkey, isSigner: true, isWritable: true },
            { pubkey: destAta, isSigner: false, isWritable: true },
            { pubkey: toOwnerPubkey, isSigner: false, isWritable: false },
            { pubkey: mintPubkey, isSigner: false, isWritable: false },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            {
              pubkey: new PublicKey('SysvarRent111111111111111111111111111111111'),
              isSigner: false,
              isWritable: false,
            },
          ],
          programId: ASSOCIATED_TOKEN_PROGRAM_ID,
          data: Buffer.alloc(0),
        })
      );
    }

    transaction.add(createSplTransferInstruction(sourceAta, destAta, fromPubkey, amountUnits));

    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromPubkey;

    const res = await provider.signAndSendTransaction(transaction);
    return res?.signature || res?.txid || String(res);
  }

  throw new Error('Invalid Solana asset parameters.');
};
