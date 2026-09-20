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
}

async function runRecoveryTest() {
  console.log('--- Starting Week 4 Recovery Tests ---');

  try {
    const initialTotal = await getSystemTotal();
    console.log(`Baseline Total: ${initialTotal}`);

    // Scenario: COMMIT Failure on HCM
    console.log('\nScenario: COMMIT Failure (HCM Timeout)');
    await setChaos('HCM', true, 'COMMIT', 'TIMEOUT');

    const key = `recovery-test-${Date.now()}`;
    const transferData = {
      sourceAccountId: 'HN-001',
      destinationAccountId: 'HCM-001',
      amount: 500000,
      currency: 'VND'
    };

    console.log('Executing transfer (Expecting COMMITTING due to simulated failure)...');
    const res = await axios.post(`${COORDINATOR}/api/transfers`, transferData, {
      headers: { 'Idempotency-Key': key }
    });

    console.log(`Initial status: ${res.data.status}`);
    const txId = res.data.transactionId;

    if (res.data.status !== 'COMMITTING' && res.data.status !== 'UNKNOWN') {
       console.log('[FAIL] Expected COMMITTING/UNKNOWN state');
    }

    // Verify Money is NOT lost but stuck in reservation/inflight
    const midTotal = await getSystemTotal();
    console.log(`System total during failure: ${midTotal} (Money should be conserved)`);

    // Recovery
    console.log('\nFixing HCM and triggering manual recovery...');
    await setChaos('HCM', false);

    const recoveryRes = await axios.post(`${COORDINATOR}/api/transfers/${txId}/recover`);
    console.log(`Recovery status: ${recoveryRes.data.data.status}`);

    if (recoveryRes.data.data.status === 'COMMITTED') {
      console.log('[PASS] Transaction successfully recovered to COMMITTED.');
    } else {
      console.log('[FAIL] Recovery failed to reach COMMITTED.');
    }

    const finalTotal = await getSystemTotal();
    console.log(`Final Total: ${finalTotal}`);

    if (initialTotal === finalTotal) {
      console.log('[PASS] Money conservation verified.');
    } else {
      console.log('[FAIL] MONEY CONSERVATION VIOLATED!');
    }

    // Idempotency Test
    console.log('\nTesting Idempotency (Sending recovery again)...');
    const resIdem = await axios.post(`${COORDINATOR}/api/transfers/${txId}/recover`);
    if (resIdem.data.data.status === 'COMMITTED') {
      console.log('[PASS] Repeated recovery is idempotent.');
    }

  } catch (err) {
    console.error('Test error:', err.response?.data || err.message);
  }
}

runRecoveryTest();
