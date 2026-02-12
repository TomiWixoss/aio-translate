const fs = require('fs');

const EN_FILE = 'merged_translations.xml';
const VI_FILE = 'merged_translations_vi.xml';

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

console.log('🔍 Kiểm tra file dịch...\n');

// Đọc file EN
const enContent = fs.readFileSync(EN_FILE, 'utf-8');
const enEntries = parseXMLEntries(enContent);
console.log(`📄 File EN: ${enEntries.length} thẻ`);

// Đọc file VI
const viContent = fs.readFileSync(VI_FILE, 'utf-8');
const viEntries = parseXMLEntries(viContent);
console.log(`📄 File VI: ${viEntries.length} thẻ\n`);

// Kiểm tra số lượng
if (enEntries.length !== viEntries.length) {
    console.log(`❌ SAI SỐ LƯỢNG: EN có ${enEntries.length}, VI có ${viEntries.length}`);
    console.log(`   Chênh lệch: ${Math.abs(enEntries.length - viEntries.length)} thẻ\n`);
}

// Kiểm tra từng Key
const enKeys = enEntries.map(e => e.key);
const viKeys = viEntries.map(e => e.key);

const missingKeys = enKeys.filter(key => !viKeys.includes(key));
const extraKeys = viKeys.filter(key => !enKeys.includes(key));
const wrongOrderKeys = [];

for (let i = 0; i < Math.min(enKeys.length, viKeys.length); i++) {
    if (enKeys[i] !== viKeys[i]) {
        wrongOrderKeys.push({
            index: i,
            expected: enKeys[i],
            actual: viKeys[i]
        });
    }
}

// Báo cáo
let hasError = false;

if (missingKeys.length > 0) {
    hasError = true;
    console.log(`❌ THIẾU ${missingKeys.length} Key trong file VI:`);
    missingKeys.slice(0, 10).forEach(key => console.log(`   - ${key}`));
    if (missingKeys.length > 10) console.log(`   ... và ${missingKeys.length - 10} Key khác\n`);
    else console.log('');
}

if (extraKeys.length > 0) {
    hasError = true;
    console.log(`❌ THỪA ${extraKeys.length} Key trong file VI:`);
    extraKeys.slice(0, 10).forEach(key => console.log(`   - ${key}`));
    if (extraKeys.length > 10) console.log(`   ... và ${extraKeys.length - 10} Key khác\n`);
    else console.log('');
}

if (wrongOrderKeys.length > 0) {
    hasError = true;
    console.log(`❌ SAI THỨ TỰ ${wrongOrderKeys.length} vị trí:`);
    wrongOrderKeys.slice(0, 10).forEach(item => {
        console.log(`   Vị trí ${item.index + 1}: Cần ${item.expected}, nhận ${item.actual}`);
    });
    if (wrongOrderKeys.length > 10) console.log(`   ... và ${wrongOrderKeys.length - 10} vị trí khác\n`);
    else console.log('');
}

if (!hasError) {
    console.log('✅ HOÀN HẢO! File VI có đúng Key, đúng thứ tự và đủ số lượng như file EN\n');
    console.log(`📊 Tổng số thẻ: ${enEntries.length}`);
} else {
    console.log('❌ File VI có lỗi, cần kiểm tra lại\n');
    process.exit(1);
}
