const fs = require('fs');
const path = require('path');
const PATHS = require('../config/paths.config');
const { parseXMLToMap, unescapeXml } = require('./utils/xml-parser');
const { findLatestBackup, backupFile } = require('./utils/backup');

// Parse XML (alias)
const parseXml = parseXMLToMap;

// Main
function mergeTranslations(enFile, viOldFile, viNewFile, outputFile, enOldFile = null) {
  console.log('\n=== Merge bản dịch ===');
  console.log(`EN mới: ${enFile}`);
  console.log(`VI cũ: ${viOldFile}`);
  console.log(`VI mới: ${viNewFile}`);
  
  // Tìm file EN cũ (backup) - tự động tìm backup mới nhất
  if (!enOldFile) {
    // Tìm trực tiếp trong versions folder
    enOldFile = findLatestBackup('merged.xml', PATHS.SOURCE.VERSIONS);
    if (enOldFile) {
      console.log(`EN cũ: ${enOldFile} (tự động tìm)`);
    }
  }
  
  // Kiểm tra file
  if (!fs.existsSync(enFile)) {
    console.error(`❌ File không tồn tại: ${enFile}`);
    return;
  }
  
  // Tạo file VI cũ rỗng nếu chưa có (lần đầu dịch)
  if (!fs.existsSync(viOldFile)) {
    console.log(`⚠️  File VI cũ chưa tồn tại, tạo file rỗng: ${viOldFile}`);
    const emptyXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<STBLKeyStringList>\n</STBLKeyStringList>';
    
    // Tạo thư mục nếu chưa có
    const dir = path.dirname(viOldFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(viOldFile, emptyXml, 'utf8');
    console.log(`✅ Đã tạo file rỗng`);
  }
  
  if (!fs.existsSync(viNewFile)) {
    console.error(`❌ File không tồn tại: ${viNewFile}`);
    return;
  }
  
  console.log('\nĐang đọc file...');
  const enEntries = parseXml(fs.readFileSync(enFile, 'utf8'));
  const viOldEntries = parseXml(fs.readFileSync(viOldFile, 'utf8'));
  const viNewEntries = parseXml(fs.readFileSync(viNewFile, 'utf8'));
  
  console.log(`EN mới: ${enEntries.size} entries`);
  console.log(`VI cũ: ${viOldEntries.size} entries`);
  console.log(`VI mới: ${viNewEntries.size} entries`);
  
  // Đọc EN cũ nếu có
  let enOldEntries = new Map();
  if (enOldFile && fs.existsSync(enOldFile)) {
    enOldEntries = parseXml(fs.readFileSync(enOldFile, 'utf8'));
    console.log(`EN cũ: ${enOldEntries.size} entries`);
  }
  
  // Tạo map: KEY -> VI_value
  console.log('\nĐang tạo translation map...');
  const translationMap = new Map();
  
  // Bước 1: Map từ VI cũ (theo KEY)
  let mappedFromOld = 0;
  viOldEntries.forEach((viValue, key) => {
    translationMap.set(key, viValue);
    mappedFromOld++;
  });
  
  console.log(`Đã map ${mappedFromOld} entries từ VI cũ (theo KEY)`);
  
  // Bước 2: Map từ VI mới (override nếu trùng - ưu tiên cao hơn)
  let mappedFromNew = 0;
  viNewEntries.forEach((viValue, key) => {
    translationMap.set(key, viValue);
    mappedFromNew++;
  });
  
  console.log(`Đã map ${mappedFromNew} entries từ VI mới (override)`);
  console.log(`Translation map: ${translationMap.size} entries`);
  
  // Merge: CHỈ duyệt qua EN mới (không thêm entries cũ đã bị xóa)
  console.log('\nĐang merge...');
  let fromNew = 0;
  let fromOld = 0;
  let untranslated = 0;
  
  let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  xml += '<STBLKeyStringList>\n';
  
  enEntries.forEach((enValue, key) => {
    // Ưu tiên: VI theo KEY
    if (translationMap.has(key)) {
      const viValue = translationMap.get(key);
      xml += `  <Text Key="${key}">${viValue}</Text>\n`;
      
      // Kiểm tra nguồn
      if (viNewEntries.has(key)) {
        fromNew++;
      } else {
        fromOld++;
      }
    } else {
      // Giữ nguyên EN nếu chưa dịch
      xml += `  <Text Key="${key}">${enValue}</Text>\n`;
      untranslated++;
    }
  });
  
  xml += '</STBLKeyStringList>';
  
  fs.writeFileSync(outputFile, xml, 'utf8');
  
  console.log(`\n✅ Đã tạo file: ${outputFile}`);
  console.log(`📊 Thống kê:`);
  console.log(`  - Tổng: ${enEntries.size} entries`);
  console.log(`  - Từ VI mới: ${fromNew} entries`);
  console.log(`  - Từ VI cũ: ${fromOld} entries`);
  console.log(`  - Chưa dịch: ${untranslated} entries`);
  console.log(`  - Tỷ lệ dịch: ${((fromNew + fromOld)/enEntries.size*100).toFixed(2)}%`);
  
  // Cảnh báo nếu có entries cũ không được sử dụng
  const unusedOld = viOldEntries.size - fromOld;
  if (unusedOld > 0) {
    console.log(`\n⚠️  Lưu ý: ${unusedOld} entries từ VI cũ không được sử dụng (đã bị xóa trong EN mới)`);
  }
}

// CLI
const args = process.argv.slice(2);

if (args.length === 0) {
  // Sử dụng paths mặc định
  const enFile = PATHS.SOURCE.CURRENT_XML;
  const viOldFile = PATHS.TRANSLATION.CURRENT_XML;
  const viNewFile = PATHS.TEMP.TRANSLATED;
  const outputFile = PATHS.TRANSLATION.CURRENT_XML;
  
  mergeTranslations(enFile, viOldFile, viNewFile, outputFile);
} else if (args.length >= 3) {
  const outputFile = args[3] || PATHS.TRANSLATION.CURRENT_XML;
  mergeTranslations(args[0], args[1], args[2], outputFile);
} else {
  console.log('Cách dùng:');
  console.log('  node 4-merge.js                                    # Sử dụng paths mặc định');
  console.log('  node 4-merge.js <EN-mới> <VI-cũ> <VI-mới> [output]');
  process.exit(1);
}
