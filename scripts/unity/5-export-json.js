const fs = require('fs');
const path = require('path');
const PATHS = require('../../config/paths.config');
const { xmlToJson } = require('../utils/json-xml-converter');

/**
 * Unity Script 5: Export XML → JSON
 * Tương đương với 5-export.js của workflow gốc
 */

function exportToJson(inputXml = null, outputJson = null, title = 'vi') {
  inputXml = inputXml || PATHS.UNITY.TEMP_MERGED;
  outputJson = outputJson || PATHS.UNITY.OUTPUT;
  
  console.log('\n=== [Unity 5] Export XML → JSON ===');
  console.log(`Input: ${inputXml}`);
  console.log(`Output: ${outputJson}`);
  console.log(`Title: ${title}`);
  
  if (!fs.existsSync(inputXml)) {
    console.error(`❌ File không tồn tại: ${inputXml}`);
    process.exit(1);
  }
  
  console.log('\nĐang đọc XML...');
  const xmlContent = fs.readFileSync(inputXml, 'utf8');
  
  console.log('Đang chuyển đổi...');
  const jsonData = xmlToJson(xmlContent, title);
  
  console.log(`✅ ${jsonData.Translations.length} entries`);
  
  // Tạo thư mục output nếu chưa có
  const outputDir = path.dirname(outputJson);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Backup file cũ
  if (fs.existsSync(outputJson)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('Z')[0];
    const backupPath = outputJson.replace('.json', `.backup_${timestamp}.json`);
    fs.copyFileSync(outputJson, backupPath);
    console.log(`💾 Đã backup: ${path.basename(backupPath)}`);
  }
  
  fs.writeFileSync(outputJson, JSON.stringify(jsonData, null, 2), 'utf8');
  
  console.log(`\n✅ Hoàn thành!`);
  console.log(`   File: ${outputJson}`);
  console.log(`   Entries: ${jsonData.Translations.length}`);
}

// CLI
const args = process.argv.slice(2);

if (args.length === 0) {
  exportToJson();
} else if (args.length >= 1) {
  const inputXml = args[0];
  const outputJson = args[1] || PATHS.UNITY.OUTPUT;
  const title = args[2] || 'vi';
  exportToJson(inputXml, outputJson, title);
} else {
  console.log('Cách dùng:');
  console.log('  node scripts/unity/5-export-json.js                      # Dùng paths mặc định');
  console.log('  node scripts/unity/5-export-json.js <input.xml>');
  console.log('  node scripts/unity/5-export-json.js <input.xml> <output.json> [title]');
  process.exit(1);
}
