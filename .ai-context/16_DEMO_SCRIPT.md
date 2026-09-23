# Presentation / Demo Script & Oral Defense

> **Tài liệu chi tiết đầy đủ (Master Guide)**: Xem tại [KICH_BAN_DEMO_VA_VAN_DAP.md](file:///e:/K%E1%BB%B3%207%20UDU/%E1%BB%A8ng%20d%E1%BB%A5ng%20&%20H%E1%BB%87%20th%E1%BB%91ng%20ph%C3%A2n%20t%C3%A1n/%E1%BB%A8ng%20d%E1%BB%A5ng/Chuy%E1%BB%83n%20ti%E1%BB%81n%20li%C3%AAn%20chi%20nh%C3%A1nh/docs/KICH_BAN_DEMO_VA_VAN_DAP.md)

---

## Tóm tắt 5 Cảnh trình diễn (5 Live Demo Scenes)

### Cảnh 1: Phân vùng dữ liệu (Data Partitioning) & Kiểm tra số dư 3 chi nhánh
- **Bản chất**: 3 chi nhánh chạy 3 tiến trình độc lập (`HN:3001`, `HCM:3002`, `DN:3003`) với file lưu trữ riêng biệt (`accounts.json`). Coordinator (`:3000`) đóng vai trò điểm vào.
- **Thao tác**: Mở app, lọc theo từng chi nhánh `TẤT CẢ`, `HN`, `HCM`, `DN`. Chỉ vào thẻ **Tổng số dư** toàn hệ thống ban đầu (79,000,000 VND).

### Cảnh 2: Chuyển tiền liên chi nhánh thành công (Happy Path 2PC)
- **Kịch bản**: Chuyển 100,000 VND từ `HN-001` sang `HCM-001`.
- **Trực quan hóa 2PC**:
  1. *Phase 1 (Prepare)*: HN khóa tiền vào `reservedBalance` (800k khả dụng), HCM kiểm tra tài khoản ACTIVE. Cả 2 cùng vote `YES`.
  2. *Phase 2 (Commit)*: Coordinator ra quyết định `COMMIT`. HN trừ tiền thật, HCM cộng tiền thật.
  3. *Bảo toàn tiền*: Tổng số dư toàn hệ thống không đổi. Lịch sử hiển thị `DISTRIBUTED`, `HN: COMMITTED`, `HCM: COMMITTED`.

### Cảnh 3: Sự cố Pha 1 — Prepare Failure & Global Abort (Rollback)
- **Kịch bản**: Tiêm lỗi HCM từ chối vote ở Prepare (PowerShell):
  ```powershell
  Invoke-RestMethod -Uri "http://localhost:3002/api/chaos" -Method Post -ContentType "application/json" -Body '{"enabled": true, "failurePoint": "PREPARE", "failureMode": "REJECT"}'
  ```
- **Chuyển tiền**: Chuyển 200,000 VND `HN-001` $\rightarrow$ `HCM-001`.
- **Hiện tượng**: App báo lỗi **❌ Giao dịch bị hủy (ABORTED)**. HN tạm giữ rồi lập tức giải phóng `reservedBalance`. Số dư `HN-001` và `HCM-001` nguyên vẹn. Lịch sử ghi `ABORTED`.
- **Tắt lỗi**: `Invoke-RestMethod -Uri "http://localhost:3002/api/chaos" -Method Post -ContentType "application/json" -Body '{"enabled": false}'`.

### Cảnh 4: Sự cố Pha 2 — Commit Timeout & Crash Recovery (Điểm ăn điểm 10)
- **Kịch bản**: Tiêm lỗi HCM timeout ở Commit (PowerShell):
  ```powershell
  Invoke-RestMethod -Uri "http://localhost:3002/api/chaos" -Method Post -ContentType "application/json" -Body '{"enabled": true, "failurePoint": "COMMIT", "failureMode": "TIMEOUT"}'
  ```
- **Chuyển tiền**: Chuyển 500,000 VND `HN-001` $\rightarrow$ `HCM-001`.
- **Điểm học thuật mấu chốt**: HN đã Commit trừ tiền, HCM timeout. **TUYỆT ĐỐI KHÔNG ĐƯỢC ABORT** vì sẽ gây Double Spending! Trạng thái giữ nguyên là `COMMITTING` / `UNKNOWN`.
- **Phục hồi**: Tắt chaos (`Invoke-RestMethod -Uri "http://localhost:3002/api/chaos" -Method Post -ContentType "application/json" -Body '{"enabled": false}'`) và chạy script phục hồi `npm run recover`. Coordinator commit bù sang HCM, giao dịch đạt `COMMITTED`, bảo toàn 100% dòng tiền.

### Cảnh 5: Idempotency Key & Kiểm chứng tự động
- Gửi 2 lần cùng một `Idempotency-Key` $\rightarrow$ Coordinator trả về ngay giao dịch cũ, không tạo mới, không trừ tiền lần 2.
- Chạy toàn bộ test suite tự động:
  ```bash
  npm run test:chaos
  ```

---

## 5 Câu hỏi vấn đáp then chốt thường gặp nhất

1. **Tại sao dùng 2PC thay vì Saga hay Raft?**
   - 2PC đảm bảo tính Nhất quán mạnh (Strong Consistency / ACID) cho giao dịch chuyển khoản tài chính tức thì. Saga là eventual consistency (phù hợp luồng dài ngày). Raft là sao chép trạng thái nội bộ chi nhánh (replication), còn 2PC là cam kết nguyên tử xuyên chi nhánh (cross-partition atomic commit).
2. **Nhược điểm lớn nhất của 2PC?**
   - Là giao thức dạng chặn (Blocking Protocol), Coordinator là điểm nghẽn đơn lẻ (SPOF), giữ khóa tài nguyên phong tỏa trong suốt thời gian trễ mạng.
3. **Phân biệt Book Balance, Reserved Balance, Available Balance?**
   - Book Balance: Số dư thực tế sổ sách (chỉ trừ/cộng ở Commit). Reserved Balance: Tiền tạm giữ ở Prepare. Available Balance: Book - Reserved (người dùng chỉ được tiêu tiền trong hạn mức này).
4. **Tại sao ở Pha 2 khi nút đích Timeout, Coordinator lại KHÔNG rollback nút nguồn?**
   - Vì nút nguồn đã thực thi trừ tiền rồi. Nếu tự ý rollback thì vi phạm tính Bền vững (Durability) và nguy cơ nút đích nhận được gói Commit muộn sẽ dẫn đến lỗi nhân đôi tiền (Double Spending). Hệ thống phải giữ trạng thái cam kết và chạy Crash Recovery để commit bù.
5. **Đồ án giải quyết vấn đề Coordinator Crash thế nào?**
   - Quyết định Commit/Abort được ghi bền vững xuống file trước khi gửi lệnh đi (Write-Ahead Log). Khi Coordinator khởi động lại, hàm `recoverTransactions()` tự động quét các giao dịch `COMMITTING`/`UNKNOWN` để gửi lệnh cam kết bù.
