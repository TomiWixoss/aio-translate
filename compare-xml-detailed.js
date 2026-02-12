const fs = require('fs');
const path = require('path');

// Hàm parse XML đơn giản
function parseXml(xmlContent) {
  const entries = new Map();
  const regex = /<Text Key="([^"]+)">([^<]*)<\/Text>/g;
  let match;
  
  while ((match = regex.exec(xmlContent)) !== null) {
    entries.set(match[1], match[2]);
  }
  
  return entries;
}

// Hàm unescape XML entities
function unescapeXml(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

// Hàm load key mapping để lấy thông tin file path
function loadKeyMapping(mappingFile) {
  if (!fs.existsSync(mappingFile)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(mappingFile, 'utf8'));
}

// Hàm so sánh chi tiết 2 file XML
function compareXmlDetailed(file1, file2, mappingFile = './key_mapping.json') {
  console.log(`\n=== So sánh XML chi tiết ===`);
  console.log(`File mới: ${file1}`);
  console.log(`File cũ: ${file2}`);
  
  if (!fs.existsSync(file1)) {
    console.error(`❌ File không tồn tại: ${file1}`);
    return;
  }
  
  if (!fs.existsSync(file2)) {
    console.error(`❌ File không tồn tại: ${file2}`);
    return;
  }
  
  const xml1Content = fs.readFileSync(file1, 'utf8');
  const xml2Content = fs.readFileSync(file2, 'utf8');
  
  const entries1 = parseXml(xml1Content);
  const entries2 = parseXml(xml2Content);
  
  // Load key mapping để biết file path
  const keyMapping = loadKeyMapping(mappingFile);
  
  // Tạo Map: value -> {keys, filePaths}
  const values1 = new Map();
  const values2 = new Map();
  
  entries1.forEach((value, key) => {
    if (!values1.has(value)) {
      values1.set(value, { keys: [], filePaths: new Set() });
    }
    values1.get(value).keys.push(key);
    
    // Thêm file path nếu có mapping
    if (keyMapping && keyMapping[key] && keyMapping[key].file) {
      values1.get(value).filePaths.add(keyMapping[key].file);
    }
  });
  
  entries2.forEach((value, key) => {
    if (!values2.has(value)) {
      values2.set(value, { keys: [], filePaths: new Set() });
    }
    values2.get(value).keys.push(key);
  });
  
  console.log(`\n📊 Thống kê tổng quan:`);
  console.log(`  File mới: ${entries1.size} entries (${values1.size} unique values)`);
  console.log(`  File cũ: ${entries2.size} entries (${values2.size} unique values)`);
  console.log(`  Chênh lệch: ${entries1.size - entries2.size} entries, ${values1.size - values2.size} unique values`);
  
  // Tìm nội dung mới
  const newValues = [];
  values1.forEach((data, value) => {
    if (!values2.has(value)) {
      newValues.push({
        value: unescapeXml(value),
        count: data.keys.length,
        keys: data.keys,
        files: Array.from(data.filePaths)
      });
    }
  });
  
  // Tìm nội dung bị xóa
  const deletedValues = [];
  values2.forEach((data, value) => {
    if (!values1.has(value)) {
      deletedValues.push({
        value: unescapeXml(value),
        count: data.keys.length,
        keys: data.keys
      });
    }
  });
  
  // Tìm nội dung có số lượng thay đổi
  const changedCount = [];
  values1.forEach((data1, value) => {
    if (values2.has(value)) {
      const data2 = values2.get(value);
      if (data1.keys.length !== data2.keys.length) {
        changedCount.push({
          value: unescapeXml(value),
          oldCount: data2.keys.length,
          newCount: data1.keys.length,
          difference: data1.keys.length - data2.keys.length,
          files: Array.from(data1.filePaths)
        });
      }
    }
  });
  
  // Hiển thị chi tiết
  console.log(`\n\n${'='.repeat(80)}`);
  console.log(`✨ NỘI DUNG MỚI THÊM: ${newValues.length}`);
  console.log(`${'='.repeat(80)}`);
  
  if (newValues.length > 0) {
    newValues.forEach((item, index) => {
      console.log(`\n[${index + 1}/${newValues.length}] Xuất hiện ${item.count} lần`);
      if (item.files.length > 0) {
        console.log(`📁 File: ${item.files.join(', ')}`);
      }
      console.log(`📝 Nội dung: "${item.value}"`);
      if (item.count <= 5) {
        console.log(`🔑 Keys: ${item.keys.join(', ')}`);
      }
    });
  } else {
    console.log('(Không có nội dung mới)');
  }
  
  console.log(`\n\n${'='.repeat(80)}`);
  console.log(`🗑️  NỘI DUNG BỊ XÓA: ${deletedValues.length}`);
  console.log(`${'='.repeat(80)}`);
  
  if (deletedValues.length > 0) {
    deletedValues.forEach((item, index) => {
      console.log(`\n[${index + 1}/${deletedValues.length}] Xuất hiện ${item.count} lần`);
      console.log(`📝 Nội dung: "${item.value}"`);
      if (item.count <= 5) {
        console.log(`🔑 Keys: ${item.keys.join(', ')}`);
      }
    });
  } else {
    console.log('(Không có nội dung bị xóa)');
  }
  
  console.log(`\n\n${'='.repeat(80)}`);
  console.log(`🔄 NỘI DUNG CÓ SỐ LƯỢNG THAY ĐỔI: ${changedCount.length}`);
  console.log(`${'='.repeat(80)}`);
  
  if (changedCount.length > 0) {
    changedCount.forEach((item, index) => {
      console.log(`\n[${index + 1}/${changedCount.length}]`);
      if (item.files.length > 0) {
        console.log(`📁 File: ${item.files.join(', ')}`);
      }
      console.log(`📝 Nội dung: "${item.value}"`);
      console.log(`📊 Số lần xuất hiện: ${item.oldCount} → ${item.newCount} (${item.difference > 0 ? '+' : ''}${item.difference})`);
    });
  } else {
    console.log('(Không có nội dung thay đổi số lượng)');
  }
  
  // Lưu báo cáo JSON
  const report = {
    timestamp: new Date().toISOString(),
    files: {
      new: file1,
      old: file2
    },
    statistics: {
      newFileEntries: entries1.size,
      oldFileEntries: entries2.size,
      newFileUniqueValues: values1.size,
      oldFileUniqueValues: values2.size,
      entriesDifference: entries1.size - entries2.size,
      uniqueValuesDifference: values1.size - values2.size,
      newValues: newValues.length,
      deletedValues: deletedValues.length,
      changedCount: changedCount.length
    },
    details: {
      newValues,
      deletedValues,
      changedCount
    }
  };
  
  const reportFile = `detailed_comparison_${new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('Z')[0]}.json`;
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\n\n📄 Đã lưu báo cáo JSON: ${reportFile}`);
}

// Hàm tìm file backup mới nhất
function findLatestBackup(baseName) {
  const dir = path.dirname(baseName) || '.';
  const ext = path.extname(baseName);
  const name = path.basename(baseName, ext);
  
  const files = fs.readdirSync(dir);
  const backupFiles = files.filter(f => 
    f.startsWith(`${name}.backup_`) && f.endsWith(ext)
  ).sort().reverse();
  
  if (backupFiles.length > 0) {
    return path.join(dir, backupFiles[0]);
  }
  
  return null;
}

// Main
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Tự động tìm file mới và backup mới nhất
    const newFile = './merged_translations.xml';
    const backupFile = findLatestBackup(newFile);
    
    if (!backupFile) {
      console.error('❌ Không tìm thấy file backup.');
      console.log('\nCách dùng:');
      console.log('  node compare-xml-detailed.js                           # So sánh với backup mới nhất');
      console.log('  node compare-xml-detailed.js <file-mới> <file-cũ>     # So sánh 2 file cụ thể');
      process.exit(1);
    }
    
    compareXmlDetailed(newFile, backupFile);
  } else if (args.length === 2) {
    compareXmlDetailed(args[0], args[1]);
  } else if (args.length === 3) {
    compareXmlDetailed(args[0], args[1], args[2]);
  } else {
    console.log('Cách dùng:');
    console.log('  node compare-xml-detailed.js                                    # So sánh với backup mới nhất');
    console.log('  node compare-xml-detailed.js <file-mới> <file-cũ>              # So sánh 2 file');
    console.log('  node compare-xml-detailed.js <file-mới> <file-cũ> <mapping>    # So sánh với mapping tùy chỉnh');
    process.exit(1);
  }
}

try {
  main();
  console.log('\n✅ Hoàn thành!');
} catch (error) {
  console.error('❌ Lỗi:', error.message);
  console.error(error.stack);
  process.exit(1);
}
