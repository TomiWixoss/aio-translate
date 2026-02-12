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
            
            if (keyMatch) {
                entries.push({
                    key: keyMatch[1],
                    text: textMatch ? textMatch[1] : '',
                    lineNumber: i + 1
                });
            }
            
            i = currentIndex;
        }
    }
    
    return entries;
}

console.log('🔍 Tìm thẻ trống trong file dịch\n');

const enContent = fs.readFileSync('merged_translations.xml', 'utf-8');
const viContent = fs.readFileSync('merged_translations_vi.xml', 'utf-8');

const enEntries = parseXMLEntries(enContent);
const viEntries = parseXMLEntries(viContent);

// Tạo map để tra cứu nhanh
const enMap = new Map();
enEntries.forEach(e => enMap.set(e.key, e.text));

const viMap = new Map();
viEntries.forEach(e => viMap.set(e.key, e.text));

console.log('📊 Thống kê:\n');
console.log(`Tiếng Anh: ${enEntries.length} thẻ`);
console.log(`Tiếng Việt: ${viEntries.length} thẻ\n`);

// Tìm thẻ trống trong tiếng Việt
const emptyInVi = viEntries.filter(e => !e.text || e.text.trim() === '');

if (emptyInVi.length > 0) {
    console.log(`⚠️  Tìm thấy ${emptyInVi.length} thẻ trống trong file tiếng Việt:\n`);
    
    emptyInVi.forEach((entry, index) => {
        const enText = enMap.get(entry.key) || '(không tìm thấy)';
        console.log(`${index + 1}. Key: ${entry.key}`);
        console.log(`   EN: "${enText}"`);
        console.log(`   VI: "${entry.text}"`);
        console.log(`   Dòng: ${entry.lineNumber}\n`);
    });
} else {
    console.log('✅ Không có thẻ trống!');
}

// Tìm thẻ có trong EN nhưng không có trong VI
const missingInVi = enEntries.filter(e => !viMap.has(e.key));

if (missingInVi.length > 0) {
    console.log(`\n⚠️  Tìm thấy ${missingInVi.length} thẻ có trong EN nhưng thiếu trong VI:\n`);
    
    missingInVi.slice(0, 10).forEach((entry, index) => {
        console.log(`${index + 1}. Key: ${entry.key}`);
        console.log(`   EN: "${entry.text}"\n`);
    });
    
    if (missingInVi.length > 10) {
        console.log(`   ... và ${missingInVi.length - 10} thẻ khác\n`);
    }
}

// Tìm thẻ có trong VI nhưng không có trong EN
const extraInVi = viEntries.filter(e => !enMap.has(e.key));

if (extraInVi.length > 0) {
    console.log(`\n⚠️  Tìm thấy ${extraInVi.length} thẻ thừa trong VI (không có trong EN):\n`);
    
    extraInVi.slice(0, 10).forEach((entry, index) => {
        console.log(`${index + 1}. Key: ${entry.key}`);
        console.log(`   VI: "${entry.text}"\n`);
    });
    
    if (extraInVi.length > 10) {
        console.log(`   ... và ${extraInVi.length - 10} thẻ khác\n`);
    }
}

console.log('\n✅ Hoàn thành!');
