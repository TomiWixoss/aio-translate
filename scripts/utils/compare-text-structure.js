const fs = require('fs');
const path = require('path');
const PATHS = require('../../config/paths.config');

// Hàm lấy tất cả file .txt trong thư mục
function getAllTextFiles(dir, baseDir = dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...getAllTextFiles(fullPath, baseDir));
    } else if (path.extname(item) === '.txt') {
      files.push(path.relative(baseDir, fullPath));
    }
  });
  
  return files;
}

// Hàm đếm số dòng có nội dung (bỏ qua dòng trống và comment)
function countContentLines(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let count = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('---')) {
      count++;
    }
  }
  
  return count;
}

// Hàm parse các entry từ file
function parseEntries(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const entries = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('---')) {
      continue;
    }
    
    // Tìm dấu = đầu tiên
    const equalIndex = trimmed.indexOf('=');
    if (equalIndex > 0) {
      const japanese = trimmed.substring(0, equalIndex).trim();
      entries.push(japanese);
    }
  }
  
  return entries;
}

// Main
function compareStructure() {
  const textDir = PATHS.SOURCE.CURRENT_TEXT;
  const translatedDir = PATHS.TRANSLATION.CURRENT_TEXT;
  
  console.log('🔍 So sánh cấu trúc Text vs Text_VI\n');
  
  // Kiểm tra thư mục tồn tại
  if (!fs.existsSync(textDir)) {
    console.error('❌ Thư mục Text không tồn tại!');
    return;
  }
  
  if (!fs.existsSync(translatedDir)) {
    console.error('❌ Thư mục Text_Translated không tồn tại!');
    return;
  }
  
  // Lấy danh sách file
  console.log('📂 Đang quét thư mục...');
  const textFiles = getAllTextFiles(textDir);
  const translatedFiles = getAllTextFiles(translatedDir);
  
  console.log(`Text: ${textFiles.length} files`);
  console.log(`Text_Translated: ${translatedFiles.length} files\n`);
  
  // So sánh số lượng file
  if (textFiles.length !== translatedFiles.length) {
    console.log('⚠️  SỐ LƯỢNG FILE KHÁC NHAU!\n');
  }
  
  // Tìm file thiếu
  const missingInTranslated = textFiles.filter(f => !translatedFiles.includes(f));
  const extraInTranslated = translatedFiles.filter(f => !textFiles.includes(f));
  
  if (missingInTranslated.length > 0) {
    console.log(`❌ Thiếu ${missingInTranslated.length} file trong Text_Translated:`);
    missingInTranslated.forEach(f => console.log(`   - ${f}`));
    console.log();
  }
  
  if (extraInTranslated.length > 0) {
    console.log(`⚠️  Thừa ${extraInTranslated.length} file trong Text_VI (cần xóa):`);
    extraInTranslated.forEach(f => console.log(`   - ${f}`));
    console.log();
  }
  
  // So sánh nội dung từng file
  console.log('📊 So sánh nội dung từng file...\n');
  
  let totalChecked = 0;
  let totalPerfect = 0;
  let totalDifferent = 0;
  const differentFiles = [];
  
  for (const relPath of textFiles) {
    const textPath = path.join(textDir, relPath);
    const translatedPath = path.join(translatedDir, relPath);
    
    if (!fs.existsSync(translatedPath)) {
      continue; // Đã báo ở trên
    }
    
    totalChecked++;
    
    // Đếm số dòng
    const textLines = countContentLines(textPath);
    const translatedLines = countContentLines(translatedPath);
    
    // Parse entries
    const textEntries = parseEntries(textPath);
    const translatedEntries = parseEntries(translatedPath);
    
    if (textLines !== translatedLines || textEntries.length !== translatedEntries.length) {
      totalDifferent++;
      differentFiles.push({
        file: relPath,
        textLines,
        translatedLines,
        textEntries: textEntries.length,
        translatedEntries: translatedEntries.length
      });
    } else {
      // Kiểm tra Japanese key có giống nhau không
      let allMatch = true;
      for (let i = 0; i < textEntries.length; i++) {
        if (textEntries[i] !== translatedEntries[i]) {
          allMatch = false;
          break;
        }
      }
      
      if (allMatch) {
        totalPerfect++;
      } else {
        totalDifferent++;
        differentFiles.push({
          file: relPath,
          textLines,
          translatedLines,
          textEntries: textEntries.length,
          translatedEntries: translatedEntries.length,
          keyMismatch: true
        });
      }
    }
  }
  
  // Kết quả
  console.log('═══════════════════════════════════════');
  console.log('KẾT QUẢ SO SÁNH');
  console.log('═══════════════════════════════════════');
  console.log(`✅ Giống 100%: ${totalPerfect}/${totalChecked} files`);
  console.log(`❌ Khác biệt: ${totalDifferent}/${totalChecked} files`);
  
  if (missingInTranslated.length > 0) {
    console.log(`⚠️  Thiếu file: ${missingInTranslated.length} files`);
  }
  
  console.log('═══════════════════════════════════════\n');
  
  if (totalDifferent > 0) {
    console.log('CHI TIẾT CÁC FILE KHÁC BIỆT:\n');
    differentFiles.forEach(item => {
      console.log(`📄 ${item.file}`);
      console.log(`   Dòng: ${item.textLines} → ${item.translatedLines}`);
      console.log(`   Entry: ${item.textEntries} → ${item.translatedEntries}`);
      if (item.keyMismatch) {
        console.log(`   ⚠️  Japanese key không khớp!`);
      }
      console.log();
    });
  }
  
  if (totalPerfect === totalChecked && missingInTranslated.length === 0) {
    console.log('🎉 CẤU TRÚC GIỐNG Y HỆT 100%!');
  } else {
    console.log('⚠️  CẤU TRÚC KHÔNG GIỐNG 100%!');
  }
}

// Chạy
try {
  compareStructure();
} catch (error) {
  console.error('❌ Lỗi:', error.message);
  process.exit(1);
}
