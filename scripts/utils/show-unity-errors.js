const fs = require('fs');

/**
 * Hiển thị chi tiết các lỗi trong Unity JSON
 */

function showErrors(inputFile, outputFile, limit = 20) {
  console.log('\n=== PHÂN TÍCH CHI TIẾT CÁC LOẠI LỖI STYLE TAGS ===\n');
  
  const inputData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  const outputData = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
  
  const inputMap = new Map();
  const outputMap = new Map();
  
  inputData.Translations.forEach(e => inputMap.set(e.Key, e));
  outputData.Translations.forEach(e => outputMap.set(e.Key, e));
  
  const tagRegex = /<[^>]+>/g;
  const placeholderRegex = /\$\d+|\{\d+\}|%[sd]/g;
  
  const tagErrors = [];
  const placeholderErrors = [];
  const emptyValues = [];
  const unchangedValues = [];
  
  inputMap.forEach((inputEntry, key) => {
    const outputEntry = outputMap.get(key);
    if (!outputEntry) return;
    
    // HTML tags
    const inputTags = (inputEntry.Value.match(tagRegex) || []).sort();
    const outputTags = (outputEntry.Value.match(tagRegex) || []).sort();
    
    if (JSON.stringify(inputTags) !== JSON.stringify(outputTags)) {
      tagErrors.push({
        key,
        input: inputEntry.Value,
        output: outputEntry.Value,
        inputTags,
        outputTags
      });
    }
    
    // Placeholders
    const inputPlaceholders = (inputEntry.Value.match(placeholderRegex) || []).sort();
    const outputPlaceholders = (outputEntry.Value.match(placeholderRegex) || []).sort();
    
    if (JSON.stringify(inputPlaceholders) !== JSON.stringify(outputPlaceholders)) {
      placeholderErrors.push({
        key,
        input: inputEntry.Value,
        output: outputEntry.Value,
        inputPlaceholders,
        outputPlaceholders
      });
    }
    
    // Empty values
    if (!outputEntry.Value || outputEntry.Value.trim() === '') {
      emptyValues.push({
        key,
        input: inputEntry.Value
      });
    }
    
    // Unchanged
    if (inputEntry.Value === outputEntry.Value) {
      unchangedValues.push({
        key,
        value: inputEntry.Value
      });
    }
  });
  
  // Hiển thị HTML tag errors
  if (tagErrors.length > 0) {
    console.log(`❌ HTML TAG ERRORS (${tagErrors.length} total, showing ${Math.min(limit, tagErrors.length)}):\n`);
    
    tagErrors.slice(0, limit).forEach((err, i) => {
      console.log(`${i + 1}. Key: ${err.key}`);
      console.log(`   Input tags:  [${err.inputTags.join(', ')}]`);
      console.log(`   Output tags: [${err.outputTags.join(', ')}]`);
      console.log(`   Input:  ${err.input.substring(0, 100)}${err.input.length > 100 ? '...' : ''}`);
      console.log(`   Output: ${err.output.substring(0, 100)}${err.output.length > 100 ? '...' : ''}`);
      console.log('');
    });
  }
  
  // Hiển thị placeholder errors
  if (placeholderErrors.length > 0) {
    console.log(`\n❌ PLACEHOLDER ERRORS (${placeholderErrors.length} total, showing all):\n`);
    
    placeholderErrors.forEach((err, i) => {
      console.log(`${i + 1}. Key: ${err.key}`);
      console.log(`   Input placeholders:  [${err.inputPlaceholders.join(', ')}]`);
      console.log(`   Output placeholders: [${err.outputPlaceholders.join(', ')}]`);
      console.log(`   Input:  ${err.input}`);
      console.log(`   Output: ${err.output}`);
      console.log('');
    });
  }
  
  // Hiển thị empty values
  if (emptyValues.length > 0) {
    console.log(`\n⚠️  EMPTY VALUES (${emptyValues.length} total, showing ${Math.min(limit, emptyValues.length)}):\n`);
    
    emptyValues.slice(0, limit).forEach((err, i) => {
      console.log(`${i + 1}. Key: ${err.key}`);
      console.log(`   Input: ${err.input.substring(0, 150)}`);
      console.log('');
    });
  }
  
  // Hiển thị unchanged values
  if (unchangedValues.length > 0) {
    console.log(`\n⚠️  UNCHANGED (${unchangedValues.length} total, showing ${Math.min(limit, unchangedValues.length)}):\n`);
    
    unchangedValues.slice(0, limit).forEach((err, i) => {
      console.log(`${i + 1}. Key: ${err.key}`);
      console.log(`   Value: ${err.value.substring(0, 150)}`);
      console.log('');
    });
  }
  
  return {
    tagErrors: tagErrors.length,
    placeholderErrors: placeholderErrors.length,
    emptyValues: emptyValues.length,
    unchangedValues: unchangedValues.length
  };
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Cách dùng:');
    console.log('  node scripts/utils/show-unity-errors.js <input.json> <output.json> [limit] [log-file.txt]');
    console.log('\nVí dụ:');
    console.log('  node scripts/utils/show-unity-errors.js unity/input.json unity/output.json 10');
    console.log('  node scripts/utils/show-unity-errors.js unity/input.json unity/output.json 10 unity/errors-log.txt');
    process.exit(1);
  }
  
  const inputFile = args[0];
  const outputFile = args[1];
  const limit = parseInt(args[2]) || 20;
  const logFile = args[3];
  
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
  
  showErrors(inputFile, outputFile, limit);
  
  // Restore console.log và ghi file
  if (logFile) {
    console.log = originalLog;
    fs.writeFileSync(logFile, logs.join('\n'), 'utf8');
    console.log(`\n📄 Log đã được lưu vào: ${logFile}`);
  }
}

module.exports = { showErrors };
