const fs = require('fs');

console.log('Đang kiểm tra duplicate keys...');

// Đọc file XML
const xmlContent = fs.readFileSync('./merged_translations.xml', 'utf8');

// Extract tất cả keys bằng regex
const keyRegex = /<Text Key="([A-F0-9]+)">/g;
const keys = [];
let match;

while ((match = keyRegex.exec(xmlContent)) !== null) {
  keys.push(match[1]);
}

console.log(`Tổng số entries: ${keys.length}`);

// Tìm duplicates
const keyCount = {};
const duplicates = [];

keys.forEach(key => {
  keyCount[key] = (keyCount[key] || 0) + 1;
  if (keyCount[key] === 2) {
    duplicates.push(key);
  }
});

if (duplicates.length > 0) {
  console.log(`\n❌ Tìm thấy ${duplicates.length} keys bị trùng:`);
  duplicates.forEach(key => {
    console.log(`  Key: ${key} - Xuất hiện ${keyCount[key]} lần`);
  });
  
  // Hiển thị một vài ví dụ
  console.log('\nVí dụ các entry bị trùng:');
  const exampleKey = duplicates[0];
  const regex = new RegExp(`<Text Key="${exampleKey}">([^<]+)</Text>`, 'g');
  let count = 0;
  while ((match = regex.exec(xmlContent)) !== null && count < 3) {
    console.log(`  ${count + 1}. Key="${exampleKey}": ${match[1]}`);
    count++;
  }
} else {
  console.log('\n✅ Không có key nào bị trùng!');
  console.log(`✅ Tất cả ${keys.length} keys đều unique.`);
}

// Kiểm tra unique keys
const uniqueKeys = new Set(keys);
console.log(`\nSố keys unique: ${uniqueKeys.size}`);
console.log(`Số keys total: ${keys.length}`);
console.log(`Số keys bị trùng: ${keys.length - uniqueKeys.size}`);
