const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Hàm tạo hash key từ đường dẫn file và nội dung Japanese
function generateKey(filePath, japanese, english) {
  // Sử dụng cả 3 yếu tố để tạo key unique
  const combined = `${filePath}::${japanese}::${english}`;
  return crypto.createHash('md5').update(combined).digest('hex').substring(0, 8).toUpperCase();
}

// Hàm escape XML entities
function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Hàm đọc tất cả file .txt trong thư mục
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

// Hàm parse file .txt và trích xuất các cặp key-value
function parseTextFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const entries = [];
  
  for (const line of lines) {
    // Bỏ qua dòng trống và dòng comment (bắt đầu với ---)
    if (!line.trim() || line.trim().startsWith('---')) {
      continue;
    }
    
    // Tìm dấu = đầu tiên (không phải trong regex)
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
      const english = line.substring(equalIndex + 1).trim();
      
      if (japanese && english) {
        entries.push({ japanese, english });
      }
    }
  }
  
  return entries;
}

// Hàm chính
function mergeTextToXml() {
  const textDir = './Text';
  const outputFile = './merged_translations.xml';
  
  console.log('Đang quét thư mục Text...');
  const textFiles = getAllTextFiles(textDir);
  console.log(`Tìm thấy ${textFiles.length} file .txt`);
  
  const xmlEntries = [];
  const keyMap = new Map(); // Để tránh trùng key
  
  textFiles.forEach(filePath => {
    console.log(`Đang xử lý: ${filePath}`);
    const relativePath = path.relative(textDir, filePath);
    const entries = parseTextFile(filePath);
    
    entries.forEach(({ japanese, english }) => {
      // Tạo key duy nhất dựa trên đường dẫn file, Japanese và English
      const key = generateKey(relativePath, japanese, english);
      
      // Với thuật toán mới, key sẽ unique hơn nhiều
      if (!keyMap.has(key)) {
        keyMap.set(key, { filePath: relativePath, japanese, english });
        xmlEntries.push({
          key: key,
          value: escapeXml(english),
          japanese: japanese,
          metadata: {
            file: relativePath,
            japanese: japanese
          }
        });
      } else {
        // Trường hợp cực kỳ hiếm: collision thực sự
        console.warn(`Key collision detected: ${key} for ${relativePath}`);
      }
    });
  });
  
  console.log(`Tổng số entry: ${xmlEntries.length}`);
  console.log('Đang tạo file XML...');
  
  // Tạo XML giống format mẫu (không có comment)
  let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  xml += '<STBLKeyStringList>\n';
  
  xmlEntries.forEach(entry => {
    xml += `  <Text Key="${entry.key}">${entry.value}</Text>\n`;
  });
  
  xml += '</STBLKeyStringList>';
  
  fs.writeFileSync(outputFile, xml, 'utf8');
  console.log(`Đã tạo file: ${outputFile}`);
  
  // Tạo file mapping để tra cứu
  const mappingFile = './key_mapping.json';
  const mapping = {};
  xmlEntries.forEach(entry => {
    mapping[entry.key] = entry.metadata;
  });
  fs.writeFileSync(mappingFile, JSON.stringify(mapping, null, 2), 'utf8');
  console.log(`Đã tạo file mapping: ${mappingFile}`);
}

// Chạy script
try {
  mergeTextToXml();
  console.log('\nHoàn thành!');
} catch (error) {
  console.error('Lỗi:', error.message);
  process.exit(1);
}
