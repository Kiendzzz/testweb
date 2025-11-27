# Website Lớp 10A2-K26 THPT Quế Lâm

Website chính thức của lớp 10A2-K26, Trường THPT Quế Lâm - Nơi lưu giữ kỷ niệm tuổi học trò.

## 🚀 Tính Năng

- **Gallery Ảnh Kỷ Niệm**: Upload, xem, tìm kiếm và sắp xếp ảnh
- **Quản Lý Học Sinh**: Danh sách 45 học sinh với vai trò
- **Authentication**: Bảo mật với mật khẩu lớp
- **Responsive Design**: Tối ưu cho mọi thiết bị
- **Dark Mode**: Chế độ tối thân thiện
- **Real-time Upload**: Upload ảnh với progress bar

## 🛠️ Công Nghệ

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Styling**: Tailwind CSS
- **Backend**: Netlify Functions
- **Storage**: GitHub Repository
- **Hosting**: Netlify

## 📋 Yêu Cầu Deploy

### Environment Variables (Netlify)
```
GITHUB_USER=your-github-username
GITHUB_REPO=your-repo-name
GITHUB_TOKEN=your-github-token
GITHUB_BRANCH=main
```

### GitHub Token Permissions
- `repo` (Full control of private repositories)
- `public_repo` (Access public repositories)

## 🚀 Hướng Dẫn Deploy

1. **Fork/Clone repository**
2. **Tạo GitHub token** với quyền repo
3. **Deploy lên Netlify**:
   - Connect GitHub repository
   - Set environment variables
   - Deploy automatically

## 📱 Tính Năng Mobile

- Responsive design cho mọi screen size
- Touch-friendly interactions
- Optimized images loading
- Mobile-first navigation

## 🔒 Bảo Mật

- Password protection cho upload
- Input sanitization
- File type validation
- Rate limiting (5s cooldown)
- XSS protection

## 🎨 UI/UX Features

- Smooth animations với AOS
- Loading states
- Progress bars
- Toast notifications
- Dark mode toggle
- Search & filter

## 📊 Performance

- Lazy loading images
- Debounced search (300ms)
- Optimized animations
- Minimal bundle size
- Fast loading times

## 🐛 Troubleshooting

### Lỗi Upload
- Kiểm tra environment variables
- Verify GitHub token permissions
- Check file size (max 5MB)

### Lỗi Load Memories
- Kiểm tra kết nối mạng
- Verify GitHub repository access
- Check memories.json format

## 📞 Support

Nếu gặp vấn đề, vui lòng liên hệ:
- **Developer**: Lê Trung Kiên
- **Facebook**: [Lê Trung Kiên](https://www.facebook.com/le.trung.kien.2k10/)

## 📄 License

© 2025 Lớp 10A2-K26, Trường THPT Quế Lâm. Made with 💖 by Kiên.

### Lỗi Filter/Search
- Tìm kiếm chỉ áp dụng trên trang hiện tại: Đã fix bằng client-side pagination.
- Không có kết quả: Hiển thị message "Không tìm thấy".