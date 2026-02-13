const fs = require('fs');
const path = require('path');
const PATHS = require('../config/paths.config');

console.log('🔄 RESET - Xóa dữ liệu dịch để bắt đầu lại từ đầu\n');

// 1. Xóa file dịch hiện tại
console.log('1️⃣ Xóa file dịch hiện tại...');
if (fs.existsSync(PATHS.TRANSLATION.CURRENT_XML)) {
  fs.unlinkSync(PATHS.TRANSLATION.CURRENT_XML);
  console.log('   ✅ Đã xóa merged_vi.xml');
}

// 2. Xóa thư mục Text_VI
console.log('\n2️⃣ Xóa thư mục Text_VI...');
const textViDir = path.join(PATHS.TRANSLATION.CURRENT, 'Text_VI');
if (fs.existsSync(textViDir)) {
  fs.rmSync(textViDir, { recursive: true, force: true });
  console.log('   ✅ Đã xóa Text_VI/');
}

// 3. Xóa các backup versions
console.log('\n3️⃣ Xóa backup versions...');
if (fs.existsSync(PATHS.TRANSLATION.VERSIONS)) {
  const files = fs.readdirSync(PATHS.TRANSLATION.VERSIONS);
  let count = 0;
  files.forEach(file => {
    if (file !== '.gitkeep') {
      fs.unlinkSync(path.join(PATHS.TRANSLATION.VERSIONS, file));
      count++;
    }
  });
  console.log(`   ✅ Đã xóa ${count} file backup`);
}

// 4. Xóa file temp
console.log('\n4️⃣ Xóa file temp...');
if (fs.existsSync(PATHS.TEMP.DIR)) {
  const files = fs.readdirSync(PATHS.TEMP.DIR);
  let count = 0;
  files.forEach(file => {
    if (file !== '.gitkeep') {
      const filePath = path.join(PATHS.TEMP.DIR, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(filePath);
      }
      count++;
    }
  });
  console.log(`   ✅ Đã xóa ${count} file/folder temp`);
}

// 5. Xóa key mapping
console.log('\n5️⃣ Xóa key mapping...');
if (fs.existsSync(PATHS.MAPPING.KEY_MAPPING)) {
  fs.unlinkSync(PATHS.MAPPING.KEY_MAPPING);
  console.log('   ✅ Đã xóa key_mapping.json');
}

// Xóa backup key mapping
const dataDir = path.dirname(PATHS.MAPPING.KEY_MAPPING);
if (fs.existsSync(dataDir)) {
  const files = fs.readdirSync(dataDir);
  let count = 0;
  files.forEach(file => {
    if (file.startsWith('key_mapping.backup_')) {
      fs.unlinkSync(path.join(dataDir, file));
      count++;
    }
  });
  if (count > 0) {
    console.log(`   ✅ Đã xóa ${count} backup key_mapping`);
  }
}

// 6. Xóa source backup (để detect-changes coi như tất cả là mới)
console.log('\n6️⃣ Xóa source backup...');
if (fs.existsSync(PATHS.SOURCE.VERSIONS)) {
  const files = fs.readdirSync(PATHS.SOURCE.VERSIONS);
  let count = 0;
  files.forEach(file => {
    if (file !== '.gitkeep' && file !== 'merged.empty.xml') {
      const filePath = path.join(PATHS.SOURCE.VERSIONS, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(filePath);
      }
      count++;
    }
  });
  console.log(`   ✅ Đã xóa ${count} file backup source`);
}

// 7. Tạo file empty.xml nếu chưa có
console.log('\n7️⃣ Tạo file empty.xml...');
const emptyXmlPath = path.join(PATHS.SOURCE.VERSIONS, 'merged.empty.xml');
if (!fs.existsSync(emptyXmlPath)) {
  const emptyXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<STBLKeyStringList>\n</STBLKeyStringList>';
  fs.writeFileSync(emptyXmlPath, emptyXml, 'utf8');
  console.log('   ✅ Đã tạo merged.empty.xml');
} else {
  console.log('   ℹ️  File merged.empty.xml đã tồn tại');
}

console.log('\n✅ HOÀN TẤT! Đã reset toàn bộ dữ liệu dịch.');
console.log('\n📋 Các bước tiếp theo:');
console.log('   1. node scripts/2-detect-changes.js');
console.log('   2. node scripts/3-translate.js');
console.log('   3. node scripts/4-merge.js');
console.log('   4. node scripts/5-export.js');
