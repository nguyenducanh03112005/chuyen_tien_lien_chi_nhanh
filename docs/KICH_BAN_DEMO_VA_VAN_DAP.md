# TÀI LIỆU KỊCH BẢN TRÌNH DIỄN (LIVE DEMO) & BỘ CÂU HỎI VẤN ĐÁP BẢO VỆ ĐỒ ÁN
## ĐỀ TÀI: DIGITAL BANKING — CHUYỂN TIỀN LIÊN CHI NHÁNH BẰNG GIAO THỨC TWO-PHASE COMMIT (2PC)
**Môn học**: Ứng dụng & Hệ thống phân tán (Distributed Systems)  
**Cơ sở đào tạo**: Khoa CNTT — Hệ thống thông tin / Kỹ thuật phần mềm  
**Tác giả**: Nhóm nghiên cứu & phát triển hệ thống  

---

## MỤC LỤC
1. [Chuẩn bị trước giờ G (Pre-flight Checklist)](#1-chuẩn-bị-trước-giờ-g-pre-flight-checklist)
2. [Kịch bản Demo thực chiến từng bước (5 Cảnh trình diễn)](#2-kịch-bản-demo-thực-chiến-từng-bước)
   - [Cảnh 1: Khởi động & Chứng minh phân vùng dữ liệu độc lập](#cảnh-1-khởi-động--chứng-minh-phân-vùng-dữ-liệu-độc-lập)
   - [Cảnh 2: Chuyển tiền thành công qua 2PC (Happy Path)](#cảnh-2-chuyển-tiền-thành-công-qua-2pc-happy-path)
   - [Cảnh 3: Sự cố Pha 1 — Prepare Failure & Global Abort (Rollback)](#cảnh-3-sự-cố-pha-1--prepare-failure--global-abort-rollback)
   - [Cảnh 4: Sự cố Pha 2 — Commit Timeout & Crash Recovery](#cảnh-4-sự-cố-pha-2--commit-timeout--crash-recovery)
   - [Cảnh 5: Chống lặp lệnh (Idempotency) & Chạy Test Suite tự động](#cảnh-5-chống-lặp-lệnh-idempotency--chạy-test-suite-tự-động)
3. [Bộ câu hỏi & Trả lời vấn đáp chuyên sâu (15 câu hỏi trọng tâm)](#3-bộ-câu-hỏi--trả-lời-vấn-đáp-chuyên-sâu)
   - [Nhóm A: Cơ sở lý thuyết & Kiến trúc hệ thống](#nhóm-a-cơ-sở-lý-thuyết--kiến-trúc-hệ-thống)
   - [Nhóm B: Tính chịu lỗi (Fault Tolerance) & Bảo toàn dữ liệu](#nhóm-b-tính-chịu-lỗi-fault-tolerance--bảo-toàn-dữ-liệu)
   - [Nhóm C: Đặc trưng hệ thống phân tán & Giả định mạng](#nhóm-c-đặc-trưng-hệ-thống-phân-tán--giả-định-mạng)
   - [Nhóm D: Giới hạn hệ thống & Hướng nâng cấp thực tế](#nhóm-d-giới-hạn-hệ-thống--hướng-nâng-cấp-thực-tế)
4. [Bảng tra cứu nhanh phản xạ trong phòng vấn đáp (Cheat-sheet)](#4-bảng-tra-cứu-nhanh-phản-xạ-trong-phòng-vấn-đáp)

---

# 1. Chuẩn bị trước giờ G (Pre-flight Checklist)

Để buổi bảo vệ diễn ra mượt mà, không gặp sự cố kỹ thuật (demo effect), hãy chuẩn bị theo checklist sau:

### 1.1. Khởi động Backend (4 tiến trình độc lập)
Mở 1 terminal tại thư mục `backend/`:
```bash
cd backend
npm run start:all
```
*Hệ thống sẽ đồng thời khởi chạy qua `concurrently`:*
- **Coordinator**: `http://localhost:3000` (Điều phối viên)
- **HN Node**: `http://localhost:3001` (Quản lý `HN-*`)
- **HCM Node**: `http://localhost:3002` (Quản lý `HCM-*`)
- **DN Node**: `http://localhost:3003` (Quản lý `DN-*`)

### 1.2. Mở Android Emulator / Cài ứng dụng lên điện thoại
- Khởi động Android Emulator trong Android Studio.
- Mở app **Digital Banking**.
- Đăng nhập với tài khoản:
  - **Username**: `admin`
  - **Password**: `admin123`
- Xác nhận trạng thái trên đỉnh màn hình: `Server: Connected` (Màu xanh lá).

### 1.3. Chuẩn bị 1 Terminal phụ để điều khiển Chaos (Tiêm lỗi)
Mở sẵn 1 terminal PowerShell / Git Bash để copy nhanh các lệnh `curl` tiêm lỗi mà không cần mở Postman gây mất tập trung.

---

# 2. Kịch bản Demo thực chiến từng bước

> **Mẹo thuyết trình**: Luôn giải thích **Hiện tượng (Symptom) $\rightarrow$ Bản chất phân tán (Distributed Principle) $\rightarrow$ Bằng chứng mã nguồn/logs (Evidence)**.

```
       +--------------------------------------------------------+
       |             LỘ TRÌNH 5 CẢNH TRÌNH DIỄN                 |
       +--------------------------------------------------------+
       | Cảnh 1: Phân vùng dữ liệu (Data Partitioning)          |
       |    |                                                   |
       |    v                                                   |
       | Cảnh 2: Chuyển tiền thành công (Happy Path 2PC)       |
       |    |                                                   |
       |    v                                                   |
       | Cảnh 3: Thử nghiệm Lỗi Pha 1 (Prepare Reject / Abort)  |
       |    |                                                   |
       |    v                                                   |
       | Cảnh 4: Thử nghiệm Lỗi Pha 2 (Commit Timeout/Recovery) |
       |    |                                                   |
       |    v                                                   |
       | Cảnh 5: Idempotency & Tự động hóa kiểm thử tiền tệ     |
       +--------------------------------------------------------+
```

---

## Cảnh 1: Khởi động & Chứng minh phân vùng dữ liệu độc lập
**Thời lượng dự kiến**: 1 — 2 phút  
**Mục tiêu**: Chứng minh hệ thống không dùng 1 DB tập trung mà phân tán thực thụ theo chi nhánh.

### Lời thoại thuyết trình:
> *"Kính thưa thầy/cô, dự án của nhóm em mô phỏng bài toán Chuyển tiền liên chi nhánh trong Ngân hàng số. Điểm cốt lõi của đề tài không phải là giao diện CRUD đơn thuần, mà là giải quyết bài toán **Tính nhất quán giao dịch trên dữ liệu phân mảnh (Data Sharding / Partitioning)**.*
> 
> *Hiện tại trên màn hình, mỗi chi nhánh chạy một Node máy chủ độc lập trên một Port riêng:*
> - *Chi nhánh Hà Nội quản lý các tài khoản `HN-*` trên cổng 3001 với file dữ liệu riêng `nodes/hn/data/accounts.json`.*
> - *Chi nhánh TP.HCM quản lý `HCM-*` trên cổng 3002.*
> - *Chi nhánh Đà Nẵng quản lý `DN-*` trên cổng 3003.*
> - *Tất cả được kết nối qua một Coordinator trung tâm trên cổng 3000.*
> 
> *Các Node hoàn toàn cô lập về bộ nhớ và dữ liệu, tuyệt đối không có chuyện Node HN ghi đè trực tiếp vào file của Node HCM."*

### Thao tác demo:
1. Trên Android App, chỉ vào các nút bấm lọc chi nhánh: **TẤT CẢ**, **HN**, **HCM**, **DN**.
2. Bấm vào nút **HN**: Chỉ hiển thị các tài khoản `HN-001`, `HN-002`.
3. Bấm vào nút **HCM**: Chỉ hiển thị `HCM-001`, `HCM-002`.
4. Chỉ vào thẻ **Tổng số dư (Total Balance)** ở trên cùng:
   - Ghi chú lại tổng tài sản ban đầu của toàn hệ thống (ví dụ: `79,000,000 VND`).

---

## Cảnh 2: Chuyển tiền thành công qua 2PC (Happy Path)
**Thời lượng dự kiến**: 2 — 3 phút  
**Mục tiêu**: Trực quan hóa quy trình 2 pha (Prepare & Commit), cơ chế đóng băng tiền `reservedBalance` và bảo toàn tổng tài sản.

### Lời thoại thuyết trình:
> *"Bây giờ em sẽ thực hiện một giao dịch liên chi nhánh: Chuyển **100,000 VND** từ tài khoản **HN-001** (Chi nhánh Hà Nội) sang **HCM-001** (Chi nhánh TP.HCM).*
> 
> *Vì đây là giao dịch liên chi nhánh, Coordinator sẽ khởi tạo một **Distributed Transaction** tuân thủ nghiêm ngặt giao thức **Two-Phase Commit (2PC)**:*
> - ***Pha 1 (Prepare)**: Coordinator gửi yêu cầu PREPARE tới cả HN và HCM. Node HN kiểm tra số dư và **tạm giữ (reserve)** 100,000 VND trong trường `reservedBalance`. Node HCM kiểm tra tài khoản đích đang hoạt động (ACTIVE). Cả 2 nút cùng phản hồi vote YES.*
> - ***Pha 2 (Commit)**: Khi nhận đủ 100% phiếu YES, Coordinator đưa ra quyết định toàn cục `COMMIT`, gửi lệnh trừ tiền thực tế tại HN và cộng tiền thực tế tại HCM.*
> 
> *Hãy quan sát kết quả giao dịch!"*

### Thao tác demo:
1. Bấm nút **💸 Chuyển tiền** trên app.
2. Chọn:
   - **Tài khoản nguồn**: `HN-001`
   - **Chi nhánh nhận**: `HCM`
   - **Tài khoản nhận**: `HCM-001`
   - **Số tiền**: `100000`
3. Bấm **Tiếp tục** $\rightarrow$ Hộp thoại xác nhận hiện ra $\rightarrow$ Bấm **Xác nhận**.
4. Màn hình thông báo: **✅ Giao dịch thành công** kèm mã giao dịch dạng `tx-xxxx-xxxx`.
5. Bấm **Hoàn tất** $\rightarrow$ Quay lại Dashboard:
   - Số dư `HN-001` đã giảm 100,000 VND.
   - Số dư `HCM-001` đã tăng 100,000 VND.
   - **Tổng số dư toàn hệ thống KHÔNG ĐỔI**.
6. Chuyển sang màn hình **📜 Lịch sử giao dịch**:
   - Giao dịch hiển thị trạng thái `COMMITTED` màu xanh lá.
   - Hiển thị rõ loại: `DISTRIBUTED`.
   - Hiển thị danh sách các bên tham gia: `HN: COMMITTED`, `HCM: COMMITTED`.
7. Chỉ vào terminal backend:
   - Chỉ cho thầy cô thấy các dòng log:
     ```text
     POST /api/internal/transactions/.../prepare -> Vote YES
     POST /api/internal/transactions/.../commit -> COMMITTED
     ```

---

## Cảnh 3: Sự cố Pha 1 — Prepare Failure & Global Abort (Rollback)
**Thời lượng dự kiến**: 3 phút  
**Mục tiêu**: Chứng minh khả năng xử lý Lỗi từng phần (Partial Failure). Nếu 1 nút từ chối ở Pha 1, toàn bộ giao dịch bị hủy bỏ an toàn, tiền tạm giữ được giải phóng, không ai bị mất tiền.

### Lời thoại thuyết trình:
> *"Thách thức lớn nhất của hệ thống phân tán là **Lỗi từng phần (Partial Failure)**: một nhánh bị lỗi trong khi nhánh khác vẫn bình thường. Nếu làm theo cách ngây thơ là trừ tiền ở HN trước rồi mới gửi sang HCM, khi HCM lỗi thì tiền của khách hàng HN sẽ 'bốc hơi'.*
> 
> *Bây giờ, em sử dụng bộ công cụ **Chaos Service** của hệ thống để tiêm lỗi vào Chi nhánh HCM: Cấu hình cho HCM từ chối bỏ phiếu (Vote NO) ở giai đoạn Prepare.*
> 
> *Khi em thực hiện chuyển tiền từ HN sang HCM: Node HN đã sẵn sàng và tạm giữ tiền, nhưng HCM trả về NO. Coordinator sẽ lập tức ra quyết định toàn cục `ABORT`, yêu cầu Node HN hủy bỏ phong tỏa (Rollback / Release Reservation). Tiền khả dụng của tài khoản HN sẽ được phục hồi nguyên vẹn!"*

### Thao tác demo:
1. **Tiêm lỗi (Terminal phụ)**:
   ```bash
   curl -X POST http://localhost:3002/api/chaos -H "Content-Type: application/json" -d "{\"enabled\": true, \"failurePoint\": \"PREPARE\", \"failureMode\": \"REJECT\"}"
   ```
   *(Terminal sẽ báo: Chaos set on HCM: point=PREPARE, mode=REJECT)*
2. **Thực hiện chuyển tiền trên App**:
   - Nguồn: `HN-001`
   - Chi nhánh nhận: `HCM`
   - Đích: `HCM-001`
   - Số tiền: `200000`
   - Bấm **Tiếp tục** $\rightarrow$ **Xác nhận**.
3. **Quan sát ứng xử**:
   - App hiển thị thông báo lỗi giao dịch.
   - Quay về Dashboard:
     - Số dư của `HN-001` **vẫn giữ nguyên**, không bị trừ 200,000 VND.
     - Số dư tạm giữ (`reservedBalance`) **bằng 0**.
     - Số dư của `HCM-001` **giữ nguyên**.
4. **Vào màn hình Lịch sử (History)**:
   - Giao dịch hiển thị trạng thái `ABORTED` màu đỏ.
   - Các bên tham gia: `HN: ABORTED`, `HCM: FAILED`.
5. **Tắt lỗi Chaos để đưa hệ thống về bình thường**:
   ```bash
   curl -X POST http://localhost:3002/api/chaos -H "Content-Type: application/json" -d "{\"enabled\": false}"
   ```

---

## Cảnh 4: Sự cố Pha 2 — Commit Timeout & Crash Recovery
**Thời lượng dự kiến**: 4 phút  
**Mục tiêu**: **ĐIỂM ĂN ĐIỂM 10 CỦA BÀI BẢO VỆ**. Giải thích tại sao một khi đã quyết định COMMIT thì **tuyệt đối không được phép Rollback**, và chứng minh cơ chế Phục hồi sau sự cố (Crash Recovery).

### Lời thoại thuyết trình:
> *"Bây giờ là tình huống phức tạp và nguy hiểm nhất trong lý thuyết 2PC: **Lỗi xảy ra ở Pha 2 (Commit Phase)**.*
> 
> *Giả sử cả HN và HCM đều đã vote YES ở pha Prepare. Coordinator đã ra quyết định toàn cục là `COMMIT` và đã gửi lệnh commit thành công tới HN (HN đã trừ tiền thật). Nhưng đúng lúc gửi sang HCM thì đường truyền mạng bị Timeout (hoặc máy chủ HCM sập nguồn).*
> 
> *Câu hỏi đặt ra: **Lúc này Coordinator có được phép Rollback (hoàn tiền) cho HN hay không?***
> ***Câu trả lời dứt khoát là: TUYỆT ĐỐI KHÔNG!** Bởi vì HN đã trừ tiền rồi. Nếu ta lại tự ý rollback một phía thì sẽ vi phạm nguyên lý Cam kết Bền vững (Durability). Giao dịch bắt buộc phải duy trì trạng thái cam kết treo (`COMMITTING` hoặc `UNKNOWN`).*
> 
> *Khi HCM phục hồi, tiến trình **Crash Recovery** của Coordinator sẽ tự động quét lại nhật ký giao dịch và hoàn tất Commit bù cho HCM, bảo toàn 100% dòng tiền!"*

### Thao tác demo:
1. **Tiêm lỗi TIMEOUT ở Pha Commit trên HCM**:
   ```bash
   curl -X POST http://localhost:3002/api/chaos -H "Content-Type: application/json" -d "{\"enabled\": true, \"failurePoint\": \"COMMIT\", \"failureMode\": \"TIMEOUT\"}"
   ```
2. **Thực hiện chuyển tiền**:
   - Nguồn: `HN-001` $\rightarrow$ Đích: `HCM-001`
   - Số tiền: `500,000 VND`.
   - Bấm **Xác nhận**.
3. **Quan sát hiện tượng**:
   - Coordinator chờ quá 5000ms timeout của Axios.
   - Node HN đã Commit xong (trừ 500k).
   - Node HCM chưa nhận được Commit (chưa cộng 500k).
   - Trạng thái giao dịch được Coordinator ghim chặt ở `COMMITTING` (không chuyển sang Abort).
4. **Chứng minh Tiền không mất đi**:
   - Số tiền 500,000 VND này được định nghĩa chuẩn xác trong lý thuyết phân tán là **In-flight Amount** (Khoản tiền đang trung chuyển trên đường truyền mạng).
5. **Kích hoạt Phục hồi (Recovery)**:
   - Sửa lỗi mạng của HCM (Tắt chaos):
     ```bash
     curl -X POST http://localhost:3002/api/chaos -H "Content-Type: application/json" -d "{\"enabled\": false}"
     ```
   - Kích hoạt phục hồi bằng cách gọi API recover hoặc restart Coordinator (ở đây ta gọi script phục hồi tự động):
     ```bash
     npm run test:recovery
     ```
   - Quan sát log: Coordinator tìm thấy giao dịch `COMMITTING`, gửi lệnh commit bù sang HCM $\rightarrow$ Giao dịch chuyển thành công sang `COMMITTED`!
   - Số dư HCM được cộng thêm 500,000 VND. Tổng tài sản hệ thống khớp tuyệt đối!

---

## Cảnh 5: Chống lặp lệnh (Idempotency) & Chạy Test Suite tự động
**Thời lượng dự kiến**: 2 phút  
**Mục tiêu**: Chứng minh giải quyết Fallacy "Mạng tin cậy" bằng UUID Idempotency-Key và chạy kịch bản kiểm thử bảo toàn tiền tệ tự động.

### Lời thoại thuyết trình:
> *"Trong môi trường di động, người dùng có thể bấm nút chuyển tiền 2 lần do mạng chậm, hoặc sóng yếu khiến app gửi lại request (Retry). Để ngăn chặn thảm họa trừ tiền 2 lần (Double Spending), hệ thống bắt buộc sử dụng **Idempotency-Key (chuẩn UUIDv4)** cho mỗi yêu cầu.*
> 
> *Nếu Coordinator nhận được yêu cầu trùng Idempotency-Key, hệ thống lập tức trả về kết quả của giao dịch trước đó mà không tạo thêm giao dịch mới và không trừ tiền lần hai.*
> 
> *Để tổng kết, em xin phép chạy bộ kiểm thử tự động `chaos_test.js` để kiểm tra tính toàn vẹn và bất biến bảo toàn tiền tệ qua toàn bộ các ca kiểm thử."*

### Thao tác demo:
1. Tại terminal `backend/`, chạy lệnh:
   ```bash
   npm run test:chaos
   ```
2. Mời thầy cô xem kết quả hiển thị trên terminal:
   - `[PASS] State matches expected: COMMITTED` (Happy Path)
   - `[PASS] State matches expected: ABORTED` (Prepare Failure)
   - `[PASS] Money conserved.`
   - `[PASS] Idempotency returned COMMITTED.` (Không bị nhân đôi tiền)
   - `All tests completed.`

---

# 3. Bộ câu hỏi & Trả lời vấn đáp chuyên sâu

Dưới đây là 15 câu hỏi phổ biến và hóc búa nhất của Hội đồng đánh giá, kèm theo câu trả lời chuẩn học thuật và vị trí code minh chứng.

---

## Nhóm A: Cơ sở lý thuyết & Kiến trúc hệ thống

### Câu 1: Tại sao đồ án lại dùng Two-Phase Commit (2PC) mà không dùng Saga Pattern hoặc Raft/Paxos?
* **Trả lời**:
  - **Mục đích bài toán**: Hệ thống ngân hàng liên chi nhánh đòi hỏi tính **Nhất quán mạnh (Strict/Strong Consistency - ACID)**. 2PC đảm bảo giao dịch diễn ra theo nguyên lý nguyên tử (Atomic Commit): hoặc tất cả các chi nhánh cùng thay đổi trạng thái, hoặc không chi nhánh nào thay đổi.
  - **So sánh với Saga**: Saga dựa trên chuỗi các giao dịch cục bộ kèm giao dịch bồi hoàn (Compensating Transaction) mang tính **Nhất quán cuối cùng (Eventual Consistency)**. Saga phù hợp cho các luồng nghiệp vụ dài (Long-Running Transactions) như đặt vé máy bay + khách sạn. Nhưng với chuyển khoản tài chính tức thì, việc để tài khoản nguồn trừ tiền rồi chờ bồi hoàn sau có thể dẫn đến hiện tượng Dirty Reads hoặc người dùng rút sạch tiền trước khi bồi hoàn.
  - **So sánh với Raft/Paxos**: Raft/Paxos là thuật toán **Nhân bản trạng thái (State Machine Replication)** dùng để đồng thuận giữa các bản sao (Replicas) của *cùng một phân vùng dữ liệu* (nhóm node cùng dữ liệu). Còn 2PC là giao thức **Atomic Commit** điều phối giữa *các phân vùng dữ liệu khác nhau (Cross-partition/Sharding)*. Trong thực tế công nghiệp (như Google Spanner hay CockroachDB), người ta kết hợp cả hai: Raft đồng thuận trong từng cụm chi nhánh, và 2PC điều phối giữa các chi nhánh khác nhau.

### Câu 2: Nhược điểm lớn nhất (Chí mạng) của 2PC là gì?
* **Trả lời**:
  2PC có 3 nhược điểm kinh điển trong lý thuyết phân tán:
  1. **Tính chất chặn (Blocking Protocol)**: Nếu Coordinator bị crash sau khi các Participant đã vote YES ở pha Prepare, các Participant buộc phải giữ khóa tài nguyên (`reservedBalance`) và bị treo (in doubt) cho đến khi Coordinator sống lại.
  2. **Điều phối viên là điểm nghẽn đơn lẻ (Single Point of Failure - SPOF)**: Nếu chỉ có 1 Coordinator duy nhất mà bị hỏng hoàn toàn phần cứng, toàn bộ hệ thống tê liệt.
  3. **Độ trễ và hiệu năng (Latency & Resource Locking)**: Phải trải qua 2 lượt round-trip trên mạng (`Prepare` rồi `Commit`), giữ tài nguyên phong tỏa trong suốt thời gian trễ mạng, làm giảm throughput so với giao dịch bất đồng bộ.

### Câu 3: Hãy giải thích sự khác biệt giữa 3 khái niệm: Book Balance, Reserved Balance và Available Balance?
* **Trả lời**:
  - **Book Balance (Số dư sổ sách / thực tế - `account.balance`)**: Số tiền thực tế được pháp lý ghi nhận trong tài khoản. Tiền này **chỉ bị trừ hoặc cộng tại Pha 2 (Commit)**.
  - **Reserved Balance (Số dư phong tỏa / tạm giữ - `account.reservedBalance`)**: Khoản tiền bị đóng băng tạm thời tại **Pha 1 (Prepare)** khi nút nguồn vote YES. Mục đích là để bảo đảm rằng tài khoản không thể thực hiện giao dịch nào khác làm âm tiền trong lúc đang chờ quyết định Commit toàn cục.
  - **Available Balance (Số dư khả dụng)**: Được tính động bằng:
    $$\text{Available Balance} = \text{Book Balance} - \text{Reserved Balance}$$
    Người dùng chỉ được phép thực hiện chuyển khoản nếu: $\text{Số tiền chuyển} \le \text{Available Balance}$.
  - *Vị trí code*: File `backend/shared/src/services/twoPhaseCommit.service.js`, dòng 31-38.

### Câu 4: Tại sao không thể thực hiện chuyển tiền bằng cách đơn giản: Trừ tiền chi nhánh A trước, nếu thành công thì gọi API cộng tiền chi nhánh B?
* **Trả lời**:
  - Cách làm tuần tự ngây thơ này vi phạm nguyên lý **Nguyên tử (Atomicity)** của hệ thống phân tán vì tiềm ẩn 2 kịch bản thảm họa:
    1. **Tiền bốc hơi (Money Lost)**: Trừ tiền ở A xong, gửi request sang B thì đứt cáp mạng hoặc B bị sập. Tiền của A đã mất nhưng B chưa có. Khách hàng khiếu nại vì tiền biến mất khỏi hệ thống.
    2. **Tiền nhân bản (Money Created)**: Nếu làm ngược lại là cộng tiền ở B trước rồi mới trừ ở A; nếu tài khoản A không đủ tiền hoặc A bị sập mạng trước khi trừ, hệ thống đã vô tình tạo tiền khống cho B.
  - 2PC giải quyết triệt để vấn đề này bằng cách tách rời việc **Thăm dò/Phong tỏa (Prepare)** với việc **Ghi nhận thực tế (Commit)**.

---

## Nhóm B: Tính chịu lỗi (Fault Tolerance) & Bảo toàn dữ liệu

### Câu 5: Bất biến bảo toàn tiền tệ (Money Conservation Invariant) được định nghĩa chính xác như thế nào trong bài toán này?
* **Trả lời**:
  - Trong hệ thống phân tán, không thể phát biểu một cách máy móc rằng "tổng số dư tài khoản luôn bất biến tại mọi thời điểm nano-giây". Bởi vì luôn tồn tại một **Cửa sổ thời gian chuyển tiếp (In-flight Transition Window)** khi gói tin Commit đang bay trên mạng giữa các nút.
  - Định luật bảo toàn tiền tệ chuẩn xác là:
    $$\sum \text{BookBalance} + \sum \text{InFlightCommittedAmounts} = \text{Hằng số (Constant)}$$
  - Khi hệ thống ở trạng thái tĩnh (trước khi giao dịch hoặc sau khi hoàn tất Commit/Abort):
    $$\sum \text{BookBalance}_{\text{sau}} = \sum \text{BookBalance}_{\text{trước}}$$
    và nếu Abort:
    $$\text{Balance}_{\text{nguồn, sau}} = \text{Balance}_{\text{nguồn, trước}} \quad \text{và} \quad \text{Balance}_{\text{đích, sau}} = \text{Balance}_{\text{đích, trước}}$$
  - *Minh chứng*: Được kiểm chứng tự động trong file `backend/chaos_test.js` qua hàm `getSystemTotal()`.

### Câu 6: Ở Pha 2 (Commit Phase), nếu Node đích bị Timeout, tại sao Coordinator KHÔNG ĐƯỢC PHÉP Rollback/Abort giao dịch?
* **Trả lời**:
  - **Quy tắc bất biến tối cao của 2PC**: Một khi Coordinator đã ra quyết định toàn cục là `COMMIT`, quyết định đó mang tính **Bền vững vĩnh viễn (Durable & Irrevocable)**.
  - Lý do: Trước khi gửi lệnh Commit sang Node đích, Coordinator rất có thể đã gửi Commit thành công cho Node nguồn (Node nguồn đã trừ tiền thật). Nếu thấy Node đích Timeout mà Coordinator vội vàng chuyển sang Abort rồi yêu cầu hoàn tiền cho Node nguồn, nhưng thực tế gói tin Commit sang Node đích chỉ bị trễ mạng và sau đó Node đích vẫn nhận được và cộng tiền $\rightarrow$ **Hệ thống sẽ bị lỗi Double Spending (Nhân đôi tiền)!**
  - **Giải pháp đúng chuẩn**: Giữ nguyên trạng thái giao dịch là `COMMITTING` hoặc `UNKNOWN`. Lưu quyết định `COMMIT` vào bộ nhớ bền vững (`distributed_transactions.json`). Khi Node đích khôi phục kết nối, Coordinator kích hoạt **Recovery Routine** để gửi lệnh commit bù.
  - *Vị trí code*: File `backend/coordinator/src/services/distributedTransaction.service.js`, dòng 106-109 và 247-257.

### Câu 7: Nếu chính máy chủ Coordinator bị sập (Crash / Kill process) đột ngột, hệ thống sẽ khôi phục dữ liệu thế nào?
* **Trả lời**:
  Hệ thống xử lý dựa trên thời điểm Coordinator bị sập:
  1. **Sập trước khi ra quyết định toàn cục (Khi đang ở CREATED hoặc PREPARING)**:
     - Khi khởi động lại, giao dịch chưa có quyết định (`decision == null`). Coordinator coi như quá hạn và ra lệnh `ABORT`, gửi yêu cầu giải phóng tiền phong tỏa tới các Participant.
  2. **Sập sau khi đã ra quyết định COMMIT (Đang ở COMMITTING)**:
     - Nhờ cơ chế ghi bền vững trước (tương đương Write-Ahead Log) vào file `distributed_transactions.json` thông qua hàm `setGlobalDecision(transactionId, 'COMMIT')`, quyết định Commit không bị mất.
     - Trong file `server.js` của Coordinator, sau 5 giây khởi động, hàm `recoverTransactions()` tự động quét toàn bộ các giao dịch đang treo (`COMMITTING`, `UNKNOWN`, `ABORTING`) và tự động kích hoạt gửi lại lệnh Commit cho các Participant còn thiếu.
  - *Vị trí code*: File `backend/coordinator/src/services/distributedTransaction.service.js`, hàm `recoverTransactions()` dòng 260-285.

### Câu 8: Cơ chế Idempotency-Key hoạt động thế nào để chống trừ tiền 2 lần khi mạng di động chập chờn?
* **Trả lời**:
  - Khi người dùng bấm "Xác nhận chuyển tiền", Android Client tự sinh một mã định danh duy nhất ngẫu nhiên chuẩn **UUIDv4** (ví dụ: `c8d193d2-7c9b-4b24-...`) và đính kèm vào HTTP Header: `Idempotency-Key`.
  - Tại Coordinator: Trước khi khởi tạo bất kỳ giao dịch mới nào, `transferController` và `DistributedTransactionService` sẽ kiểm tra trong kho lưu trữ xem key này đã từng được xử lý hay chưa (`findByIdempotencyKey`).
  - Nếu đã tồn tại: Coordinator **không chạy lại luồng 2PC**, mà trả về ngay lập tức trạng thái và kết quả của giao dịch cũ. Nhờ vậy, dù client có gửi lại 10 lần do timeout hay lag mạng, tiền cũng chỉ bị trừ đúng một lần duy nhất.
  - *Vị trí code*: File `backend/coordinator/src/services/distributedTransaction.service.js`, dòng 54-56.

---

## Nhóm C: Đặc trưng hệ thống phân tán & Giả định mạng

### Câu 9: Đồ án này minh họa việc bác bỏ những "Giả định sai lầm về mạng phân tán" (Fallacies of Distributed Computing) nào?
* **Trả lời**:
  Hệ thống được thiết kế đặc biệt để đối phó với các giả định sai lầm sau của Peter Deutsch:
  1. **"Mạng đáng tin cậy" (The network is reliable)**: Đồ án không bao giờ tin mạng tin cậy. Tất cả các lời gọi HTTP đều được bọc trong khối `try/catch`, cấu hình Timeout chặt chẽ (5000ms), và có cơ chế bồi hoàn Rollback khi mất kết nối.
  2. **"Độ trễ bằng 0" (Latency is zero)**: Giao thức 2 pha làm bộc lộ rõ độ trễ mạng (Network Latency). Ứng dụng Android sử dụng kiến trúc bất đồng bộ (Kotlin Coroutines + StateFlow) và hiển thị thanh tiến trình trực quan cho người dùng.
  3. **"Tô-pô mạng không thay đổi" (Topology doesn't change)**: Hệ thống cho phép các node chi nhánh bật/tắt (Online/Offline) độc lập mà Coordinator vẫn kiểm soát được trạng thái qua API Health Check (`/api/nodes/health`).

### Câu 10: Hệ thống đạt được những loại Tính trong suốt (Distribution Transparency) nào theo chuẩn phân tán?
* **Trả lời**:
  - **Access Transparency (Trong suốt về truy cập)**: Người dùng hay Mobile App sử dụng cùng một định dạng API chuẩn (`/api/accounts`, `/api/transfers`) để thao tác với tài khoản dù tài khoản đó nằm ở chi nhánh Hà Nội, TP.HCM hay Đà Nẵng.
  - **Location Transparency (Trong suốt về vị trí)**: Client không cần biết địa chỉ IP hay Port vật lý của từng chi nhánh (3001, 3002, 3003); toàn bộ việc định tuyến (Routing) do Coordinator đảm nhiệm tại cổng 3000.
  - **Failure Transparency (Trong suốt về sự cố - một phần)**: Khi một nút bị lỗi ở pha Prepare, hệ thống tự động bồi hoàn và thông báo kết quả sạch sẽ cho người dùng mà không làm rò rỉ trạng thái dữ liệu dở dang hay làm treo máy client.

### Câu 11: Nếu 2 giao dịch chuyển tiền diễn ra cùng một mili-giây trên cùng một tài khoản nguồn, hệ thống chống Race Condition như thế nào?
* **Trả lời**:
  - Trong triển khai hiện tại, hệ thống sử dụng cơ chế kiểm tra và cập nhật `reservedBalance` ngay tại Pha 1:
    - Khi giao dịch 1 vào Pha Prepare, nó kiểm tra: $\text{balance} - \text{reservedBalance} \ge \text{amount}_1$. Nếu đủ, nó tăng ngay `reservedBalance += amount_1` và lưu xuống đĩa.
    - Khi giao dịch 2 đến ngay sau đó, số dư khả dụng $\text{balance} - \text{reservedBalance}$ đã bị giảm đi bởi giao dịch 1. Nếu số dư khả dụng không còn đủ cho $\text{amount}_2$, Node nguồn sẽ lập tức **Vote NO** với lý do `INSUFFICIENT_BALANCE`.
  - Trong NodeJS đơn luồng (Event Loop), các tác vụ kiểm tra và cập nhật biến trong cùng một tick diễn ra tuần tự, giúp ngăn chặn race condition ở mức độ cơ bản.

---

## Nhóm D: Giới hạn hệ thống & Hướng nâng cấp thực tế

### Câu 12: Đồ án hiện tại đang lưu dữ liệu vào các file JSON (`accounts.json`). Điều này có hạn chế gì trong thực tế và cách thay thế?
* **Trả lời**:
  - **Hạn chế**:
    1. Ghi file bằng `fs.writeFileSync` là thao tác ghi đè toàn bộ file (Full rewrite), tốn I/O đĩa và không hỗ trợ khóa cấp hàng (Row-level lock).
    2. Nếu máy chủ bị mất điện đột ngột đúng khoảnh khắc hệ điều hành đang flush buffer xuống đĩa, file JSON có thể bị hỏng cấu trúc (Corrupted JSON).
  - **Cách nâng cấp cho Production**:
    - Thay thế bằng hệ quản trị cơ sở dữ liệu quan hệ nhúng như **SQLite có bật chế độ WAL (Write-Ahead Logging)** hoặc **PostgreSQL**.
    - Sử dụng giao dịch ACID thực thụ của DB với câu lệnh `SELECT ... FOR UPDATE` để khóa tài khoản nguồn ở mức row-level trong pha Prepare.

### Câu 13: Làm thế nào để giải quyết vấn đề Single Point of Failure (SPOF) của Coordinator?
* **Trả lời**:
  - Hiện tại hệ thống chỉ có 1 Coordinator duy nhất. Nếu máy chủ này hỏng vĩnh viễn, toàn bộ mạng ngừng hoạt động.
  - **Giải pháp chuẩn công nghiệp**:
    - Triển khai một cụm Coordinator (Coordinator Cluster) gồm 3 hoặc 5 nút chạy thuật toán đồng thuận **Raft** hoặc **Paxos**.
    - Một nút được bầu làm Leader tiếp nhận yêu cầu chuyển tiền. Nhật ký giao dịch 2PC (`distributed_transactions.json`) được sao chép (replicated) đồng thuận qua các nút follower.
    - Nếu Leader bị crash, cụm tự động bầu Leader mới trong vòng vài trăm mili-giây và Leader mới tiếp tục điều phối các giao dịch dang dở dựa trên nhật ký đã được đồng thuận.

### Câu 14: Tại sao trong thực tế người ta thường dùng Message Queue (Kafka/RabbitMQ) cho Pha Commit?
* **Trả lời**:
  - Gọi HTTP POST `/commit` đồng bộ có rủi ro bị timeout do nghẽn mạng.
  - Nếu thay bằng **Message Broker phân tán (Apache Kafka hoặc RabbitMQ)** với cơ chế **Guaranteed Delivery (At-least-once delivery)**:
    - Khi Coordinator quyết định COMMIT, nó chỉ cần ghi một Event `TransactionCommitted` vào Message Topic được phân vùng bền vững.
    - Các Node chi nhánh đóng vai trò là Consumer, liên tục lắng nghe và cam kết sẽ thực thi lệnh commit ngay khi sống dậy mà Coordinator không cần phải giữ kết nối HTTP chờ đợi. Mô hình này chuyển pha Commit thành bất đồng bộ, giúp tăng Throughput của hệ thống lên gấp hàng chục lần.

### Câu 15: Nếu muốn mở rộng hệ thống từ 3 chi nhánh lên 100 chi nhánh trên toàn quốc, kiến trúc cần thay đổi những gì?
* **Trả lời**:
  1. **Dynamic Service Discovery**: Hiện tại danh sách node được cấu hình tĩnh trong `config.js`. Cần dùng Consul hoặc Eureka để các node chi nhánh tự động đăng ký (Register) và kiểm tra nhịp tim (Heartbeat).
  2. **Consistent Hashing**: Định tuyến tài khoản dựa trên thuật toán băm nhất quán thay vì kiểm tra tiền tố chuỗi `HN-`, `HCM-`.
  3. **Tối ưu hóa mạng nội bộ (gRPC / Protocol Buffers)**: Thay thế HTTP/1.1 JSON bằng gRPC (HTTP/2 + Protobuf) giữa Coordinator và các Node để giảm kích thước payload và tận dụng Multiplexing kết nối mạng.

---

# 4. Bảng tra cứu nhanh phản xạ trong phòng vấn đáp

### 4.1. Bảng tra cứu Port & Địa chỉ dịch vụ
| Thành phần | Vai trò | Port | Dữ liệu lưu trữ | Endpoint kiểm tra nhanh |
|---|---|:---:|---|---|
| **Coordinator** | Điều phối viên trung tâm | `:3000` | `coordinator/data/distributed_transactions.json` | `GET http://localhost:3000/api/nodes/health` |
| **HN Node** | Quản lý tài khoản `HN-*` | `:3001` | `nodes/hn/data/accounts.json` | `GET http://localhost:3001/api/accounts` |
| **HCM Node** | Quản lý tài khoản `HCM-*` | `:3002` | `nodes/hcm/data/accounts.json` | `GET http://localhost:3002/api/accounts` |
| **DN Node** | Quản lý tài khoản `DN-*` | `:3003` | `nodes/dn/data/accounts.json` | `GET http://localhost:3003/api/accounts` |

### 4.2. Bảng ma trận trạng thái giao thức 2PC (State Transitions)
```text
[CREATED] ──(Gửi Prepare)──> [PREPARING]
                                  │
      ┌───────────────────────────┴───────────────────────────┐
(Tất cả vote YES)                                      (Có nút vote NO hoặc Timeout > 5s)
      │                                                       │
      v                                                       v
 [PREPARED]                                              [ABORTING]
      │                                                       │
 (Ghi Decision = COMMIT)                                 (Gửi Abort & nhả Reserved)
      │                                                       │
      v                                                       v
[COMMITTING] ──(Tất cả commit xong)──> [COMMITTED]        [ABORTED]
      │
 (Nếu lỗi ở pha 2)
      v
  [UNKNOWN] ──(Chạy Recovery)──> [COMMITTED]
```

### 4.3. Các lệnh Terminal khẩn cấp cần nhớ
```bash
# 1. Khởi động toàn bộ 4 node
npm run start:all

# 2. Chạy test suite sự cố (Bảo toàn tiền tệ)
npm run test:chaos

# 3. Chạy test suite phục hồi sau sự cố
npm run test:recovery

# 4. Tiêm lỗi HCM từ chối Prepare (Rollback)
curl -X POST http://localhost:3002/api/chaos -H "Content-Type: application/json" -d "{\"enabled\": true, \"failurePoint\": \"PREPARE\", \"failureMode\": \"REJECT\"}"

# 5. Tiêm lỗi HCM timeout Commit (Treo và phục hồi)
curl -X POST http://localhost:3002/api/chaos -H "Content-Type: application/json" -d "{\"enabled\": true, \"failurePoint\": \"COMMIT\", \"failureMode\": \"TIMEOUT\"}"

# 6. Tắt toàn bộ lỗi (Reset về trạng thái bình thường)
curl -X POST http://localhost:3002/api/chaos -H "Content-Type: application/json" -d "{\"enabled\": false}"
```

### 4.4. Các "Từ khóa vàng" (Golden Keywords) giúp ghi điểm cao
- **Atomicity (Tính nguyên tử)**: "Tất cả hoặc không gì cả" trên nhiều ranh giới lưu trữ phân tán.
- **In-flight Transition Window**: Khoảng thời gian chuyển tiếp khi tiền đang bay trên gói tin mạng.
- **Reserved Balance vs Book Balance**: Phân định rạch ròi giữa đóng băng tạm thời và trừ tiền thực tế.
- **Durable Commitment**: Quyết định Commit ở Pha 2 là vĩnh viễn, không được phép bồi hoàn tùy tiện.
- **Crash Recovery & Reconciliation**: Quét nhật ký để thực thi cam kết bù khi node sống lại.
- **Idempotency Key**: Chống lỗi lặp gói tin và tấn công gửi lại (Replay attack).
- **Single Point of Failure (SPOF)**: Nút thắt tập trung của Coordinator trong giao thức 2PC cổ điển.
