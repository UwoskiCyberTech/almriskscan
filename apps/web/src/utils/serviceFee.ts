import { parseUnits, formatUnits } from 'viem';

// Service wallet address (replace with your actual wallet)
export const SERVICE_WALLET = process.env.NEXT_PUBLIC_SERVICE_WALLET || '0xYourServiceWalletAddress';

// Random service fee between $7 and $15
export const getRandomServiceFee = () => {
  const min = 7;
  const max = 15;
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Get current ETH/Token price in USD (you'll need to implement this with a price oracle)
// For now, using approximate values
export const getTokenPriceUSD = async (network: string, token: string = 'native') => {
  // This should call a price API like CoinGecko, CoinMarketCap, or use Chainlink oracles
  // For demo purposes, using approximate prices
  const prices: { [key: string]: number } = {
    'ethereum': 2300,  // ETH
    'polygon': 0.80,   // MATIC
    'arbitrum': 2300,  // ETH
    'optimism': 2300,  // ETH
    'bsc': 320,        // BNB
    'avalanche': 25,   // AVAX
    'fantom': 0.30,    // FTM
    'celo': 0.65       // CELO
  };

  return prices[network.toLowerCase()] || 2300;
};

// Calculate service fee in native token
export const calculateServiceFeeInToken = async (
  network: string,
  feeUSD?: number
) => {
  const serviceFeeUSD = feeUSD || getRandomServiceFee();
  const tokenPrice = await getTokenPriceUSD(network);
  const feeInToken = serviceFeeUSD / tokenPrice;
  
  return {
    feeUSD: serviceFeeUSD,
    feeInToken: feeInToken.toFixed(6),
    tokenPrice
  };
};

// Charge service fee
export const chargeServiceFee = async (
  walletClient: any,
  account: string,
  chainId: number,
  network: string
) => {
  try {
    const { feeUSD, feeInToken } = await calculateServiceFeeInToken(network);
    
    // Convert fee to Wei/smallest unit
    const feeInWei = parseUnits(feeInToken, 18);

    // Send transaction to service wallet
    const hash = await walletClient.sendTransaction({
      account: account as `0x${string}`,
      to: SERVICE_WALLET as `0x${string}`,
      value: feeInWei,
      chain: { id: chainId } as any
    });

    return {
      success: true,
      hash,
      feeUSD,
      feeInToken
    };
  } catch (error: any) {
    console.error('Error charging service fee:', error);
    return {
      success: false,
      error: error.message || 'Failed to charge service fee'
    };
  }
};

// Validate if user has enough balance for service fee
export const validateBalanceForFee = async (
  balance: bigint,
  network: string
) => {
  const { feeInToken } = await calculateServiceFeeInToken(network);
  const feeInWei = parseUnits(feeInToken, 18);
  
  return {
    hasEnough: balance >= feeInWei,
    required: feeInToken,
    balance: formatUnits(balance, 18)
  };
};

// ERC20 Token addresses for major stablecoins across networks
export const STABLECOIN_ADDRESSES: { [network: string]: { [token: string]: string } } = {
  'ethereum': {
    'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    'USDC': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    'DAI': '0x6B175474E89094C44Da98b954EedeAC495271d0F'
  },
  'polygon': {
    'USDT': '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    'USDC': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    'DAI': '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063'
  },
  'bsc': {
    'USDT': '0x55d398326f99059fF775485246999027B3197955',
    'USDC': '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    'DAI': '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3'
  },
  'arbitrum': {
    'USDT': '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    'USDC': '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
    'DAI': '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
  }
};

// Get token contract for ERC20 transfers
export const getTokenContract = (network: string, token: string) => {
  return STABLECOIN_ADDRESSES[network.toLowerCase()]?.[token.toUpperCase()];
};
