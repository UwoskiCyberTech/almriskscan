const ETH_ALT = [
  'https://rpc.flashbots.net',
  'https://ethereum-rpc.publicnode.com',
  'https://eth.llamarpc.com',
  'https://1rpc.io/eth',
];

const POLYGON_ALT = [
  'https://polygon-bor-rpc.publicnode.com',
  'https://polygon.llamarpc.com',
  'https://1rpc.io/matic',
  'https://rpc.payload.de/open/polygon',
];

const FANTOM_ALT = [
  'https://rpc.ftm.tools',
  'https://rpc3.fantom.network',
  'https://fantom-pokt.nodies.app',
  'https://rpc.fantom.tools',
];

async function testUrl(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) return { url, ok: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    if (data.error) return { url, ok: false, error: data.error.message };
    return { url, ok: true, block: parseInt(data.result, 16) };
  } catch (err) {
    clearTimeout(timeoutId);
    return { url, ok: false, error: err.name === 'AbortError' ? 'Timeout' : err.message };
  }
}

async function testAll() {
  console.log('--- Testing Ethereum Alternatives ---');
  for (const url of ETH_ALT) {
    const r = await testUrl(url);
    console.log(`${url}: ${r.ok ? `✅ SUCCESS (Block ${r.block})` : `❌ FAILED (${r.error})`}`);
  }

  console.log('\n--- Testing Polygon Alternatives ---');
  for (const url of POLYGON_ALT) {
    const r = await testUrl(url);
    console.log(`${url}: ${r.ok ? `✅ SUCCESS (Block ${r.block})` : `❌ FAILED (${r.error})`}`);
  }

  console.log('\n--- Testing Fantom Alternatives ---');
  for (const url of FANTOM_ALT) {
    const r = await testUrl(url);
    console.log(`${url}: ${r.ok ? `✅ SUCCESS (Block ${r.block})` : `❌ FAILED (${r.error})`}`);
  }
}

testAll();
