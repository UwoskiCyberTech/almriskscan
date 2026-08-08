const TronWeb = require('tronweb');

(async () => {
  try {
    const tronWeb = new TronWeb({ fullHost: 'https://api.trongrid.io' });
    const addr = 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb';
    const hex = tronWeb.address.toHex(addr);
    console.log('hex addr', hex);
    const account = await tronWeb.fullNode.request('wallet/getaccount', { address: hex });
    console.log('account keys', Object.keys(account));
    const contractAddress = 'TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj';
    const contract = await tronWeb.contract().at(contractAddress);
    console.log('contract methods keys', Object.keys(contract.methods).slice(0, 20));
    try {
      const symbol = await contract.methods.symbol().call();
      console.log('symbol', symbol);
    } catch (err) {
      console.error('symbol call error', err);
    }
    try {
      const decimals = await contract.methods.decimals().call();
      console.log('decimals', decimals);
    } catch (err) {
      console.error('decimals call error', err);
    }
    try {
      const balance = await contract.methods.balanceOf(addr).call();
      console.log('balance raw', balance.toString());
    } catch (err) {
      console.error('balance call error', err);
    }
  } catch (error) {
    console.error('TRC20 detailed test error:', error);
    if (typeof error === 'object') {
      try { console.error('error JSON', JSON.stringify(error, null, 2)); } catch (e) {}
    }
    process.exit(1);
  }
})();