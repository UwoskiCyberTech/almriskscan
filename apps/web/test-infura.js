const INFURA_URLS = [
  'https://mainnet.infura.io/v3/e9ef72117045496d8cd1578edd9ef781',
  'https://polygon-mainnet.infura.io/v3/e9ef72117045496d8cd1578edd9ef781',
  'https://arbitrum-mainnet.infura.io/v3/e9ef72117045496d8cd1578edd9ef781',
  'https://optimism-mainnet.infura.io/v3/e9ef72117045496d8cd1578edd9ef781',
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
    if (!res.ok) return { url, ok: false, error: `HTTP ${res.status} ${res.statusText}` };
    const data = await res.json();
    if (data.error) return { url, ok: false, error: data.error.message };
    return { url, ok: true, block: parseInt(data.result, 16) };
  } catch (err) {
    clearTimeout(timeoutId);
    return { url, ok: false, error: err.name === 'AbortError' ? 'Timeout' : err.message };
  }
}

async function testAll() {
  console.log('--- Testing Infura Endpoints ---');
  for (const url of INFURA_URLS) {
    const r = await testUrl(url);
    console.log(`${url}: ${r.ok ? `✅ SUCCESS (Block ${r.block})` : `❌ FAILED (${r.error})`}`);
  }
}

testAll();
