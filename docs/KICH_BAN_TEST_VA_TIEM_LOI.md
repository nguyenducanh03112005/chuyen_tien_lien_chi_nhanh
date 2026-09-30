# Kịch bản test và lệnh tiêm lỗi

## 0. Chuẩn bị

```powershell
cd backend
npm run reset
npm run start:all
```

Các địa chỉ:

```text
Coordinator: http://localhost:3000
HN:         http://localhost:3001
HCM:        http://localhost:3002
DN:         http://localhost:3003
```

Tắt toàn bộ lỗi trước mỗi ca:

```powershell
3001,3002,3003 | ForEach-Object {
  Invoke-RestMethod -Uri "http://localhost:$($_)/api/chaos" -Method Post `
    -ContentType "application/json" -Body '{"enabled":false,"failurePoint":"NONE","failureMode":"REJECT"}'
}
```

## 1. Test chuyển tiền thành công — Happy Path

### Thực hiện

```powershell
$key = "test-happy-$(Get-Date -Format yyyyMMddHHmmssfff)"
Invoke-RestMethod -Uri "http://localhost:3000/api/transfers" -Method Post `
  -Headers @{"Idempotency-Key"=$key} -ContentType "application/json" `
  -Body '{"sourceAccountId":"HN-001","destinationAccountId":"HCM-001","amount":100000,"currency":"VND"}'
```

### Kỳ vọng

- HTTP thành công.
- Trạng thái giao dịch: `COMMITTED`.
- `HN-001` giảm `100000`, `HCM-001` tăng `100000`.
- Tổng tiền toàn hệ thống không đổi.

## 2. Test lỗi PREPARE — HCM từ chối vote

### Tiêm lỗi

```powershell
Invoke-RestMethod -Uri "http://localhost:3002/api/chaos" -Method Post `
  -ContentType "application/json" `
  -Body '{"enabled":true,"failurePoint":"PREPARE","failureMode":"REJECT"}'
```

### Thực hiện

```powershell
$key = "test-prepare-reject-$(Get-Date -Format yyyyMMddHHmmssfff)"
Invoke-RestMethod -Uri "http://localhost:3000/api/transfers" -Method Post `
  -Headers @{"Idempotency-Key"=$key} -ContentType "application/json" `
  -Body '{"sourceAccountId":"HN-002","destinationAccountId":"HCM-002","amount":50000,"currency":"VND"}'
```

### Kỳ vọng

- HCM trả vote `NO` ở pha `PREPARE`.
- Trạng thái giao dịch: `ABORTED`.
- Tiền tạm giữ ở HN được giải phóng.
- Số dư nguồn và đích không thay đổi.
- Tổng tiền toàn hệ thống không đổi.

### Tắt lỗi

```powershell
Invoke-RestMethod -Uri "http://localhost:3002/api/chaos" -Method Post `
  -ContentType "application/json" -Body '{"enabled":false}'
```

## 3. Test lỗi COMMIT — HCM timeout

### Tiêm lỗi

```powershell
Invoke-RestMethod -Uri "http://localhost:3002/api/chaos" -Method Post `
  -ContentType "application/json" `
  -Body '{"enabled":true,"failurePoint":"COMMIT","failureMode":"TIMEOUT"}'
```

### Thực hiện

```powershell
$key = "test-commit-timeout-$(Get-Date -Format yyyyMMddHHmmssfff)"
$tx = Invoke-RestMethod -Uri "http://localhost:3000/api/transfers" -Method Post `
  -Headers @{"Idempotency-Key"=$key} -ContentType "application/json" `
  -Body '{"sourceAccountId":"HN-001","destinationAccountId":"HCM-001","amount":10000,"currency":"VND"}'
$tx
```

### Kỳ vọng

- HN có thể đã commit, HCM timeout ở pha `COMMIT`.
- Trạng thái giao dịch: `COMMITTING` hoặc `UNKNOWN`.
- Không được rollback HN.
- Không có mất hoặc tạo thêm tiền; khoản tiền đang xử lý được xem là `in-flight`.

## 4. Test crash recovery cho giao dịch COMMITTING

### Tắt lỗi

```powershell
Invoke-RestMethod -Uri "http://localhost:3002/api/chaos" -Method Post `
  -ContentType "application/json" -Body '{"enabled":false}'
```

### Phục hồi theo mã giao dịch

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/transfers/$($tx.transactionId)/recover" -Method Post
```

### Hoặc quét toàn bộ giao dịch dở dang

```powershell
npm run recover
```

### Kỳ vọng

- Participant HCM được commit bù.
- Trạng thái giao dịch: `COMMITTED`.
- Tổng tiền toàn hệ thống bằng tổng tiền trước khi test.

## 5. Test idempotency — gửi lại cùng một yêu cầu

### Thực hiện

```powershell
$key = "test-idempotency-$(Get-Date -Format yyyyMMddHHmmssfff)"
$body = '{"sourceAccountId":"DN-001","destinationAccountId":"HN-001","amount":100,"currency":"VND"}'

$first = Invoke-RestMethod -Uri "http://localhost:3000/api/transfers" -Method Post `
  -Headers @{"Idempotency-Key"=$key} -ContentType "application/json" -Body $body

$second = Invoke-RestMethod -Uri "http://localhost:3000/api/transfers" -Method Post `
  -Headers @{"Idempotency-Key"=$key} -ContentType "application/json" -Body $body

$first
$second
```

### Kỳ vọng

- Hai phản hồi trả về cùng một giao dịch.
- Chỉ tạo một giao dịch thực tế.
- Tiền chỉ bị trừ/cộng một lần.
- Trạng thái giao dịch: `COMMITTED`.

## 6. Test thiếu Idempotency-Key

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/transfers" -Method Post `
  -ContentType "application/json" `
  -Body '{"sourceAccountId":"HN-001","destinationAccountId":"HCM-001","amount":100000,"currency":"VND"}'
```

### Kỳ vọng

- HTTP `400`.
- Mã lỗi: `MISSING_IDEMPOTENCY_KEY`.
- Không tạo giao dịch và không thay đổi số dư.

## 7. Test dữ liệu chuyển tiền không hợp lệ

### Cùng tài khoản nguồn và đích

```powershell
$key = "test-same-account-$(Get-Date -Format yyyyMMddHHmmssfff)"
Invoke-RestMethod -Uri "http://localhost:3000/api/transfers" -Method Post `
  -Headers @{"Idempotency-Key"=$key} -ContentType "application/json" `
  -Body '{"sourceAccountId":"HN-001","destinationAccountId":"HN-001","amount":100,"currency":"VND"}'
```

### Số tiền không hợp lệ

```powershell
$key = "test-invalid-amount-$(Get-Date -Format yyyyMMddHHmmssfff)"
Invoke-RestMethod -Uri "http://localhost:3000/api/transfers" -Method Post `
  -Headers @{"Idempotency-Key"=$key} -ContentType "application/json" `
  -Body '{"sourceAccountId":"HN-001","destinationAccountId":"HCM-001","amount":0,"currency":"VND"}'
```

### Không đủ số dư

```powershell
$key = "test-insufficient-balance-$(Get-Date -Format yyyyMMddHHmmssfff)"
Invoke-RestMethod -Uri "http://localhost:3000/api/transfers" -Method Post `
  -Headers @{"Idempotency-Key"=$key} -ContentType "application/json" `
  -Body '{"sourceAccountId":"HN-001","destinationAccountId":"HCM-001","amount":999999999999,"currency":"VND"}'
```

### Kỳ vọng chung

- HTTP lỗi `4xx` với mã lỗi tương ứng.
- Không tạo giao dịch thành công.
- Không thay đổi số dư.

## 8. Chạy toàn bộ test tự động

```powershell
cd backend
npm run test:chaos
```

Kỳ vọng: các ca Happy Path, PREPARE Reject, COMMIT Timeout/Recovery và Idempotency đều đạt `PASS`.

```powershell
npm run test:recovery
```

Kỳ vọng: giao dịch timeout được phục hồi thành `COMMITTED`, recovery lặp lại không làm thay đổi kết quả, tổng tiền được bảo toàn.

## 9. Dọn trạng thái sau kiểm thử

```powershell
cd backend
npm run reset
```
