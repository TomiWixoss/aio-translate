#!/usr/bin/env node
/**
 * Unity Update Script - Workflow tự động
 * Tương đương với scripts/update.js của workflow gốc
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const PATHS = require('../../config/paths.config');

console.log('🚀 Princess Connect Translation - Unity JSON Workflow\n');
console.log('='.repeat(60));

function runScript(scriptPath, description) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`▶️  ${description}`);
  console.log(`${'='.repeat(60)}\n`);
  
  try {
    execSync(`node "${scriptPath}"`, { 
      stdio: 'inherit',
      cwd: PATHS.ROOT 
    });
    console.log(`\n✅ ${description} - Hoàn thành`);
    return true;
  } catch (error) {
    console.error(`\n❌ ${description} - Lỗi`);
    return false;
  }
}

async function main() {
  const startTime = Date.now();
  
  // Kiểm tra file input
  if (!fs.existsSync(PATHS.UNITY.INPUT)) {
    console.error(`❌ File không tồn tại: ${PATHS.UNITY.INPUT}`);
    console.log('\nĐặt file JSON Unity vào: unity/input.json');
    process.exit(1);
  }
  
  console.log(`\n📂 Input: ${PATHS.UNITY.INPUT}`);
  console.log(`📂 Output: ${PATHS.UNITY.OUTPUT}`);
  
  console.log('\n📝 Workflow:');
  console.log('  1. Import JSON → XML + Mapping');
  console.log('  2. Phát hiện thay đổi');
  console.log('  3. Dịch tự động');
  console.log('  4. Merge bản dịch');
  console.log('  5. Export XML → JSON');
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  readline.question('\n▶️  Bắt đầu? (Y/n): ', (answer) => {
    readline.close();
    
    if (answer.toLowerCase() === 'n') {
      console.log('Đã hủy.');
      process.exit(0);
    }
    
    // Bước 1: Import
    if (!runScript(
      path.join(PATHS.ROOT, 'scripts', 'unity', '1-import-json.js'),
      'Bước 1: Import JSON → XML'
    )) {
      process.exit(1);
    }
    
    // Bước 2: Detect changes
    if (!runScript(
      path.join(PATHS.ROOT, 'scripts', 'unity', '2-detect-changes.js'),
      'Bước 2: Phát hiện thay đổi'
    )) {
      process.exit(1);
    }
    
    // Kiểm tra có nội dung mới không
    if (!fs.existsSync(PATHS.UNITY.TEMP_NEW)) {
      console.log('\n✅ Không có nội dung mới!');
      process.exit(0);
    }
    
    const newContent = fs.readFileSync(PATHS.UNITY.TEMP_NEW, 'utf-8');
    const entryCount = (newContent.match(/<Text Key=/g) || []).length;
    
    if (entryCount === 0) {
      console.log('\n✅ Không có nội dung mới cần dịch!');
      process.exit(0);
    }
    
    console.log(`\n📊 Tìm thấy ${entryCount} entries mới`);
    
    // Bước 3: Translate
    if (!runScript(
      path.join(PATHS.ROOT, 'scripts', 'unity', '3-translate.js'),
      'Bước 3: Dịch tự động'
    )) {
      process.exit(1);
    }
    
    // Bước 4: Merge
    if (!runScript(
      path.join(PATHS.ROOT, 'scripts', 'unity', '4-merge.js'),
      'Bước 4: Merge bản dịch'
    )) {
      process.exit(1);
    }
    
    // Bước 5: Export
    if (!runScript(
      path.join(PATHS.ROOT, 'scripts', 'unity', '5-export-json.js'),
      'Bước 5: Export JSON'
    )) {
      process.exit(1);
    }
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 HOÀN THÀNH TẤT CẢ!');
    console.log('='.repeat(60));
    console.log(`⏱️  Thời gian: ${elapsed}s`);
    console.log(`📁 Kết quả: ${PATHS.UNITY.OUTPUT}`);
  });
}

main().catch(error => {
  console.error('\n❌ Lỗi:', error.message);
  process.exit(1);
});
