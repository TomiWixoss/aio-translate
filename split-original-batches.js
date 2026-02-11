const fs = require('fs');
const path = require('path');

const BATCH_SIZE = 100;
const INPUT_FILE = 'original-texts.txt';
const TEMP_DIR = 'temp-original-batches';

console.log('📦 Đang tách file gốc thành các batch...\n');

// Tạo thư mục nếu chưa có
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Đọc file gốc
const content = fs.readFileSync(INPUT_FILE, 'utf-8');
const lines = content.split('\n');
const totalBatches = Math.ceil(lines.length / BATCH_SIZE);

console.log(`📊 Tổng số dòng: ${lines.length}`);
console.log(`📦 Tổng số batch: ${totalBatches}\n`);

// Tách thành các batch
for (let i = 0; i < totalBatches; i++) {
    const startIndex = i * BATCH_SIZE;
    const batch = lines.slice(startIndex, startIndex + BATCH_SIZE);
    const batchFile = path.join(TEMP_DIR, `batch-${String(i).padStart(6, '0')}.txt`);
    
    fs.writeFileSync(batchFile, batch.join('\n'), 'utf-8');
    console.log(`✅ Batch ${i + 1}/${totalBatches}: ${batch.length} dòng → ${batchFile}`);
}

console.log('\n✅ Hoàn thành tách file gốc!');
console.log(`\nBây giờ chạy: node compare-original-translated.js`);
