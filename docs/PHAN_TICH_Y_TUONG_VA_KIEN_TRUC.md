# Phân tích ý tưởng và kiến trúc hệ thống

## 1. Ý tưởng dự án

Hệ thống mô phỏng chuyển tiền giữa các chi nhánh ngân hàng có dữ liệu phân tán. Mỗi chi nhánh quản lý tài khoản của mình trên một tiến trình độc lập; giao dịch chuyển tiền giữa hai chi nhánh phải thay đổi dữ liệu ở cả nơi gửi và nơi nhận một cách nguyên tử.

Vấn đề cốt lõi là: nếu một chi nhánh thành công còn chi nhánh kia lỗi, hệ thống không được tạo ra giao dịch nửa chừng hoặc làm mất tiền. Dự án giải quyết vấn đề này bằng giao thức Two-Phase Commit (2PC), kết hợp lưu trạng thái giao dịch, idempotency và cơ chế recovery.

## 2. Mục tiêu thiết kế

- Đảm bảo tính nguyên tử: tất cả participant cùng commit hoặc cùng abort trong pha chuẩn bị.
- Bảo toàn tổng tiền trước và sau giao dịch.
- Cô lập dữ liệu theo từng chi nhánh.
- Xử lý được lỗi một phần, timeout và giao dịch đang dang dở.
- Không tạo giao dịch thứ hai khi client gửi lại cùng một yêu cầu.
- Cho phép quan sát và trình diễn các failure mode bằng Chaos Service.

## 3. Kiến trúc tổng thể

```text
+------------------+
| Android App       |
| Jetpack Compose   |
| ViewModel/Retrofit|
+--------+---------+
         |
         | HTTP REST
         v
+--------------------------+
| Coordinator :3000        |
| API + Distributed Tx     |
| 2PC state machine        |
| transaction log          |
| recovery                 |
+----+----------+-----+----+
     |          |     |
     | prepare/ |     |
     | commit/  |     |
     | abort    |     |
     v          v     v
+---------+ +---------+ +---------+
| HN:3001 | | HCM:3002| | DN:3003 |
| accounts| | accounts | | accounts|
| local tx| | local tx | | local tx|
+---------+ +---------+ +---------+
```

### Các thành phần

| Thành phần | Trách nhiệm |
|---|---|
| Android App | Hiển thị tài khoản, tạo yêu cầu chuyển tiền, hiển thị trạng thái `COMMITTED`, `ABORTED`, `COMMITTING` hoặc lỗi. |
| Coordinator | Nhận yêu cầu client, xác định participant, điều phối 2PC, lưu trạng thái và khởi chạy recovery. |
| Branch Node HN/HCM/DN | Quản lý tài khoản cục bộ và thực thi `prepare`, `commit`, `abort` cho participant của mình. |
| Repository JSON | Mô phỏng persistence cho tài khoản, participant transaction và distributed transaction. |
| Chaos Service | Tiêm lỗi có chủ đích tại `PREPARE` hoặc `COMMIT` với chế độ `REJECT` hoặc `TIMEOUT`. |

## 4. Phân vùng dữ liệu

Mỗi branch node có dữ liệu riêng:

- `backend/nodes/hn/data/accounts.json`
- `backend/nodes/hcm/data/accounts.json`
- `backend/nodes/dn/data/accounts.json`

Coordinator không trực tiếp sửa số dư của participant. Nó gửi lệnh qua HTTP tới đúng branch node. Vì vậy, quyền sở hữu dữ liệu vẫn nằm ở chi nhánh tương ứng.

Các tài khoản được định tuyến theo tiền tố chi nhánh, ví dụ `HN-001`, `HCM-001`, `DN-001`. Với giao dịch liên chi nhánh, Coordinator tạo hai participant: nguồn với vai trò `SOURCE` và đích với vai trò `DESTINATION`.

## 5. Luồng xử lý giao dịch

### 5.1. Tiếp nhận yêu cầu

Client gửi `POST /api/transfers` kèm header `Idempotency-Key`. Coordinator kiểm tra key trong transaction repository:

1. Nếu key đã tồn tại, trả lại giao dịch cũ.
2. Nếu chưa tồn tại, tạo `transactionId` mới.
3. Lưu giao dịch với trạng thái `CREATED`.

### 5.2. Pha Prepare

Coordinator chuyển giao dịch sang `PREPARING` và gọi song song:

```text
POST /api/internal/transactions/{transactionId}/prepare
```

Participant thực hiện:

- kiểm tra tài khoản tồn tại, đúng chi nhánh và đang `ACTIVE`;
- kiểm tra currency;
- với `SOURCE`, kiểm tra `available = balance - reservedBalance`;
- tạm giữ tiền bằng cách tăng `reservedBalance`;
- ghi participant transaction ở trạng thái `PREPARED`;
- trả `YES` hoặc `NO`.

Nếu tất cả trả `YES`, Coordinator chuyển giao dịch sang `PREPARED`. Chỉ cần một participant trả `NO` hoặc timeout, Coordinator chọn quyết định `ABORT` và gửi lệnh abort để giải phóng reservation.

### 5.3. Pha Commit

Khi pha Prepare thành công, Coordinator:

1. Lưu quyết định toàn cục `COMMIT`.
2. Chuyển giao dịch sang `COMMITTING`.
3. Gọi:

```text
POST /api/internal/transactions/{transactionId}/commit
```

Participant nguồn trừ `balance` và giải phóng `reservedBalance`. Participant đích cộng `balance`. Khi tất cả participant trả `COMMITTED`, Coordinator chuyển trạng thái toàn cục thành `COMMITTED`.

Một participant timeout ở pha này không làm giao dịch abort. Giao dịch giữ ở `COMMITTING` hoặc `UNKNOWN` để recovery tiếp tục quyết định `COMMIT` đã được ghi trước đó.

## 6. Mô hình trạng thái

```text
CREATED -> PREPARING -> PREPARED -> COMMITTING -> COMMITTED
              |             |
              v             v
           ABORTING ------> ABORTED

COMMITTING -> UNKNOWN -> COMMITTING
ABORTING   -> UNKNOWN -> ABORTING
```

Các trạng thái cuối là `COMMITTED`, `ABORTED` và `FAILED`. Quy tắc quan trọng là giao dịch đã `COMMITTED` không được quay lại `ABORTED`; điều này bảo vệ tính bền vững của quyết định commit.

## 7. Bảo toàn tiền và reservation

Hệ thống tách ba khái niệm:

- `balance`: số dư sổ sách hiện tại.
- `reservedBalance`: số tiền đang bị giữ trong pha Prepare.
- `available`: số tiền có thể dùng, tính bằng `balance - reservedBalance`.

Trong Prepare, tiền nguồn chỉ bị khóa, chưa bị trừ thật. Trong Abort, reservation được trả lại. Trong Commit, tiền nguồn mới bị trừ và tiền đích được cộng. Thiết kế này ngăn việc trừ tiền nguồn trước khi biết toàn bộ participant có thể tham gia giao dịch.

## 8. Chịu lỗi và phục hồi

### Prepare failure

HCM trả `NO` hoặc không phản hồi. Coordinator gửi `ABORT` tới các participant đã chuẩn bị, nhờ đó giải phóng tiền tạm giữ.

### Commit timeout

Một participant có thể đã commit trong khi Coordinator chưa nhận được phản hồi. Coordinator không rollback participant khác mà lưu giao dịch ở trạng thái chưa hoàn tất.

### Recovery

Khi khởi động, Coordinator chờ participant sẵn sàng rồi quét transaction repository. Các giao dịch `COMMITTING`, `UNKNOWN`, `ABORTING` hoặc có quyết định toàn cục chưa hoàn tất sẽ được xử lý lại:

- `decision = COMMIT`: gửi commit bù tới participant còn thiếu.
- `decision = ABORT`: gửi abort tới participant chưa hoàn tất.
- chưa có decision nhưng bị treo ở giai đoạn đầu: abort để tránh giữ tài nguyên vô hạn.

Các lệnh phục hồi hiện có:

```powershell
npm run recover
```

hoặc:

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/transfers/{transactionId}/recover" -Method Post
```

## 9. Idempotency

`Idempotency-Key` là định danh logic của yêu cầu từ client. Coordinator lưu key cùng giao dịch. Khi client retry do mạng chậm hoặc người dùng bấm lặp:

- không tạo transaction mới;
- không chạy lại việc trừ/cộng tiền;
- trả lại kết quả của transaction cũ.

Đây là lớp bảo vệ chống double spending ở tầng API; tính idempotent ở participant cũng được hỗ trợ bằng việc kiểm tra participant transaction đã `COMMITTED` hay chưa.

## 10. Chaos testing

Chaos Service chỉ phục vụ môi trường phát triển/kiểm thử. Có thể cấu hình theo node:

```powershell
Invoke-RestMethod -Uri "http://localhost:3002/api/chaos" -Method Post `
  -ContentType "application/json" `
  -Body '{"enabled":true,"failurePoint":"PREPARE","failureMode":"REJECT"}'
```

```powershell
Invoke-RestMethod -Uri "http://localhost:3002/api/chaos" -Method Post `
  -ContentType "application/json" `
  -Body '{"enabled":true,"failurePoint":"COMMIT","failureMode":"TIMEOUT"}'
```

Mục đích là chứng minh ba đặc tính: abort an toàn khi Prepare thất bại, không rollback sai trong Commit và có thể hoàn tất giao dịch bằng recovery.

## 11. Đánh giá kiến trúc

### Điểm mạnh

- Mô phỏng rõ ràng mô hình coordinator–participant của 2PC.
- Dữ liệu chi nhánh được cô lập và thao tác qua API nội bộ.
- Có state machine, transaction log, idempotency và recovery.
- Có khả năng tái hiện lỗi để kiểm chứng tính nhất quán.
- Giao diện phản ánh trạng thái giao dịch trung gian thay vì chỉ báo thành công/thất bại.

### Giới hạn hiện tại

- JSON file chưa phải cơ chế persistence đồng thời an toàn như database giao dịch.
- Coordinator là điểm lỗi đơn (single point of failure).
- Recovery chủ yếu do Coordinator chủ động; participant chưa có giao thức tự hỏi quyết định từ các node khác.
- Timeout hiện mô phỏng bằng delay HTTP, chưa phải network partition thật.
- Chưa có xác thực, phân quyền, mã hóa nội bộ hoặc kiểm soát audit ở mức production.
- Chưa có cơ chế lock phân tán và xử lý đồng thời mạnh khi nhiều yêu cầu cùng tác động một tài khoản.

## 12. Hướng phát triển

1. Thay JSON bằng database hỗ trợ transaction, WAL và optimistic/pessimistic locking.
2. Dùng durable message broker cho prepare/commit/abort và retry có backoff.
3. Nhân bản Coordinator hoặc dùng consensus để loại bỏ single point of failure.
4. Bổ sung authentication, authorization, TLS, audit log và rate limiting.
5. Thêm metric, tracing và dashboard theo dõi latency, timeout, reservation và recovery.
6. Kiểm thử concurrency, process crash, network partition và duplicate message ở quy mô lớn hơn.

## 13. Kết luận

Đây là mô hình thực nghiệm tập trung vào bài toán nhất quán giao dịch trên dữ liệu phân tán. Giá trị chính của dự án không nằm ở việc mô phỏng một ứng dụng ngân hàng hoàn chỉnh, mà ở việc thể hiện được cách 2PC phối hợp nhiều node độc lập, cách reservation bảo vệ số dư và cách recovery xử lý trạng thái không chắc chắn sau lỗi mạng hoặc lỗi participant.
