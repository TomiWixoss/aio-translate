const fs = require('fs');
const path = require('path');

// Đọc file XML
const inputFile = 'en/Strings_ENG_US/Strings_ENG_US.xml';
const outputFile = 'vi/Strings_ENG_US/Strings_VIE_VI.xml';

// Nếu không phải chạy với tham số "apply", tạo file txt
if (process.argv[2] !== 'apply') {
    console.log('Đang đọc file:', inputFile);

    // Đọc nội dung file
    const content = fs.readFileSync(inputFile, 'utf-8');

    // Tách các dòng
    const lines = content.split('\n');

    // Tìm các dòng TextStringDefinition và extract content
    const textContents = [];
    let lineNumber = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.includes('<TextStringDefinition')) {
            lineNumber++;
            
            // Lấy toàn bộ content của TextStringDefinition (có thể nhiều dòng)
            let fullLine = line;
            let currentIndex = i;
            
            // Nếu dòng chưa đóng thẻ, tiếp tục đọc và nối thành 1 dòng
            while (!fullLine.includes('/>') && currentIndex < lines.length - 1) {
                currentIndex++;
                fullLine += ' ' + lines[currentIndex].trim();
            }
            
            // Extract TextString content
            const textMatch = fullLine.match(/TextString="([^"]*)"/);
            
            if (textMatch) {
                const textString = textMatch[1];
                textContents.push(textString);
            }
            
            // Cập nhật i để bỏ qua các dòng đã đọc
            i = currentIndex;
        }
    }

    console.log(`Tìm thấy ${textContents.length} dòng cần dịch`);

    // Tạo file text để dễ dịch - mỗi content 1 dòng
    const textContent = textContents.join('\n');
    fs.writeFileSync('original-texts.txt', textContent, 'utf-8');
    console.log('Đã tạo file original-texts.txt - mỗi content là 1 dòng');
}

// Hàm tạo file XML mới từ file text đã dịch
function createTranslatedXML(translatedFile) {
    console.log('\nĐang tạo file XML đã dịch...');
    
    // Đọc file gốc để lấy InstanceID
    const originalContent = fs.readFileSync(inputFile, 'utf-8');
    const originalLines = originalContent.split('\n');
    
    const instanceIds = [];
    
    for (let i = 0; i < originalLines.length; i++) {
        const line = originalLines[i].trim();
        
        if (line.includes('<TextStringDefinition')) {
            let fullLine = line;
            let currentIndex = i;
            
            while (!fullLine.includes('/>') && currentIndex < originalLines.length - 1) {
                currentIndex++;
                fullLine += ' ' + originalLines[currentIndex].trim();
            }
            
            const instanceMatch = fullLine.match(/InstanceID="([^"]+)"/);
            if (instanceMatch) {
                instanceIds.push(instanceMatch[1]);
            }
            
            i = currentIndex;
        }
    }
    
    // Đọc file đã dịch
    const translatedContent = fs.readFileSync(translatedFile, 'utf-8');
    const translatedLines = translatedContent.split('\n');
    
    // Tạo XML mới
    let xmlOutput = '<?xml version="1.0" encoding="utf-8"?>\n<StblData>\n  <TextStringDefinitions>\n';
    
    for (let i = 0; i < Math.min(instanceIds.length, translatedLines.length); i++) {
        const translatedText = translatedLines[i] || '';
        xmlOutput += `    <TextStringDefinition InstanceID="${instanceIds[i]}" TextString="${translatedText}" />\n`;
    }
    
    xmlOutput += '  </TextStringDefinitions>\n</StblData>';
    
    // Tạo thư mục nếu chưa có
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputFile, xmlOutput, 'utf-8');
    console.log('Đã tạo file:', outputFile);
}

// Export hàm để sử dụng sau khi dịch
module.exports = { createTranslatedXML };

console.log('\n=== HƯỚNG DẪN SỬ DỤNG ===');
console.log('1. Mở file original-texts.txt');
console.log('2. Dịch trực tiếp từng dòng trong file đó');
console.log('3. Lưu file');
console.log('4. Chạy: node translate-xml.js apply');
console.log('   (sẽ tự động dùng file original-texts.txt)');

// Nếu chạy với tham số "apply"
if (process.argv[2] === 'apply') {
    const fileToUse = process.argv[3] || 'translated-texts.txt';
    createTranslatedXML(fileToUse);
}
