const fs = require('fs');
const path = require('path');
const PATHS = require('../../config/paths.config');

/**
 * Unity Script 0: Reset - Xóa tất cả file tạm để dịch lại từ đầu
 */

function resetUnityWorkflow() {
  console.log('\n=== [Unity 0] Reset Workflow ===\n');
  
  const filesToDelete = [
    // Temp XML files
    PATHS.UNITY.TEMP_EN_XML,
    PATHS.UNITY.TEMP_NEW,
    PATHS.UNITY.TEMP_TRANSLATED,
    PATHS.UNITY.TEMP_MERGED,
    
    // Progress file
    path.join(PATHS.TEMP.DIR, 'unity-progress.json'),
    
    // Temp batches folder
    path.join(PATHS.TEMP.DIR, 'temp-batches-unity'),
    
    // Output JSON (optional - comment out nếu muốn giữ)
    // PATHS.UNITY.OUTPUT_JSON,
  ];
  
  let deletedCount = 0;
  let notFoundCount = 0;
  
  console.log('Đang xóa files...\n');
  
  filesToDelete.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        // Xóa thư mục và nội dung
        fs.rmSync(filePath, { recursive: true, force: true });
        console.log(`✅ Đã xóa thư mục: ${path.basename(filePath)}`);
      } else {
        // Xóa file
        fs.unlinkSync(filePath);
        console.log(`✅ Đã xóa file: ${path.basename(filePath)}`);
      }
      
      deletedCount++;
    } else {
      console.log(`⚪ Không tồn tại: ${path.basename(filePath)}`);
      notFoundCount++;
    }
  });
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Tổng kết:`);
  console.log(`   Đã xóa: ${deletedCount}`);
  console.log(`   Không tồn tại: ${notFoundCount}`);
  console.log('='.repeat(50));
  
  console.log('\n✅ Reset hoàn tất! Có thể chạy lại workflow từ đầu.');
  console.log('\nBước tiếp theo:');
  console.log('  node scripts/unity/1-import-json.js');
  console.log('  hoặc');
  console.log('  node scripts/unity/update.js');
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Unity Reset Script');
    console.log('\nCách dùng:');
    console.log('  node scripts/unity/0-reset.js');
    console.log('\nMô tả:');
    console.log('  Xóa tất cả file tạm để dịch lại từ đầu');
    console.log('  - Temp XML files (ja, new, translated, merged)');
    console.log('  - Progress file');
    console.log('  - Temp batches folder');
    console.log('\nLưu ý:');
    console.log('  - Input JSON và mapping files sẽ KHÔNG bị xóa');
    console.log('  - Output JSON sẽ KHÔNG bị xóa (có thể uncomment trong code để xóa)');
    process.exit(0);
  }
  
  // Confirm trước khi xóa
  console.log('⚠️  Cảnh báo: Script này sẽ xóa tất cả file tạm của Unity workflow!');
  console.log('   Bạn sẽ phải dịch lại từ đầu.\n');
  
  // Nếu có flag --force thì không cần confirm
  if (!args.includes('--force') && !args.includes('-f')) {
    console.log('Nhấn Ctrl+C để hủy, hoặc Enter để tiếp tục...');
    
    // Đợi user nhấn Enter
    process.stdin.once('data', () => {
      resetUnityWorkflow();
      process.exit(0);
    });
  } else {
    resetUnityWorkflow();
  }
}

module.exports = { resetUnityWorkflow };
