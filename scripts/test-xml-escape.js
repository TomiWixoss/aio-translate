const { parseXMLEntries, escapeXml } = require('./utils/xml-parser');

/**
 * Script test để xem XML được escape như thế nào trước khi gửi cho AI
 */

// Test cases với các thẻ HTML và biến
const testCases = [
    {
        key: 'test.1',
        text: 'この<style=Major>{#ITEM}</style>、あんたにあげる。'
    },
    {
        key: 'test.2',
        text: 'この<style="Major">{#OBJECT}</style>を受け取ってください。'
    },
    {
        key: 'test.3',
        text: '<style="Major">建築構造</style>と<style="Major">塗装</style>が載っている'
    },
    {
        key: 'test.4',
        text: '合計2人の<style="Major">絆</style>特性を持つ島民の好感度が<sprite name="Haogan"><sprite name="Haogan">以上'
    },
    {
        key: 'test.5',
        text: '<Style=Major>見習い栽培者</Style>になってから使いましょう。'
    }
];

console.log('='.repeat(80));
console.log('TEST: XML ESCAPE TRƯỚC KHI GỬI CHO AI');
console.log('='.repeat(80));

console.log('\n📋 TRƯỚC KHI ESCAPE (Text gốc):');
console.log('-'.repeat(80));
testCases.forEach((tc, i) => {
    console.log(`\n${i + 1}. Key: ${tc.key}`);
    console.log(`   Text: ${tc.text}`);
});

console.log('\n\n📤 SAU KHI ESCAPE (XML gửi cho AI):');
console.log('-'.repeat(80));

// Tạo XML như trong script 3-translate.js
const xmlInput = testCases.map(e => {
    return `  <Text Key="${e.key}">${escapeXml(e.text)}</Text>`;
}).join('\n');

const fullXml = `<STBLKeyStringList>\n${xmlInput}\n</STBLKeyStringList>`;

console.log(fullXml);

console.log('\n\n🔍 KIỂM TRA PARSE LẠI:');
console.log('-'.repeat(80));

// Parse lại để xem có đúng không
const parsed = parseXMLEntries(fullXml);

parsed.forEach((entry, i) => {
    const original = testCases[i];
    const match = entry.text === original.text;
    
    console.log(`\n${i + 1}. Key: ${entry.key}`);
    console.log(`   Parsed: ${entry.text}`);
    console.log(`   Match:  ${match ? '✅' : '❌'}`);
    
    if (!match) {
        console.log(`   Expected: ${original.text}`);
    }
});

console.log('\n' + '='.repeat(80));
console.log('✅ Test hoàn thành!');
console.log('='.repeat(80));
