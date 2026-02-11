const fs = require('fs');
const path = require('path');

const BATCH_SIZE = 100;
const INPUT_FILE = 'original-texts.txt';
const TEMP_DIR = 'temp-batches';

console.log('🔍 Kiểm tra tất cả batch...\n');

// Đọc file gốc
const content = fs.readFileSync(INPUT_FILE, 'utf-8');
const lines = content.split('\n');
const totalBatches = Math.ceil(lines.length / BATCH_SIZE);

console.log(`📊 Tổng số dòng gốc: ${lines.length}`);
console.log(`📦 Tổng số batch: ${totalBatches}\n`);

let totalOriginalLines = 0;
let totalTranslatedLines = 0;
const problemBatches = [];

for (let i = 0; i < totalBatches; i++) {
    const batchFile = path.join(TEMP_DIR, `batch-${String(i).padStart(6, '0')}.txt`);
    
    if (!fs.existsSync(batchFile)) {
        console.log(`❌ Batch ${i + 1}: File không tồn tại`);
        problemBatches.push({ batch: i + 1, issue: 'missing' });
        continue;
    }
    
    // Đếm dòng gốc
    const startIndex = i * BATCH_SIZE;
    const originalBatch = lines.slice(startIndex, startIndex + BATCH_SIZE);
    const originalCount = originalBatch.length;
    
    // Đếm dòng đã dịch
    const translatedContent = fs.readFileSync(batchFile, 'utf-8');
    const translatedLines = translatedContent.split('\n');
    const translatedCount = translatedLines.length;
    
    totalOriginalLines += originalCount;
    totalTranslatedLines += translatedCount;
    
    if (originalCount !== translatedCount) {
        console.log(`⚠️  Batch ${i + 1}: ${originalCount} dòng gốc → ${translatedCount} dòng dịch (chênh ${translatedCount - originalCount})`);
        problemBatches.push({ 
            batch: i + 1, 
            issue: 'mismatch', 
            original: originalCount, 
            translated: translatedCount,
            diff: translatedCount - originalCount
        });
    } else {
        console.log(`✅ Batch ${i + 1}: ${originalCount} dòng`);
    }
}

console.log('\n' + '='.repeat(60));
console.log('📊 TỔNG KẾT');
console.log('='.repeat(60));
console.log(`Tổng dòng gốc:     ${totalOriginalLines}`);
console.log(`Tổng dòng đã dịch: ${totalTranslatedLines}`);
console.log(`Chênh lệch:        ${totalTranslatedLines - totalOriginalLines}`);

if (problemBatches.length > 0) {
    console.log(`\n⚠️  Có ${problemBatches.length} batch có vấn đề:`);
    problemBatches.forEach(p => {
        if (p.issue === 'missing') {
            console.log(`   - Batch ${p.batch}: Thiếu file`);
        } else {
            console.log(`   - Batch ${p.batch}: Chênh ${p.diff > 0 ? '+' : ''}${p.diff} dòng`);
        }
    });
    
    console.log(`\n💡 Gợi ý: Chạy lại script dịch để dịch lại các batch có vấn đề`);
} else {
    console.log(`\n✅ Tất cả batch đều OK!`);
}
