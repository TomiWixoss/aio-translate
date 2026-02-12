# 📚 HƯỚNG DẪN SỬ DỤNG - Princess Connect Translation Tool

## 📁 CẤU TRÚC DỰ ÁN

```
aio-translate/
├── scripts/              # Các script chính
│   ├── merge-text-to-xml.js       # [1] Text → XML
│   ├── extract-new-content.js     # [2] Tìm nội dung mới
│   ├── auto-translate.js          # [3] Dịch tự động
│   ├── merge-translations.js      # [4] Merge bản dịch
│   ├── xml-to-text.js            # [5] XML → Text
│   └── compare-xml-detailed.js    # So sánh chi tiết
│
├── Text/                 # Thư mục Text gốc (EN)
├── Text_Templates/       # Template (tự động tạo)
├── Text_Translated/      # Thư mục Text đã dịch (VI)
│
├── backup/              # File backup tự động
├── output/              # File trung gian
├── docs/                # Tài liệu
│
├── merged_translations.xml        # XML EN chính
├── merged_translations_vi.xml     # XML VI chính
├── key_mapping.json              # Map key → metadata
│
├── .env                 # API keys
└── package.json         # Dependencies
```

---

## 🚀 QUY TRÌNH DỊCH HOÀN CHỈNH

### **Bước 1: Chuyển Text → XML**
```bash
node scripts/merge-text-to-xml.js
```

**Input:** `Text/` (thư mục)  
**Output:**
- `merged_translations.xml` - File XML EN
- `key_mapping.json` - Map key → file path
- `Text_Templates/` - Backup cấu trúc gốc

**Chức năng:**
- Quét tất cả file `.txt` trong `Text/`
- Tạo key unique cho mỗi entry
- Tự động backup file cũ nếu đã tồn tại

---

### **Bước 2: Tìm nội dung mới cần dịch**
```bash
node scripts/extract-new-content.js
```

**Input:**
- `merged_translations.xml` (EN mới)
- `backup/merged_translations.backup_*.xml` (EN cũ - tự động tìm)

**Output:**
- `output/new_content_to_translate.xml` - Chỉ chứa nội dung mới
- `output/new_content_to_translate_mapping.json` - Thống kê

**Thống kê:**
- ✨ Nội dung mới: X entries
- 🗑️ Nội dung xóa: Y entries
- 📝 Cần dịch: X entries

---

### **Bước 3: Dịch tự động**
```bash
node scripts/auto-translate.js
```

**Input:** `output/new_content_to_translate.xml`  
**Output:** `output/new_content_translated_vi.xml`

**Cấu hình:**
- `BATCH_SIZE`: 50 entries/batch
- `PARALLEL_BATCHES`: 10 batch song song
- API: NVIDIA (stepfun-ai/step-3.5-flash)

**Tính năng:**
- Tự động retry khi lỗi
- Lưu progress (có thể resume)
- Kiểm tra key chính xác

---

### **Bước 4: Merge bản dịch**
```bash
node scripts/merge-translations.js merged_translations.xml merged_translations_vi.xml output/new_content_translated_vi.xml
```

**Input:**
- `merged_translations.xml` (EN mới - 179,533 entries)
- `merged_translations_vi.xml` (VI cũ - 179,318 entries)
- `output/new_content_translated_vi.xml` (VI mới - 249 entries)
- `backup/merged_translations.backup_*.xml` (EN cũ - tự động tìm)

**Output:**
- `merged_translations_vi_updated.xml` (179,533 entries hoàn chỉnh)

**Logic:**
- So sánh theo NỘI DUNG (không theo key)
- Ưu tiên: VI mới > VI cũ > giữ EN
- Chỉ lấy entries có trong EN mới

**Thống kê:**
- Từ VI mới: X entries
- Từ VI cũ: Y entries
- Chưa dịch: Z entries
- Tỷ lệ dịch: XX%

---

### **Bước 5: Chuyển XML → Text**
```bash
node scripts/xml-to-text.js merged_translations_vi_updated.xml key_mapping.json Text_Templates Text_Translated
```

**Input:**
- `merged_translations_vi_updated.xml` - XML VI đã merge
- `key_mapping.json` - Map key → file path
- `Text_Templates/` - Cấu trúc gốc

**Output:**
- `Text_Translated/` - Thư mục Text đã dịch (1,552 files)

**Chức năng:**
- Giữ nguyên cấu trúc thư mục
- Giữ nguyên dòng trống, comment
- Map key → nội dung dịch

---

## 🔧 SCRIPT PHỤ TRỢ

### **So sánh chi tiết 2 XML**
```bash
node scripts/compare-xml-detailed.js [file-mới] [file-cũ]
```

**Output:**
- Hiển thị chi tiết từng thay đổi
- Lưu báo cáo JSON

---

## ⚙️ CẤU HÌNH

### **File .env**
```env
NVIDIA_API_KEY=nvapi-xxx
NVIDIA_API_KEY_2=nvapi-yyy
```

### **File package.json**
```json
{
  "dependencies": {
    "aio-llm": "^1.0.0",
    "dotenv": "^17.2.4"
  }
}
```

---

## 📝 LƯU Ý QUAN TRỌNG

### **1. Backup tự động**
- Mỗi lần chạy script sẽ tự động backup file cũ
- Format: `filename.backup_YYYY-MM-DD_HH-MM-SS.ext`

### **2. Key generation**
- Key dựa trên: file path + line number + nội dung
- Key stable: không thay đổi khi nội dung không đổi

### **3. Merge thông minh**
- So sánh theo nội dung EN, không theo key
- Tái sử dụng bản dịch cũ khi nội dung giống nhau
- Chỉ dịch nội dung mới thực sự

### **4. Resume translation**
- File progress: `translation-progress-new-content.json`
- Có thể dừng và tiếp tục bất cứ lúc nào
- Xóa file progress để dịch lại từ đầu

---

## 🐛 XỬ LÝ LỖI

### **Lỗi: "Không tìm thấy file backup"**
```bash
# Chỉ định file cụ thể
node scripts/extract-new-content.js merged_translations.xml backup/merged_translations.backup_XXX.xml
```

### **Lỗi: "Translation map: 0 entries"**
- Kiểm tra file EN cũ có tồn tại không
- Script tự động tìm file backup mới nhất

### **Lỗi: "Sai Key" khi dịch**
- Script tự động retry 3 lần
- Sau 3 lần sẽ gọi API mới
- Kiểm tra log để xem chi tiết

---

## 📊 THỐNG KÊ DỰ ÁN

- **Tổng entries**: 179,533
- **Tổng files**: 1,552
- **Ngôn ngữ**: EN → VI
- **Game**: Princess Connect! Re:Dive

---

## 🎯 WORKFLOW NHANH

```bash
# 1. Text → XML
node scripts/merge-text-to-xml.js

# 2. Tìm nội dung mới
node scripts/extract-new-content.js

# 3. Dịch
node scripts/auto-translate.js

# 4. Merge
node scripts/merge-translations.js merged_translations.xml merged_translations_vi.xml output/new_content_translated_vi.xml

# 5. XML → Text
node scripts/xml-to-text.js merged_translations_vi_updated.xml key_mapping.json Text_Templates Text_Translated
```

---

## 📞 HỖ TRỢ

Nếu gặp vấn đề, kiểm tra:
1. File `.env` có đúng API key không
2. File backup có tồn tại không
3. File progress có bị lỗi không (xóa và chạy lại)
4. Log console để xem chi tiết lỗi
