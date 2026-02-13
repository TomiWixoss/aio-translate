const fs = require('fs');
const path = require('path');
const PATHS = require('../../config/paths.config');
const { jsonToXml } = require('../utils/json-xml-converter');
const { backupFile } = require('../utils/backup');

/**
 * Unity Script 1: Import JSON → XML + Key Mapping
 * Tương đương với 1-import-source.js của workflow gốc
 */

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
  
  // Chuyển JSON → XML
  console.log('\nĐang chuyển đổi JSON → XML...');
  const { xml, count } = jsonToXml(jsonData);
  
  // Tạo thư mục nếu chưa có
  const outputDir = path.dirname(outputXml);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(outputXml, xml, 'utf8');
  console.log(`✅ Đã tạo XML: ${count} entries`);
  
  // Tạo key mapping
  console.log('\nĐang tạo key mapping...');
  const mapping = {};
  
  jsonData.Translations.forEach(entry => {
    if (!entry.Key || entry.Value === undefined) return;
    
    mapping[entry.Key] = {
      filePath: 'unity.json',
      japanese: entry.Value,
      english: entry.Value,
      lineNum: 0,
      type: 'entry'
    };
  });
  
  fs.writeFileSync(mappingFile, JSON.stringify(mapping, null, 2), 'utf8');
  console.log(`✅ Đã tạo mapping: ${Object.keys(mapping).length} entries`);
  
  console.log('\n✅ Hoàn thành!');
  console.log(`   XML: ${outputXml}`);
  console.log(`   Mapping: ${mappingFile}`);
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
