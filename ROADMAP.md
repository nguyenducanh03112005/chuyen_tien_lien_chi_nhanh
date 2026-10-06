# Lộ trình hoàn thiện dự án (Roadmap)

Lộ trình được lập bằng cách đối chiếu mã nguồn hiện tại với yêu cầu trong
[`.ai-context/02_REQUIREMENTS.md`](.ai-context/02_REQUIREMENTS.md) và kế hoạch kiểm thử
[`.ai-context/10_TEST_PLAN.md`](.ai-context/10_TEST_PLAN.md).

Thứ tự ưu tiên: **Giai đoạn 1–3 là bắt buộc để nộp và bảo vệ**, Giai đoạn 4 làm bài
mạnh hơn, Giai đoạn 5 là phần mở rộng nếu còn thời gian.

---

## Hiện trạng

**Đã hoàn thành**
- [x] Coordinator + 3 node chi nhánh (HN, HCM, DN), dữ liệu phân vùng theo chi nhánh
- [x] Chuyển tiền nội bộ chi nhánh
- [x] Chuyển tiền liên chi nhánh bằng Two-Phase Commit (Prepare / Commit / Abort)
- [x] Tạm giữ tiền (`reservedBalance`) ở pha Prepare
- [x] Idempotency Key cho yêu cầu chuyển tiền
- [x] Crash Recovery (khi khởi động và qua `POST /api/transfers/recover`), presumed abort
- [x] Chaos API: `REJECT` / `TIMEOUT` tại `PREPARE` / `COMMIT`
- [x] Kịch bản kiểm thử: `chaos_test.js`, `recovery_test.js`, `demo_viva.js`
- [x] Ứng dụng Android: đăng nhập, xem tài khoản, chuyển tiền, lịch sử, trạng thái 2PC
- [x] Tài liệu: báo cáo, phân tích kiến trúc, kịch bản thuyết trình, hỏi đáp

**Còn thiếu so với yêu cầu**
- [ ] Unit test tự động (kế hoạch kiểm thử có, mã chưa có)
- [ ] Kịch bản kiểm thử luôn thoát với mã `0`, kể cả khi có `[FAIL]`
- [ ] Chế độ Admin/Chaos trong ứng dụng (yêu cầu "Admin/debug mode")
- [ ] Chế độ chi nhánh **offline** (yêu cầu "set branch online/offline")
- [ ] Hiển thị **tiến trình** giao dịch theo thời gian thực (yêu cầu "Show transaction progress")
- [ ] Ứng dụng chỉ chạy trên emulator (`10.0.2.2` cố định) – chưa chạy được qua LAN
- [ ] `.ai-context/12_PROJECT_STATUS.md` đã lỗi thời (mọi mục vẫn chưa đánh dấu)

---

## Giai đoạn 1 – Kiểm thử tự động (ưu tiên cao nhất)

Mục tiêu: chứng minh tính đúng đắn bằng test chạy được một lệnh, không phụ thuộc đọc log.

- [ ] Thêm framework test cho backend (gợi ý: `node:test` có sẵn trong Node.js, không cần cài thêm)
- [ ] Unit test **node/participant** (`twoPhaseCommit.service.js`):
  - [ ] prepare đủ số dư → YES, `reservedBalance` tăng
  - [ ] prepare thiếu số dư / số tiền không hợp lệ → NO
  - [ ] commit giao dịch đã prepare → số dư thay đổi đúng
  - [ ] abort giao dịch đã prepare → nhả tiền tạm giữ
  - [ ] prepare / commit / abort gọi lặp lại → kết quả như một lần
  - [ ] abort trước prepare → prepare muộn bị từ chối (tombstone)
- [ ] Unit test **coordinator** (`distributedTransaction.service.js`, giả lập node bằng mock HTTP):
  - [ ] bảng chuyển trạng thái hợp lệ / không hợp lệ
  - [ ] tất cả YES → COMMITTED
  - [ ] một NO → ABORTED
  - [ ] timeout ở Prepare → ABORT trước khi có quyết định
  - [ ] lỗi ở Commit → COMMITTING, recovery → COMMITTED
- [ ] Sửa `chaos_test.js` và `recovery_test.js`: thoát với mã `1` khi có `[FAIL]`
- [ ] Thêm lệnh `npm test` ở thư mục gốc chạy toàn bộ test
- [ ] Kiểm tra bất biến: tổng tiền trước = sau sau **mỗi** kịch bản

**Hoàn thành khi:** `npm test` chạy xanh và báo đỏ khi cố tình làm hỏng logic 2PC.

## Giai đoạn 2 – Hoàn thiện chức năng theo yêu cầu

- [ ] **Chế độ offline cho chi nhánh:** thêm `failureMode: OFFLINE` – node trả lỗi 503 cho
      mọi API nội bộ, để demo "chi nhánh mất kết nối" mà không phải tắt tiến trình
      (lệnh `start:all` dùng `--kill-others`, tắt một node sẽ tắt cả hệ thống)
- [ ] **Màn hình Admin/Chaos trong app:** bật/tắt lỗi cho từng chi nhánh, chọn điểm lỗi
      (Prepare/Commit) và kiểu lỗi (Reject/Timeout/Offline), nút "Recover"
- [ ] **Theo dõi tiến trình giao dịch:** màn hình chi tiết giao dịch tự làm mới
      (polling `GET /api/transfers/:id`) cho tới trạng thái cuối, hiển thị từng bước
      PREPARING → PREPARED → COMMITTING → COMMITTED / ABORTED và trạng thái từng chi nhánh
- [ ] `GET /api/transfers/:id` trả được cả giao dịch nội bộ (hiện chỉ trả giao dịch phân tán)
- [ ] Hiển thị **số dư khả dụng** (`balance − reservedBalance`) rõ ràng trên app

**Hoàn thành khi:** toàn bộ checklist demo thủ công trong `10_TEST_PLAN.md` thực hiện được
từ app, không cần gõ lệnh `curl`.

## Giai đoạn 3 – Sẵn sàng demo và bảo vệ

- [ ] Cấu hình địa chỉ backend cho app (qua `BuildConfig` hoặc màn hình cài đặt) để chạy trên
      **điện thoại thật qua LAN**, không chỉ emulator
- [ ] Cấu hình URL các node của coordinator qua biến môi trường (hiện cố định `localhost`)
- [ ] Build APK release, ghi hướng dẫn cài đặt vào `README.md`
- [ ] Chạy thử toàn bộ `16_DEMO_SCRIPT.md` từ đầu tới cuối, đo thời gian
- [ ] Chuẩn bị phương án dự phòng: video quay demo, ảnh chụp màn hình từng kịch bản
- [ ] Cập nhật `.ai-context/12_PROJECT_STATUS.md` theo tiến độ thực tế
- [ ] Rà lại tài liệu trong `docs/` cho khớp với mã nguồn sau khi sửa

**Hoàn thành khi:** demo chạy trơn tru trên máy trình bày, có phương án dự phòng.

## Giai đoạn 4 – Chất lượng mã và độ tin cậy (nên làm)

- [ ] **CI bằng GitHub Actions:** chạy `npm test` và build Android cho mỗi Pull Request
- [ ] Ghi log có cấu trúc kèm `transactionId` để truy vết một giao dịch qua các node
- [ ] Tách cấu hình hằng số (timeout, cổng, độ trễ recovery) vào một file config
- [ ] Gộp `fileDatabase.js` trùng lặp giữa coordinator và shared
- [ ] Xóa mã cũ không dùng (`backend/shared/src/server.js` – mock server cũ)
- [ ] Unit test cho `BankingViewModel` (Android) với API giả lập
- [ ] Recovery chạy định kỳ (không chỉ khi khởi động) để tự xử lý giao dịch treo

## Giai đoạn 5 – Mở rộng (nếu còn thời gian)

Các hướng này dùng để trả lời câu hỏi "hệ thống có thể cải thiện thế nào?" khi bảo vệ;
chỉ cần làm một mục là đủ gây ấn tượng.

- [ ] Thay file JSON bằng **SQLite/PostgreSQL** cho từng chi nhánh (transaction thật)
- [ ] Xác thực API nội bộ giữa coordinator và node (API key / token)
- [ ] Đăng nhập thật thay cho tài khoản cố định `admin / admin123`
- [ ] Nhân bản coordinator (bầu leader bằng Raft) để loại bỏ điểm lỗi đơn
- [ ] Triển khai thử mẫu **Saga** để so sánh với 2PC (độ trễ, khả năng chịu lỗi)
- [ ] Đóng gói bằng **Docker Compose** (mỗi chi nhánh một container), mô phỏng mạng chậm

---

## Cách theo dõi tiến độ

- Đánh dấu `[x]` vào file này khi hoàn thành một mục, kèm số Pull Request nếu có.
- Mỗi giai đoạn nên làm trên một nhánh riêng và gộp vào `main` qua Pull Request.
