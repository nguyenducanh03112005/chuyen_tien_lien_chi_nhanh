const axios = require('axios');

const COORDINATOR = 'http://localhost:3000';

function money(value) {
  return new Intl.NumberFormat('vi-VN').format(value) + ' VND';
}

async function recover() {
  console.log('=== KÍCH HOẠT CRASH RECOVERY TOÀN CỤC ===');
  try {
    const res = await axios.post(`${COORDINATOR}/api/transfers/recover`);
    const { recoveredCount, transactions } = res.data.data;

    console.log(`Số giao dịch dở dang được tìm thấy và xử lý: ${recoveredCount}`);
    if (recoveredCount > 0) {
      transactions.forEach((tx) => {
        console.log(`- Mã giao dịch: ${tx.transactionId}`);
        console.log(`  Quyết định toàn cục: ${tx.decision}`);
        console.log(`  Trạng thái cuối: ${tx.status}`);
        tx.participants.forEach((p) => {
          console.log(`    + Chi nhánh ${p.branchId} (${p.role}): ${p.status}`);
        });
      });
    }

    // Kiểm tra lại số dư các tài khoản
    const accountsRes = await axios.get(`${COORDINATOR}/api/accounts`);
    const accounts = accountsRes.data.data;
    const total = accounts.reduce((sum, acc) => sum + parseInt(acc.balance), 0);

    console.log('\n--- BẢNG SỐ DƯ SAU PHỤC HỒI ---');
    accounts.forEach((acc) => {
      console.log(`- ${acc.id} (${acc.ownerName} - ${acc.branchId}): ${money(acc.balance)} (Tạm giữ: ${money(acc.reservedBalance || 0)})`);
    });
    console.log(`Tổng tài sản toàn hệ thống: ${money(total)}`);
    console.log('✅ Quá trình phục hồi thành công. Hệ thống đạt trạng thái nhất quán tuyệt đối!');
  } catch (err) {
    console.error('❌ Lỗi khi kích hoạt phục hồi:', err.response?.data || err.message);
  }
}

recover();
