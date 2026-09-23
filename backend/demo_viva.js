const axios = require('axios');

const COORDINATOR = 'http://127.0.0.1:3000';
const NODES = {
  HN: 'http://127.0.0.1:3001',
  HCM: 'http://127.0.0.1:3002',
  DN: 'http://127.0.0.1:3003'
};

const client = axios.create({ timeout: 15000 });

function money(value) {
  return new Intl.NumberFormat('vi-VN').format(value) + ' VND';
}

async function getAccounts() {
  const response = await client.get(`${COORDINATOR}/api/accounts`);
  return response.data.data;
}

async function getAccount(accountId) {
  const accounts = await getAccounts();
  return accounts.find((account) => account.id === accountId);
}

async function totalBalance() {
  const accounts = await getAccounts();
  return accounts.reduce((sum, account) => sum + Number(account.balance), 0);
}

async function setChaos(branchId, enabled, failurePoint = 'NONE', failureMode = 'REJECT') {
  await client.post(`${NODES[branchId]}/api/chaos`, {
    enabled,
    failurePoint,
    failureMode
  });
}

async function clearChaos() {
  await Promise.all(Object.keys(NODES).map((branchId) => setChaos(branchId, false)));
}

async function transfer(data, idempotencyKey) {
  const response = await client.post(`${COORDINATOR}/api/transfers`, data, {
    headers: { 'Idempotency-Key': idempotencyKey }
  });
  return response.data;
}

async function preflight() {
  console.log('\n=== PREFLIGHT ===');
  const coordinator = await client.get(`${COORDINATOR}/api/health`);
  const nodes = await client.get(`${COORDINATOR}/api/health/nodes`);
  const accounts = await getAccounts();
  console.log(`Coordinator: ${coordinator.data.status}`);
  nodes.data.nodes.forEach((node) => console.log(`${node.branchId}: ${node.status} (${node.url})`));
  console.log(`Accounts: ${accounts.length}`);
  console.log(`System book balance: ${money(await totalBalance())}`);

  const allUp = coordinator.data.status === 'UP' && nodes.data.nodes.every((node) => node.status === 'UP');
  if (!allUp) throw new Error('PREFLIGHT_FAILED: Có dịch vụ chưa sẵn sàng');
}

async function successScenario() {
  console.log('\n=== SUCCESS: DN-001 -> HN-001 ===');
  const amount = 10000;
  const beforeTotal = await totalBalance();
  const transaction = await transfer({
    sourceAccountId: 'DN-001',
    destinationAccountId: 'HN-001',
    amount,
    currency: 'VND'
  }, `viva-success-${Date.now()}`);
  const afterTotal = await totalBalance();

  console.log(`Transaction: ${transaction.transactionId}`);
  console.log(`Global status/decision: ${transaction.status}/${transaction.decision}`);
  transaction.participants.forEach((participant) => {
    console.log(`${participant.branchId} (${participant.role}): ${participant.status}`);
  });
  console.log(`Money conservation: ${money(beforeTotal)} -> ${money(afterTotal)}`);
  if (transaction.status !== 'COMMITTED' || beforeTotal !== afterTotal) {
    throw new Error('SUCCESS_SCENARIO_FAILED');
  }
}

async function prepareFailureScenario() {
  console.log('\n=== PREPARE FAILURE: HCM từ chối ===');
  const beforeTotal = await totalBalance();
  await setChaos('HCM', true, 'PREPARE', 'REJECT');
  try {
    const transaction = await transfer({
      sourceAccountId: 'HN-002',
      destinationAccountId: 'HCM-002',
      amount: 10000,
      currency: 'VND'
    }, `viva-prepare-failure-${Date.now()}`);
    const source = await getAccount('HN-002');
    const afterTotal = await totalBalance();
    console.log(`Transaction: ${transaction.transactionId}`);
    console.log(`Global status/decision: ${transaction.status}/${transaction.decision}`);
    console.log(`HN-002 reservedBalance after abort: ${money(source.reservedBalance || 0)}`);
    console.log(`Money conservation: ${money(beforeTotal)} -> ${money(afterTotal)}`);
    if (transaction.status !== 'ABORTED' || source.reservedBalance !== 0 || beforeTotal !== afterTotal) {
      throw new Error('PREPARE_FAILURE_SCENARIO_FAILED');
    }
  } finally {
    await setChaos('HCM', false);
  }
}

async function commitRecoveryScenario() {
  console.log('\n=== COMMIT TIMEOUT + RECOVERY ===');
  const amount = 10000;
  const beforeTotal = await totalBalance();
  await setChaos('HCM', true, 'COMMIT', 'TIMEOUT');
  let transaction;
  try {
    transaction = await transfer({
      sourceAccountId: 'HN-001',
      destinationAccountId: 'HCM-001',
      amount,
      currency: 'VND'
    }, `viva-recovery-${Date.now()}`);
    const duringTotal = await totalBalance();
    console.log(`After timeout: ${transaction.status}/${transaction.decision}`);
    console.log(`Book balance during in-flight window: ${money(duringTotal)}`);
    console.log(`Book + in-flight: ${money(duringTotal + amount)} (baseline ${money(beforeTotal)})`);
    if (transaction.status !== 'COMMITTING' || transaction.decision !== 'COMMIT') {
      throw new Error('EXPECTED_COMMITTING_WITH_COMMIT_DECISION');
    }
  } finally {
    await setChaos('HCM', false);
  }

  const recovery = await client.post(`${COORDINATOR}/api/transfers/${transaction.transactionId}/recover`);
  const recovered = recovery.data.data;
  const afterTotal = await totalBalance();
  console.log(`After recovery: ${recovered.status}/${recovered.decision}`);
  console.log(`Money conservation after convergence: ${money(beforeTotal)} -> ${money(afterTotal)}`);
  if (recovered.status !== 'COMMITTED' || beforeTotal !== afterTotal) {
    throw new Error('RECOVERY_SCENARIO_FAILED');
  }
}

async function idempotencyScenario() {
  console.log('\n=== IDEMPOTENCY ===');
  const amount = 10000;
  const key = `viva-idempotency-${Date.now()}`;
  const beforeSource = await getAccount('DN-002');
  const data = {
    sourceAccountId: 'DN-002',
    destinationAccountId: 'HN-002',
    amount,
    currency: 'VND'
  };
  const first = await transfer(data, key);
  const second = await transfer(data, key);
  const afterSource = await getAccount('DN-002');
  const actualDebit = beforeSource.balance - afterSource.balance;

  console.log(`First transaction ID:  ${first.transactionId}`);
  console.log(`Second transaction ID: ${second.transactionId}`);
  console.log(`Actual debit after two requests: ${money(actualDebit)}`);
  if (first.transactionId !== second.transactionId || actualDebit !== amount) {
    throw new Error('IDEMPOTENCY_SCENARIO_FAILED');
  }
}

const scenarios = {
  preflight,
  success: successScenario,
  'prepare-failure': prepareFailureScenario,
  'commit-recovery': commitRecoveryScenario,
  idempotency: idempotencyScenario
};

async function main() {
  const requested = process.argv[2] || 'preflight';
  try {
    await clearChaos();
    if (requested === 'all') {
      await preflight();
      await successScenario();
      await prepareFailureScenario();
      await commitRecoveryScenario();
      await idempotencyScenario();
    } else if (scenarios[requested]) {
      await scenarios[requested]();
    } else {
      throw new Error(`Kịch bản không hợp lệ: ${requested}`);
    }
    console.log('\n[PASS] Demo hoàn tất.');
  } catch (error) {
    const detail = error.response?.data || error.message;
    console.error('\n[FAIL]', detail);
    process.exitCode = 1;
  } finally {
    try {
      await clearChaos();
    } catch (error) {
      console.error('[WARN] Không thể tự tắt chaos:', error.message);
    }
  }
}

main();
