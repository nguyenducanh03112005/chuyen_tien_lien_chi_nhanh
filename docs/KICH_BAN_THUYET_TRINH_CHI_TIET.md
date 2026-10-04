# Kịch bản thuyết trình

Tài liệu này chỉ phục vụ phần trình bày theo slide. Nội dung hỏi đáp kiến trúc nằm độc lập tại `HOI_DAP_KIEN_TRUC_PHAN_TAN.md` và không lặp lại trong tài liệu này.

## Slide 1. Bài toán

Giới thiệu hệ thống chuyển tiền giữa các chi nhánh có dữ liệu phân tán. Nhấn mạnh yêu cầu: nếu một node lỗi, hệ thống không được mất tiền hoặc cập nhật nửa chừng. Nêu 2PC là thuật toán điều phối được chọn.

## Slide 2. Ý tưởng giải pháp

Giải thích ba điểm: dữ liệu phân vùng theo chi nhánh, lỗi một phần có thể xảy ra, Coordinator cần điều phối quyết định chung. Nói rõ branch node sở hữu dữ liệu còn Coordinator sở hữu trạng thái giao dịch.

## Slide 3. Kiến trúc

Chỉ lần lượt Android App, Coordinator `3000`, rồi HN `3001`, HCM `3002`, DN `3003`. App chỉ gọi Coordinator. Coordinator gọi participant bằng các API nội bộ `prepare`, `commit`, `abort`.

## Slide 4. Công nghệ

Android dùng Kotlin, Compose, ViewModel, StateFlow và Retrofit để biểu diễn trạng thái bất đồng bộ. Backend dùng Node.js, Express và Axios để tạo các process HTTP độc lập. JSON giúp quan sát prototype. Chaos Service tạo lỗi có kiểm soát để kiểm chứng fault tolerance.

## Slide 5. Two-Phase Commit

Pha Prepare kiểm tra điều kiện và giữ tiền. Tất cả participant trả `YES` thì giao dịch sang `PREPARED`. Một `NO` hoặc timeout làm Coordinator chọn `ABORT`.

Pha Commit chỉ chạy sau khi Prepare thành công. Coordinator ghi quyết định `COMMIT`, gửi commit tới các participant và chỉ kết thúc khi tất cả đã `COMMITTED`.

## Slide 6. Reservation

Giải thích `available = balance - reservedBalance`. Prepare chỉ tăng `reservedBalance`, chưa trừ `balance`. Abort giải phóng reservation. Commit mới trừ nguồn và cộng đích. Cách này bảo vệ tiền trong thời gian giao dịch đang chuẩn bị.

## Slide 7. Lỗi một phần

Với `PREPARE/REJECT`, HCM trả `NO`, Coordinator abort và HN trả lại reservation. Với `COMMIT/TIMEOUT`, HN có thể đã commit nên Coordinator không rollback; giao dịch giữ `COMMITTING` hoặc `UNKNOWN` để recovery.

## Slide 8. Recovery và Idempotency

Recovery đọc transaction log. Quyết định `COMMIT` thì gửi commit bù; quyết định `ABORT` thì gửi abort bù. `Idempotency-Key` giúp request retry trả lại transaction cũ, không trừ tiền lần hai.

## Slide 9. Demo

Trình diễn theo thứ tự: happy path, Prepare Reject, Commit Timeout, tắt chaos và recovery, cuối cùng gửi lặp cùng idempotency key. Khi demo, mở App cùng log Coordinator và branch node để nối thao tác giao diện với các bước 2PC.

## Slide 10. Kết luận

Tổng kết bốn kết quả: atomicity trong Prepare, không rollback sai sau Commit, recovery giao dịch dang dở và idempotency chống duplicate request. Nêu rõ giới hạn prototype: JSON, Coordinator đơn, timeout mô phỏng qua HTTP và chưa có bảo mật production.

## Phần kết

Khẳng định dự án tập trung vào cách hệ thống duy trì tính nhất quán khi có lỗi, không chỉ vào luồng chuyển tiền thành công. Mời câu hỏi và chuyển phần hỏi đáp sang `HOI_DAP_KIEN_TRUC_PHAN_TAN.md`.
