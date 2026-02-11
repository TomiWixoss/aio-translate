const fs = require('fs');
const path = require('path');

const BATCH_SIZE = 100;
const ORIGINAL_DIR = 'temp-original-batches';
const TRANSLATED_DIR = 'temp-batches';

console.log('🔍 So sánh batch gốc và batch đã dịch...\n');

// Đọc file gốc để biết tổng số batch
const content = fs.readFileSync('original-texts.txt', 'utf-8');
const lines = content.split('\n');
const totalBatches = Math.ceil(lines.length / BATCH_SIZE);

console.log(`📊 Tổng số batch: ${totalBatches}\n`);

const problemBatches = [];
let totalOriginalLines = 0;
let totalTranslatedLines = 0;

for (let i = 0; i < totalBatches; i++) {
    const batchNum = i + 1;
    const originalFile = path.join(ORIGINAL_DIR, `batch-${String(i).padStart(6, '0')}.txt`);
    const translatedFile = path.join(TRANSLATED_DIR, `batch-${String(i).padStart(6, '0')}.txt`);
    
    // Kiểm tra file tồn tại
    if (!fs.existsSync(originalFile)) {
        console.log(`❌ Batch ${batchNum}: File gốc không tồn tại`);
        continue;
    }
    
    if (!fs.existsSync(translatedFile)) {
        console.log(`❌ Batch ${batchNum}: File dịch không tồn tại`);
        problemBatches.push({ batch: batchNum, issue: 'missing_translated' });
        continue;
    }
    
    // Đọc và đếm dòng
    const originalContent = fs.readFileSync(originalFile, 'utf-8');
    const originalLines = originalContent.split('\n');
    const originalCount = originalLines.length;
    
    const translatedContent = fs.readFileSync(translatedFile, 'utf-8');
    const translatedLines = translatedContent.split('\n');
    const translatedCount = translatedLines.length;
    
    totalOriginalLines += originalCount;
    totalTranslatedLines += translatedCount;
    
    if (originalCount !== translatedCount) {
        const diff = translatedCount - originalCount;
        console.log(`⚠️  Batch ${batchNum}: ${originalCount} dòng gốc → ${translatedCount} dòng dịch (chênh ${diff > 0 ? '+' : ''}${diff})`);
        
        problemBatches.push({ 
            batch: batchNum, 
            issue: 'mismatch', 
            original: originalCount, 
            translated: translatedCount,
            diff: diff
        });
        
        // Hiển thị 3 dòng đầu của mỗi file để so sánh
        console.log(`   📄 Gốc (3 dòng đầu):`);
        originalLines.slice(0, 3).forEach((line, idx) => {
            console.log(`      ${idx + 1}. ${line.substring(0, 80)}${line.length > 80 ? '...' : ''}`);
        });
        console.log(`   📄 Dịch (3 dòng đầu):`);
        translatedLines.slice(0, 3).forEach((line, idx) => {
            console.log(`      ${idx + 1}. ${line.substring(0, 80)}${line.length > 80 ? '...' : ''}`);
        });
        console.log('');
    } else {
        console.log(`✅ Batch ${batchNum}: ${originalCount} dòng`);
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
    
    // Nhóm theo loại vấn đề
    const missingBatches = problemBatches.filter(p => p.issue === 'missing_translated');
    const mismatchBatches = problemBatches.filter(p => p.issue === 'mismatch');
    
    if (missingBatches.length > 0) {
        console.log(`\n   📁 ${missingBatches.length} batch thiếu file dịch:`);
        missingBatches.forEach(p => {
            console.log(`      - Batch ${p.batch}`);
        });
    }
    
    if (mismatchBatches.length > 0) {
        console.log(`\n   📊 ${mismatchBatches.length} batch chênh số dòng:`);
        
        // Sắp xếp theo độ chênh lệch giảm dần
        mismatchBatches.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
        
        console.log(`\n   Top 10 batch chênh nhiều nhất:`);
        mismatchBatches.slice(0, 10).forEach(p => {
            console.log(`      - Batch ${p.batch}: ${p.diff > 0 ? '+' : ''}${p.diff} dòng (${p.original} → ${p.translated})`);
        });
    }
    
    // Lưu danh sách batch có vấn đề
    const problemList = problemBatches.map(p => p.batch);
    fs.writeFileSync('problem-batches.json', JSON.stringify(problemList, null, 2), 'utf-8');
    console.log(`\n💾 Đã lưu danh sách batch có vấn đề vào problem-batches.json`);
    
} else {
    console.log(`\n✅ Tất cả batch đều OK!`);
}
