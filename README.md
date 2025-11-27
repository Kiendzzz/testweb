# A2K26

**Website Lớp 10A2‑K26 THPT Quế Lâm** — Nơi lưu giữ kỷ niệm tuổi học trò.

## 🌟 Giới thiệu dự án

A2K26 là website kỷ niệm dành riêng cho tập thể lớp 10A2‑K26 (THPT Quế Lâm), nơi lưu giữ hình ảnh, thông tin và những khoảnh khắc đáng nhớ của thời học sinh. Website được xây dựng với giao diện hiện đại, thân thiện và tối ưu cho mọi thiết bị.

## ✅ Tính năng nổi bật

* 🖼️ **Thư viện ảnh kỷ niệm**: Upload, xem và sắp xếp ảnh theo bộ nhớ / sự kiện.
* 👥 **Danh sách học sinh**: Hiển thị đầy đủ 45 thành viên cùng vai trò (lớp trưởng, bí thư,...).
* 🔐 **Bảo vệ bằng mật khẩu lớp**: Kiểm soát quyền truy cập và upload.
* 📱 **Responsive Design**: Tối ưu trải nghiệm trên mobile & desktop.
* 🌙 **Dark Mode**: Chế độ tối thân thiện với mắt.
* ⚡ **Upload ảnh kèm progress bar**: Phản hồi theo thời gian thực.

## 🛠️ Công nghệ sử dụng

* **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
* **Styling**: Tailwind CSS
* **Backend**: Netlify Functions
* **Storage**: GitHub Repository
* **Hosting**: Netlify

## 🚀 Hướng dẫn cài đặt & Deploy

### Biến môi trường cần thiết

```
CLASS_PASSWORD=your-password
GITHUB_USER=your-github-username  
GITHUB_REPO=your-repo-name  
GITHUB_TOKEN=your-github-token  
GITHUB_BRANCH=main  
```

> Lưu ý: Token cần có quyền `repo` hoặc `public_repo` nếu repository là public.

### Các bước deploy

1. Clone hoặc fork repository
2. Tạo GitHub Personal Access Token
3. Kết nối repo với Netlify
4. Thiết lập biến môi trường
5. Deploy & sử dụng

## 📁 Cấu trúc thư mục

```
/img             ← Ảnh kỷ niệm
/functions       ← Backend (Netlify Functions)
index.html       ← Trang chính
style.css        ← File CSS chính
main.js          ← Logic JavaScript
manifest.json    ← Cấu hình PWA (nếu có)
netlify.toml     ← Cấu hình Netlify
```

## 🐞 Xử lý lỗi thường gặp

### Không upload được ảnh

* Kiểm tra GitHub Token
* Đảm bảo biến môi trường đã cấu hình đúng
* Dung lượng ảnh không vượt quá 5MB

### Không hiển thị ảnh

* Kiểm tra kết nối mạng
* Kiểm tra quyền truy cập repo ảnh

## 💡 Định hướng phát triển

* Thêm timeline kỷ niệm theo năm học
* Tạo trang hồ sơ cho từng thành viên
* Hệ thống bình luận & like ảnh

## 📞 Liên hệ

Developer: **Lê Trung Kiên**
Website: A2K26

## 📄 License

© 2025 A2K26 - Lớp 10A2 THPT Quế Lâm. All rights reserved.

<p align="center">
  <img src="https://github.com/Kiendzzz/testweb/blob/main/anhlop.png" alt="Ảnh tập thể lớp A2K26" width="800"/>
</p>

