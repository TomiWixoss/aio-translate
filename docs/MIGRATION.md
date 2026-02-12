# 🔄 HƯỚNG DẪN MIGRATION

## Chuyển từ cấu trúc cũ sang cấu trúc mới

Dự án đã được tái tổ chức để dễ dàng update và quản lý version.

### Những gì đã thay đổi

#### Cấu trúc thư mục

**Trước:**
```
aio-translate/
├── Text/                          # Text EN
├── Text_Translated/               # Text VI
├── merged_translations.xml        # XML EN
├── merged_translations_vi.xml     # XML VI
├── backup/                        # Backup lộn xộn
├── output/                        # File tạm
└── scripts/                       # Scripts không có số thứ tự
```

**Sau:**
```
princess-connect-translation/
├── data/
│   ├── source/current/           # Text + XML EN hiện tại
│   ├── source/versions/          # Lịch sử versions EN
│   ├── translation/current/      # Text + XML VI hiện tại
│   ├── translation/versions/     # Lịch sử versions VI
│   └── temp/                     # File tạm tập trung
├── scripts/
│   ├── 1-import-source.js        # Có số thứ tự rõ ràng
│   ├── 2-detect-changes.js
│   ├── 3-translate.js
│   ├── 4-merge.js
│   ├── 5-export.js
│   ├── update.js                 # Script tổng hợp
│   └── utils/                    # Utilities tập trung
└── config/                       # Cấu hình tập trung
```

#### Scripts đã di chuyển

| Cũ | Mới |
|----|-----|
| `merge-text-to-xml.js` | `1-import-source.js` |
| `extract-new-content.js` | `2-detect-changes.js` |
| `auto-translate.js` | `3-translate.js` |
| `merge-translations.js` | `4-merge.js` |
| `xml-to-text.js` | `5-export.js` |
| - | `update.js` (mới) |

#### Utilities đã tập trung

Các script tiện ích đã được di chuyển vào `scripts/utils/`:
- `compare-text-structure.js` → `utils/compare-text-structure.js`
- `compare-xml-detailed.js` → `utils/compare-xml.js`
- `count-words.js` → `utils/count-words.js`
- `find-empty-entries.js` → `utils/find-empty-entries.js`
- `fix-xml-entities.js` → `utils/fix-xml-entities.js`
- `check-duplicate-keys.js` → `utils/check-duplicate-keys.js`

Thêm utilities mới:
- `utils/xml-parser.js` - Parse XML
- `utils/backup.js` - Quản lý backup

### File đã di chuyển

| File cũ | Vị trí mới |
|---------|------------|
| `Text/` | `data/source/current/Text/` |
| `Text_Templates/` | `data/source/current/Text_Templates/` |
| `merged_translations.xml` | `data/source/current/merged.xml` |
| `merged_translations_vi.xml` | `data/translation/current/merged_vi.xml` |
| `backup/` | `data/source/versions/backup_2026-02-12/` |
| `output/` | `data/temp/` |
| `temp-batches-*` | `data/temp/batches/` |

### Cách sử dụng mới

**Trước (5+ bước thủ công):**
```bash
node scripts/merge-text-to-xml.js
node scripts/extract-new-content.js
node scripts/auto-translate.js
node scripts/merge-translations.js merged_translations.xml merged_translations_vi.xml output/new_content_translated_vi.xml
node scripts/xml-to-text.js merged_translations_vi_updated.xml key_mapping.json Text_Templates Text_Translated
```

**Sau (1 lệnh):**
```bash
# Import bản EN mới
node scripts/1-import-source.js ./path/to/new/Text

# Tự động update
node scripts/update.js
```

### Lợi ích

1. ✅ **Đơn giản hơn**: 1 lệnh thay vì 5+
2. ✅ **Rõ ràng hơn**: Scripts có số thứ tự
3. ✅ **Tổ chức tốt hơn**: Data/Scripts/Config tách biệt
4. ✅ **Version control**: Lưu lịch sử đầy đủ
5. ✅ **Dễ rollback**: Có thể quay lại version cũ
6. ✅ **Tái sử dụng code**: Utilities tập trung

### Lưu ý

- File `.env` vẫn giữ nguyên
- `Text_Translated/` vẫn ở root (để tương thích)
- Các backup cũ đã được di chuyển vào `data/source/versions/`
- Config được tách ra file riêng trong `config/`
