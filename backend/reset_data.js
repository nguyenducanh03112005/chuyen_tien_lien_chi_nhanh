const fs = require('fs');
const path = require('path');

const hnAccounts = [
  {
    id: "HN-001",
    ownerName: "Nguyễn Văn A",
    branchId: "HN",
    balance: 9000000,
    currency: "VND",
    status: "ACTIVE",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: new Date().toISOString(),
    reservedBalance: 0
  },
  {
    id: "HN-002",
    ownerName: "Trần Thị B",
    branchId: "HN",
    balance: 25000000,
    currency: "VND",
    status: "ACTIVE",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: new Date().toISOString(),
    reservedBalance: 0
  }
];

const hcmAccounts = [
  {
    id: "HCM-001",
    ownerName: "Lê Văn C",
    branchId: "HCM",
    balance: 10000000,
    currency: "VND",
    status: "ACTIVE",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: new Date().toISOString(),
    reservedBalance: 0
  },
  {
    id: "HCM-002",
    ownerName: "Phạm Văn E",
    branchId: "HCM",
    balance: 12000000,
    currency: "VND",
    status: "ACTIVE",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: new Date().toISOString(),
    reservedBalance: 0
  }
];

const dnAccounts = [
  {
    id: "DN-001",
    ownerName: "Phạm Thị D",
    branchId: "DN",
    balance: 15000000,
    currency: "VND",
    status: "ACTIVE",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: new Date().toISOString(),
    reservedBalance: 0
  },
  {
    id: "DN-002",
    ownerName: "Hoàng Văn F",
    branchId: "DN",
    balance: 9000000,
    currency: "VND",
    status: "ACTIVE",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: new Date().toISOString(),
    reservedBalance: 0
  }
];

function resetData() {
  console.log('🔄 Đang khôi phục số dư và dữ liệu demo chuẩn...');

  fs.writeFileSync(path.join(__dirname, 'nodes/hn/data/accounts.json'), JSON.stringify(hnAccounts, null, 2));
  fs.writeFileSync(path.join(__dirname, 'nodes/hcm/data/accounts.json'), JSON.stringify(hcmAccounts, null, 2));
  fs.writeFileSync(path.join(__dirname, 'nodes/dn/data/accounts.json'), JSON.stringify(dnAccounts, null, 2));

  // Reset chaos configs on all nodes
  const chaosOff = { enabled: false, failurePoint: "NONE", failureMode: "REJECT" };
  const hnChaosPath = path.join(__dirname, 'nodes/hn/data/chaos_config.json');
  const hcmChaosPath = path.join(__dirname, 'nodes/hcm/data/chaos_config.json');
  const dnChaosPath = path.join(__dirname, 'nodes/dn/data/chaos_config.json');
  if (fs.existsSync(hnChaosPath)) fs.writeFileSync(hnChaosPath, JSON.stringify(chaosOff, null, 2));
  if (fs.existsSync(hcmChaosPath)) fs.writeFileSync(hcmChaosPath, JSON.stringify(chaosOff, null, 2));
  if (fs.existsSync(dnChaosPath)) fs.writeFileSync(dnChaosPath, JSON.stringify(chaosOff, null, 2));

  console.log('✅ Đã đặt lại số dư chuẩn:');
  console.log('- HN-001:  9,000,000 VND');
  console.log('- HN-002: 25,000,000 VND');
  console.log('- HCM-001: 10,000,000 VND');
  console.log('- HCM-002: 12,000,000 VND');
  console.log('- DN-001: 15,000,000 VND');
  console.log('- DN-002:  9,000,000 VND');
  console.log('Tổng tài sản: 80,000,000 VND.');
}

resetData();
