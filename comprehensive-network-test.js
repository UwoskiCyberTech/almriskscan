const Web3 = require('web3');

// Network configurations
const NETWORKS = {
  tron: {
    name: 'Tron (TRC20)',
    type: 'tron',
    rpc: 'https://api.trongrid.io',
    testContract: 'TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj', // USDT on Tron
    testAddress: 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb',
  },
  ethereum: {
    name: 'Ethereum (Mainnet)',
    type: 'evm',
    rpc: 'https://mainnet.infura.io/v3/e9ef72117045496d8cd1578edd9ef781',
    chainId: 1,
    testAddress: '0x1fC618a5B0AAFfC876b72288D71f3E80918c590f',
  },
  bsc: {
    name: 'BNB Smart Chain',
    type: 'evm',
    rpc: 'https://bsc-dataseed.binance.org/',
    chainId: 56,
    testAddress: '0x1fC618a5B0AAFfC876b72288D71f3E80918c590f',
  },
  polygon: {
    name: 'Polygon',
    type: 'evm',
    rpc: 'https://polygon-mainnet.infura.io/v3/e9ef72117045496d8cd1578edd9ef781',
    chainId: 137,
    testAddress: '0x1fC618a5B0AAFfC876b72288D71f3E80918c590f',
  },
  arbitrum: {
    name: 'Arbitrum One',
    type: 'evm',
    rpc: 'https://arbitrum-mainnet.infura.io/v3/e9ef72117045496d8cd1578edd9ef781',
    chainId: 42161,
    testAddress: '0x1fC618a5B0AAFfC876b72288D71f3E80918c590f',
  },
  optimism: {
    name: 'Optimism',
    type: 'evm',
    rpc: 'https://optimism-mainnet.infura.io/v3/e9ef72117045496d8cd1578edd9ef781',
    chainId: 10,
    testAddress: '0x1fC618a5B0AAFfC876b72288D71f3E80918c590f',
  },
  avalanche: {
    name: 'Avalanche C-Chain',
    type: 'evm',
    rpc: 'https://api.avax.network/ext/bc/C/rpc',
    chainId: 43114,
    testAddress: '0x1fC618a5B0AAFfC876b72288D71f3E80918c590f',
  },
  fantom: {
    name: 'Fantom',
    type: 'evm',
    rpc: 'https://rpc.fantom.network/',
    chainId: 250,
    testAddress: '0x1fC618a5B0AAFfC876b72288D71f3E80918c590f',
  },
  celo: {
    name: 'Celo',
    type: 'evm',
    rpc: 'https://forno.celo.org',
    chainId: 42220,
    testAddress: '0x1fC618a5B0AAFfC876b72288D71f3E80918c590f',
  },
  base: {
    name: 'Base',
    type: 'evm',
    rpc: 'https://mainnet.base.org',
    chainId: 8453,
    testAddress: '0x1fC618a5B0AAFfC876b72288D71f3E80918c590f',
  },
  linea: {
    name: 'Linea',
    type: 'evm',
    rpc: 'https://rpc.linea.build',
    chainId: 59144,
    testAddress: '0x1fC618a5B0AAFfC876b72288D71f3E80918c590f',
  },
  scroll: {
    name: 'Scroll',
    type: 'evm',
    rpc: 'https://rpc.scroll.io',
    chainId: 534352,
    testAddress: '0x1fC618a5B0AAFfC876b72288D71f3E80918c590f',
  },
};

// Test results tracking
const results = {
  passed: [],
  failed: [],
};

async function testTronNetwork(config) {
  try {
    console.log(`\n🧪 Testing ${config.name}...`);
    
    // Import TronWeb - need to use the .TronWeb property
    const TronWeb = require('tronweb').TronWeb;
    const tronWeb = new TronWeb({ fullHost: config.rpc });
    
    // Test 1: Get network info
    const nodeInfo = await tronWeb.trx.getNodeInfo();
    console.log(`  ✓ Connected to Tron network`);
    
    // Test 2: Get chain parameters
    const chainParams = await tronWeb.trx.getChainParameters();
    console.log(`  ✓ Chain parameters received`);
    
    // Test 3: Get account info for a valid Tron address
    try {
      const addr = 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb';
      const hex = tronWeb.address.toHex(addr);
      const account = await tronWeb.fullNode.request('wallet/getaccount', { address: hex });
      console.log(`  ✓ Account query successful`);
    } catch (e) {
      console.log(`  ✓ Tron address query works (account may not exist)`);
    }
    
    // Test 4: Get network status
    const blockCount = await tronWeb.trx.getCurrentBlock();
    console.log(`  ✓ Latest block received`);
    
    results.passed.push(config.name);
    console.log(`✅ ${config.name} - PASSED`);
    return true;
  } catch (error) {
    console.error(`❌ ${config.name} - FAILED`);
    console.error(`   Error: ${error.message}`);
    results.failed.push({ network: config.name, error: error.message });
    return false;
  }
}

async function testEVMNetwork(config) {
  try {
    console.log(`\n🧪 Testing ${config.name}...`);
    
    const web3 = new Web3(config.rpc);
    
    // Test 1: Get chain ID
    const chainId = await web3.eth.getChainId();
    console.log(`  ✓ Connected to chain ID: ${chainId}`);
    
    // Test 2: Get gas price
    const gasPrice = await web3.eth.getGasPrice();
    console.log(`  ✓ Gas price: ${web3.utils.fromWei(gasPrice, 'gwei')} Gwei`);
    
    // Test 3: Get latest block
    const blockNumber = await web3.eth.getBlockNumber();
    console.log(`  ✓ Latest block: ${blockNumber}`);
    
    // Test 4: Get account balance
    const balance = await web3.eth.getBalance(config.testAddress);
    const ethBalance = web3.utils.fromWei(balance, 'ether');
    console.log(`  ✓ Account balance: ${ethBalance} ETH`);
    
    // Test 5: Verify network RPC is working (optional - some RPCs disable this)
    try {
      const accounts = await web3.eth.getAccounts();
      console.log(`  ✓ RPC responding correctly`);
    } catch (e) {
      console.log(`  ✓ RPC responding (getAccounts disabled on this endpoint)`);
    }
    
    results.passed.push(config.name);
    console.log(`✅ ${config.name} - PASSED`);
    return true;
  } catch (error) {
    console.error(`❌ ${config.name} - FAILED`);
    console.error(`   Error: ${error.message}`);
    results.failed.push({ network: config.name, error: error.message });
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Comprehensive Web3 Network Tests');
  console.log('='.repeat(60));
  
  const startTime = Date.now();
  
  for (const [key, config] of Object.entries(NETWORKS)) {
    try {
      if (config.type === 'tron') {
        await testTronNetwork(config);
      } else if (config.type === 'evm') {
        await testEVMNetwork(config);
      }
    } catch (error) {
      console.error(`Unexpected error testing ${config.name}:`, error);
      results.failed.push({ network: config.name, error: error.message });
    }
  }
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Networks Tested: ${results.passed.length + results.failed.length}`);
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`⏱️  Duration: ${duration}s`);
  
  if (results.passed.length > 0) {
    console.log('\n✅ Passed Networks:');
    results.passed.forEach(name => console.log(`   • ${name}`));
  }
  
  if (results.failed.length > 0) {
    console.log('\n❌ Failed Networks:');
    results.failed.forEach(item => {
      console.log(`   • ${item.network}`);
      console.log(`     Error: ${item.error}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  
  const success = results.failed.length === 0;
  process.exit(success ? 0 : 1);
}

// Set timeout for entire test suite (5 minutes)
setTimeout(() => {
  console.error('\n⏱️  Test suite timed out after 5 minutes');
  console.log('\n' + '='.repeat(60));
  console.log('📊 PARTIAL TEST SUMMARY (TIMEOUT)');
  console.log('='.repeat(60));
  console.log(`Passed: ${results.passed.length}`);
  console.log(`Failed: ${results.failed.length}`);
  process.exit(1);
}, 5 * 60 * 1000);

// Run tests
runAllTests();
