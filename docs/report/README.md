# Báo cáo Web Kỹ thuật & Học thuật (Distributed Systems Web Report)

Giao diện web trực quan, hiện đại trình bày toàn diện nội dung học thuật và kỹ thuật của đồ án **Digital Banking — Chuyển tiền liên chi nhánh (Distributed 2PC)**.

## Cách xem báo cáo
1. **Mở trực tiếp trên trình duyệt**: Nhấp đúp chuột vào file `index.html` trong thư mục `docs/report/` (hỗ trợ Chrome, Edge, Firefox, Safari).
2. **Xem qua Local Server** (nếu muốn):
   ```bash
   npx serve docs/report
   ```

## Các tính năng trên giao diện Web:
- **Toàn văn học thuật**: 9 chương chi tiết chuyển giao đầy đủ từ `docs/DISTRIBUTED_SYSTEM_REPORT.md`.
- **Sơ đồ trực quan (Mermaid.js)**: Tự động kết xuất sơ đồ kiến trúc phân tán và máy trạng thái 2PC State Machine.
- **Tìm kiếm toàn văn (Live Search)**: Thanh tìm kiếm ở header lọc nội dung theo từ khóa tức thì.
- **Chế độ Sáng / Tối (Dark / Light Mode)**: Tự động phát hiện cấu hình hệ điều hành và lưu tùy chọn vào `localStorage`.
- **Hỗ trợ In / Xuất PDF (Print Optimized)**: Nhấn nút **In / PDF** để tạo bản báo cáo định dạng trang in chuẩn mực học thuật, tự động ẩn thanh điều hướng và nút bấm.
- **Mục lục điều hướng động (Sidebar Scrollspy)**: Tự động highlight mục đang xem khi cuộn trang.

## Cấu trúc thư mục:
- `index.html`: Khung tài liệu HTML ngữ nghĩa chứa toàn bộ nội dung học thuật, bảng biểu, sơ đồ.
- `styles.css`: Hệ thống CSS design system hỗ trợ Dark Mode, responsive mobile, print media.
- `app.js`: Xử lý tương tác (chuyển theme, cuộn mục lục, tìm kiếm lọc DOM, menu mobile).
- `data/report.json`: Dữ liệu cấu trúc JSON đồng bộ cho các công cụ trích xuất tự động.
