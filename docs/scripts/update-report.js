const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Root and docs directories
const ROOT_DIR = path.resolve(__dirname, '../..');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');
const REPORT_MD_PATH = path.join(DOCS_DIR, 'DISTRIBUTED_SYSTEM_REPORT.md');

console.log('====================================================');
console.log('  CẬP NHẬT BÁO CÁO HỆ THỐNG PHÂN TÁN (MARKDOWN)');
console.log('====================================================');

// 1. Get Git metadata
let gitInfo = {
    branch: 'main',
    commitHash: 'unknown',
    commitMessage: 'Initial work',
    commitDate: new Date().toISOString()
};

try {
    gitInfo.branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: ROOT_DIR }).toString().trim();
    gitInfo.commitHash = execSync('git rev-parse --short HEAD', { cwd: ROOT_DIR }).toString().trim();
    gitInfo.commitMessage = execSync('git log -1 --pretty=%B', { cwd: ROOT_DIR }).toString().trim();
    gitInfo.commitDate = execSync('git log -1 --format=%cd --date=iso', { cwd: ROOT_DIR }).toString().trim();
} catch (e) {
    console.warn('[WARN] Không thể lấy thông tin Git:', e.message);
}

// 2. Scan backend node data
const nodes = ['hn', 'hcm', 'dn'];
let accountsStats = {
    totalAccounts: 0,
    totalBalance: 0,
    byBranch: {}
};

nodes.forEach(node => {
    const accPath = path.join(ROOT_DIR, 'backend', 'nodes', node, 'data', 'accounts.json');
    if (fs.existsSync(accPath)) {
        try {
            const accounts = JSON.parse(fs.readFileSync(accPath, 'utf8'));
            const count = accounts.length;
            const balance = accounts.reduce((sum, a) => sum + (parseInt(a.balance) || 0), 0);
            accountsStats.byBranch[node.toUpperCase()] = { count, balance };
            accountsStats.totalAccounts += count;
            accountsStats.totalBalance += balance;
        } catch (e) {
            console.error(`[ERROR] Lỗi đọc dữ liệu ${node}:`, e.message);
        }
    }
});

// 3. Scan distributed transactions data
let txStats = {
    totalTransactions: 0,
    committed: 0,
    aborted: 0
};
const txPath = path.join(ROOT_DIR, 'backend', 'coordinator', 'data', 'distributed_transactions.json');
if (fs.existsSync(txPath)) {
    try {
        const txs = JSON.parse(fs.readFileSync(txPath, 'utf8'));
        txStats.totalTransactions = txs.length;
        txStats.committed = txs.filter(t => t.status === 'COMMITTED').length;
        txStats.aborted = txs.filter(t => t.status === 'ABORTED').length;
    } catch (e) {
        console.error('[ERROR] Lỗi đọc dữ liệu transactions:', e.message);
    }
}

const now = new Date();
const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

console.log(`- Nhánh Git: ${gitInfo.branch}`);
console.log(`- Commit gần nhất: [${gitInfo.commitHash}] ${gitInfo.commitMessage.split('\n')[0]}`);
console.log(`- Tổng tài khoản: ${accountsStats.totalAccounts} (Tổng số dư: ${accountsStats.totalBalance.toLocaleString()} VND)`);
console.log(`- Giao dịch phân tán: ${txStats.totalTransactions} (${txStats.committed} COMMITTED, ${txStats.aborted} ABORTED)`);

// 4. Update docs/DISTRIBUTED_SYSTEM_REPORT.md
if (fs.existsSync(REPORT_MD_PATH)) {
    let mdContent = fs.readFileSync(REPORT_MD_PATH, 'utf8');

    // Update verification date & Git commit
    mdContent = mdContent.replace(
        /> \*\*Thời điểm xác minh\*\*: .*/g,
        `> **Thời điểm xác minh**: ${formattedDate} (Git: \`${gitInfo.commitHash}\` - Nhánh: \`${gitInfo.branch}\`)`
    );

    fs.writeFileSync(REPORT_MD_PATH, mdContent, 'utf8');
    console.log(`✓ Đã cập nhật [docs/DISTRIBUTED_SYSTEM_REPORT.md]`);
} else {
    console.error(`[ERROR] Không tìm thấy [docs/DISTRIBUTED_SYSTEM_REPORT.md]`);
}

console.log('====================================================');
console.log('  HOÀN TẤT ĐỒNG BỘ BÁO CÁO THÀNH CÔNG!');
console.log('====================================================\n');
