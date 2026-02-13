const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const PATHS = require('../../config/paths.config');

/**
 * Unity Script 3: Dịch tự động
 * Wrapper gọi script 3-translate.js với mode 'unity'
 */

function translate() {
  console.log('\n=== [Unity 3] Dịch tự động ===');
  
  const inputFile = PATHS.UNITY.TEMP_NEW;
  const outputFile = PATHS.UNITY.TEMP_TRANSLATED;
  
  if (!fs.existsSync(inputFile)) {
    console.error(`❌ File không tồn tại: ${inputFile}`);
    console.log('\nChạy script 2-detect-changes.js trước!');
    process.exit(1);
  }
  
  // Kiểm tra file có entries không
  const content = fs.readFileSync(inputFile, 'utf8');
  const entryCount = (content.match(/<Text Key=/g) || []).length;
  
  if (entryCount === 0) {
    console.log('✅ Không có entries cần dịch!');
    
    // Tạo file empty
    const emptyXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<STBLKeyStringList>\n</STBLKeyStringList>';
    fs.writeFileSync(outputFile, emptyXml, 'utf8');
    return;
  }
  
  console.log(`📊 Tìm thấy ${entryCount} entries cần dịch\n`);
  
  // Chạy script 3-translate.js với mode 'unity'
  console.log('Đang gọi script 3-translate.js (mode: unity)...\n');
  
  try {
    execSync('node scripts/3-translate.js unity', {
      stdio: 'inherit',
      cwd: PATHS.ROOT
    });
    
    console.log(`\n✅ Hoàn thành!`);
    console.log(`   File: ${outputFile}`);
  } catch (error) {
    console.error('\n❌ Lỗi khi dịch:', error.message);
    process.exit(1);
  }
}

// CLI
translate();
