const fs = require('fs');
const path = require('path');
const PATHS = require('../config/paths.config');
const { parseXMLToMap, createXML, escapeXml } = require('./utils/xml-parser');
const { findLatestBackup, backupFile } = require('./utils/backup');

// Parse XML (alias)
const parseXml = parseXMLToMap;

// Main
function extractNewContent(newFile, oldFile, outputFile) {
  console.log('\n=== Trích xuất nội dung mới ===');
  console.log(`File mới: ${newFile}`);
  console.log(`File cũ: ${oldFile}`);
  
  if (!fs.existsSync(newFile)) {
    console.error(`❌ File không tồn tại: ${newFile}`);
    return;
  }
  
  if (!fs.existsSync(oldFile)) {
    console.error(`❌ File không tồn tại: ${oldFile}`);
    return;
  }
  
  console.log('\nĐang đọc file...');
  const newXml = fs.readFileSync(newFile, 'utf8');
  const oldXml = fs.readFileSync(oldFile, 'utf8');
  
  const newEntries = parseXml(newXml);
  const oldEntries = parseXml(oldXml);
  
  console.log(`File mới: ${newEntries.size} entries`);
  console.log(`File cũ: ${oldEntries.size} entries`);
  
  // Tạo map: value -> keys cho cả 2 file
  const oldValues = new Map();
  oldEntries.forEach((value, key) => {
    if (!oldValues.has(value)) {
      oldValues.set(value, []);
    }
    oldValues.get(value).push(key);
  });
  
  const newValues = new Map();
  newEntries.forEach((value, key) => {
    if (!newValues.has(value)) {
      newValues.set(value, []);
    }
    newValues.get(value).push(key);
  });
  
  // Tìm nội dung mới (value không tồn tại trong file cũ)
  const newContent = [];
  newEntries.forEach((value, key) => {
    if (!oldValues.has(value)) {
      newContent.push({ key, value });
    }
  });
  
  // Tìm nội dung bị xóa (value không tồn tại trong file mới)
  const deletedContent = [];
  oldEntries.forEach((value, key) => {
    if (!newValues.has(value)) {
      deletedContent.push({ key, value });
    }
  });
  
  // Tìm nội dung sửa đổi (cùng key nhưng khác value)
  // Vì key đã thay đổi, ta không thể dùng cách này
  // Thay vào đó, ta chỉ quan tâm đến nội dung mới cần dịch
  
  console.log(`\n📊 Thống kê thay đổi:`);
  console.log(`  ✨ Nội dung mới: ${newContent.length} entries`);
  console.log(`  🗑️  Nội dung xóa: ${deletedContent.length} entries`);
  console.log(`  📝 Cần dịch: ${newContent.length} entries`);
  
  // Tạo XML - chỉ chứa nội dung mới
  let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  xml += '<STBLKeyStringList>\n';
  
  newContent.forEach(entry => {
    xml += `  <Text Key="${entry.key}">${entry.value}</Text>\n`;
  });
  
  xml += '</STBLKeyStringList>';
  
  fs.writeFileSync(outputFile, xml, 'utf8');
  console.log(`\n✅ Đã tạo file: ${outputFile}`);
  console.log(`📝 File chứa ${newContent.length} entries cần dịch`);
  
  // Tạo file mapping chi tiết
  const mappingFile = outputFile.replace('.xml', '_mapping.json');
  const mapping = {
    statistics: {
      new: newContent.length,
      deleted: deletedContent.length,
      total: newContent.length
    },
    new: {},
    deleted: {}
  };
  
  newContent.forEach(entry => {
    mapping.new[entry.key] = entry.value;
  });
  
  deletedContent.forEach(entry => {
    mapping.deleted[entry.key] = entry.value;
  });
  
  fs.writeFileSync(mappingFile, JSON.stringify(mapping, null, 2), 'utf8');
  console.log(`📄 Đã tạo file mapping: ${mappingFile}`);
}

// CLI
const args = process.argv.slice(2);

if (args.length === 0) {
  const newFile = PATHS.SOURCE.CURRENT_XML;
  const oldFile = findLatestBackup('merged.xml', PATHS.SOURCE.VERSIONS);
  
  if (!oldFile) {
    console.error('❌ Không tìm thấy file backup.');
    console.log('\nCách dùng:');
    console.log('  node 2-detect-changes.js');
    console.log('  node 2-detect-changes.js <file-mới> <file-cũ> [output]');
    process.exit(1);
  }
  
  const outputFile = PATHS.TEMP.NEW_CONTENT;
  extractNewContent(newFile, oldFile, outputFile);
} else if (args.length >= 2) {
  const outputFile = args[2] || PATHS.TEMP.NEW_CONTENT;
  extractNewContent(args[0], args[1], outputFile);
} else {
  console.log('Cách dùng:');
  console.log('  node 2-detect-changes.js                              # Tự động tìm backup');
  console.log('  node 2-detect-changes.js <file-mới> <file-cũ>        # Chỉ định file');
  console.log('  node 2-detect-changes.js <file-mới> <file-cũ> <output>');
  process.exit(1);
}
