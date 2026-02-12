#!/usr/bin/env node
/**
 * Script tổng hợp - Tự động update bản dịch khi có bản EN mới
 * 
 * Workflow:
 * 1. Phát hiện thay đổi (so sánh với version cũ)
 * 2. Dịch nội dung mới
 * 3. Merge với bản dịch cũ
 * 4. Export ra Text files
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const PATHS = require('../config/paths.config');

console.log('🚀 Princess Connect Translation - Auto Update\n');
console.log('='.repeat(60));

// Kiểm tra file cần thiết
function checkRequiredFiles() {
  console.log('\n📋 Kiểm tra file...');
  
  const required = [
    { path: PATHS.SOURCE.CURRENT_XML, name: 'Source XML (EN)' },
    { path: PATHS.TRANSLATION.CURRENT_XML, name: 'Translation XML (VI)' },
  ];
  
  for (const file of required) {
    if (!fs.existsSync(file.path)) {
      console.error(`❌ Thiếu file: ${file.name}`);
      console.error(`   Path: ${file.path}`);
      return false;
    }
    console.log(`✅ ${file.name}`);
  }
  
  return true;
}

// Chạy script
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

// Main workflow
async function main() {
  const startTime = Date.now();
  
  // Kiểm tra file
  if (!checkRequiredFiles()) {
    console.error('\n❌ Thiếu file cần thiết. Vui lòng kiểm tra lại.');
    process.exit(1);
  }
  
  // Hỏi user có muốn chạy full workflow không
  console.log('\n📝 Workflow:');
  console.log('  1. Phát hiện thay đổi');
  console.log('  2. Dịch nội dung mới');
  console.log('  3. Merge bản dịch');
  console.log('  4. Export Text files');
  
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
    
    // Bước 1: Phát hiện thay đổi
    if (!runScript(
      path.join(PATHS.ROOT, 'scripts', '2-detect-changes.js'),
      'Bước 1: Phát hiện thay đổi'
    )) {
      process.exit(1);
    }
    
    // Kiểm tra có nội dung mới không
    if (!fs.existsSync(PATHS.TEMP.NEW_CONTENT)) {
      console.log('\n✅ Không có nội dung mới cần dịch!');
      process.exit(0);
    }
    
    const newContentXml = fs.readFileSync(PATHS.TEMP.NEW_CONTENT, 'utf-8');
    const entryCount = (newContentXml.match(/<Text Key=/g) || []).length;
    
    if (entryCount === 0) {
      console.log('\n✅ Không có nội dung mới cần dịch!');
      process.exit(0);
    }
    
    console.log(`\n📊 Tìm thấy ${entryCount} entries mới cần dịch`);
    
    // Bước 2: Dịch tự động
    if (!runScript(
      path.join(PATHS.ROOT, 'scripts', '3-translate.js'),
      'Bước 2: Dịch tự động'
    )) {
      process.exit(1);
    }
    
    // Bước 3: Merge
    if (!runScript(
      path.join(PATHS.ROOT, 'scripts', '4-merge.js'),
      'Bước 3: Merge bản dịch'
    )) {
      process.exit(1);
    }
    
    // Bước 4: Export
    if (!runScript(
      path.join(PATHS.ROOT, 'scripts', '5-export.js'),
      'Bước 4: Export Text files'
    )) {
      process.exit(1);
    }
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 HOÀN THÀNH TẤT CẢ!');
    console.log('='.repeat(60));
    console.log(`⏱️  Thời gian: ${elapsed}s`);
    console.log(`📁 Kết quả: ${PATHS.TRANSLATION.CURRENT_TEXT}`);
  });
}

main().catch(error => {
  console.error('\n❌ Lỗi:', error.message);
  process.exit(1);
});
