const fs = require('fs');

/**
 * Fix lỗi HTML entities bị escape sai trong Unity JSON
 * Chuyển &lt; &gt; &quot; &amp; về dạng bình thường
 */

function fixHtmlEscapeErrors(inputFile, outputFile, options = {}) {
  const {
    backup = true,
    dryRun = false,
    verbose = true
  } = options;
  
  console.log('\n=== FIX LỖI HTML ENTITIES BỊ ESCAPE SAI ===\n');
  console.log(`Input:  ${inputFile}`);
  console.log(`Output: ${outputFile}`);
  console.log(`Dry run: ${dryRun ? 'YES (không ghi file)' : 'NO'}\n`);
  
  // Backup file gốc
  if (backup && !dryRun && inputFile === outputFile) {
    const backupFile = inputFile.replace(/\.json$/, `.backup_${Date.now()}.json`);
    fs.copyFileSync(inputFile, backupFile);
    console.log(`✅ Đã backup: ${backupFile}\n`);
  }
  
  const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  
  let fixedCount = 0;
  const fixes = [];
  
  data.Translations.forEach(entry => {
    const originalValue = entry.Value;
    let fixedValue = originalValue;
    
    // Fix HTML entities
    const replacements = [
      { from: /&lt;/g, to: '<', name: '&lt; → <' },
      { from: /&gt;/g, to: '>', name: '&gt; → >' },
      { from: /&quot;/g, to: '"', name: '&quot; → "' },
      { from: /&apos;/g, to: "'", name: '&apos; → \'' },
      { from: /&amp;/g, to: '&', name: '&amp; → &' }
    ];
    
    let hasChanges = false;
    const appliedFixes = [];
    
    replacements.forEach(({ from, to, name }) => {
      const matches = fixedValue.match(from);
      if (matches) {
        fixedValue = fixedValue.replace(from, to);
        hasChanges = true;
        appliedFixes.push(`${name} (${matches.length}x)`);
      }
    });
    
    if (hasChanges) {
      entry.Value = fixedValue;
      fixedCount++;
      
      fixes.push({
        key: entry.Key,
        original: originalValue,
        fixed: fixedValue,
        changes: appliedFixes
      });
      
      if (verbose) {
        console.log(`${fixedCount}. ${entry.Key}`);
        console.log(`   Changes: ${appliedFixes.join(', ')}`);
        console.log(`   Before: ${originalValue.substring(0, 100)}${originalValue.length > 100 ? '...' : ''}`);
        console.log(`   After:  ${fixedValue.substring(0, 100)}${fixedValue.length > 100 ? '...' : ''}`);
        console.log('');
      }
    }
  });
  
  // Ghi file
  if (!dryRun) {
    fs.writeFileSync(outputFile, JSON.stringify(data, null, 2), 'utf8');
    console.log(`\n✅ Đã ghi file: ${outputFile}`);
  }
  
  console.log(`\n📊 TỔNG KẾT:`);
  console.log(`   Tổng entries: ${data.Translations.length}`);
  console.log(`   Đã fix: ${fixedCount}`);
  console.log(`   Không đổi: ${data.Translations.length - fixedCount}`);
  
  return {
    total: data.Translations.length,
    fixed: fixedCount,
    fixes: fixes
  };
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Cách dùng:');
    console.log('  node scripts/utils/fix-html-escape-errors.js <input-file> [output-file] [options]');
    console.log('\nOptions:');
    console.log('  --no-backup    Không tạo backup file');
    console.log('  --dry-run      Chỉ xem preview, không ghi file');
    console.log('  --quiet        Không hiển thị chi tiết từng fix');
    console.log('\nVí dụ:');
    console.log('  node scripts/utils/fix-html-escape-errors.js unity/output.json');
    console.log('  node scripts/utils/fix-html-escape-errors.js unity/output.json unity/output-fixed.json');
    console.log('  node scripts/utils/fix-html-escape-errors.js unity/output.json --dry-run');
    console.log('  node scripts/utils/fix-html-escape-errors.js unity/output.json --no-backup --quiet');
    process.exit(1);
  }
  
  const inputFile = args[0];
  const outputFile = args[1] && !args[1].startsWith('--') ? args[1] : inputFile;
  
  const options = {
    backup: !args.includes('--no-backup'),
    dryRun: args.includes('--dry-run'),
    verbose: !args.includes('--quiet')
  };
  
  fixHtmlEscapeErrors(inputFile, outputFile, options);
}

module.exports = { fixHtmlEscapeErrors };
