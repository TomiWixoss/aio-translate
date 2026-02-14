const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const PATHS = require('../../config/paths.config');

/**
 * Unity Fix HTML Tags - Sửa lỗi HTML tags trong output.json
 * 
 * Workflow:
 * 1. So sánh input.json và output.json
 * 2. Tìm entries có HTML tags không khớp
 * 3. Tạo XML chỉ chứa entries bị lỗi
 * 4. Dịch lại bằng script 3-translate.js (mode unity)
 * 5. Cập nhật vào output.json
 */

function findHtmlTagErrors(inputFile, outputFile) {
  console.log('\n=== Tìm lỗi HTML tags và Rich Text ===');
  console.log(`Input:  ${inputFile}`);
  console.log(`Output: ${outputFile}`);
  
  if (!fs.existsSync(inputFile)) {
    console.error(`❌ File không tồn tại: ${inputFile}`);
    process.exit(1);
  }
  
  if (!fs.existsSync(outputFile)) {
    console.error(`❌ File không tồn tại: ${outputFile}`);
    process.exit(1);
  }
  
  // Đọc JSON
  const inputData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  const outputData = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
  
  // Tạo map
  const inputMap = new Map();
  const outputMap = new Map();
  
  inputData.Translations.forEach(e => inputMap.set(e.Key, e));
  outputData.Translations.forEach(e => outputMap.set(e.Key, e));
  
  // Regex patterns
  const tagRegex = /<[^>]+>/g;
  const placeholderRegex = /\$\d+|\{\d+\}|%[sd]|\{[^}]+\}/g; // Bao gồm cả {#ITEM}, {Name@@MainRole}
  
  const tagErrors = [];
  const placeholderErrors = [];
  const japaneseErrors = [];
  const emptyValues = [];
  
  console.log('\nĐang kiểm tra lỗi...');
  
  inputMap.forEach((inputEntry, key) => {
    const outputEntry = outputMap.get(key);
    
    if (!outputEntry) return;
    
    // 1. Kiểm tra empty values
    if (!outputEntry.Value || outputEntry.Value.trim() === '') {
      emptyValues.push({
        key: key,
        inputValue: inputEntry.Value
      });
      return; // Bỏ qua các check khác nếu rỗng
    }
    
    // 2. Kiểm tra HTML tags (bao gồm cả lỗi cú pháp)
    const inputTags = (inputEntry.Value.match(tagRegex) || []).sort();
    const outputTags = (outputEntry.Value.match(tagRegex) || []).sort();
    
    // Kiểm tra lỗi cú pháp HTML entities
    const hasBrokenTags = /&gt;|&lt;|&quot(?!;)|<\/[^>]*&/.test(outputEntry.Value);
    
    if (JSON.stringify(inputTags) !== JSON.stringify(outputTags) || hasBrokenTags) {
      tagErrors.push({
        key: key,
        inputValue: inputEntry.Value,
        outputValue: outputEntry.Value,
        inputTags: inputTags,
        outputTags: outputTags,
        hasBrokenTags: hasBrokenTags
      });
    }
    
    // 3. Kiểm tra placeholders và variables
    const inputPlaceholders = (inputEntry.Value.match(placeholderRegex) || []).sort();
    const outputPlaceholders = (outputEntry.Value.match(placeholderRegex) || []).sort();
    
    if (JSON.stringify(inputPlaceholders) !== JSON.stringify(outputPlaceholders)) {
      placeholderErrors.push({
        key: key,
        inputValue: inputEntry.Value,
        outputValue: outputEntry.Value,
        inputPlaceholders: inputPlaceholders,
        outputPlaceholders: outputPlaceholders
      });
    }
    
    // 4. Kiểm tra còn tiếng Nhật không
    const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(outputEntry.Value);
    if (hasJapanese) {
      japaneseErrors.push({
        key: key,
        inputValue: inputEntry.Value,
        outputValue: outputEntry.Value
      });
    }
  });
  
  console.log(`\n📊 Kết quả:`);
  console.log(`   HTML tag errors: ${tagErrors.length}`);
  console.log(`   Placeholder errors: ${placeholderErrors.length}`);
  console.log(`   Japanese errors: ${japaneseErrors.length}`);
  console.log(`   Empty values: ${emptyValues.length}`);
  
  return { tagErrors, placeholderErrors, japaneseErrors, emptyValues };
}

function createFixXml(errors, inputFile, outputFile) {
  console.log('\n=== Tạo XML để fix ===');
  
  // Đọc input để lấy giá trị gốc
  const inputData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  const inputMap = new Map();
  inputData.Translations.forEach(e => inputMap.set(e.Key, e));
  
  // Đọc reverse mapping để chuyển về hash keys
  const reverseMappingFile = path.join(path.dirname(PATHS.MAPPING.KEY_MAPPING), 'unity_reverse_mapping.json');
  
  if (!fs.existsSync(reverseMappingFile)) {
    console.error(`❌ Không tìm thấy reverse mapping: ${reverseMappingFile}`);
    process.exit(1);
  }
  
  const reverseMapping = JSON.parse(fs.readFileSync(reverseMappingFile, 'utf8'));
  
  // Tạo forward mapping (originalKey -> hashKey)
  const forwardMapping = {};
  Object.entries(reverseMapping).forEach(([hashKey, originalKey]) => {
    forwardMapping[originalKey] = hashKey;
  });
  
  // Tạo XML với hash keys
  let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  xml += '<STBLKeyStringList>\n';
  
  let count = 0;
  
  errors.forEach(error => {
    const originalKey = error.key;
    const hashKey = forwardMapping[originalKey];
    
    if (!hashKey) {
      console.warn(`⚠️  Không tìm thấy hash key cho: ${originalKey}`);
      return;
    }
    
    const inputEntry = inputMap.get(originalKey);
    if (!inputEntry) {
      console.warn(`⚠️  Không tìm thấy input entry cho: ${originalKey}`);
      return;
    }
    
    // Escape XML
    const escapedText = inputEntry.Value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
    
    xml += `  <Text Key="${hashKey}">${escapedText}</Text>\n`;
    count++;
  });
  
  xml += '</STBLKeyStringList>';
  
  fs.writeFileSync(outputFile, xml, 'utf8');
  console.log(`✅ Đã tạo XML: ${count} entries`);
  console.log(`   File: ${outputFile}`);
  
  return count;
}

function updateOutputJson(fixedXmlFile, outputJsonFile, errors) {
  console.log('\n=== Cập nhật output.json ===');
  
  if (!fs.existsSync(fixedXmlFile)) {
    console.error(`❌ File không tồn tại: ${fixedXmlFile}`);
    process.exit(1);
  }
  
  // Đọc XML đã fix
  const xmlContent = fs.readFileSync(fixedXmlFile, 'utf8');
  const keyRegex = /<Text Key="([A-F0-9]+)">(.*?)<\/Text>/gs;
  const fixedTranslations = new Map();
  let match;
  
  while ((match = keyRegex.exec(xmlContent)) !== null) {
    const hashKey = match[1];
    const translatedText = match[2]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
    
    fixedTranslations.set(hashKey, translatedText);
  }
  
  console.log(`✅ Đọc ${fixedTranslations.size} entries đã fix`);
  
  // Đọc reverse mapping
  const reverseMappingFile = path.join(path.dirname(PATHS.MAPPING.KEY_MAPPING), 'unity_reverse_mapping.json');
  const reverseMapping = JSON.parse(fs.readFileSync(reverseMappingFile, 'utf8'));
  
  // Tạo forward mapping
  const forwardMapping = {};
  Object.entries(reverseMapping).forEach(([hashKey, originalKey]) => {
    forwardMapping[originalKey] = hashKey;
  });
  
  // Đọc output.json
  const outputData = JSON.parse(fs.readFileSync(outputJsonFile, 'utf8'));
  
  // Backup
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('Z')[0];
  const backupPath = outputJsonFile.replace('.json', `.backup_${timestamp}.json`);
  fs.copyFileSync(outputJsonFile, backupPath);
  console.log(`💾 Đã backup: ${path.basename(backupPath)}`);
  
  // Cập nhật
  let updatedCount = 0;
  
  outputData.Translations.forEach(entry => {
    const originalKey = entry.Key;
    const hashKey = forwardMapping[originalKey];
    
    if (hashKey && fixedTranslations.has(hashKey)) {
      entry.Value = fixedTranslations.get(hashKey);
      updatedCount++;
    }
  });
  
  // Lưu file
  fs.writeFileSync(outputJsonFile, JSON.stringify(outputData, null, 2), 'utf8');
  
  console.log(`✅ Đã cập nhật ${updatedCount} entries`);
  console.log(`   File: ${outputJsonFile}`);
}

async function main() {
  console.log('🔧 Unity Fix HTML Tags\n');
  console.log('='.repeat(60));
  
  const inputFile = PATHS.UNITY.INPUT_JSON;
  const outputFile = PATHS.UNITY.OUTPUT_JSON;
  
  // Bước 1: Tìm lỗi
  const { tagErrors, placeholderErrors, japaneseErrors, emptyValues } = findHtmlTagErrors(inputFile, outputFile);
  
  if (tagErrors.length === 0 && placeholderErrors.length === 0 && japaneseErrors.length === 0 && emptyValues.length === 0) {
    console.log('\n✅ Không có lỗi cần fix!');
    return;
  }
  
  // Hiển thị một vài ví dụ
  if (tagErrors.length > 0) {
    console.log('\n📋 Ví dụ lỗi HTML tags (5 đầu):');
    tagErrors.slice(0, 5).forEach((err, i) => {
      console.log(`\n${i + 1}. Key: ${err.key}`);
      console.log(`   Input tags:  [${err.inputTags.join(', ')}]`);
      console.log(`   Output tags: [${err.outputTags.join(', ')}]`);
      if (err.hasBrokenTags) {
        console.log(`   ⚠️  Có lỗi cú pháp HTML entities (&gt;, &lt;, &quot)`);
      }
      console.log(`   Input:  ${err.inputValue.substring(0, 80)}...`);
      console.log(`   Output: ${err.outputValue.substring(0, 80)}...`);
    });
  }
  
  if (placeholderErrors.length > 0) {
    console.log('\n📋 Ví dụ lỗi Placeholders/Variables (5 đầu):');
    placeholderErrors.slice(0, 5).forEach((err, i) => {
      console.log(`\n${i + 1}. Key: ${err.key}`);
      console.log(`   Input placeholders:  [${err.inputPlaceholders.join(', ')}]`);
      console.log(`   Output placeholders: [${err.outputPlaceholders.join(', ')}]`);
      console.log(`   Input:  ${err.inputValue.substring(0, 80)}...`);
      console.log(`   Output: ${err.outputValue.substring(0, 80)}...`);
    });
  }
  
  if (japaneseErrors.length > 0) {
    console.log('\n📋 Ví dụ lỗi tiếng Nhật (5 đầu):');
    japaneseErrors.slice(0, 5).forEach((err, i) => {
      console.log(`\n${i + 1}. Key: ${err.key}`);
      console.log(`   Output: ${err.outputValue.substring(0, 100)}...`);
    });
  }
  
  if (emptyValues.length > 0) {
    console.log(`\n⚠️  Empty values: ${emptyValues.length} entries`);
  }
  
  // Gộp tất cả lỗi
  const allErrors = [...tagErrors, ...placeholderErrors, ...japaneseErrors, ...emptyValues];
  
  // Loại bỏ duplicate (nếu có entry vừa lỗi tag vừa lỗi JP)
  const uniqueErrors = Array.from(
    new Map(allErrors.map(e => [e.key, e])).values()
  );
  
  console.log(`\n📊 Tổng số entries cần fix: ${uniqueErrors.length}`);
  
  // Hỏi user có muốn fix không
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  readline.question('\n▶️  Tiếp tục fix? (Y/n): ', async (answer) => {
    readline.close();
    
    if (answer.toLowerCase() === 'n') {
      console.log('Đã hủy.');
      process.exit(0);
    }
    
    // Bước 2: Tạo XML để fix
    const fixXmlFile = path.join(PATHS.TEMP.DIR, 'unity-fix.xml');
    const count = createFixXml(uniqueErrors, inputFile, fixXmlFile);
    
    if (count === 0) {
      console.log('\n❌ Không có entries nào để fix!');
      process.exit(1);
    }
    
    // Bước 3: Dịch lại bằng script 3-translate.js
    console.log('\n=== Dịch lại entries bị lỗi ===');
    console.log('Đang gọi script 3-translate.js (mode: unity-fix)...\n');
    
    // Tạm thời đổi tên file
    const originalNewFile = PATHS.UNITY.TEMP_NEW;
    const originalTranslatedFile = PATHS.UNITY.TEMP_TRANSLATED;
    
    // Backup file gốc nếu có
    if (fs.existsSync(originalNewFile)) {
      fs.renameSync(originalNewFile, originalNewFile + '.backup-fix');
    }
    if (fs.existsSync(originalTranslatedFile)) {
      fs.renameSync(originalTranslatedFile, originalTranslatedFile + '.backup-fix');
    }
    
    // Copy file fix vào vị trí của TEMP_NEW
    fs.copyFileSync(fixXmlFile, originalNewFile);
    
    try {
      // Chạy script dịch
      execSync('node scripts/3-translate.js unity', {
        stdio: 'inherit',
        cwd: PATHS.ROOT
      });
      
      // Bước 4: Cập nhật output.json
      updateOutputJson(originalTranslatedFile, outputFile, uniqueErrors);
      
      console.log('\n' + '='.repeat(60));
      console.log('🎉 HOÀN THÀNH!');
      console.log('='.repeat(60));
      console.log(`✅ Đã fix ${uniqueErrors.length} entries`);
      console.log(`📁 File: ${outputFile}`);
      
      // Verify lại
      console.log('\n=== Kiểm tra lại ===');
      const { 
        tagErrors: newTagErrors, 
        placeholderErrors: newPlaceholderErrors,
        japaneseErrors: newJapaneseErrors,
        emptyValues: newEmptyValues
      } = findHtmlTagErrors(inputFile, outputFile);
      
      console.log(`\n📊 Sau khi fix:`);
      console.log(`   HTML tag errors: ${newTagErrors.length} (trước: ${tagErrors.length})`);
      console.log(`   Placeholder errors: ${newPlaceholderErrors.length} (trước: ${placeholderErrors.length})`);
      console.log(`   Japanese errors: ${newJapaneseErrors.length} (trước: ${japaneseErrors.length})`);
      console.log(`   Empty values: ${newEmptyValues.length} (trước: ${emptyValues.length})`);
      
      const totalErrorsBefore = tagErrors.length + placeholderErrors.length + japaneseErrors.length + emptyValues.length;
      const totalErrorsAfter = newTagErrors.length + newPlaceholderErrors.length + newJapaneseErrors.length + newEmptyValues.length;
      
      if (totalErrorsAfter === 0) {
        console.log('\n✅ Tất cả lỗi đã được fix!');
      } else {
        console.log(`\n⚠️  Vẫn còn ${totalErrorsAfter} lỗi (đã fix ${totalErrorsBefore - totalErrorsAfter})`);
        console.log('   Có thể cần chạy lại script này hoặc fix thủ công.');
      }
      
    } catch (error) {
      console.error('\n❌ Lỗi khi dịch:', error.message);
      process.exit(1);
    } finally {
      // Restore file gốc
      if (fs.existsSync(originalNewFile + '.backup-fix')) {
        fs.unlinkSync(originalNewFile);
        fs.renameSync(originalNewFile + '.backup-fix', originalNewFile);
      }
      if (fs.existsSync(originalTranslatedFile + '.backup-fix')) {
        fs.unlinkSync(originalTranslatedFile);
        fs.renameSync(originalTranslatedFile + '.backup-fix', originalTranslatedFile);
      }
    }
  });
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Unity Fix HTML Tags Script');
    console.log('\nCách dùng:');
    console.log('  node scripts/unity/fix-html-tags.js');
    console.log('\nMô tả:');
    console.log('  Tìm và fix các lỗi HTML tags trong output.json');
    console.log('  - Tìm entries có HTML tags không khớp với input');
    console.log('  - Tìm entries còn ký tự tiếng Nhật');
    console.log('  - Dịch lại chỉ những entries bị lỗi');
    console.log('  - Cập nhật vào output.json');
    console.log('\nLưu ý:');
    console.log('  - Script sẽ backup output.json trước khi cập nhật');
    console.log('  - Có thể chạy nhiều lần cho đến khi hết lỗi');
    process.exit(0);
  }
  
  main().catch(error => {
    console.error('\n❌ Lỗi:', error.message);
    process.exit(1);
  });
}

module.exports = { findHtmlTagErrors, createFixXml, updateOutputJson };
