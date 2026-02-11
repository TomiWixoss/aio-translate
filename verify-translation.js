const fs = require('fs');

const EN_FILE = 'en/Strings_ENG_US/Strings_ENG_US.xml';
const VI_FILE = 'vi/Strings_ENG_US/Strings_VIE_VI.xml';

function parseXMLEntries(xmlContent) {
    const entries = [];
    const lines = xmlContent.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.includes('<TextStringDefinition')) {
            let fullLine = line;
            let currentIndex = i;
            
            while (!fullLine.includes('/>') && currentIndex < lines.length - 1) {
                currentIndex++;
                fullLine += ' ' + lines[currentIndex].trim();
            }
            
            const instanceMatch = fullLine.match(/InstanceID="([^"]+)"/);
            const textMatch = fullLine.match(/TextString="([^"]*)"/);
            
            if (instanceMatch) {
                entries.push({
                    instanceId: instanceMatch[1],
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

// Kiểm tra từng InstanceID
const enIds = enEntries.map(e => e.instanceId);
const viIds = viEntries.map(e => e.instanceId);

const missingIds = enIds.filter(id => !viIds.includes(id));
const extraIds = viIds.filter(id => !enIds.includes(id));
const wrongOrderIds = [];

for (let i = 0; i < Math.min(enIds.length, viIds.length); i++) {
    if (enIds[i] !== viIds[i]) {
        wrongOrderIds.push({
            index: i,
            expected: enIds[i],
            actual: viIds[i]
        });
    }
}

// Báo cáo
let hasError = false;

if (missingIds.length > 0) {
    hasError = true;
    console.log(`❌ THIẾU ${missingIds.length} InstanceID trong file VI:`);
    missingIds.slice(0, 10).forEach(id => console.log(`   - ${id}`));
    if (missingIds.length > 10) console.log(`   ... và ${missingIds.length - 10} ID khác\n`);
    else console.log('');
}

if (extraIds.length > 0) {
    hasError = true;
    console.log(`❌ THỪA ${extraIds.length} InstanceID trong file VI:`);
    extraIds.slice(0, 10).forEach(id => console.log(`   - ${id}`));
    if (extraIds.length > 10) console.log(`   ... và ${extraIds.length - 10} ID khác\n`);
    else console.log('');
}

if (wrongOrderIds.length > 0) {
    hasError = true;
    console.log(`❌ SAI THỨ TỰ ${wrongOrderIds.length} vị trí:`);
    wrongOrderIds.slice(0, 10).forEach(item => {
        console.log(`   Vị trí ${item.index + 1}: Cần ${item.expected}, nhận ${item.actual}`);
    });
    if (wrongOrderIds.length > 10) console.log(`   ... và ${wrongOrderIds.length - 10} vị trí khác\n`);
    else console.log('');
}

if (!hasError) {
    console.log('✅ HOÀN HẢO! File VI có đúng InstanceID, đúng thứ tự và đủ số lượng như file EN\n');
    console.log(`📊 Tổng số thẻ: ${enEntries.length}`);
} else {
    console.log('❌ File VI có lỗi, cần kiểm tra lại\n');
    process.exit(1);
}
