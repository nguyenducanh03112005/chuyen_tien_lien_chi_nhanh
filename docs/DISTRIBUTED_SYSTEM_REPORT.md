# Báo cáo kỹ thuật hệ thống chuyển tiền liên chi nhánh

## 1. Phạm vi và mục tiêu

Dự án mô phỏng chuyển tiền giữa các chi nhánh ngân hàng có dữ liệu phân tán. Mỗi chi nhánh chạy như một tiến trình độc lập; Coordinator điều phối giao dịch giữa tài khoản nguồn và tài khoản đích.

Mục tiêu kiểm chứng là tính nguyên tử của giao dịch, bảo toàn tổng tiền, xử lý lỗi một phần, phục hồi giao dịch dở dang và chống gửi lặp.

## 2. Phạm vi hiện thực

- Android client gọi API của Coordinator.
- Coordinator chạy tại port `3000`.
- Branch node HN, HCM, DN chạy lần lượt tại `3001`, `3002`, `3003`.
- Dữ liệu prototype lưu trong JSON theo từng process.
- Giao tiếp giữa các process sử dụng REST/HTTP và Axios.
- Giao dịch liên chi nhánh dùng Two-Phase Commit.

## 3. Quy tắc nghiệp vụ chính

Tài khoản có `balance` và `reservedBalance`. Số dư khả dụng được tính bằng `balance - reservedBalance`.

Trong Prepare, hệ thống chỉ giữ tiền nguồn. Trong Commit, hệ thống mới trừ tiền nguồn, giải phóng tiền giữ và cộng tiền cho tài khoản đích. Trong Abort, hệ thống trả lại tiền giữ.

Một giao dịch đã có quyết định `COMMIT` không được chuyển ngược thành `ABORT`.

## 4. Cơ chế phân tán

Coordinator tạo transaction record, xác định participant nguồn và đích, rồi gửi các lệnh nội bộ `prepare`, `commit` hoặc `abort` tới branch node tương ứng.

Pha Prepare yêu cầu mọi participant trả `YES`. Một kết quả `NO` hoặc lỗi kết nối làm giao dịch đi theo nhánh Abort.

Pha Commit chỉ bắt đầu sau khi mọi participant đã Prepare thành công. Nếu Commit chưa hoàn tất, Coordinator giữ trạng thái `COMMITTING` hoặc `UNKNOWN` và chờ recovery.

## 5. Chịu lỗi và phục hồi

Chaos Service hỗ trợ mô phỏng `PREPARE/REJECT` và `COMMIT/TIMEOUT`. Prepare failure giải phóng reservation và đưa giao dịch về `ABORTED`. Commit timeout không rollback participant đã commit; recovery đọc quyết định toàn cục và gửi lệnh còn thiếu.

Coordinator quét các giao dịch chưa hoàn tất khi khởi động hoặc khi gọi recovery thủ công. Recovery với quyết định `COMMIT` tiếp tục commit; recovery với quyết định `ABORT` tiếp tục abort.

## 6. Idempotency và kiểm chứng

API chuyển tiền yêu cầu `Idempotency-Key`. Coordinator dùng key để trả lại transaction cũ khi client retry, tránh tạo giao dịch và thay đổi số dư lần hai.

Các kịch bản kiểm thử chính gồm happy path, Prepare Reject, Commit Timeout, Recovery, Idempotency, thiếu key, tài khoản không hợp lệ và không đủ số dư. Chi tiết lệnh chạy nằm trong `KICH_BAN_TEST_VA_TIEM_LOI.md`.

## 7. Kết quả và giới hạn

Mô hình hiện chứng minh được luồng 2PC, reservation, abort an toàn, commit bù và chống duplicate request. Đây là prototype học tập, chưa phải hệ thống production: JSON chưa thay thế database giao dịch, Coordinator vẫn là điểm lỗi đơn, timeout chưa mô phỏng network partition thật và chưa có đầy đủ cơ chế bảo mật.

## 8. Hướng phát triển

Thay JSON bằng database có transaction và locking; bổ sung message broker, retry có backoff, Coordinator dự phòng, authentication, TLS, audit log, metrics, tracing và kiểm thử concurrency/process crash.
