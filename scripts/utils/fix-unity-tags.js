const fs = require('fs');

/**
 * Hàm fix lỗi tags trong file Output dựa trên chuẩn của Input
 */
function fixTags(inputFile, outputFile) {
    console.log('🔄 Đang đọc dữ liệu...');

    // Đọc file
    let inputContent, outputContent;
    try {
        inputContent = fs.readFileSync(inputFile, 'utf8');
        outputContent = fs.readFileSync(outputFile, 'utf8');
    } catch (e) {
        console.error('❌ Lỗi không tìm thấy file:', e.message);
        return;
    }

    const inputData = JSON.parse(inputContent);
    const outputData = JSON.parse(outputContent);

    // Tạo Map để tra cứu nhanh Input
    const inputMap = new Map();
    inputData.Translations.forEach(e => inputMap.set(e.Key, e.Value));

    let fixedCount = 0;
    let syntaxFixedCount = 0;

    console.log('🛠️  Đang xử lý sửa lỗi...');

    outputData.Translations.forEach(entry => {
        const key = entry.Key;
        const originalValue = entry.Value;
        const inputValue = inputMap.get(key);

        if (!inputValue || !originalValue) return;

        let fixedValue = originalValue;

        // --- BƯỚC 1: Sửa lỗi cú pháp HTML/Rich Text cơ bản (Syntax Fixes) ---
        
        // 1.1 Sửa lỗi encode HTML entity phổ biến trong Unity
        if (fixedValue.includes('&gt;') || fixedValue.includes('&lt;') || fixedValue.includes('&quot;')) {
            fixedValue = fixedValue
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"');
        }

        // 1.2 Sửa lỗi thẻ đóng bị lỗi (ví dụ: </style, </color mà thiếu >)
        fixedValue = fixedValue.replace(/<\/(style|color|b|i|size)(?![>])/g, '</$1>');

        // 1.3 Sửa lỗi dấu ngoặc kép thông minh (smart quotes) thành ngoặc thẳng
        fixedValue = fixedValue.replace(/[“”]/g, '"');

        // 1.4 Sửa lỗi khoảng trắng trong biến (ví dụ: { 0 } -> {0})
        fixedValue = fixedValue.replace(/\{\s+(\d+)\s+\}/g, '{$1}');

        if (fixedValue !== originalValue) syntaxFixedCount++;

        // --- BƯỚC 2: Đồng bộ định dạng thẻ Style theo Input (Mapping Logic) ---

        // Regex để bắt các thẻ style phổ biến: Major, MajorRed, v.v.
        // Group 1: Tên style (ví dụ: Major)
        const styleRegex = /<style=["']?([^"'>]+)["']?>/g;
        
        let match;
        // Quét tất cả thẻ style trong Input để xem định dạng chuẩn là gì
        while ((match = styleRegex.exec(inputValue)) !== null) {
            const styleName = match[1]; // VD: Major
            const fullInputTag = match[0]; // VD: <style=Major> hoặc <style="Major">

            // Tạo regex để tìm thẻ tương ứng trong Output (bất kể có ngoặc hay không)
            // Tìm: <style="Major"> hoặc <style=Major> hoặc <style='Major'>
            const targetRegex = new RegExp(`<style=["']?${styleName}["']?>`, 'g');

            // Thay thế trong Output bằng đúng định dạng của Input
            if (fixedValue.match(targetRegex)) {
                fixedValue = fixedValue.replace(targetRegex, fullInputTag);
            }
        }

        // --- BƯỚC 3: Sửa lỗi Sprite (ví dụ: <sprite name="Haogan&quot) ---
        if (fixedValue.includes('<sprite name=')) {
             // Fix lỗi &quot hoặc thiếu dấu đóng trong sprite
             fixedValue = fixedValue.replace(/<sprite name="([^"]+)&quot/g, '<sprite name="$1">');
             // Fix trường hợp sprite name="X" mà thiếu >
             fixedValue = fixedValue.replace(/(<sprite name="[^"]+")(?![>])/g, '$1>');
        }

        // Cập nhật lại giá trị nếu có thay đổi
        if (fixedValue !== entry.Value) {
            entry.Value = fixedValue;
            fixedCount++;
        }
    });

    // Ghi file Output đè lên file cũ (hoặc file mới)
    fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2), 'utf8');

    console.log('\n=== KẾT QUẢ SỬA LỖI ===');
    console.log(`✅ Đã sửa lỗi cú pháp (decode, dấu ngoặc): ${syntaxFixedCount} dòng`);
    console.log(`✅ Tổng số dòng đã được cập nhật (bao gồm đồng bộ tag): ${fixedCount} dòng`);
    console.log(`💾 Đã lưu file tại: ${outputFile}`);
}

// CLI Check
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log('Cách dùng: node fix-unity-tags.js <input.json> <output.json>');
        process.exit(1);
    }
    fixTags(args[0], args[1]);
}

module.exports = { fixTags };