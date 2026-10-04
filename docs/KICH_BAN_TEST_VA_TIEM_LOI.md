# Kịch bản kiểm thử và lệnh tiêm lỗi

## 1. Chuẩn bị môi trường

```powershell
cd backend
npm install
npm run reset
npm run start:all
```

Service: Coordinator `3000`, HN `3001`, HCM `3002`, DN `3003`.

Tắt chaos trước mỗi ca:

```powershell
3001,3002,3003 | ForEach-Object {
  Invoke-RestMethod "http://localhost:$($_)/api/chaos" -Method Post `
    -ContentType "application/json" -Body '{"enabled":false,"failurePoint":"NONE","failureMode":"REJECT"}'
}
```

## 2. Happy Path

```powershell
$key = "happy-$(Get-Date -Format yyyyMMddHHmmssfff)"
Invoke-RestMethod "http://localhost:3000/api/transfers" -Method Post `
  -Headers @{"Idempotency-Key"=$key} -ContentType "application/json" `
  -Body '{"sourceAccountId":"HN-001","destinationAccountId":"HCM-001","amount":100000,"currency":"VND"}'
```

Kỳ vọng: `COMMITTED`, HN giảm tiền, HCM tăng tiền, tổng tiền không đổi.

## 3. Prepare Reject

```powershell
Invoke-RestMethod "http://localhost:3002/api/chaos" -Method Post `
  -ContentType "application/json" `
  -Body '{"enabled":true,"failurePoint":"PREPARE","failureMode":"REJECT"}'
```

Gửi giao dịch HN-002 → HCM-002 với số tiền `50000` và key mới.

Kỳ vọng: HCM trả `NO`, Coordinator gửi `ABORT`, giao dịch `ABORTED`, reservation của HN được giải phóng, tổng tiền không đổi.

Tắt lỗi:

```powershell
Invoke-RestMethod "http://localhost:3002/api/chaos" -Method Post `
  -ContentType "application/json" -Body '{"enabled":false}'
```

## 4. Commit Timeout

```powershell
Invoke-RestMethod "http://localhost:3002/api/chaos" -Method Post `
  -ContentType "application/json" `
  -Body '{"enabled":true,"failurePoint":"COMMIT","failureMode":"TIMEOUT"}'
```

Gửi giao dịch HN-001 → HCM-001 với số tiền `10000` và key mới.

Kỳ vọng: trạng thái `COMMITTING` hoặc `UNKNOWN`; không rollback participant đã commit; tiền còn thiếu được xem là in-flight.

## 5. Recovery

Tắt chaos rồi phục hồi:

```powershell
Invoke-RestMethod "http://localhost:3002/api/chaos" -Method Post `
  -ContentType "application/json" -Body '{"enabled":false}'
npm run recover
```

Hoặc phục hồi một transaction:

```powershell
Invoke-RestMethod "http://localhost:3000/api/transfers/{transactionId}/recover" -Method Post
```

Kỳ vọng: participant còn thiếu nhận commit bù, transaction thành `COMMITTED`, tổng tiền khớp baseline.

## 6. Idempotency

Gửi cùng body hai lần với cùng header `Idempotency-Key`.

```powershell
$key = "idem-$(Get-Date -Format yyyyMMddHHmmssfff)"
$body = '{"sourceAccountId":"DN-001","destinationAccountId":"HN-001","amount":100,"currency":"VND"}'
Invoke-RestMethod "http://localhost:3000/api/transfers" -Method Post -Headers @{"Idempotency-Key"=$key} -ContentType "application/json" -Body $body
Invoke-RestMethod "http://localhost:3000/api/transfers" -Method Post -Headers @{"Idempotency-Key"=$key} -ContentType "application/json" -Body $body
```

Kỳ vọng: hai phản hồi trỏ tới cùng transaction và tiền chỉ thay đổi một lần.

## 7. Kiểm thử lỗi đầu vào

Kiểm tra các trường hợp: thiếu `Idempotency-Key`, cùng tài khoản nguồn/đích, amount bằng 0 hoặc âm, currency không hỗ trợ, tài khoản không tồn tại và không đủ số dư.

Kỳ vọng: API trả lỗi `4xx`, không tạo giao dịch thành công và không thay đổi số dư.

## 8. Bộ test tự động

```powershell
npm run test:chaos
npm run test:recovery
```

Kỳ vọng: các test in `PASS`, giao dịch lỗi được phục hồi đúng và tổng tiền được bảo toàn.
