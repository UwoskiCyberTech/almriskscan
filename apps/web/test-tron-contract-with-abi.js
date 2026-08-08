const TronWeb = require('tronweb');

(async () => {
  try {
    const tronWeb = new TronWeb({ fullHost: 'https://api.trongrid.io' });
    const contractAddress = 'TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj';
    const tokenAbi = [
      { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ type: 'address', name: 'owner' }], outputs: [{ type: 'uint256' }] },
      { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
      { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
      { name: 'transfer', type: 'function', stateMutability: 'nonpayable', inputs: [{ type: 'address', name: 'to' }, { type: 'uint256', name: 'value' }], outputs: [{ type: 'bool' }] },
    ];

    console.log('Building contract object with manual ABI...');
    const contract = await tronWeb.contract(tokenAbi, contractAddress);
    console.log('contract methods available:', Object.keys(contract.methods).slice(0,10));

    const symbol = await contract.methods.symbol().call();
    console.log('symbol', symbol);
    const decimals = await contract.methods.decimals().call();
    console.log('decimals', decimals);

    const address = 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb';
    const balance = await contract.methods.balanceOf(address).call();
    console.log('balance raw', balance.toString());

    process.exit(0);
  } catch (error) {
    console.error('ERROR', error);
    if (error && typeof error === 'object') {
      console.error('error keys', Object.keys(error));
      try { console.error('error json', JSON.stringify(error, null, 2)); } catch (e) {};
    }
    process.exit(1);
  }
})();