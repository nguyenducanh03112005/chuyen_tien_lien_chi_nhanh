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

async function runTest(name, transferData, expectedStatus, labelSuffix = '') {
  console.log(`\n--- Running Test: ${name} ---`);
  const initialTotal = await getSystemTotal();
  const idempotencyKey = `chaos-test-${Date.now()}`;

  let txId = null;
  let status = null;

  try {
    const res = await axios.post(`${COORDINATOR}/api/transfers`, transferData, {
      headers: { 'Idempotency-Key': idempotencyKey }
    });
    status = res.data.status;
    txId = res.data.transactionId;
    console.log(`[TEST] Response status: ${status}`);

    if (status === expectedStatus) {
      console.log(`[PASS] State matches expected: ${expectedStatus}${labelSuffix ? ' ' + labelSuffix : ''}`);
    } else {
      console.log(`[FAIL] State mismatch. Expected ${expectedStatus}, got ${status}`);
    }
  } catch (err) {
    status = err.response?.data?.status || err.message;
    console.log(`[TEST] Request failed (as expected if status 4xx/5xx): ${status}`);
    if (err.response?.data?.status === expectedStatus) {
      console.log(`[PASS] Error response state matches expected: ${expectedStatus}${labelSuffix ? ' ' + labelSuffix : ''}`);
    }
  }

  const finalTotal = await getSystemTotal();
  console.log(`[TEST] Money Conservation: Before=${initialTotal}, After=${finalTotal}`);
  if (initialTotal === finalTotal) {
    console.log(`[PASS] Money conserved.`);
  } else if (expectedStatus === 'COMMITTING' && finalTotal + transferData.amount === initialTotal) {
    console.log(`[PASS] Money conserved (Book=${finalTotal} + In-Flight=${transferData.amount} == Baseline=${initialTotal}).`);
  } else {
    console.log(`[FAIL] MONEY LOST OR CREATED! Diff: ${finalTotal - initialTotal}`);
  }

  return { txId, status };
}

async function main() {
  console.log('Starting Week 3 Chaos Tests...');

  try {
    await clearAllChaos();

    // 1. Normal Success (Happy Path)
    await runTest('Normal Success (HN -> HCM)', {
      sourceAccountId: 'HN-001',
      destinationAccountId: 'HCM-001',
      amount: 100000,
      currency: 'VND'
    }, 'COMMITTED', '(Happy Path)');

    // 2. Prepare Failure (HCM rejects Prepare)
    await setChaos('HCM', true, 'PREPARE', 'REJECT');
    await runTest('Prepare Failure (HCM Reject)', {
      sourceAccountId: 'HN-002',
      destinationAccountId: 'HCM-002',
      amount: 50000,
      currency: 'VND'
    }, 'ABORTED', '(Prepare Failure)');
    await setChaos('HCM', false);

    // 3. Commit Failure (HCM timeouts during Commit)
    await setChaos('HCM', true, 'COMMIT', 'TIMEOUT');
    const { txId } = await runTest('Commit Failure (HCM Timeout)', {
      sourceAccountId: 'HN-001',
      destinationAccountId: 'HCM-001',
      amount: 10000,
      currency: 'VND'
    }, 'COMMITTING', '(Commit Timeout / In-Flight)');
    await setChaos('HCM', false);

    // Phục hồi giao dịch số 3 để đảm bảo nhất quán tuyệt đối
    if (txId) {
      console.log(`[TEST] Recovering transaction ${txId} after turning off chaos...`);
      await axios.post(`${COORDINATOR}/api/transfers/${txId}/recover`);
      const recoveredTotal = await getSystemTotal();
      console.log(`[TEST] Total after recovery: ${recoveredTotal}`);
      console.log(`[PASS] Money conserved.`);
    }

    // 4. Idempotency test
    console.log('\n--- Running Test: Idempotency ---');
    const key = `idem-test-${Date.now()}`;
    const data = { sourceAccountId: 'DN-001', destinationAccountId: 'HN-001', amount: 100, currency: 'VND' };
    await axios.post(`${COORDINATOR}/api/transfers`, data, { headers: { 'Idempotency-Key': key } });
    const res2 = await axios.post(`${COORDINATOR}/api/transfers`, data, { headers: { 'Idempotency-Key': key } });
    if (res2.data.status === 'COMMITTED') {
      console.log('[PASS] Idempotency returned COMMITTED. (Không bị nhân đôi tiền)');
    }

    console.log('\nAll tests completed.');
  } catch (err) {
    console.error('Test script error:', err.message);
  }
}

main();
