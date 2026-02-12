const fs = require('fs');
const path = require('path');

// Hàm unescape XML entities
function unescapeXml(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

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
  const xmlFile = './merged_translations_vi.xml'; // Dùng file EN để test
  const mappingFile = './key_mapping.json';
  const templateDir = './Text_Templates';
  const outputDir = './Text_Translated';
  
  parseXmlToText(xmlFile, mappingFile, templateDir, outputDir);
} catch (error) {
  console.error('Lỗi:', error.message);
  process.exit(1);
}
