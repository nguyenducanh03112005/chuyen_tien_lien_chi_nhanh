const axios = require('axios');

const COORDINATOR = 'http://localhost:3000';
const NODES = {
  HN: 'http://localhost:3001',
  HCM: 'http://localhost:3002',
  DN: 'http://localhost:3003'
};

async function getSystemTotal() {
  const res = await axios.get(`${COORDINATOR}/api/accounts`);
  return res.data.data.reduce((sum, acc) => sum + parseInt(acc.balance), 0);
}

async function setChaos(nodeId, enabled, point = 'NONE', mode = 'REJECT') {
  const url = `${NODES[nodeId]}/api/chaos`;
  await axios.post(url, { enabled, failurePoint: point, failureMode: mode });
  console.log(`[TEST] Chaos set on ${nodeId}: enabled=${enabled}, point=${point}, mode=${mode}`);
}

async function clearAllChaos() {
  for (const id in NODES) {
    await setChaos(id, false);
  }
}

async function runTest(name, transferData, expectedStatus) {
  console.log(`\n--- Running Test: ${name} ---`);
  const initialTotal = await getSystemTotal();
  const idempotencyKey = `chaos-test-${Date.now()}`;

  try {
    const res = await axios.post(`${COORDINATOR}/api/transfers`, transferData, {
      headers: { 'Idempotency-Key': idempotencyKey }
    });
    console.log(`[TEST] Response status: ${res.data.status}`);

    if (res.data.status === expectedStatus) {
      console.log(`[PASS] State matches expected: ${expectedStatus}`);
    } else {
      console.log(`[FAIL] State mismatch. Expected ${expectedStatus}, got ${res.data.status}`);
    }
  } catch (err) {
    console.log(`[TEST] Request failed (as expected if status 4xx/5xx): ${err.response?.data?.status || err.message}`);
    if (err.response?.data?.status === expectedStatus) {
        console.log(`[PASS] Error response state matches expected: ${expectedStatus}`);
    }
  }

  const finalTotal = await getSystemTotal();
  console.log(`[TEST] Money Conservation: Before=${initialTotal}, After=${finalTotal}`);
  if (initialTotal === finalTotal) {
    console.log(`[PASS] Money conserved.`);
  } else {
    console.log(`[FAIL] MONEY LOST OR CREATED! Diff: ${finalTotal - initialTotal}`);
  }
}

async function main() {
  console.log('Starting Week 3 Chaos Tests...');

  try {
    await clearAllChaos();

    // 1. Normal Success
    await runTest('Normal Success (HN -> HCM)', {
      sourceAccountId: 'HN-001',
      destinationAccountId: 'HCM-001',
      amount: 100000,
      currency: 'VND'
    }, 'COMMITTED');

    // 2. Prepare Failure (HCM rejects Prepare)
    await setChaos('HCM', true, 'PREPARE', 'REJECT');
    await runTest('Prepare Failure (HCM Reject)', {
      sourceAccountId: 'HN-002',
      destinationAccountId: 'HCM-002',
      amount: 50000,
      currency: 'VND'
    }, 'ABORTED');
    await setChaos('HCM', false);

    // 3. Commit Failure (HCM timeouts during Commit)
    // NOTE: In this state, coordinator should remain in COMMITTING or UNKNOWN
    await setChaos('HCM', true, 'COMMIT', 'TIMEOUT');
    await runTest('Commit Failure (HCM Timeout)', {
      sourceAccountId: 'HN-001',
      destinationAccountId: 'HCM-001',
      amount: 10000,
      currency: 'VND'
    }, 'COMMITTING');
    await setChaos('HCM', false);

    // 4. Idempotency test (Repeat the previous COMMITTING one)
    // It should still return COMMITTING (or try again and reach COMMITTED if chaos is off)
    console.log('\n--- Running Test: Idempotency ---');
    // We'd need the exact previous key, but for simple demo, let's just do a new one and repeat it.
    const key = 'idem-test-key';
    const data = { sourceAccountId: 'DN-001', destinationAccountId: 'HN-001', amount: 100, currency: 'VND' };
    await axios.post(`${COORDINATOR}/api/transfers`, data, { headers: { 'Idempotency-Key': key } });
    const res2 = await axios.post(`${COORDINATOR}/api/transfers`, data, { headers: { 'Idempotency-Key': key } });
    if (res2.data.status === 'COMMITTED') {
      console.log('[PASS] Idempotency returned COMMITTED.');
    }

    console.log('\nAll tests completed.');
  } catch (err) {
    console.error('Test script error:', err.message);
  }
}

main();
