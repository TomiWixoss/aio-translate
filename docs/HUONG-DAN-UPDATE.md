# 🔄 HƯỚNG DẪN UPDATE BẢN DỊCH

## Khi có bản EN mới từ game

### Cách 1: Tự động (Khuyến nghị)

```bash
# Bước 1: Import bản EN mới vào dự án
node scripts/1-import-source.js ./path/to/new/Text

# Bước 2: Chạy update tự động
node scripts/update.js
```

Script sẽ tự động:
- ✅ Phát hiện nội dung mới/thay đổi
- ✅ Dịch tự động nội dung mới
- ✅ Merge với bản dịch cũ (tái sử dụng)
- ✅ Export ra Text files

### Cách 2: Từng bước (Kiểm soát chi tiết)

```bash
# Bước 1: Import source
node scripts/1-import-source.js ./path/to/new/Text

# Bước 2: Phát hiện thay đổi
node scripts/2-detect-changes.js

# Bước 3: Dịch nội dung mới
node scripts/3-translate.js

# Bước 4: Merge bản dịch
node scripts/4-merge.js

# Bước 5: Export Text files
node scripts/5-export.js
```

## Cấu trúc thư mục sau khi tái tổ chức

```
princess-connect-translation/
├── data/
│   ├── source/                    # Nguồn EN
│   │   ├── current/
│   │   │   ├── Text/             # Text EN hiện tại
│   │   │   ├── Text_Templates/   # Template gốc
│   │   │   └── merged.xml        # XML EN
│   │   └── versions/             # Lịch sử versions
│   │
│   ├── translation/              # Bản dịch VI
│   │   ├── current/
│   │   │   ├── Text_VI/         # Text VI (output)
│   │   │   └── merged_vi.xml    # XML VI
│   │   └── versions/            # Lịch sử bản dịch
│   │
│   └── temp/                    # File tạm
│       ├── new_content.xml     # Nội dung mới
│       ├── translated.xml      # Đã dịch
│       ├── progress.json       # Tiến độ
│       └── batches/           # Batch files
│
├── scripts/
│   ├── 1-import-source.js      # Import Text EN
│   ├── 2-detect-changes.js     # Phát hiện thay đổi
│   ├── 3-translate.js          # Dịch tự động
│   ├── 4-merge.js              # Merge bản dịch
│   ├── 5-export.js             # Export Text VI
│   ├── update.js               # Script tổng hợp
│   └── utils/                  # Utilities
│
├── config/
│   ├── translation.config.js   # Cấu hình dịch
│   └── paths.config.js         # Đường dẫn
│
└── .env                        # API keys
```

## Ưu điểm của cấu trúc mới

1. **Tổ chức rõ ràng**: Phân tách source/translation/temp
2. **Version control**: Lưu lịch sử các version
3. **Tự động hóa**: 1 lệnh để update toàn bộ
4. **Tái sử dụng**: Merge thông minh, không dịch lại
5. **Dễ rollback**: Có thể quay lại version cũ

## Lưu ý

- File `.env` cần có API keys hợp lệ
- Backup tự động trước mỗi lần update
- Progress được lưu, có thể resume nếu bị gián đoạn
- Temp files được tự động dọn dẹp sau khi hoàn thành
