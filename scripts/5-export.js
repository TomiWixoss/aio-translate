const fs = require('fs');
const path = require('path');
const PATHS = require('../config/paths.config');
const { unescapeXml } = require('./utils/xml-parser');

// Đọc file XML đã dịch
function parseXmlToText(xmlFile, mappingFile, templateDir, outputDir) {
  console.log('Đang đọc file XML đã dịch...');
  const xmlContent = fs.readFileSync(xmlFile, 'utf8');
  
  console.log('Đang đọc file mapping...');
  const mapping = JSON.parse(fs.readFileSync(mappingFile, 'utf8'));
  
  // Extract tất cả translations từ XML
  const keyRegex = /<Text Key="([A-F0-9_]+)">(.*?)<\/Text>/gs;
  const translations = {};
  let match;
  
  while ((match = keyRegex.exec(xmlContent)) !== null) {
    const key = match[1];
    const translation = unescapeXml(match[2]);
    translations[key] = translation;
  }
  
  console.log(`Đã tìm thấy ${Object.keys(translations).length} translations`);
  
  // Tạo index lookup: file -> japanese -> key (TỐI ƯU!)
  console.log('Đang tạo index lookup...');
  const fileIndex = {};
  
  for (const [key, meta] of Object.entries(mapping)) {
    if (meta.type === 'entry') {
      const filePath = meta.file;
      if (!fileIndex[filePath]) {
        fileIndex[filePath] = {};
      }
      fileIndex[filePath][meta.japanese] = key;
    }
  }
  
  // Lấy danh sách file từ template
  const templateFiles = getAllTextFiles(templateDir);
  console.log(`Đang tạo ${templateFiles.length} files từ template...`);
  
  // Lấy danh sách file hiện có trong output
  const existingFiles = fs.existsSync(outputDir) ? getAllTextFiles(outputDir) : [];
  const templateRelativePaths = new Set(
    templateFiles.map(f => path.relative(templateDir, f))
  );
  
  // Xóa file không còn trong template
  let deletedCount = 0;
  existingFiles.forEach(existingPath => {
    const relativePath = path.relative(outputDir, existingPath);
    if (!templateRelativePaths.has(relativePath)) {
      fs.unlinkSync(existingPath);
      console.log(`🗑️  Đã xóa: ${relativePath}`);
      deletedCount++;
    }
  });
  
  if (deletedCount > 0) {
    console.log(`\n🗑️  Đã xóa ${deletedCount} file không còn trong source\n`);
  }
  
  templateFiles.forEach(templatePath => {
    const relativePath = path.relative(templateDir, templatePath);
    const outputPath = path.join(outputDir, relativePath);
    const outputDirPath = path.dirname(outputPath);
    
    // Tạo thư mục nếu chưa có
    if (!fs.existsSync(outputDirPath)) {
      fs.mkdirSync(outputDirPath, { recursive: true });
    }
    
    // Đọc template file
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    const lines = templateContent.split('\n');
    
    // Lấy index cho file này
    const fileKeys = fileIndex[relativePath] || {};
    
    // Thay thế từng dòng
    const outputLines = lines.map(line => {
      const trimmed = line.trim();
      
      // Giữ nguyên dòng trống và comment
      if (!trimmed || trimmed.startsWith('---')) {
        return line;
      }
      
      // Tìm dấu = để parse entry
      let equalIndex = -1;
      let inRegex = false;
      
      for (let i = 0; i < line.length; i++) {
        if (line.substring(i, i + 3) === 'sr:' || line.substring(i, i + 2) === 'r:') {
          inRegex = true;
        }
        if (line[i] === '=' && !inRegex) {
          equalIndex = i;
          break;
        }
        if (inRegex && line[i] === '"' && line[i - 1] !== '\\') {
          const nextQuote = line.indexOf('"', i + 1);
          if (nextQuote > i && line[nextQuote + 1] === '=') {
            equalIndex = nextQuote + 1;
            break;
          }
        }
      }
      
      if (equalIndex > 0) {
        const japanese = line.substring(0, equalIndex).trim();
        
        // Lookup nhanh từ index
        const key = fileKeys[japanese];
        if (key && translations[key] !== undefined) {
          return `${japanese}=${translations[key]}`;
        }
      }
      
      // Giữ nguyên nếu không tìm thấy
      return line;
    });
    
    fs.writeFileSync(outputPath, outputLines.join('\n'), 'utf8');
    console.log(`Đã tạo: ${outputPath}`);
  });
  
  console.log('\nHoàn thành!');
  console.log(`Đã tạo ${templateFiles.length} files trong thư mục: ${outputDir}`);
  
  // Apply fixes từ thư mục fix/
  const fixDir = path.join(path.dirname(PATHS.TRANSLATION.CURRENT), 'fix');
  console.log(`\n📝 Kiểm tra thư mục fix: ${fixDir}`);
  
  if (fs.existsSync(fixDir)) {
    const fixFiles = getAllTextFiles(fixDir);
    
    if (fixFiles.length > 0) {
      console.log(`Tìm thấy ${fixFiles.length} file fix, đang apply...`);
      let appliedCount = 0;
      
      fixFiles.forEach(fixPath => {
        const relativePath = path.relative(fixDir, fixPath);
        const targetPath = path.join(outputDir, relativePath);
        
        // Copy file fix ghi đè lên file đã export
        if (fs.existsSync(targetPath)) {
          fs.copyFileSync(fixPath, targetPath);
          console.log(`   ✅ ${relativePath}`);
          appliedCount++;
        } else {
          console.log(`   ⚠️  ${relativePath} (file không tồn tại, bỏ qua)`);
        }
      });
      
      console.log(`\n✅ Đã apply ${appliedCount}/${fixFiles.length} fixes`);
    } else {
      console.log('   ℹ️  Không có file fix nào');
    }
  } else {
    console.log(`   ℹ️  Thư mục fix không tồn tại: ${fixDir}`);
  }
}

// Hàm lấy tất cả file .txt
function getAllTextFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      getAllTextFiles(filePath, fileList);
    } else if (path.extname(file) === '.txt') {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Chạy script
try {
  const xmlFile = PATHS.TRANSLATION.CURRENT_XML;
  const mappingFile = PATHS.MAPPING.KEY_MAPPING;
  const templateDir = PATHS.SOURCE.CURRENT + '/Text_Templates';
  const outputDir = PATHS.TRANSLATION.CURRENT_TEXT;
  
  parseXmlToText(xmlFile, mappingFile, templateDir, outputDir);
} catch (error) {
  console.error('Lỗi:', error.message);
  process.exit(1);
}
