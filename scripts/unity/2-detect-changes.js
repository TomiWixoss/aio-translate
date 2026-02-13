const fs = require('fs');
const path = require('path');
const PATHS = require('../../config/paths.config');
const { parseXMLToMap } = require('../utils/xml-parser');
const { jsonToXml } = require('../utils/json-xml-converter');

/**
 * Unity Script 2: Phát hiện thay đổi
 * Tương đương với 2-detect-changes.js của workflow gốc
 */

function detectChanges(newXmlFile = null, oldJsonFile = null, outputFile = null) {
  newXmlFile = newXmlFile || PATHS.UNITY.TEMP_EN_XML;
  oldJsonFile = oldJsonFile || PATHS.UNITY.OUTPUT_JSON;
  outputFile = outputFile || PATHS.UNITY.TEMP_NEW;
  
  console.log('\n=== [Unity 2] Phát hiện thay đổi ===');
  console.log(`File mới: ${newXmlFile}`);
  console.log(`Bản dịch cũ: ${oldJsonFile}`);
  console.log(`Output: ${outputFile}`);
  
  if (!fs.existsSync(newXmlFile)) {
    console.error(`❌ File không tồn tại: ${newXmlFile}`);
    process.exit(1);
  }
  
  console.log('\nĐang đọc file mới...');
  const newXml = fs.readFileSync(newXmlFile, 'utf8');
  const newEntries = parseXMLToMap(newXml);
  console.log(`✅ ${newEntries.size} entries`);
  
  // Đọc bản dịch cũ (nếu có)
  let oldEntries = new Map();
  
  if (fs.existsSync(oldJsonFile)) {
    console.log('\nĐang đọc bản dịch cũ...');
    const oldJsonContent = fs.readFileSync(oldJsonFile, 'utf8');
    const oldJsonData = JSON.parse(oldJsonContent);
    
    if (oldJsonData.Translations && Array.isArray(oldJsonData.Translations)) {
      oldJsonData.Translations.forEach(entry => {
        if (entry.Key && entry.Value !== undefined) {
          oldEntries.set(entry.Key, entry.Value);
        }
      });
      console.log(`✅ ${oldEntries.size} entries`);
    }
  } else {
    console.log('\nℹ️  Không tìm thấy bản dịch cũ (sẽ dịch toàn bộ)');
  }
  
  // Tìm entries mới
  const newContent = [];
  newEntries.forEach((value, key) => {
    if (!oldEntries.has(key)) {
      newContent.push({ key, value });
    }
  });
  
  console.log(`\n📊 Thống kê:`);
  console.log(`  ✨ Entries mới: ${newContent.length}`);
  console.log(`  📝 Cần dịch: ${newContent.length}`);
  
  if (newContent.length === 0) {
    console.log('\n✅ Không có nội dung mới cần dịch!');
    
    // Tạo file empty
    const emptyXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<STBLKeyStringList>\n</STBLKeyStringList>';
    fs.writeFileSync(outputFile, emptyXml, 'utf8');
    return;
  }
  
  // Tạo XML
  let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  xml += '<STBLKeyStringList>\n';
  
  newContent.forEach(entry => {
    xml += `  <Text Key="${entry.key}">${entry.value}</Text>\n`;
  });
  
  xml += '</STBLKeyStringList>';
  
  fs.writeFileSync(outputFile, xml, 'utf8');
  
  console.log(`\n✅ Hoàn thành!`);
  console.log(`   File: ${outputFile}`);
  console.log(`   Entries: ${newContent.length}`);
}

// CLI
const args = process.argv.slice(2);

if (args.length === 0) {
  detectChanges();
} else if (args.length >= 2) {
  const newXmlFile = args[0];
  const oldJsonFile = args[1];
  const outputFile = args[2] || PATHS.UNITY.TEMP_NEW;
  detectChanges(newXmlFile, oldJsonFile, outputFile);
} else {
  console.log('Cách dùng:');
  console.log('  node scripts/unity/2-detect-changes.js                           # Dùng paths mặc định');
  console.log('  node scripts/unity/2-detect-changes.js <new.xml> <old.json>');
  console.log('  node scripts/unity/2-detect-changes.js <new.xml> <old.json> <output.xml>');
  process.exit(1);
}
