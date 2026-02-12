# Changelog

## [2.0.0] - 2026-02-12

### Tái tổ chức toàn bộ dự án

#### Added
- Cấu trúc thư mục mới: `data/source/`, `data/translation/`, `data/temp/`
- Config tập trung: `config/translation.config.js`, `config/paths.config.js`
- Script tổng hợp: `scripts/update.js` - chạy toàn bộ workflow
- Utilities tập trung trong `scripts/utils/`
- Version management cho source và translation
- Backup utilities với auto-cleanup
- XML parser utilities
- NPM scripts shortcuts

#### Changed
- Scripts đổi tên và đánh số rõ ràng (1-5)
  - `merge-text-to-xml.js` → `1-import-source.js`
  - `extract-new-content.js` → `2-detect-changes.js`
  - `auto-translate.js` → `3-translate.js`
  - `merge-translations.js` → `4-merge.js`
  - `xml-to-text.js` → `5-export.js`
- Tất cả scripts sử dụng PATHS và CONFIG từ config files
- Workflow đơn giản hóa: 1 lệnh thay vì 5+

#### Improved
- Tổ chức code rõ ràng hơn
- Dễ dàng update khi có bản EN mới
- Version control tốt hơn
- Backup tự động và có thể rollback
- Tái sử dụng code qua utilities

#### Documentation
- `docs/HUONG-DAN-UPDATE.md` - Hướng dẫn update mới
- `docs/CAU-TRUC-MOI.md` - Giải thích cấu trúc
- `docs/MIGRATION.md` - Hướng dẫn migration
- `docs/CHECKLIST.md` - Checklist kiểm tra
- Cập nhật `README.md`

### Migration từ v1.x

Xem `docs/MIGRATION.md` để biết chi tiết cách chuyển từ cấu trúc cũ sang mới.

---

## [1.0.0] - 2026-02-11

### Initial Release
- Text to XML conversion
- XML to Text conversion
- Auto translation với NVIDIA API
- Merge translations
- Compare utilities
