# Phân tích ý tưởng và kiến trúc

## 1. Ý tưởng

Hệ thống mô phỏng giao dịch chuyển tiền giữa các phân vùng dữ liệu ngân hàng. Mỗi branch node sở hữu tài khoản của chi nhánh mình. Coordinator không ghi trực tiếp vào dữ liệu chi nhánh mà điều phối các participant qua HTTP.

## 2. Sơ đồ kiến trúc

```text
Android App
    |
    v
Coordinator :3000
    | prepare / commit / abort
    +---- HN :3001 ---- accounts + participant transactions
    +---- HCM:3002 ---- accounts + participant transactions
    +---- DN :3003 ---- accounts + participant transactions
```

Android dùng Retrofit gọi API ngoài. Coordinator dùng Axios gọi API nội bộ. Các node dùng Express và repository JSON cục bộ.

## 3. Thành phần mã nguồn

| Thành phần | Vị trí | Vai trò |
|---|---|---|
| Android UI | `app/src/main` | Nhập giao dịch và hiển thị trạng thái |
| Coordinator | `backend/coordinator` | API client, state machine, log và recovery |
| Participant nodes | `backend/nodes/hn`, `hcm`, `dn` | Sở hữu tài khoản và thực hiện thay đổi cục bộ |
| 2PC service | `backend/shared/src/services/twoPhaseCommit.service.js` | Prepare, reservation, commit, abort |
| Chaos service | `backend/shared/src/services/chaos.service.js` | Mô phỏng reject và timeout |

## 4. Lý do chọn công nghệ

Node.js/Express tạo các process HTTP độc lập với cấu hình nhẹ. REST/HTTP làm rõ boundary mạng giữa Coordinator và participant. JSON giúp quan sát trạng thái trong prototype. Android Compose và ViewModel biểu diễn trạng thái giao dịch bất đồng bộ trên client.

2PC phù hợp mục tiêu minh họa atomic commit giữa các phân vùng. Reservation giúp giữ tiền trong Prepare mà chưa ghi nhận debit cuối cùng. Idempotency-Key xử lý retry từ client. Recovery xử lý trạng thái không chắc chắn sau timeout.

## 5. Luồng dữ liệu

1. Client gửi `POST /api/transfers` cùng `Idempotency-Key`.
2. Coordinator tạo transaction `CREATED` và chuyển sang `PREPARING`.
3. Coordinator gọi `prepare` song song tới các participant.
4. Tất cả `YES` thì ghi quyết định `COMMIT`; có `NO` thì ghi `ABORT`.
5. Với `COMMIT`, participant nguồn debit và participant đích credit.
6. Coordinator hoàn tất ở `COMMITTED`, hoặc giữ `COMMITTING/UNKNOWN` để recovery.

## 6. Mô hình trạng thái

```text
CREATED -> PREPARING -> PREPARED -> COMMITTING -> COMMITTED
              |             |
              v             v
           ABORTING ------> ABORTED

COMMITTING/ABORTING -> UNKNOWN -> recovery
```

State machine ngăn chuyển một giao dịch đã `COMMITTED` về `ABORTED`, bảo vệ quyết định commit đã ghi.

## 7. Đánh giá

Kiến trúc hiện phù hợp cho học tập và demo fault tolerance. Giới hạn hiện tại là persistence JSON, Coordinator chưa được nhân bản, timeout chưa phải network partition thật, và các node chưa có cơ chế consensus hoặc bảo mật production.
