const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const PATHS = require('../../config/paths.config');
const { parseXMLEntries, escapeXml } = require('../utils/xml-parser');

/**
 * CONFIG
 */
const TAG_REGEX = /<[^>]+>/g;
// Regex bắt biến: {0}, $1, %s, {#ITEM}, {Name@Role}
const PLACEHOLDER_REGEX = /(\{\s*[\w\d@#.]+\s*\}|\$\d+|%[sd])/g;

/**
 * Hàm lấy danh sách tags và placeholders đã được chuẩn hóa để so sánh
 */
function getValidationTokens(text) {
    if (!text) return { tags: [], placeholders: [] };
    
    const tags = (text.match(TAG_REGEX) || []).sort();
    const placeholders = (text.match(PLACEHOLDER_REGEX) || [])
        .map(p => p.replace(/\s+/g, '')) // Xóa khoảng trắng thừa trong biến { 0 } -> {0}
        .sort();
        
    return { tags, placeholders };
}

/**
 * Hàm so sánh xem Output có khớp Input về mặt cấu trúc không
 */
function isValidTranslation(inputText, outputText) {
    const input = getValidationTokens(inputText);
    const output = getValidationTokens(outputText);

    const tagsMatch = JSON.stringify(input.tags) === JSON.stringify(output.tags);
    const varsMatch = JSON.stringify(input.placeholders) === JSON.stringify(output.placeholders);

    return {
        isValid: tagsMatch && varsMatch,
        details: { tagsMatch, varsMatch, input, output }
    };
}

/**
 * Main Process
 */
async function main() {
    console.log('🚀 BẮT ĐẦU QUY TRÌNH SỬA LỖI HTML/TAG TỰ ĐỘNG\n');

    // 1. Đọc dữ liệu
    console.log('📖 Đọc file Input và Output...');
    if (!fs.existsSync(PATHS.UNITY.INPUT_JSON) || !fs.existsSync(PATHS.UNITY.OUTPUT_JSON)) {
        console.error('❌ Không tìm thấy file input.json hoặc output.json');
        process.exit(1);
    }

    const inputData = JSON.parse(fs.readFileSync(PATHS.UNITY.INPUT_JSON, 'utf8'));
    const outputData = JSON.parse(fs.readFileSync(PATHS.UNITY.OUTPUT_JSON, 'utf8'));

    const inputMap = new Map();
    inputData.Translations.forEach(e => inputMap.set(e.Key, e.Value));

    // 2. Tìm các entry bị lỗi
    console.log('🔍 Đang quét lỗi (bỏ qua UNCHANGED)...');
    const errorEntries = [];
    const unchangedKeys = [];

    outputData.Translations.forEach(entry => {
        const originalText = inputMap.get(entry.Key);
        if (!originalText) return;

        // Bỏ qua nếu chưa dịch (Unchanged)
        if (entry.Value === originalText) {
            unchangedKeys.push(entry.Key);
            return;
        }

        // Kiểm tra lỗi
        const validation = isValidTranslation(originalText, entry.Value);
        if (!validation.isValid) {
            errorEntries.push({
                key: entry.Key,
                original: originalText,
                current: entry.Value,
                ...validation.details
            });
        }
    });

    console.log(`📊 Kết quả quét:`);
    console.log(`   - Tổng số lỗi tìm thấy: ${errorEntries.length}`);
    console.log(`   - Bỏ qua (Unchanged): ${unchangedKeys.length}`);

    if (errorEntries.length === 0) {
        console.log('✅ Không tìm thấy lỗi nào cần sửa!');
        process.exit(0);
    }

    // 3. Chuẩn bị file XML tạm để dịch
    console.log('\n📝 Tạo file XML tạm thời cho các dòng lỗi...');
    
    // Backup file unity-new.xml hiện tại nếu có
    const tempNewPath = PATHS.UNITY.TEMP_NEW;
    const tempBackupPath = tempNewPath + '.bak_fix_errors';
    if (fs.existsSync(tempNewPath)) {
        fs.copyFileSync(tempNewPath, tempBackupPath);
    }

    // Tạo nội dung XML mới chỉ chứa các dòng lỗi
    // CHÚ Ý: Chúng ta đưa text gốc tiếng Nhật vào để AI dịch lại từ đầu
    let xmlContent = errorEntries.map(e => 
        `  <Text Key="${e.key}">${escapeXml(e.original)}</Text>`
    ).join('\n');
    
    // Bọc trong thẻ root (dù script 3 dùng regex line-by-line nhưng đúng chuẩn vẫn hơn)
    xmlContent = `<STBLKeyStringList>\n${xmlContent}\n</STBLKeyStringList>`;
    
    fs.writeFileSync(tempNewPath, xmlContent, 'utf8');
    console.log(`✅ Đã ghi ${errorEntries.length} dòng vào ${tempNewPath}`);

    // 4. Gọi script 3-translate.js
    console.log('\n🤖 ĐANG GỌI AI DỊCH LẠI (Sử dụng script 3-translate)...');
    console.log('⚠️  Lưu ý: Script 3 sẽ tự động kiểm tra tag và retry nếu sai.');
    
    try {
        // Gọi child process synchronous
        execSync('node scripts/unity/3-translate.js unity', { 
            stdio: 'inherit', // Hiển thị log của script con ra màn hình chính
            cwd: PATHS.ROOT 
        });
    } catch (e) {
        console.error('❌ Lỗi khi chạy script dịch:', e.message);
        // Restore backup và exit
        if (fs.existsSync(tempBackupPath)) fs.renameSync(tempBackupPath, tempNewPath);
        process.exit(1);
    }

    // 5. Đọc kết quả và Merge
    console.log('\n🔄 Đang xử lý kết quả dịch và kiểm tra lại lần cuối...');
    const translatedPath = PATHS.UNITY.TEMP_TRANSLATED;
    
    if (!fs.existsSync(translatedPath)) {
        console.error('❌ Không tìm thấy file kết quả dịch!');
        if (fs.existsSync(tempBackupPath)) fs.renameSync(tempBackupPath, tempNewPath);
        process.exit(1);
    }

    const translatedContent = fs.readFileSync(translatedPath, 'utf8');
    const translatedEntries = parseXMLEntries(translatedContent);
    const translatedMap = new Map();
    translatedEntries.forEach(e => translatedMap.set(e.key, e.text));

    let fixedCount = 0;
    let failedCount = 0;

    // Cập nhật Output JSON
    outputData.Translations.forEach(entry => {
        if (translatedMap.has(entry.Key)) {
            const originalText = inputMap.get(entry.Key);
            const newTranslation = translatedMap.get(entry.Key);

            // Double check (Kiểm tra lại lần cuối trước khi ghi)
            const validation = isValidTranslation(originalText, newTranslation);

            if (validation.isValid) {
                entry.Value = newTranslation;
                entry.Version = (entry.Version || 1) + 1; // Tăng version để đánh dấu đã sửa
                fixedCount++;
            } else {
                failedCount++;
                console.warn(`⚠️  AI Dịch vẫn lỗi Key: ${entry.Key}`);
                console.warn(`   Gốc:  ${originalText}`);
                console.warn(`   Dịch: ${newTranslation}`);
                console.warn(`   Lỗi:  ${!validation.details.tagsMatch ? 'Sai Tags' : 'Sai Biến'}`);
            }
        }
    });

    // 6. Lưu file Output
    console.log('\n💾 Đang lưu file output.json...');
    fs.writeFileSync(PATHS.UNITY.OUTPUT_JSON, JSON.stringify(outputData, null, 2), 'utf8');

    // 7. Dọn dẹp
    if (fs.existsSync(tempBackupPath)) {
        fs.renameSync(tempBackupPath, tempNewPath); // Trả lại file cũ
    } else {
        // Nếu không có backup thì xóa file temp đi
        fs.unlinkSync(tempNewPath); 
    }
    // Xóa file kết quả tạm
    if (fs.existsSync(translatedPath)) fs.unlinkSync(translatedPath);

    console.log('\n' + '='.repeat(50));
    console.log('🎉 TỔNG KẾT QUÁ TRÌNH FIX LỖI');
    console.log('='.repeat(50));
    console.log(`📥 Tổng số lỗi ban đầu: ${errorEntries.length}`);
    console.log(`✅ Đã sửa thành công:   ${fixedCount}`);
    console.log(`❌ Vẫn còn lỗi:         ${failedCount}`);
    console.log(`💾 File đã lưu tại:     ${PATHS.UNITY.OUTPUT_JSON}`);
    
    if (failedCount > 0) {
        console.log('\n💡 Gợi ý: Các lỗi còn lại có thể do cấu trúc quá phức tạp.');
        console.log('   Bạn có thể chạy lại script này một lần nữa hoặc sửa tay.');
    }
}

// Chạy script
main();