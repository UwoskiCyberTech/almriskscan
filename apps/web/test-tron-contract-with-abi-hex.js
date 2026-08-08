const TronWeb = require('tronweb');

(async () => {
  try {
    const tronWeb = new TronWeb({ fullHost: 'https://api.trongrid.io' });
    const contractAddress = 'TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj';
    const tokenAbi = [
      { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ type: 'address', name: 'owner' }], outputs: [{ type: 'uint256' }] },
      { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
      { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
    ];
    const contract = await tronWeb.contract(tokenAbi, contractAddress);
    console.log('Manual ABI contract built');
    const symbol = await contract.methods.symbol().call();
    console.log('symbol', symbol);
    const decimals = await contract.methods.decimals().call();
    console.log('decimals', decimals);
    const addrBase58 = 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb';
    const addrHex = tronWeb.address.toHex(addrBase58);
    console.log('address hex', addrHex);
    try {
      const balanceBase58 = await contract.methods.balanceOf(addrBase58).call();
      console.log('base58 balance', balanceBase58.toString());
    } catch (err) {
      console.error('base58 error', err.toString());
    }
    try {
      const balanceHex = await contract.methods.balanceOf(addrHex).call();
      console.log('hex balance', balanceHex.toString());
    } catch (err) {
      console.error('hex error', err.toString());
    }
  } catch (error) {
    console.error('TEST ERROR', error);
    process.exit(1);
  }
})();