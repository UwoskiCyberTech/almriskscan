const TronWeb = require('tronweb');

function dumpError(err) {
  console.error('error type:', typeof err);
  console.error('error toString:', err && err.toString ? err.toString() : String(err));
  if (err && typeof err === 'object') {
    console.error('error keys:', Object.getOwnPropertyNames(err));
    try {
      console.error('error json:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    } catch (e) {
      console.error('error JSON stringify failed', e);
    }
  }
}

(async () => {
  try {
    const tronWeb = new TronWeb({ fullHost: 'https://api.trongrid.io' });
    const addr = 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb';
    console.log('addressBase58', addr);
    console.log('addressHex', tronWeb.address.toHex(addr));
    const account = await tronWeb.trx.getAccount(addr);
    console.log('trx.getAccount result keys:', Object.keys(account));
    console.log('account assetV2 length:', account.assetV2?.length);

    const contractAddress = 'TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj';
    console.log('contract address', contractAddress);
    const contractInfo = await tronWeb.trx.getContract(contractAddress).catch((e) => { throw { stage: 'getContract', err: e }; });
    console.log('contractInfo keys:', contractInfo ? Object.keys(contractInfo) : null);
    console.log('contractInfo abi size:', contractInfo.abi?.length || 'no abi');
    const contract = await tronWeb.contract().at(contractAddress).catch((e) => { throw { stage: 'contractAt', err: e }; });
    console.log('contract object type', typeof contract);
    console.log('contract methods keys', Object.keys(contract.methods).slice(0, 20));
    const symbol = await contract.methods.symbol().call().catch((e) => { throw { stage: 'symbol', err: e }; });
    console.log('symbol', symbol);
    const decimals = await contract.methods.decimals().call().catch((e) => { throw { stage: 'decimals', err: e }; });
    console.log('decimals', decimals);
    const balance = await contract.methods.balanceOf(addr).call().catch((e) => { throw { stage: 'balanceOf', err: e }; });
    console.log('balance raw', balance.toString());
  } catch (mainErr) {
    console.error('MAIN ERROR');
    if (mainErr && mainErr.stage) {
      console.error('stage:', mainErr.stage);
      dumpError(mainErr.err);
    } else {
      dumpError(mainErr);
    }
    process.exit(1);
  }
})();