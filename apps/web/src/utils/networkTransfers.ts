import { parseEther, parseUnits } from 'viem';

export type SupportedNetwork =
  | 'Ethereum'
  | 'Polygon'
  | 'Arbitrum'
  | 'Optimism'
  | 'BNB Smart Chain'
  | 'Avalanche'
  | 'Fantom'
  | 'Celo'
  | 'Base'
  | 'Linea'
  | 'Scroll';

const normalizeNetworkName = (networkName: string) => {
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
  return networkName?.trim() || '';
};

const EVM_RPC_URLS: Record<number, string> = {
  1: 'https://cloudflare-eth.com',
  137: 'https://polygon-rpc.com',
  42161: 'https://arb1.arbitrum.io/rpc',
  10: 'https://mainnet.optimism.io',
  56: 'https://bsc.publicnode.com',
  43114: 'https://api.avax.network/ext/bc/C/rpc',
  250: 'https://rpc.ankr.com/fantom',
  42220: 'https://forno.celo.org',
  8453: 'https://mainnet.base.org',
  59144: 'https://linea.rpc.thirdweb.com',
  534352: 'https://scroll.rpc.thirdweb.com',
};

export const getPublicRpcUrl = (networkName: string) => {
  const config = getNetworkConfig(networkName);
  if (!config || config.chainId <= 0) return undefined;
  return EVM_RPC_URLS[config.chainId];
};

export const EVM_NETWORKS: Array<{ name: SupportedNetwork; chainId: number; explorer: string; symbol: string }> = [
  { name: 'Ethereum', chainId: 1, explorer: 'https://etherscan.io/tx/', symbol: 'ETH' },
  { name: 'Polygon', chainId: 137, explorer: 'https://polygonscan.com/tx/', symbol: 'POL' },
  { name: 'Arbitrum', chainId: 42161, explorer: 'https://arbiscan.io/tx/', symbol: 'ETH' },
  { name: 'Optimism', chainId: 10, explorer: 'https://optimistic.etherscan.io/tx/', symbol: 'ETH' },
  { name: 'BNB Smart Chain', chainId: 56, explorer: 'https://bscscan.com/tx/', symbol: 'BNB' },
  { name: 'Avalanche', chainId: 43114, explorer: 'https://snowtrace.io/tx/', symbol: 'AVAX' },
  { name: 'Fantom', chainId: 250, explorer: 'https://ftmscan.com/tx/', symbol: 'FTM' },
  { name: 'Celo', chainId: 42220, explorer: 'https://celoscan.io/tx/', symbol: 'CELO' },
  { name: 'Base', chainId: 8453, explorer: 'https://basescan.org/tx/', symbol: 'ETH' },
  { name: 'Linea', chainId: 59144, explorer: 'https://lineascan.build/tx/', symbol: 'ETH' },
  { name: 'Scroll', chainId: 534352, explorer: 'https://scrollscan.com/tx/', symbol: 'ETH' },
];

export const getNetworkConfig = (networkName: string) => {
  const normalizedTarget = normalizeNetworkName(networkName);
  const config = EVM_NETWORKS.find((item) => normalizeNetworkName(item.name) === normalizedTarget);
  if (config) {
    return config;
  }

  return null;
};

export const getExplorerUrl = (txHash: string, networkName: string) => {
  const config = getNetworkConfig(networkName);
  if (!config) {
    return `https://etherscan.io/tx/${txHash}`;
  }

  return `${config.explorer}${txHash}`;
};


const sendEvmTokenTransfer = async (recipient: string, amount: string, tokenContractAddress: string, walletClient: any) => {
  if (!walletClient) {
    throw new Error('Wallet client is required for ERC20 transfers.');
  }

  const decimals = await walletClient.readContract({
    address: tokenContractAddress as `0x${string}`,
    abi: [
      { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
    ],
    functionName: 'decimals',
    args: [],
  });

  const amountInUnits = parseUnits(amount, Number(decimals));

  const hash = await walletClient.writeContract({
    address: tokenContractAddress as `0x${string}`,
    abi: [
      { name: 'transfer', type: 'function', stateMutability: 'nonpayable', inputs: [{ type: 'address', name: 'to' }, { type: 'uint256', name: 'value' }], outputs: [{ type: 'bool' }] },
    ],
    functionName: 'transfer',
    args: [recipient as `0x${string}`, amountInUnits],
  });

  return hash;
};

export const sendNetworkTransfer = async (params: {
  network: SupportedNetwork;
  recipient: string;
  amount: string;
  tokenContractAddress?: string;
  address?: string;
  walletClient?: any;
  chain?: { id?: number; name?: string };
  switchChainAsync?: (args: { chainId: number }) => Promise<any>;
}) => {
  const config = getNetworkConfig(params.network);
  if (!config) {
    throw new Error(`Unsupported network: ${params.network}`);
  }

  if (params.tokenContractAddress) {
    return {
      txHash: await sendEvmTokenTransfer(params.recipient, params.amount, params.tokenContractAddress, params.walletClient),
      explorerUrl: getExplorerUrl('', params.network),
    };
  }

  const expectedChainId = config.chainId;
  if (params.chain?.id && params.chain.id !== expectedChainId) {
    if (params.switchChainAsync) {
      await params.switchChainAsync({ chainId: expectedChainId });
    } else {
      throw new Error(`Please switch your wallet to ${params.network} before sending.`);
    }
  }

  if (!params.walletClient || !params.address) {
    throw new Error('Please connect a compatible wallet before sending.');
  }

  const amountInWei = parseEther(params.amount);
  const hash = await params.walletClient.sendTransaction({
    account: params.address as `0x${string}`,
    to: params.recipient as `0x${string}`,
    value: amountInWei,
    chain: { id: expectedChainId } as any,
  });

  return { txHash: hash, explorerUrl: getExplorerUrl(hash, params.network) };
};
