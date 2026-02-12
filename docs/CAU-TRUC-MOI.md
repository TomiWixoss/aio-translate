# 📁 CẤU TRÚC DỰ ÁN MỚI

## Mục tiêu
- Dễ dàng update khi có bản EN mới
- Workflow đơn giản, tự động
- Quản lý version rõ ràng
- Tái sử dụng bản dịch cũ tối đa

## Cấu trúc thư mục mới

```
princess-connect-translation/
├── data/
│   ├── source/                    # Nguồn gốc (EN)
│   │   ├── current/              # Bản EN hiện tại
│   │   │   ├── Text/            # Thư mục Text gốc
│   │   │   └── merged.xml       # XML đã merge
│   │   └── versions/            # Lịch sử các version
│   │       ├── v1.0.0/
│   │       ├── v1.1.0/
│   │       └── ...
│   │
│   ├── translation/              # Bản dịch (VI)
│   │   ├── current/             # Bản VI hiện tại
│   │   │   ├── Text_VI/        # Thư mục Text đã dịch
│   │   │   └── merged_vi.xml   # XML VI đã merge
│   │   └── versions/           # Lịch sử bản dịch
│   │       ├── v1.0.0/
│   │       └── ...
│   │
│   └── temp/                    # File tạm
│       ├── new_content.xml     # Nội dung mới cần dịch
│       ├── translated.xml      # Nội dung vừa dịch
│       └── batches/           # Batch dịch tự động
│
├── scripts/
│   ├── 1-import-source.js      # Import Text EN mới
│   ├── 2-detect-changes.js     # Phát hiện thay đổi
│   ├── 3-translate.js          # Dịch tự động
│   ├── 4-merge.js              # Merge bản dịch
│   ├── 5-export.js             # Export Text VI
│   ├── update.js               # Script tổng hợp (chạy tất cả)
│   └── utils/                  # Các hàm tiện ích
│       ├── xml-parser.js
│       ├── backup.js
│       └── translator.js
│
├── config/
│   ├── translation.config.js   # Cấu hình dịch
│   └── paths.config.js         # Cấu hình đường dẫn
│
├── .env                        # API keys
└── package.json
```

## Workflow mới (Đơn giản hóa)

### Khi có bản EN mới:

```bash
# Bước 1: Import bản EN mới
node scripts/1-import-source.js ./path/to/new/Text

# Bước 2: Tự động phát hiện thay đổi và dịch
node scripts/update.js

# Hoặc chạy từng bước:
node scripts/2-detect-changes.js  # Tìm nội dung mới
node scripts/3-translate.js       # Dịch tự động
node scripts/4-merge.js           # Merge với bản cũ
node scripts/5-export.js          # Export Text VI
```

### Các tính năng mới:

1. **Version Management**: Tự động lưu version cũ trước khi update
2. **Smart Merge**: Tái sử dụng bản dịch cũ dựa trên nội dung
3. **Incremental Translation**: Chỉ dịch nội dung mới
4. **Rollback Support**: Có thể quay lại version cũ
5. **Progress Tracking**: Theo dõi tiến độ dịch

## So sánh với cấu trúc cũ

| Cũ | Mới |
|-----|-----|
| File rải rác ở root | Tổ chức theo thư mục rõ ràng |
| Backup không có version | Version management đầy đủ |
| 5+ bước thủ công | 1 lệnh tự động |
| Khó rollback | Dễ dàng rollback |
| Temp files lộn xộn | Temp files tập trung |
