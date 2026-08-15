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
  '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';

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
  const tronWeb = win.tronWeb || (win.tronLink && win.tronLink.tronWeb);
  if (!tronWeb || !tronWeb.ready) {
    throw new Error('TronLink / TronWeb extension is not unlocked or ready.');
  }

  if (asset.isNative) {
    // Send TRX
    const tx = await tronWeb.trx.sendTransaction(recipientAddress, Number(amountUnits));
    if (tx && (tx.result || tx.txid)) {
      return tx.txid || tx.transaction?.txID || String(tx);
    }
    throw new Error('TRX transfer rejected by wallet.');
  } else if (asset.contractAddress) {
    // Send TRC20 Token (e.g. TRC20 USDT)
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
  const solanaProvider = win.phantom?.solana || win.solana;

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

  // Instruction index 3 = Transfer (amount uint64 LE)
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
  const provider = win.phantom?.solana || win.solana;

  if (!provider || typeof provider.signAndSendTransaction !== 'function') {
    throw new Error('Solana wallet (Phantom) is not connected or unlocked.');
  }

  const rpcUrl = SOLANA_RPC_ENDPOINTS[0];
  const connection = new Connection(rpcUrl, 'confirmed');
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

    const { signature } = await provider.signAndSendTransaction(transaction);
    return signature;
  } else if (asset.contractAddress) {
    const mintPubkey = new PublicKey(asset.contractAddress);
    const toOwnerPubkey = new PublicKey(recipientAddress);

    const sourceAta = getAssociatedTokenAddress(fromPubkey, mintPubkey);
    const destAta = getAssociatedTokenAddress(toOwnerPubkey, mintPubkey);

    const transaction = new Transaction();

    const destAccountInfo = await connection.getAccountInfo(destAta);
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

    const { signature } = await provider.signAndSendTransaction(transaction);
    return signature;
  }

  throw new Error('Invalid Solana asset parameters.');
};
