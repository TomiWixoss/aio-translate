const fs = require('fs');

function parseXMLEntries(xmlContent) {
    const entries = [];
    const lines = xmlContent.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.includes('<Text Key=')) {
            let fullLine = line;
            let currentIndex = i;
            
            // Nối các dòng nếu thẻ XML bị ngắt dòng
            while (!fullLine.includes('</Text>') && currentIndex < lines.length - 1) {
                currentIndex++;
                fullLine += ' ' + lines[currentIndex].trim();
            }
            
            const keyMatch = fullLine.match(/Key="([^"]+)"/);
            const textMatch = fullLine.match(/>([^<]*)<\/Text>/);
            
            if (keyMatch && textMatch) {
                entries.push({
                    key: keyMatch[1],
                    text: textMatch[1]
                });
            }
            
            i = currentIndex;
        }
    }
    
    return entries;
}

function countWords(text) {
    // Loại bỏ các ký tự đặc biệt, giữ lại chữ cái, số và khoảng trắng
    const cleaned = text.replace(/<[^>]+>/g, ' ') // Loại bỏ HTML tags
                        .replace(/[^\w\s]/g, ' ')  // Loại bỏ ký tự đặc biệt
                        .replace(/\s+/g, ' ')      // Gộp nhiều khoảng trắng
                        .trim();
    
    if (!cleaned) return 0;
    
    return cleaned.split(' ').filter(word => word.length > 0).length;
}

function analyzeFile(filePath) {
    console.log(`\n📊 Phân tích file: ${filePath}\n`);
    
    if (!fs.existsSync(filePath)) {
        console.log(`❌ File không tồn tại: ${filePath}`);
        return null;
    }
    
    const xmlContent = fs.readFileSync(filePath, 'utf-8');
    const entries = parseXMLEntries(xmlContent);
    
    let totalWords = 0;
    let totalChars = 0;
    let emptyEntries = 0;
    
    for (const entry of entries) {
        const words = countWords(entry.text);
        const chars = entry.text.length;
        
        totalWords += words;
        totalChars += chars;
        
        if (!entry.text || entry.text.trim() === '') {
            emptyEntries++;
        }
    }
    
    console.log(`📝 Tổng số thẻ: ${entries.length.toLocaleString()}`);
    console.log(`📖 Tổng số từ: ${totalWords.toLocaleString()}`);
    console.log(`🔤 Tổng số ký tự: ${totalChars.toLocaleString()}`);
    console.log(`📊 Trung bình: ${(totalWords / entries.length).toFixed(2)} từ/thẻ`);
    console.log(`⚠️  Thẻ trống: ${emptyEntries}`);
    
    return {
        entries: entries.length,
        words: totalWords,
        chars: totalChars,
        avgWords: totalWords / entries.length,
        emptyEntries
    };
}

// Phân tích cả 2 file
console.log('🚀 Đếm số từ trong file XML\n');
console.log('='.repeat(50));

const enStats = analyzeFile('merged_translations.xml');
const viStats = analyzeFile('merged_translations_vi.xml');

if (enStats && viStats) {
    console.log('\n' + '='.repeat(50));
    console.log('\n📊 SO SÁNH:\n');
    console.log(`Tiếng Anh: ${enStats.words.toLocaleString()} từ`);
    console.log(`Tiếng Việt: ${viStats.words.toLocaleString()} từ`);
    console.log(`Tỷ lệ: ${(viStats.words / enStats.words * 100).toFixed(2)}%`);
}
