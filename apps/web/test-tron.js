const TronWeb = require('tronweb');

(async () => {
  try {
    const tronWeb = new TronWeb({ fullHost: 'https://api.trongrid.io' });
    const contractAddress = 'TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj';
    const contract = await tronWeb.contract().at(contractAddress);
    const symbol = await contract.methods.symbol().call();
    const decimals = await contract.methods.decimals().call();
    console.log('symbol:', symbol);
    console.log('decimals:', decimals);
    const exampleAddress = 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb';
    const balance = await contract.methods.balanceOf(exampleAddress).call();
    console.log('balance (raw):', balance.toString());
    if (decimals) {
      const adjusted = Number(balance) / 10 ** Number(decimals);
      console.log('balance adjusted:', adjusted);
    }
  } catch (error) {
    console.error('TRC20 test error:', error);
    process.exit(1);
  }
})();