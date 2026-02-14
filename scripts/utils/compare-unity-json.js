const fs = require('fs');
const path = require('path');

/**
 * So sánh input.json và output.json để kiểm tra lỗi
 */

function compareUnityJSON(inputFile, outputFile) {
  console.log('\n=== So sánh Unity JSON ===');
  console.log(`Input:  ${inputFile}`);
  console.log(`Output: ${outputFile}`);
  
  if (!fs.existsSync(inputFile)) {
    console.error(`❌ Input file không tồn tại: ${inputFile}`);
    process.exit(1);
  }
  
  if (!fs.existsSync(outputFile)) {
    console.error(`❌ Output file không tồn tại: ${outputFile}`);
    process.exit(1);
  }
  
  // Đọc JSON
  const inputData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  const outputData = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
  
  const errors = [];
  const warnings = [];
  
  // 1. Kiểm tra cấu trúc cơ bản
  console.log('\n1️⃣  Kiểm tra cấu trúc...');
  
  if (!inputData.Title || !inputData.Translations) {
    errors.push('Input JSON thiếu Title hoặc Translations');
  }
  
  if (!outputData.Title || !outputData.Translations) {
    errors.push('Output JSON thiếu Title hoặc Translations');
  }
  
  if (!Array.isArray(inputData.Translations)) {
    errors.push('Input Translations không phải array');
  }
  
  if (!Array.isArray(outputData.Translations)) {
    errors.push('Output Translations không phải array');
  }
  
  if (errors.length > 0) {
    console.error('❌ Lỗi cấu trúc:');
    errors.forEach(e => console.error(`   - ${e}`));
    return;
  }
  
  console.log(`✅ Cấu trúc hợp lệ`);
  console.log(`   Input Title:  ${inputData.Title}`);
  console.log(`   Output Title: ${outputData.Title}`);
  
  // 2. Kiểm tra số lượng entries
  console.log('\n2️⃣  Kiểm tra số lượng entries...');
  
  const inputCount = inputData.Translations.length;
  const outputCount = outputData.Translations.length;
  
  console.log(`   Input:  ${inputCount} entries`);
  console.log(`   Output: ${outputCount} entries`);
  
  if (inputCount !== outputCount) {
    errors.push(`Số lượng entries khác nhau: Input=${inputCount}, Output=${outputCount}`);
  } else {
    console.log(`✅ Số lượng khớp`);
  }
  
  // 3. Tạo map để so sánh
  console.log('\n3️⃣  Kiểm tra keys...');
  
  const inputMap = new Map();
  const outputMap = new Map();
  
  inputData.Translations.forEach((entry, idx) => {
    if (!entry.Key) {
      errors.push(`Input entry ${idx} thiếu Key`);
    } else {
      inputMap.set(entry.Key, entry);
    }
  });
  
  outputData.Translations.forEach((entry, idx) => {
    if (!entry.Key) {
      errors.push(`Output entry ${idx} thiếu Key`);
    } else {
      outputMap.set(entry.Key, entry);
    }
  });
  
  // Kiểm tra keys bị thiếu
  const missingInOutput = [];
  const missingInInput = [];
  
  inputMap.forEach((entry, key) => {
    if (!outputMap.has(key)) {
      missingInOutput.push(key);
    }
  });
  
  outputMap.forEach((entry, key) => {
    if (!inputMap.has(key)) {
      missingInInput.push(key);
    }
  });
  
  if (missingInOutput.length > 0) {
    errors.push(`${missingInOutput.length} keys bị thiếu trong output`);
    console.log(`❌ Keys thiếu trong output (hiển thị 10 đầu):`);
    missingInOutput.slice(0, 10).forEach(k => console.log(`   - ${k}`));
  }
  
  if (missingInInput.length > 0) {
    warnings.push(`${missingInInput.length} keys thừa trong output (không có trong input)`);
    console.log(`⚠️  Keys thừa trong output (hiển thị 10 đầu):`);
    missingInInput.slice(0, 10).forEach(k => console.log(`   - ${k}`));
  }
  
  if (missingInOutput.length === 0 && missingInInput.length === 0) {
    console.log(`✅ Tất cả keys khớp`);
  }
  
  // 4. Kiểm tra từng entry
  console.log('\n4️⃣  Kiểm tra chi tiết entries...');
  
  let emptyValues = 0;
  let unchangedValues = 0;
  let versionMismatch = 0;
  let missingFields = 0;
  
  inputMap.forEach((inputEntry, key) => {
    const outputEntry = outputMap.get(key);
    
    if (!outputEntry) return; // Đã check ở bước 3
    
    // Kiểm tra fields
    if (!outputEntry.hasOwnProperty('Key')) {
      missingFields++;
      errors.push(`Entry ${key}: thiếu field Key`);
    }
    
    if (!outputEntry.hasOwnProperty('Version')) {
      missingFields++;
      errors.push(`Entry ${key}: thiếu field Version`);
    }
    
    if (!outputEntry.hasOwnProperty('Value')) {
      missingFields++;
      errors.push(`Entry ${key}: thiếu field Value`);
    }
    
    // Kiểm tra Value rỗng
    if (!outputEntry.Value || outputEntry.Value.trim() === '') {
      emptyValues++;
    }
    
    // Kiểm tra Value không đổi (vẫn là tiếng Nhật)
    if (inputEntry.Value === outputEntry.Value) {
      unchangedValues++;
    }
    
    // Kiểm tra Version
    if (inputEntry.Version !== outputEntry.Version) {
      versionMismatch++;
    }
  });
  
  console.log(`   Entries với Value rỗng: ${emptyValues}`);
  console.log(`   Entries không đổi (vẫn JP): ${unchangedValues}`);
  console.log(`   Entries Version khác: ${versionMismatch}`);
  console.log(`   Entries thiếu fields: ${missingFields}`);
  
  if (emptyValues > 0) {
    warnings.push(`${emptyValues} entries có Value rỗng`);
  }
  
  if (unchangedValues > 0) {
    warnings.push(`${unchangedValues} entries không được dịch (vẫn giữ nguyên tiếng Nhật)`);
  }
  
  if (versionMismatch > 0) {
    warnings.push(`${versionMismatch} entries có Version khác với input`);
  }
  
  // 5. Kiểm tra HTML tags và placeholders
  console.log('\n5️⃣  Kiểm tra HTML tags và placeholders...');
  
  let tagMismatch = 0;
  let placeholderMismatch = 0;
  
  const tagRegex = /<[^>]+>/g;
  const placeholderRegex = /\$\d+|\{\d+\}|%[sd]/g;
  
  inputMap.forEach((inputEntry, key) => {
    const outputEntry = outputMap.get(key);
    if (!outputEntry) return;
    
    // Kiểm tra HTML tags
    const inputTags = (inputEntry.Value.match(tagRegex) || []).sort();
    const outputTags = (outputEntry.Value.match(tagRegex) || []).sort();
    
    if (JSON.stringify(inputTags) !== JSON.stringify(outputTags)) {
      tagMismatch++;
    }
    
    // Kiểm tra placeholders
    const inputPlaceholders = (inputEntry.Value.match(placeholderRegex) || []).sort();
    const outputPlaceholders = (outputEntry.Value.match(placeholderRegex) || []).sort();
    
    if (JSON.stringify(inputPlaceholders) !== JSON.stringify(outputPlaceholders)) {
      placeholderMismatch++;
    }
  });
  
  console.log(`   Entries với HTML tags khác: ${tagMismatch}`);
  console.log(`   Entries với placeholders khác: ${placeholderMismatch}`);
  
  if (tagMismatch > 0) {
    errors.push(`${tagMismatch} entries có HTML tags không khớp`);
  }
  
  if (placeholderMismatch > 0) {
    errors.push(`${placeholderMismatch} entries có placeholders không khớp`);
  }
  
  // 6. Tổng kết
  console.log('\n' + '='.repeat(50));
  console.log('📊 KẾT QUẢ KIỂM TRA');
  console.log('='.repeat(50));
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ HOÀN HẢO! Không có lỗi hay cảnh báo.');
  } else {
    if (errors.length > 0) {
      console.log(`\n❌ ${errors.length} LỖI:`);
      errors.forEach((e, i) => console.log(`   ${i + 1}. ${e}`));
    }
    
    if (warnings.length > 0) {
      console.log(`\n⚠️  ${warnings.length} CẢNH BÁO:`);
      warnings.forEach((w, i) => console.log(`   ${i + 1}. ${w}`));
    }
  }
  
  console.log('\n' + '='.repeat(50));
  
  return {
    errors: errors.length,
    warnings: warnings.length,
    stats: {
      inputCount,
      outputCount,
      emptyValues,
      unchangedValues,
      versionMismatch,
      tagMismatch,
      placeholderMismatch
    }
  };
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Cách dùng:');
    console.log('  node scripts/utils/compare-unity-json.js <input.json> <output.json> [log-file.txt]');
    console.log('\nVí dụ:');
    console.log('  node scripts/utils/compare-unity-json.js unity/input.json unity/output.json');
    console.log('  node scripts/utils/compare-unity-json.js unity/input.json unity/output.json unity/compare-log.txt');
    process.exit(1);
  }
  
  const inputFile = args[0];
  const outputFile = args[1];
  const logFile = args[2];
  
  // Capture console output nếu có logFile
  let originalLog;
  let logs = [];
  
  if (logFile) {
    originalLog = console.log;
    console.log = (...args) => {
      const msg = args.join(' ');
      logs.push(msg);
      originalLog(msg);
    };
  }
  
  const result = compareUnityJSON(inputFile, outputFile);
  
  // Restore console.log và ghi file
  if (logFile) {
    console.log = originalLog;
    fs.writeFileSync(logFile, logs.join('\n'), 'utf8');
    console.log(`\n📄 Log đã được lưu vào: ${logFile}`);
  }
  
  // Exit code: 0 nếu không có lỗi, 1 nếu có lỗi
  process.exit(result.errors > 0 ? 1 : 0);
}

module.exports = { compareUnityJSON };
