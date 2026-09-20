const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Define project root directory relative to this script
const ROOT_DIR = path.resolve(__dirname, '../..');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');
const REPORT_MD_PATH = path.join(DOCS_DIR, 'DISTRIBUTED_SYSTEM_REPORT.md');
const REPORT_HTML_PATH = path.join(DOCS_DIR, 'report', 'index.html');
const REPORT_JSON_PATH = path.join(DOCS_DIR, 'report', 'data', 'report.json');

console.log('====================================================');
console.log('  CẬP NHẬT BÁO CÁO HỆ THỐNG PHÂN TÁN TỰ ĐỘNG');
console.log('====================================================');

// 1. Get Git metadata
let gitInfo = {
    branch: 'main',
    commitHash: 'unknown',
    commitMessage: 'No commit yet',
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
console.log(`- Giao dịch phân tán đã ghi nhận: ${txStats.totalTransactions} (${txStats.committed} committed, ${txStats.aborted} aborted)`);

// 4. Update DISTRIBUTED_SYSTEM_REPORT.md (if it exists)
if (fs.existsSync(REPORT_MD_PATH)) {
    let mdContent = fs.readFileSync(REPORT_MD_PATH, 'utf8');
    
    // Update verification date
    mdContent = mdContent.replace(
        /> \*\*Thời điểm xác minh\*\*: .*/g,
        `> **Thời điểm xác minh**: ${formattedDate} (Commit: \`${gitInfo.commitHash}\`)`
    );

    fs.writeFileSync(REPORT_MD_PATH, mdContent, 'utf8');
    console.log(`✓ Đã đồng bộ [docs/DISTRIBUTED_SYSTEM_REPORT.md]`);
} else {
    console.log(`- [docs/DISTRIBUTED_SYSTEM_REPORT.md] không tồn tại (bỏ qua).`);
}

// 5. Update docs/report/index.html
if (fs.existsSync(REPORT_HTML_PATH)) {
    let htmlContent = fs.readFileSync(REPORT_HTML_PATH, 'utf8');
    
    // Replace verification time in hero meta
    htmlContent = htmlContent.replace(
        /<span class="hero-meta-value">Tháng [^<]*<\/span>/g,
        `<span class="hero-meta-value">${formattedDate} (Git: <code>${gitInfo.commitHash}</code>)</span>`
    );
    htmlContent = htmlContent.replace(
        /<span class="hero-meta-value"><code>v[^<]*<\/code>[^<]*<\/span>/g,
        `<span class="hero-meta-value"><code>v1.0.0</code> (Commit: ${gitInfo.commitHash})</span>`
    );

    fs.writeFileSync(REPORT_HTML_PATH, htmlContent, 'utf8');
    console.log(`✓ Đã đồng bộ [docs/report/index.html]`);
}

// 6. Update docs/report/data/report.json
if (fs.existsSync(REPORT_JSON_PATH)) {
    try {
        const jsonContent = JSON.parse(fs.readFileSync(REPORT_JSON_PATH, 'utf8'));
        
        jsonContent.meta.date = formattedDate;
        jsonContent.meta.lastCommit = {
            hash: gitInfo.commitHash,
            message: gitInfo.commitMessage.split('\n')[0],
            branch: gitInfo.branch,
            date: gitInfo.commitDate
        };
        jsonContent.statistics = {
            totalAccounts: accountsStats.totalAccounts,
            totalBalance: accountsStats.totalBalance,
            byBranch: accountsStats.byBranch,
            transactions: txStats
        };

        // Add changelog entry if not already present
        if (!jsonContent.changelog) jsonContent.changelog = [];
        const todayStr = now.toISOString().split('T')[0];
        const lastEntry = jsonContent.changelog[jsonContent.changelog.length - 1];
        
        if (!lastEntry || lastEntry.hash !== gitInfo.commitHash) {
            jsonContent.changelog.push({
                date: todayStr,
                event: `Update: ${gitInfo.commitMessage.split('\n')[0]}`,
                hash: gitInfo.commitHash,
                ver: jsonContent.meta.version
            });
        }

        fs.writeFileSync(REPORT_JSON_PATH, JSON.stringify(jsonContent, null, 2), 'utf8');
        console.log(`✓ Đã đồng bộ [docs/report/data/report.json]`);
    } catch (e) {
        console.error('[ERROR] Lỗi ghi report.json:', e.message);
    }
}

console.log('====================================================');
console.log('  HOÀN TẤT CẬP NHẬT BÁO CÁO THÀNH CÔNG!');
console.log('====================================================\n');
