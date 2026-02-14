const fs = require('fs');

/**
 * Kiểm tra lỗi HTML entities bị escape sai trong Unity JSON
 * Phát hiện các trường hợp như &lt; &gt; &quot; &amp; xuất hiện trong text
 */

function checkHtmlEscapeErrors(jsonFile, options = {}) {
  const {
    showDetails = true,
    limit = 50,
    outputFile = null
  } = options;
  
  console.log('\n=== KIỂM TRA LỖI HTML ENTITIES BỊ ESCAPE SAI ===\n');
  console.log(`File: ${jsonFile}\n`);
  
  const data = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  
  // Các pattern cần kiểm tra
  const patterns = {
    htmlEntities: /&(lt|gt|quot|amp|apos|#\d+|#x[0-9a-fA-F]+);/g,
    brokenTags: /&lt;[^&]*&gt;/g,
    mixedTags: /<[^>]*&[lg]t;[^>]*>/g,
    partialEscape: /&lt;(?!\/?(style|color|size|b|i|u|material|sprite|link|quad|nobr|mark|s|sub|sup|align|indent|line-height|margin|pos|space|voffset|width|cspace|mspace|font|alpha|uppercase|lowercase|smallcaps))/gi
  };
  
  const errors = {
    htmlEntities: [],
    brokenTags: [],
    mixedTags: [],
    partialEscape: [],
    suspiciousPatterns: []
  };
  
  data.Translations.forEach(entry => {
    const value = entry.Value;
    
    // 1. Kiểm tra HTML entities
    const entityMatches = value.match(patterns.htmlEntities);
    if (entityMatches) {
      errors.htmlEntities.push({
        key: entry.Key,
        value: value,
        entities: entityMatches,
        count: entityMatches.length
      });
    }
    
    // 2. Kiểm tra thẻ bị escape hoàn toàn (như &lt;style&gt;)
    const brokenMatches = value.match(patterns.brokenTags);
    if (brokenMatches) {
      errors.brokenTags.push({
        key: entry.Key,
        value: value,
        broken: brokenMatches
      });
    }
    
    // 3. Kiểm tra thẻ bị escape một phần (như <style&gt; hoặc &lt;style>)
    const mixedMatches = value.match(patterns.mixedTags);
    if (mixedMatches) {
      errors.mixedTags.push({
        key: entry.Key,
        value: value,
        mixed: mixedMatches
      });
    }
    
    // 4. Kiểm tra các pattern đáng ngờ khác
    if (value.includes('&lt;') && !value.includes('</')) {
      errors.suspiciousPatterns.push({
        key: entry.Key,
        value: value,
        reason: 'Có &lt; nhưng không có closing tag'
      });
    }
    
    // Kiểm tra thẻ style bị escape
    if (value.includes('&lt;style=') || value.includes('style=&quot;')) {
      errors.suspiciousPatterns.push({
        key: entry.Key,
        value: value,
        reason: 'Style tag bị escape'
      });
    }
  });
  
  // Tổng hợp kết quả
  const totalErrors = 
    errors.htmlEntities.length +
    errors.brokenTags.length +
    errors.mixedTags.length +
    errors.suspiciousPatterns.length;
  
  console.log('📊 TỔNG QUAN:\n');
  console.log(`  Tổng số entries: ${data.Translations.length}`);
  console.log(`  ❌ HTML entities bị escape: ${errors.htmlEntities.length}`);
  console.log(`  ❌ Thẻ bị escape hoàn toàn: ${errors.brokenTags.length}`);
  console.log(`  ❌ Thẻ bị escape một phần: ${errors.mixedTags.length}`);
  console.log(`  ⚠️  Pattern đáng ngờ: ${errors.suspiciousPatterns.length}`);
  console.log(`  📝 Tổng lỗi: ${totalErrors}\n`);
  
  if (!showDetails) {
    return errors;
  }
  
  // Hiển thị chi tiết
  if (errors.htmlEntities.length > 0) {
    console.log(`\n❌ HTML ENTITIES BỊ ESCAPE (${errors.htmlEntities.length} entries):\n`);
    errors.htmlEntities.slice(0, limit).forEach((err, i) => {
      console.log(`${i + 1}. ${err.key}`);
      console.log(`   Entities: ${err.entities.join(', ')}`);
      console.log(`   Value: ${err.value.substring(0, 150)}${err.value.length > 150 ? '...' : ''}`);
      console.log('');
    });
    if (errors.htmlEntities.length > limit) {
      console.log(`   ... và ${errors.htmlEntities.length - limit} lỗi khác\n`);
    }
  }
  
  if (errors.brokenTags.length > 0) {
    console.log(`\n❌ THẺ BỊ ESCAPE HOÀN TOÀN (${errors.brokenTags.length} entries):\n`);
    errors.brokenTags.slice(0, limit).forEach((err, i) => {
      console.log(`${i + 1}. ${err.key}`);
      console.log(`   Broken tags: ${err.broken.join(', ')}`);
      console.log(`   Value: ${err.value.substring(0, 150)}${err.value.length > 150 ? '...' : ''}`);
      console.log('');
    });
    if (errors.brokenTags.length > limit) {
      console.log(`   ... và ${errors.brokenTags.length - limit} lỗi khác\n`);
    }
  }
  
  if (errors.mixedTags.length > 0) {
    console.log(`\n❌ THẺ BỊ ESCAPE MỘT PHẦN (${errors.mixedTags.length} entries):\n`);
    errors.mixedTags.slice(0, limit).forEach((err, i) => {
      console.log(`${i + 1}. ${err.key}`);
      console.log(`   Mixed tags: ${err.mixed.join(', ')}`);
      console.log(`   Value: ${err.value.substring(0, 150)}${err.value.length > 150 ? '...' : ''}`);
      console.log('');
    });
    if (errors.mixedTags.length > limit) {
      console.log(`   ... và ${errors.mixedTags.length - limit} lỗi khác\n`);
    }
  }
  
  if (errors.suspiciousPatterns.length > 0) {
    console.log(`\n⚠️  PATTERN ĐÁNG NGỜ (${errors.suspiciousPatterns.length} entries):\n`);
    errors.suspiciousPatterns.slice(0, limit).forEach((err, i) => {
      console.log(`${i + 1}. ${err.key}`);
      console.log(`   Lý do: ${err.reason}`);
      console.log(`   Value: ${err.value.substring(0, 150)}${err.value.length > 150 ? '...' : ''}`);
      console.log('');
    });
    if (errors.suspiciousPatterns.length > limit) {
      console.log(`   ... và ${errors.suspiciousPatterns.length - limit} lỗi khác\n`);
    }
  }
  
  // Ghi ra file nếu cần
  if (outputFile) {
    const report = {
      file: jsonFile,
      timestamp: new Date().toISOString(),
      summary: {
        totalEntries: data.Translations.length,
        totalErrors: totalErrors,
        htmlEntities: errors.htmlEntities.length,
        brokenTags: errors.brokenTags.length,
        mixedTags: errors.mixedTags.length,
        suspiciousPatterns: errors.suspiciousPatterns.length
      },
      errors: errors
    };
    
    fs.writeFileSync(outputFile, JSON.stringify(report, null, 2), 'utf8');
    console.log(`\n📄 Chi tiết đã được lưu vào: ${outputFile}`);
  }
  
  return errors;
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Cách dùng:');
    console.log('  node scripts/utils/check-html-escape-errors.js <json-file> [options]');
    console.log('\nOptions:');
    console.log('  --limit <n>        Giới hạn số lỗi hiển thị (mặc định: 50)');
    console.log('  --no-details       Chỉ hiển thị tổng quan');
    console.log('  --output <file>    Lưu chi tiết ra file JSON');
    console.log('\nVí dụ:');
    console.log('  node scripts/utils/check-html-escape-errors.js unity/output.json');
    console.log('  node scripts/utils/check-html-escape-errors.js unity/output.json --limit 20');
    console.log('  node scripts/utils/check-html-escape-errors.js unity/output.json --output unity/escape-errors.json');
    process.exit(1);
  }
  
  const jsonFile = args[0];
  const options = {
    showDetails: !args.includes('--no-details'),
    limit: 50,
    outputFile: null
  };
  
  // Parse options
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      options.limit = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      options.outputFile = args[i + 1];
      i++;
    }
  }
  
  checkHtmlEscapeErrors(jsonFile, options);
}

module.exports = { checkHtmlEscapeErrors };
