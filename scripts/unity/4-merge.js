const fs = require('fs');
const path = require('path');
const PATHS = require('../../config/paths.config');
const { parseXMLToMap } = require('../utils/xml-parser');

/**
 * Unity Script 4: Merge bản dịch
 * Tương đương với 4-merge.js của workflow gốc
 */

function mergeTranslations(enXml = null, viOldJson = null, viNewXml = null, outputXml = null) {
  enXml = enXml || PATHS.UNITY.TEMP_EN_XML;
  viOldJson = viOldJson || PATHS.UNITY.OUTPUT_JSON;
  viNewXml = viNewXml || PATHS.UNITY.TEMP_TRANSLATED;
  outputXml = outputXml || PATHS.UNITY.TEMP_MERGED;
  
  console.log('\n=== [Unity 4] Merge bản dịch ===');
  console.log(`EN: ${enXml}`);
  console.log(`VI cũ: ${viOldJson}`);
  console.log(`VI mới: ${viNewXml}`);
  console.log(`Output: ${outputXml}`);
  
  if (!fs.existsSync(enXml)) {
    console.error(`❌ File không tồn tại: ${enXml}`);
    process.exit(1);
  }
  
  console.log('\nĐang đọc file EN...');
  const enContent = fs.readFileSync(enXml, 'utf8');
  const enEntries = parseXMLToMap(enContent);
  console.log(`✅ ${enEntries.size} entries`);
  
  // Tạo translation map
  const translationMap = new Map();
  
  // Đọc VI cũ
  if (fs.existsSync(viOldJson)) {
    console.log('\nĐang đọc VI cũ...');
    const viOldContent = fs.readFileSync(viOldJson, 'utf8');
    const viOldData = JSON.parse(viOldContent);
    
    if (viOldData.Translations && Array.isArray(viOldData.Translations)) {
      viOldData.Translations.forEach(entry => {
        if (entry.Key && entry.Value !== undefined) {
          translationMap.set(entry.Key, entry.Value);
        }
      });
      console.log(`✅ ${translationMap.size} entries`);
    }
  }
  
  // Đọc VI mới (override)
  if (fs.existsSync(viNewXml)) {
    console.log('\nĐang đọc VI mới...');
    const viNewContent = fs.readFileSync(viNewXml, 'utf8');
    const viNewEntries = parseXMLToMap(viNewContent);
    
    viNewEntries.forEach((value, key) => {
      translationMap.set(key, value);
    });
    
    console.log(`✅ ${viNewEntries.size} entries mới`);
  }
  
  // Merge
  console.log('\nĐang merge...');
  let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  xml += '<STBLKeyStringList>\n';
  
  let translated = 0;
  let untranslated = 0;
  
  enEntries.forEach((enValue, key) => {
    if (translationMap.has(key)) {
      xml += `  <Text Key="${key}">${translationMap.get(key)}</Text>\n`;
      translated++;
    } else {
      xml += `  <Text Key="${key}">${enValue}</Text>\n`;
      untranslated++;
    }
  });
  
  xml += '</STBLKeyStringList>';
  
  fs.writeFileSync(outputXml, xml, 'utf8');
  
  console.log(`\n✅ Hoàn thành!`);
  console.log(`   File: ${outputXml}`);
  console.log(`   Đã dịch: ${translated} entries`);
  console.log(`   Chưa dịch: ${untranslated} entries`);
  console.log(`   Tỷ lệ: ${((translated / enEntries.size) * 100).toFixed(2)}%`);
}

// CLI
const args = process.argv.slice(2);

if (args.length === 0) {
  mergeTranslations();
} else if (args.length >= 3) {
  const enXml = args[0];
  const viOldJson = args[1];
  const viNewXml = args[2];
  const outputXml = args[3] || PATHS.UNITY.TEMP_MERGED;
  mergeTranslations(enXml, viOldJson, viNewXml, outputXml);
} else {
  console.log('Cách dùng:');
  console.log('  node scripts/unity/4-merge.js                                    # Dùng paths mặc định');
  console.log('  node scripts/unity/4-merge.js <en.xml> <vi-old.json> <vi-new.xml>');
  console.log('  node scripts/unity/4-merge.js <en.xml> <vi-old.json> <vi-new.xml> <output.xml>');
  process.exit(1);
}
