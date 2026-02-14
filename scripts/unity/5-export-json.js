const fs = require('fs');
const path = require('path');
const PATHS = require('../../config/paths.config');
const { xmlToJson } = require('../utils/json-xml-converter');

/**
 * Unity Script 5: Export XML → JSON
 * Chuyển hash keys về original keys
 */

function exportToJson(inputXml = null, outputJson = null, title = 'vi') {
  inputXml = inputXml || PATHS.UNITY.TEMP_MERGED;
  outputJson = outputJson || PATHS.UNITY.OUTPUT_JSON;
  
  console.log('\n=== [Unity 5] Export XML → JSON ===');
  console.log(`Input: ${inputXml}`);
  console.log(`Output: ${outputJson}`);
  console.log(`Title: ${title}`);
  
  if (!fs.existsSync(inputXml)) {
    console.error(`❌ File không tồn tại: ${inputXml}`);
    process.exit(1);
  }
  
  // Đọc reverse mapping (hashKey -> originalKey)
  const reverseMappingFile = path.join(path.dirname(PATHS.MAPPING.KEY_MAPPING), 'unity_reverse_mapping.json');
  
  if (!fs.existsSync(reverseMappingFile)) {
    console.error(`❌ Không tìm thấy reverse mapping: ${reverseMappingFile}`);
    console.log('\nChạy script 1-import-json.js trước!');
    process.exit(1);
  }
  
  console.log('\nĐang đọc reverse mapping...');
  const reverseMapping = JSON.parse(fs.readFileSync(reverseMappingFile, 'utf8'));
  console.log(`✅ ${Object.keys(reverseMapping).length} mappings`);
  
  console.log('\nĐang đọc XML...');
  const xmlContent = fs.readFileSync(inputXml, 'utf8');
  
  // Parse XML thủ công để giữ hash keys
  const keyRegex = /<Text Key="([A-F0-9]+)">(.*?)<\/Text>/gs;
  const translations = [];
  let match;
  
  while ((match = keyRegex.exec(xmlContent)) !== null) {
    const hashKey = match[1];
    const translatedText = match[2]
      .replace(/&amp;/g, '&')      // Phải unescape & TRƯỚC
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
    
    // Chuyển hash key về original key
    const originalKey = reverseMapping[hashKey];
    
    if (!originalKey) {
      console.warn(`⚠️  Không tìm thấy original key cho hash: ${hashKey}`);
      continue;
    }
    
    translations.push({
      Key: originalKey,
      Version: 1,
      Value: translatedText
    });
  }
  
  console.log(`✅ ${translations.length} entries`);
  
  // Tạo JSON
  const jsonData = {
    Title: title,
    Translations: translations
  };
  
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
