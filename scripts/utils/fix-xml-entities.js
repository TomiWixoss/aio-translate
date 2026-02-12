const fs = require('fs');

const VI_FILE = 'vi/Strings_ENG_US/Strings_VIE_VI.xml';
const EN_FILE = 'en/Strings_ENG_US/Strings_ENG_US.xml';

console.log('🔧 Đang sửa XML entities dựa trên file EN...\n');

// Parse EN file to get correct format
function parseXMLEntries(xmlContent) {
    const entries = [];
    const lines = xmlContent.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.includes('<Text Key=')) {
            let fullLine = line;
            let currentIndex = i;
            
            while (!fullLine.includes('</Text>') && currentIndex < lines.length - 1) {
                currentIndex++;
                fullLine += ' ' + lines[currentIndex].trim();
            }
            
            const keyMatch = fullLine.match(/Key="([^"]+)"/);
            const textMatch = fullLine.match(/>([^<]*)<\/Text>/);
            
            if (keyMatch) {
                entries.push({
                    key: keyMatch[1],
                    text: textMatch ? textMatch[1] : ''
                });
            }
            
            i = currentIndex;
        }
    }
    
    return entries;
}

// Đọc file EN để lấy format đúng
const enContent = fs.readFileSync(EN_FILE, 'utf-8');
const enEntries = parseXMLEntries(enContent);
const enMap = new Map(enEntries.map(e => [e.key, e.text]));

console.log(`📄 Đã load ${enEntries.length} thẻ từ file EN\n`);

// Restore from backup
if (fs.existsSync(VI_FILE + '.backup')) {
    fs.copyFileSync(VI_FILE + '.backup', VI_FILE);
    console.log('📂 Đã restore từ backup\n');
}

const viContent = fs.readFileSync(VI_FILE, 'utf-8');
const lines = viContent.split('\n');

let fixedCount = 0;
const fixedLines = lines.map((line, index) => {
    if (line.includes('<Text Key=')) {
        const keyMatch = line.match(/Key="([^"]+)"/);
        const textMatch = line.match(/>([^<]*)<\/Text>/);
        
        if (keyMatch && textMatch) {
            const key = keyMatch[1];
            const viText = textMatch[1];
            const enText = enMap.get(key);
            
            if (enText) {
                let fixedText = viText;
                
                // Check if EN has HTML tags escaped
                const enHasEscapedTags = enText.includes('&lt;') || enText.includes('&gt;');
                const viHasUnescapedTags = /<(?!\/?(Text|STBLKeyStringList))/.test(viText);
                
                if (enHasEscapedTags && viHasUnescapedTags) {
                    // Escape all < and > in VI text
                    fixedText = fixedText.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                }
                
                // Fix & that are not part of valid entities
                fixedText = fixedText.replace(/&(?!(lt;|gt;|amp;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;))/g, '&amp;');
                
                // Fix incomplete entities
                fixedText = fixedText.replace(/&(lt|gt|amp|quot|apos)(?!;)/g, '&$1;');
                
                if (fixedText !== viText) {
                    fixedCount++;
                    console.log(`Dòng ${index + 1} (${key}): Đã fix`);
                    return line.replace(viText, fixedText);
                }
            }
        }
    }
    return line;
});

fs.writeFileSync(VI_FILE, fixedLines.join('\n'), 'utf-8');

console.log(`\n✅ Đã sửa ${fixedCount} dòng`);
console.log(`✅ Đã cập nhật file gốc`);
