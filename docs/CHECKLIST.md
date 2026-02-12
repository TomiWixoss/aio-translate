# ✅ CHECKLIST - Kiểm tra dự án

## Cấu trúc thư mục

- [x] `data/source/current/` - Text và XML EN hiện tại
- [x] `data/source/versions/` - Lịch sử versions EN
- [x] `data/translation/current/` - Text và XML VI hiện tại
- [x] `data/translation/versions/` - Lịch sử versions VI
- [x] `data/temp/` - File tạm
- [x] `scripts/` - Scripts đã đánh số 1-5
- [x] `scripts/utils/` - Utilities tập trung
- [x] `config/` - Cấu hình

## Scripts chính

- [x] `scripts/1-import-source.js` - Import Text EN
- [x] `scripts/2-detect-changes.js` - Phát hiện thay đổi
- [x] `scripts/3-translate.js` - Dịch tự động
- [x] `scripts/4-merge.js` - Merge bản dịch
- [x] `scripts/5-export.js` - Export Text VI
- [x] `scripts/update.js` - Script tổng hợp

## Utilities

- [x] `scripts/utils/xml-parser.js` - Parse XML
- [x] `scripts/utils/backup.js` - Quản lý backup
- [x] `scripts/utils/compare-xml.js` - So sánh XML
- [x] `scripts/utils/count-words.js` - Đếm từ
- [x] `scripts/utils/find-empty-entries.js` - Tìm thẻ trống
- [x] `scripts/utils/fix-xml-entities.js` - Sửa XML entities
- [x] `scripts/utils/check-duplicate-keys.js` - Kiểm tra key trùng
- [x] `scripts/utils/compare-text-structure.js` - So sánh cấu trúc Text
- [x] `scripts/utils/verify-translation.js` - Kiểm tra bản dịch

## Config

- [x] `config/translation.config.js` - Cấu hình dịch (API, batch size, etc.)
- [x] `config/paths.config.js` - Đường dẫn tập trung

## Tài liệu

- [x] `README.md` - Tổng quan dự án
- [x] `docs/HUONG-DAN-SU-DUNG.md` - Hướng dẫn chi tiết (cũ)
- [x] `docs/HUONG-DAN-UPDATE.md` - Hướng dẫn update (mới)
- [x] `docs/CAU-TRUC-MOI.md` - Giải thích cấu trúc mới
- [x] `docs/MIGRATION.md` - Hướng dẫn migration
- [x] `docs/CHECKLIST.md` - Checklist này

## Package.json scripts

- [x] `npm run import` - Import source
- [x] `npm run detect` - Detect changes
- [x] `npm run translate` - Translate
- [x] `npm run merge` - Merge translations
- [x] `npm run export` - Export text
- [x] `npm run update` - Full workflow
- [x] `npm run compare` - Compare XML
- [x] `npm run count` - Count words
- [x] `npm run check-empty` - Check empty entries

## Kiểm tra code

- [x] Không có duplicate function (escapeXml, parseXml, etc.)
- [x] Import đúng từ utils
- [x] PATHS config được sử dụng đúng
- [x] CONFIG được sử dụng đúng
- [x] SystemPrompt giống bản gốc
- [x] Không có file .js thừa ở root

## Kiểm tra chức năng

- [ ] Test `npm run import` với thư mục Text mẫu
- [ ] Test `npm run detect` phát hiện thay đổi
- [ ] Test `npm run translate` dịch batch nhỏ
- [ ] Test `npm run merge` merge bản dịch
- [ ] Test `npm run export` export ra Text
- [ ] Test `npm run update` workflow đầy đủ

## Lưu ý

- File `.env` cần có API keys hợp lệ
- `Text_Translated/` vẫn ở root để tương thích
- Backup tự động trước mỗi lần chạy
- Progress được lưu, có thể resume
