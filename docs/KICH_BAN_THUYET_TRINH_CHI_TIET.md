# Kịch bản thuyết trình chi tiết

## Slide 1. Chuyển tiền liên chi nhánh với Two-Phase Commit

### Lời trình bày

Kính thưa thầy cô và các bạn, nhóm em xin trình bày dự án **Chuyển tiền liên chi nhánh**.

Đây là một hệ thống ngân hàng số mô phỏng giao dịch chuyển tiền giữa các chi nhánh có dữ liệu phân tán. Điểm quan trọng của dự án không chỉ là tạo một giao diện chuyển tiền, mà là giải quyết bài toán nhất quán khi giao dịch phải cập nhật dữ liệu tại nhiều node khác nhau.

Ví dụ, khi chuyển tiền từ HN-001 sang HCM-001, hệ thống phải trừ tiền ở Hà Nội và cộng tiền ở Thành phố Hồ Chí Minh. Nếu một node gặp lỗi giữa chừng, hệ thống phải đảm bảo tiền không bị mất và giao dịch không rơi vào trạng thái cập nhật một nửa.

Để giải quyết bài toán này, nhóm sử dụng giao thức **Two-Phase Commit**, viết tắt là 2PC.

### Điểm cần chỉ trên slide

- Chỉ vào Coordinator ở giữa: đây là thành phần điều phối giao dịch.
- Chỉ vào ba node HN, HCM, DN: đây là các chi nhánh có dữ liệu riêng.
- Nhấn mạnh câu hỏi: *Nếu một node lỗi thì giao dịch sẽ được xử lý như thế nào?*

### Chuyển slide

Để hiểu vì sao cần kiến trúc này, trước hết chúng ta nhìn vào bài toán và các rủi ro mà hệ thống phải xử lý.

## Slide 2. Bài toán và câu trả lời kiến trúc

### Lời trình bày

Hệ thống có ba đặc điểm chính.

Thứ nhất, dữ liệu được phân tán. Mỗi chi nhánh quản lý tài khoản của mình trên một tiến trình độc lập. HN quản lý các tài khoản bắt đầu bằng `HN-`, HCM quản lý `HCM-`, và DN quản lý `DN-`.

Thứ hai, giao dịch liên chi nhánh tạo ra lỗi một phần. Có thể node nguồn vẫn hoạt động, nhưng node đích bị timeout. Cũng có thể node đích từ chối giao dịch trong khi node nguồn đã tạm giữ tiền.

Thứ ba, hệ thống cần một cơ chế nhất quán. Nếu tất cả participant đều sẵn sàng thì giao dịch được commit. Nếu có một participant không sẵn sàng trong pha chuẩn bị thì toàn bộ giao dịch phải abort.

Vì vậy, nhóm tách hệ thống thành hai vai trò. Các branch node sở hữu dữ liệu và thực thi thay đổi cục bộ. Coordinator sở hữu trạng thái giao dịch và điều phối quá trình commit hoặc abort.

### Điểm nhấn kỹ thuật

Không nên để Coordinator tự ý sửa trực tiếp số dư của các chi nhánh. Coordinator chỉ gửi lệnh qua API nội bộ. Cách này thể hiện rõ ranh giới dữ liệu trong hệ thống phân tán.

### Chuyển slide

Sau khi xác định vai trò, slide tiếp theo mô tả các thành phần cụ thể và cách chúng kết nối với nhau.

## Slide 3. Mô hình kiến trúc hệ thống

### Lời trình bày

Ở tầng trên cùng là Android App. Ứng dụng được xây dựng bằng Kotlin, Jetpack Compose, ViewModel và Retrofit.

App không gọi trực tiếp từng chi nhánh. App chỉ gọi Coordinator thông qua REST API. Đây là điểm quan trọng vì client không cần biết giao dịch phải đi qua những node nào.

Coordinator chạy trên port 3000. Thành phần này cung cấp API cho app, tạo distributed transaction, chạy state machine của 2PC, lưu transaction log và kích hoạt recovery.

Bên dưới là ba branch node:

- HN chạy trên port 3001.
- HCM chạy trên port 3002.
- DN chạy trên port 3003.

Mỗi branch node có tài khoản và participant transaction riêng. Coordinator gọi tới các node thông qua các API nội bộ như `prepare`, `commit` và `abort`.

Như vậy, luồng kết nối là: Android App gọi Coordinator, Coordinator gọi các participant, participant thao tác trên dữ liệu cục bộ của mình.

### Điểm cần chỉ trên sơ đồ

1. Chỉ vào mũi tên Android App đến Coordinator và nói đây là API dành cho client.
2. Chỉ vào các mũi tên Coordinator đến HN, HCM, DN và nói đây là API điều phối nội bộ.
3. Chỉ vào các file `accounts.json` và `participant tx` để giải thích dữ liệu được phân vùng.

### Câu hỏi có thể được hỏi

**Tại sao App không gọi trực tiếp HN và HCM?**

Vì Coordinator cần giữ một trạng thái giao dịch thống nhất. Nếu App tự gọi từng node, client phải tự xử lý timeout, thứ tự commit và recovery. Điều đó làm logic phân tán bị đẩy ra phía client và khó kiểm soát.

### Chuyển slide

Tiếp theo, nhóm trình bày các công nghệ được sử dụng và lý do mỗi công nghệ phù hợp với vai trò của nó.

## Slide 4. Công nghệ và lý do lựa chọn

### Lời trình bày

Ở phía client, nhóm sử dụng Android với Jetpack Compose để xây dựng giao diện chuyển tiền, danh sách tài khoản và lịch sử giao dịch. Compose giúp giao diện phản ứng trực tiếp với trạng thái giao dịch như đang xử lý, thành công, bị hủy hoặc đang chờ recovery.

Kotlin ViewModel và StateFlow giúp tách giao diện khỏi logic gọi API. Khi Coordinator trả về trạng thái `COMMITTED`, `ABORTED` hoặc `COMMITTING`, ViewModel cập nhật state và giao diện hiển thị đúng thông tin.

Retrofit được dùng để gọi các REST API từ Android tới Coordinator.

Ở backend, nhóm sử dụng Node.js và Express. Lý do là Node.js phù hợp để tạo nhiều HTTP process nhẹ, giúp mô phỏng Coordinator và các branch node độc lập trên những port khác nhau.

Dữ liệu dùng JSON repository vì đây là prototype phục vụ học tập. JSON dễ quan sát, dễ reset và giúp nhìn trực tiếp trạng thái của từng node. Trong hệ thống thực tế, phần này cần thay bằng database có transaction và cơ chế khóa đồng thời.

Axios được Coordinator dùng để gửi request tới participant. Chaos Service dùng để tiêm lỗi `REJECT` hoặc `TIMEOUT`, giúp kiểm chứng khả năng chịu lỗi thay vì chỉ kiểm thử trường hợp thành công.

### Tại sao dùng REST và HTTP?

REST/HTTP giúp thể hiện rõ việc các node giao tiếp qua mạng. Mặc dù tất cả đang chạy trên cùng máy, các process vẫn có boundary giống các service phân tán thật.

### Chuyển slide

Sau khi biết các thành phần, chúng ta đi vào thuật toán trung tâm của dự án: Two-Phase Commit.

## Slide 5. Sơ đồ luồng 2PC

### Lời trình bày

Một giao dịch bắt đầu khi client gửi `POST /api/transfers` tới Coordinator.

Coordinator tạo transaction với trạng thái `CREATED`, sau đó chuyển sang `PREPARING`.

### Pha 1: Prepare

Coordinator gửi yêu cầu Prepare đồng thời tới tất cả participant. Node nguồn kiểm tra tài khoản và số dư khả dụng. Node đích kiểm tra tài khoản, chi nhánh và currency.

Nếu participant có thể thực hiện giao dịch, nó tạm giữ tài nguyên cần thiết và trả về `YES`. Ở hệ thống này, node nguồn tăng `reservedBalance` thay vì trừ `balance` ngay lập tức.

Khi tất cả participant trả `YES`, Coordinator chuyển trạng thái giao dịch sang `PREPARED`.

Nếu có một participant trả `NO` hoặc timeout, Coordinator chọn quyết định `ABORT`, gửi lệnh abort tới các node và giải phóng reservation.

### Pha 2: Commit

Khi đã có đủ phiếu `YES`, Coordinator ghi quyết định toàn cục `COMMIT`, chuyển trạng thái sang `COMMITTING` rồi gửi lệnh commit tới các participant.

Node nguồn trừ số dư thật và giải phóng reservation. Node đích cộng số dư. Khi tất cả participant trả về `COMMITTED`, giao dịch toàn cục chuyển sang `COMMITTED`.

### Nguyên tắc quan trọng

Prepare trả lời câu hỏi: *Có thể thực hiện giao dịch không?*

Commit trả lời câu hỏi: *Thực hiện quyết định đã được Coordinator chốt như thế nào?*

### Chuyển slide

Để thấy rõ sự khác nhau giữa hai pha, slide tiếp theo mô tả chính xác participant thay đổi dữ liệu như thế nào.

## Slide 6. Reservation bảo vệ số dư

### Lời trình bày

Trong pha Prepare, participant chưa trừ tiền thật. Hệ thống kiểm tra số dư khả dụng theo công thức:

`available = balance - reservedBalance`

Nếu tài khoản nguồn còn đủ tiền, participant tăng `reservedBalance` và ghi transaction cục bộ ở trạng thái `PREPARED`.

Việc reservation có hai mục đích. Thứ nhất, giao dịch khác không thể sử dụng lại số tiền đang được giữ. Thứ hai, nếu giao dịch bị abort, hệ thống chỉ cần giảm reservation để trả lại số tiền khả dụng.

Trong pha Commit, node nguồn mới trừ `balance`, đồng thời giải phóng reservation. Node đích cộng tiền vào `balance`.

Nhờ vậy, hệ thống tránh được tình huống đã trừ tiền nguồn nhưng chưa biết node đích có chấp nhận giao dịch hay không.

### Ví dụ minh họa

Giả sử HN-001 có `balance = 1.000.000` và đang giữ `reservedBalance = 0`. Khi chuyển 100.000:

- Sau Prepare: `balance = 1.000.000`, `reservedBalance = 100.000`, `available = 900.000`.
- Sau Commit: `balance = 900.000`, `reservedBalance = 0`.
- HCM-001 tăng thêm 100.000.

Tổng tiền hệ thống trước và sau giao dịch không đổi.

### Chuyển slide

Tuy nhiên, hệ thống phân tán luôn phải giả định rằng lỗi có thể xảy ra. Slide tiếp theo minh họa hai lỗi quan trọng nhất.

## Slide 7. Xử lý lỗi một phần

### Lời trình bày

Nhóm mô phỏng hai failure mode bằng Chaos Service.

### Trường hợp 1: Prepare Reject

Nếu HCM bị cấu hình `PREPARE / REJECT`, HCM trả về vote `NO`. Có thể HN đã vote `YES` và đã tạm giữ tiền, nhưng Coordinator chưa ghi quyết định Commit.

Khi nhận một vote `NO`, Coordinator chọn `ABORT`, gửi lệnh abort tới HN và HCM. HN giảm `reservedBalance`, giao dịch chuyển sang `ABORTED` và số dư thực tế không bị thay đổi.

### Trường hợp 2: Commit Timeout

Nếu HCM timeout trong pha Commit, tình huống khác hoàn toàn xảy ra. HN có thể đã trừ tiền thật, trong khi Coordinator chưa nhận được phản hồi từ HCM.

Ở đây, Coordinator không được tự ý rollback HN. Lý do là quyết định `COMMIT` đã được ghi nhận. Nếu rollback một phía, hệ thống có thể làm sai tính bền vững của giao dịch.

Vì vậy, hệ thống giữ giao dịch ở `COMMITTING` hoặc `UNKNOWN` để chờ recovery.

### Câu hỏi có thể được hỏi

**Vì sao Prepare timeout thì abort nhưng Commit timeout không abort?**

Vì trước Commit, hệ thống chưa có quyết định toàn cục cuối cùng và còn có thể giải phóng reservation. Sau khi Commit được quyết định, một participant có thể đã ghi dữ liệu thật. Rollback lúc này có thể làm các node đi tới hai kết quả khác nhau.

### Chuyển slide

Để hoàn tất những giao dịch bị treo, hệ thống dùng transaction log, recovery và idempotency.

## Slide 8. Recovery và Idempotency

### Lời trình bày

Coordinator lưu trạng thái giao dịch và quyết định toàn cục vào transaction repository.

Khi khởi động, Coordinator chờ các participant sẵn sàng rồi quét các giao dịch chưa hoàn tất.

Nếu transaction có `decision = COMMIT`, Coordinator gửi lại lệnh commit tới participant còn thiếu. Participant đã commit sẽ trả lại trạng thái `COMMITTED`, còn participant chưa commit sẽ thực hiện commit bù.

Nếu transaction có `decision = ABORT`, Coordinator gửi lại lệnh abort để giải phóng các reservation còn tồn tại.

Recovery được thiết kế idempotent. Gọi recovery nhiều lần không làm cộng hoặc trừ tiền nhiều lần vì participant kiểm tra trạng thái cục bộ trước khi áp dụng thay đổi.

Ngoài recovery, hệ thống còn có idempotency ở tầng API. Mỗi request chuyển tiền bắt buộc có `Idempotency-Key`.

- Request đầu tiên với key mới tạo transaction.
- Request lặp lại với cùng key trả về transaction cũ.
- Hệ thống không tạo transaction thứ hai và không trừ tiền hai lần.

Điều này quan trọng trong ứng dụng di động vì người dùng có thể bấm lại hoặc client retry khi mạng chậm.

### Chuyển slide

Sau đây là kịch bản demo để nối các thành phần, thuật toán và failure mode thành một luồng kiểm thử hoàn chỉnh.

## Slide 9. Kịch bản demo

### Lời trình bày

Nhóm trình bày theo năm bước.

### Bước 1: Happy Path

Thực hiện chuyển 100.000 VND từ HN-001 sang HCM-001. Kỳ vọng giao dịch đi qua Prepare, Commit và kết thúc ở `COMMITTED`. Tổng tiền hệ thống không đổi.

### Bước 2: Prepare Reject

Bật Chaos Service trên HCM với `PREPARE / REJECT`. Thực hiện giao dịch mới. HCM trả `NO`, Coordinator broadcast `ABORT`, HN giải phóng reservation và giao dịch kết thúc ở `ABORTED`.

### Bước 3: Commit Timeout

Bật `COMMIT / TIMEOUT` trên HCM. Thực hiện giao dịch. Quan sát HN có thể commit, còn giao dịch toàn cục giữ ở `COMMITTING` hoặc `UNKNOWN`.

### Bước 4: Recovery

Tắt chaos trên HCM, sau đó gọi endpoint recovery hoặc chạy lệnh `npm run recover`. Coordinator phát hiện giao dịch dở dang và gửi commit bù. Giao dịch chuyển sang `COMMITTED`.

### Bước 5: Idempotency

Gửi hai request giống nhau với cùng `Idempotency-Key`. Request thứ hai trả lại kết quả giao dịch thứ nhất, không tạo giao dịch mới.

Trong lúc demo, nhóm cần mở đồng thời Android App và các cửa sổ log backend để người xem thấy được mối liên hệ giữa thao tác trên giao diện, request HTTP, trạng thái Coordinator và dữ liệu tại branch node.

### Chuyển slide

Cuối cùng, nhóm tổng kết những gì mô hình đã chứng minh và những giới hạn cần nhìn nhận rõ.

## Slide 10. Kết luận và giới hạn

### Lời trình bày

Dự án đã xây dựng một mô hình thực nghiệm cho giao dịch phân tán giữa các chi nhánh.

Thứ nhất, 2PC đảm bảo tính nguyên tử trong pha chuẩn bị: nếu có participant không sẵn sàng, giao dịch được abort và reservation được giải phóng.

Thứ hai, hệ thống không rollback sai sau khi đã có quyết định Commit. Những giao dịch bị timeout được giữ ở trạng thái trung gian và xử lý bằng recovery.

Thứ ba, idempotency bảo vệ hệ thống khỏi việc client retry hoặc gửi lặp, tránh double spending.

Tuy nhiên, nhóm cũng xác định rõ giới hạn của prototype. JSON chưa thay thế được database giao dịch thực tế. Coordinator hiện vẫn là một điểm lỗi đơn. Chaos Service mô phỏng timeout ở tầng HTTP, chưa phải network partition thật. Hệ thống cũng chưa triển khai đầy đủ authentication, authorization, TLS và audit log production.

Nếu phát triển tiếp, nhóm sẽ thay JSON bằng database có transaction và locking, bổ sung message broker, retry có backoff, quan sát hệ thống bằng metrics/tracing, đồng thời nghiên cứu cơ chế dự phòng Coordinator.

Thông điệp chính của dự án là: trong hệ thống phân tán, cần thiết kế tính nhất quán cùng với cách hệ thống thất bại. Một giao dịch thành công không chỉ là cập nhật được số dư, mà còn phải biết xử lý đúng khi mạng chậm, participant lỗi hoặc client gửi lại yêu cầu.

## Phần kết

Nhóm em xin cảm ơn thầy cô và các bạn đã lắng nghe. Nhóm sẵn sàng trả lời câu hỏi về kiến trúc, giao thức 2PC, cơ chế reservation, recovery và các kịch bản tiêm lỗi.

## Câu hỏi phản biện thường gặp

### 1. Tại sao không trừ tiền ngay trong Prepare?

Vì Prepare chỉ là bước kiểm tra và giữ tài nguyên. Nếu trừ tiền ngay rồi participant khác từ chối, hệ thống phải hoàn tiền trong một trạng thái chưa chắc chắn. Reservation giúp tách việc giữ tiền khỏi việc ghi nhận thay đổi cuối cùng.

### 2. Tại sao dùng 2PC thay vì Saga?

Bài toán chuyển tiền cần tính nguyên tử và nhất quán mạnh giữa nguồn và đích. Saga phù hợp với các quy trình dài có bước bồi hoàn và thường chấp nhận nhất quán cuối cùng. Trong prototype này, 2PC minh họa trực tiếp yêu cầu tất cả node cùng commit hoặc abort.

### 3. Nhược điểm lớn nhất của 2PC là gì?

2PC có tính chất blocking. Nếu Coordinator lỗi sau Prepare, participant có thể phải giữ tài nguyên và chờ quyết định. Ngoài ra, Coordinator là single point of failure nếu chưa có cơ chế dự phòng.

### 4. Nếu Coordinator chết sau khi ghi COMMIT thì sao?

Khi Coordinator khởi động lại, recovery đọc transaction log. Vì quyết định COMMIT đã tồn tại, hệ thống gửi commit bù tới những participant chưa hoàn tất.

### 5. JSON có phù hợp production không?

Không. JSON phù hợp cho prototype và trình diễn vì dễ quan sát. Production cần database hỗ trợ transaction, locking, WAL, backup và xử lý đồng thời.

### 6. Làm sao kiểm tra hệ thống không mất tiền?

Ghi nhận tổng số dư trước test, chạy giao dịch hoặc fault injection, sau đó tính lại tổng số dư. Với giao dịch đang `COMMITTING`, phần tiền đang xử lý phải được tính như in-flight amount. Sau recovery, tổng tài sản phải khớp với baseline.
