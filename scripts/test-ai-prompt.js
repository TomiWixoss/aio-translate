const { escapeXml } = require('./utils/xml-parser');

/**
 * Script test để xem PROMPT CHÍNH XÁC gửi cho AI
 */

// Test cases từ errors-detail.txt
const testBatch = [
    {
        key: '$DialogLib.FaceSendGift.ALi.DialogList[1].Sentences[0].Text$',
        text: 'この<style=Major>{#ITEM}</style>、あんたにあげる。'
    },
    {
        key: '$DialogLib.ReturnGift.AVGMen.DialogList[0].Sentences[0].Text$',
        text: '待って、僕からもプレゼント！この<style="Major">{#OBJECT}</style>をもらって、相棒への友情の証だ、遠慮なく！'
    },
    {
        key: '$DialogLib.ReturnGift.Ali.DialogList[0].Sentences[0].Text$',
        text: 'サンキュー！この<style="Major">{#OBJECT}</style>、使ってよ。'
    }
];

console.log('='.repeat(80));
console.log('PROMPT GỬI CHO AI (Unity Mode)');
console.log('='.repeat(80));

// Tạo XML input giống như trong script 3-translate.js (Unity mode)
const xmlInput = testBatch.map(e => {
    return `  <Text Key="${e.key}">${escapeXml(e.text)}</Text>`;
}).join('\n');

// Tạo prompt giống y hệt trong script
const userPrompt = `Dịch ${testBatch.length} thẻ XML tiếng Nhật sang tiếng Việt.

${xmlInput}

GIỮ NGUYÊN cấu trúc XML và Key, CHỈ dịch nội dung trong thẻ <Text>. Trả về ĐÚNG ${testBatch.length} thẻ <Text>.`;

console.log('\n📤 USER PROMPT:\n');
console.log(userPrompt);

console.log('\n' + '='.repeat(80));
console.log('📋 PHÂN TÍCH:');
console.log('='.repeat(80));

testBatch.forEach((entry, i) => {
    console.log(`\n${i + 1}. Key: ${entry.key}`);
    console.log(`   Gốc:     ${entry.text}`);
    console.log(`   Escaped: ${escapeXml(entry.text)}`);
    
    // Kiểm tra các thẻ HTML
    const tags = entry.text.match(/<[^>]+>/g) || [];
    console.log(`   Tags:    [${tags.join(', ')}]`);
    
    // Kiểm tra biến
    const vars = entry.text.match(/\{[^}]+\}/g) || [];
    console.log(`   Vars:    [${vars.join(', ')}]`);
});

console.log('\n' + '='.repeat(80));
console.log('✅ AI sẽ nhận được text ĐẦY ĐỦ với tất cả thẻ và biến!');
console.log('='.repeat(80));
