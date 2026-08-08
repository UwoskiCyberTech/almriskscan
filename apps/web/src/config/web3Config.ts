import { http, createConfig } from 'wagmi';
import { mainnet, polygon, arbitrum, optimism, bsc, avalanche, fantom, celo, base, linea, scroll } from 'wagmi/chains';
import { coinbaseWallet, injected, walletConnect } from 'wagmi/connectors';

const infuraRpcUrl = process.env.NEXT_PUBLIC_WALLET_PROVIDER_URL || process.env.WALLET_PROVIDER_URL || 'https://mainnet.infura.io/v3/e9ef72117045496d8cd1578edd9ef781';
const rpcUrls = {
  [mainnet.id]: http(infuraRpcUrl),
  [polygon.id]: http(`https://polygon-mainnet.infura.io/v3/${infuraRpcUrl.split('/').pop()}`),
  [arbitrum.id]: http(`https://arbitrum-mainnet.infura.io/v3/${infuraRpcUrl.split('/').pop()}`),
  [optimism.id]: http(`https://optimism-mainnet.infura.io/v3/${infuraRpcUrl.split('/').pop()}`),
  [bsc.id]: http('https://bsc-dataseed.binance.org/'),
  [avalanche.id]: http('https://api.avax.network/ext/bc/C/rpc'),
  [fantom.id]: http('https://rpc.ftm.tools/'),
  [celo.id]: http('https://forno.celo.org'),
  [base.id]: http('https://mainnet.base.org'),
  [linea.id]: http('https://linea.rpc.thirdweb.com'),
  [scroll.id]: http('https://scroll.rpc.thirdweb.com'),
};

// Get WalletConnect Project ID from environment
const rawProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || process.env.WALLETCONNECT_PROJECT_ID || '';
const placeholderValues = ['demo-project-id', 'your_walletconnect_project_id_here', 'your-walletconnect-project-id', 'your_walletconnect_project_id'];
const projectId = rawProjectId.trim();
const isWalletConnectEnabled = Boolean(
  projectId && !placeholderValues.includes(projectId.toLowerCase())
);

// Define supported chains
const chains = [
  mainnet,
  polygon,
  arbitrum,
  optimism,
  bsc,
  avalanche,
  fantom,
  celo,
  base,
  linea,
  scroll
] as const;

// Wallet info for UI display
export const WALLET_CONFIGS = {
  injected: {
    name: 'Browser Wallet',
    icon: '🦊',
    description: 'MetaMask, Trust Wallet, Brave, Rabby, etc.',
  },
  coinbase: {
    name: 'Coinbase Wallet',
    icon: '🔷',
    description: 'Coinbase\'s web3 wallet',
  },
  walletConnect: {
    name: 'WalletConnect',
    icon: '🌐',
    description: 'Connect 40+ mobile and desktop wallets with QR code and deep-link support, including Rainbow, Argent, Ledger, Trust Wallet, and more.',
  },
};

// Create wagmi config with WalletConnect support
export const wagmiConfig = createConfig({
  ssr: true,
  chains,
  transports: rpcUrls,
  connectors: [
    // Injected wallets (MetaMask, Trust Wallet, Brave, Rabby, etc.)
    injected({
      shimDisconnect: true,
    }),
    coinbaseWallet({
      appName: 'Direct Wallet Withdrawal',
      appLogoUrl: 'https://avatars.githubusercontent.com/u/37784886',
      preference: 'all',
    }),
    ...(isWalletConnectEnabled
      ? [
          // WalletConnect (supports 40+ wallets via QR code)
          walletConnect({
            projectId,
            metadata: {
              name: 'Direct Wallet Withdrawal',
              description: 'Direct wallet withdrawals without a payment gateway',
              url: 'https://example.com',
              icons: ['https://avatars.githubusercontent.com/u/37784886'],
            },
            showQrModal: true, // Show QR modal for WalletConnect
          }),
        ]
      : []),
  ],
});

export { chains, projectId, isWalletConnectEnabled };

