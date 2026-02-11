const fs = require('fs');
const path = require('path');

const BATCH_SIZE = 100;
const INPUT_FILE = 'original-texts.txt';
const TEMP_DIR = 'temp-batches';

// Lấy batch number từ command line
const batchNum = parseInt(process.argv[2]);

if (!batchNum || batchNum < 1) {
    console.log('Sử dụng: node compare-batches.js <batch_number>');
    console.log('Ví dụ: node compare-batches.js 14');
    process.exit(1);
}

const batchIndex = batchNum - 1;

// Đọc file gốc
const content = fs.readFileSync(INPUT_FILE, 'utf-8');
const lines = content.split('\n');

// Lấy batch gốc
const startIndex = batchIndex * BATCH_SIZE;
const originalBatch = lines.slice(startIndex, startIndex + BATCH_SIZE);

// Đọc batch đã dịch
const batchFile = path.join(TEMP_DIR, `batch-${String(batchIndex).padStart(6, '0')}.txt`);
if (!fs.existsSync(batchFile)) {
    console.log(`❌ Không tìm thấy file: ${batchFile}`);
    process.exit(1);
}

const translatedContent = fs.readFileSync(batchFile, 'utf-8');
const translatedBatch = translatedContent.split('\n');

console.log('='.repeat(80));
console.log(`SO SÁNH BATCH ${batchNum}`);
console.log('='.repeat(80));
console.log(`Dòng gốc: ${originalBatch.length}`);
console.log(`Dòng dịch: ${translatedBatch.length}`);
console.log(`Chênh lệch: ${translatedBatch.length - originalBatch.length}`);
console.log('='.repeat(80));

// Hiển thị từng dòng
const maxLines = Math.max(originalBatch.length, translatedBatch.length);

for (let i = 0; i < maxLines; i++) {
    const originalLine = originalBatch[i] || '[THIẾU]';
    const translatedLine = translatedBatch[i] || '[THIẾU]';
    
    console.log(`\n--- Dòng ${i + 1} ---`);
    console.log(`📝 Gốc: ${originalLine.substring(0, 150)}${originalLine.length > 150 ? '...' : ''}`);
    console.log(`🌐 Dịch: ${translatedLine.substring(0, 150)}${translatedLine.length > 150 ? '...' : ''}`);
    
    if (originalBatch[i] && !translatedBatch[i]) {
        console.log('⚠️  THIẾU DÒNG DỊCH');
    } else if (!originalBatch[i] && translatedBatch[i]) {
        console.log('⚠️  DÒNG DỊCH THỪA');
    }
}

console.log('\n' + '='.repeat(80));
