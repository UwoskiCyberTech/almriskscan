const EVM_RPC_URLS = {
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

async function testRpc(id, url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return { id, url, status: 'FAILED', error: `HTTP ${res.status} ${res.statusText}` };
    }

    const data = await res.json();
    if (data.error) {
      return { id, url, status: 'FAILED', error: data.error.message || JSON.stringify(data.error) };
    }

    return { id, url, status: 'SUCCESS', result: data.result };
  } catch (err) {
    clearTimeout(timeoutId);
    return { id, url, status: 'FAILED', error: err.name === 'AbortError' ? 'Timeout' : err.message };
  }
}

async function testAll() {
  console.log('Testing RPC endpoints via JSON-RPC POST...');
  const promises = Object.entries(EVM_RPC_URLS).map(([id, url]) => testRpc(id, url));
  const results = await Promise.all(promises);
  for (const r of results) {
    if (r.status === 'SUCCESS') {
      console.log(`✅ Chain ${r.id} (${r.url}): SUCCESS - Block: ${parseInt(r.result, 16)}`);
    } else {
      console.log(`❌ Chain ${r.id} (${r.url}): FAILED - Error: ${r.error}`);
    }
  }
}

testAll();
