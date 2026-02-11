const fs = require('fs');
const path = require('path');

// Đọc file XML đã dịch
function parseXmlToText(xmlFile, mappingFile, outputDir) {
  console.log('Đang đọc file XML đã dịch...');
  const xmlContent = fs.readFileSync(xmlFile, 'utf8');
  
  console.log('Đang đọc file mapping...');
  const mapping = JSON.parse(fs.readFileSync(mappingFile, 'utf8'));
  
  // Extract tất cả translations từ XML
  const keyRegex = /<Text Key="([A-F0-9]+)">([^<]*)<\/Text>/g;
  const translations = {};
  let match;
  
  while ((match = keyRegex.exec(xmlContent)) !== null) {
    const key = match[1];
    const translation = match[2];
    translations[key] = translation;
  }
  
  console.log(`Đã tìm thấy ${Object.keys(translations).length} translations`);
  
  // Nhóm theo file
  const fileGroups = {};
  
  Object.keys(translations).forEach(key => {
    const meta = mapping[key];
    if (!meta) {
      console.warn(`Không tìm thấy metadata cho key: ${key}`);
      return;
    }
    
    const filePath = meta.file;
    if (!fileGroups[filePath]) {
      fileGroups[filePath] = [];
    }
    
    fileGroups[filePath].push({
      japanese: meta.japanese,
      translation: translations[key]
    });
  });
  
  console.log(`Đang tạo ${Object.keys(fileGroups).length} files...`);
  
  // Tạo lại các file .txt
  Object.keys(fileGroups).forEach(filePath => {
    const outputPath = path.join(outputDir, filePath);
    const outputDirPath = path.dirname(outputPath);
    
    // Tạo thư mục nếu chưa có
    if (!fs.existsSync(outputDirPath)) {
      fs.mkdirSync(outputDirPath, { recursive: true });
    }
    
    // Tạo nội dung file
    let content = '';
    fileGroups[filePath].forEach(entry => {
      content += `${entry.japanese}=${entry.translation}\n`;
    });
    
    fs.writeFileSync(outputPath, content, 'utf8');
    console.log(`Đã tạo: ${outputPath}`);
  });
  
  console.log('\nHoàn thành!');
  console.log(`Đã tạo ${Object.keys(fileGroups).length} files trong thư mục: ${outputDir}`);
}

// Chạy script
try {
  const xmlFile = './merged_translations_vi.xml';
  const mappingFile = './key_mapping.json';
  const outputDir = './Text_Translated';
  
  parseXmlToText(xmlFile, mappingFile, outputDir);
} catch (error) {
  console.error('Lỗi:', error.message);
  process.exit(1);
}
