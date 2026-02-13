const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const PATHS = require('../../config/paths.config');
const { jsonToXml } = require('../utils/json-xml-converter');
const { backupFile } = require('../utils/backup');

/**
 * Unity Script 1: Import JSON → XML + Key Mapping
 * Tạo mã hash ngắn cho Key (giống workflow gốc)
 */

// Tạo hash key ngắn từ original key
function generateHashKey(originalKey) {
  return crypto.createHash('md5')
    .update(originalKey)
    .digest('hex')
    .substring(0, 12)
    .toUpperCase();
}

function importUnityJson(inputJson = null, outputXml = null, mappingFile = null) {
  inputJson = inputJson || PATHS.UNITY.INPUT_JSON;
  outputXml = outputXml || PATHS.UNITY.TEMP_EN_XML;
  mappingFile = mappingFile || PATHS.MAPPING.KEY_MAPPING;
  
  console.log('\n=== [Unity 1] Import JSON → XML ===');
  console.log(`Input: ${inputJson}`);
  console.log(`Output XML: ${outputXml}`);
  console.log(`Mapping: ${mappingFile}`);
  
  if (!fs.existsSync(inputJson)) {
    console.error(`❌ File không tồn tại: ${inputJson}`);
    process.exit(1);
  }
  
  // Backup files cũ
  console.log('\nBackup files cũ...');
  backupFile(outputXml, path.dirname(outputXml));
  backupFile(mappingFile, path.dirname(mappingFile));
  
  // Đọc JSON
  console.log('\nĐang đọc JSON...');
  const jsonContent = fs.readFileSync(inputJson, 'utf8');
  const jsonData = JSON.parse(jsonContent);
  
  if (!jsonData.Translations || !Array.isArray(jsonData.Translations)) {
    console.error('❌ JSON không đúng format');
    process.exit(1);
  }
  
  console.log(`✅ Title: ${jsonData.Title || 'N/A'}`);
  console.log(`   Entries: ${jsonData.Translations.length}`);
  
  // Tạo XML với hash keys
  console.log('\nĐang tạo hash keys và XML...');
  let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  xml += '<STBLKeyStringList>\n';
  
  const mapping = {};
  const keyMap = new Map(); // originalKey -> hashKey
  let count = 0;
  
  for (const entry of jsonData.Translations) {
    if (!entry.Key || entry.Value === undefined || entry.Value === null) {
      console.warn(`⚠️  Bỏ qua entry không hợp lệ:`, entry);
      continue;
    }
    
    const originalKey = entry.Key;
    const hashKey = generateHashKey(originalKey);
    const japaneseText = entry.Value;
    
    // Escape XML
    const escapedText = japaneseText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
    
    xml += `  <Text Key="${hashKey}">${escapedText}</Text>\n`;
    
    // Lưu mapping
    mapping[hashKey] = {
      originalKey: originalKey,
      filePath: 'unity.json',
      japanese: japaneseText,
      english: japaneseText,
      lineNum: 0,
      type: 'entry'
    };
    
    keyMap.set(originalKey, hashKey);
    count++;
  }
  
  xml += '</STBLKeyStringList>';
  
  // Tạo thư mục nếu chưa có
  const outputDir = path.dirname(outputXml);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(outputXml, xml, 'utf8');
  console.log(`✅ Đã tạo XML: ${count} entries với hash keys`);
  
  // Lưu mapping
  fs.writeFileSync(mappingFile, JSON.stringify(mapping, null, 2), 'utf8');
  console.log(`✅ Đã tạo mapping: ${Object.keys(mapping).length} entries`);
  
  // Lưu reverse mapping (hashKey -> originalKey) để export
  const reverseMapping = {};
  keyMap.forEach((hashKey, originalKey) => {
    reverseMapping[hashKey] = originalKey;
  });
  
  const reverseMappingFile = path.join(path.dirname(mappingFile), 'unity_reverse_mapping.json');
  fs.writeFileSync(reverseMappingFile, JSON.stringify(reverseMapping, null, 2), 'utf8');
  console.log(`✅ Đã tạo reverse mapping: ${reverseMappingFile}`);
  
  console.log('\n✅ Hoàn thành!');
  console.log(`   XML: ${outputXml}`);
  console.log(`   Mapping: ${mappingFile}`);
  console.log(`   Reverse: ${reverseMappingFile}`);
}

// CLI
const args = process.argv.slice(2);

if (args.length === 0) {
  // Sử dụng paths mặc định
  importUnityJson();
} else if (args.length >= 1) {
  const inputJson = args[0];
  const outputXml = args[1] || PATHS.UNITY.TEMP_EN_XML;
  const mappingFile = args[2] || PATHS.MAPPING.KEY_MAPPING;
  importUnityJson(inputJson, outputXml, mappingFile);
} else {
  console.log('Cách dùng:');
  console.log('  node scripts/unity/1-import-json.js                    # Dùng paths mặc định');
  console.log('  node scripts/unity/1-import-json.js <input.json>');
  console.log('  node scripts/unity/1-import-json.js <input.json> <output.xml> [mapping.json]');
  process.exit(1);
}
