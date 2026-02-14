const { AIO } = require('aio-llm');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const PATHS = require('../config/paths.config');

// Log file cho AI responses
const AI_LOG_FILE = path.join(PATHS.ROOT, 'unity', 'ai-responses.log.txt');

/**
 * Tạo hash key ngắn từ key gốc
 */
function createHashKey(originalKey) {
    return crypto.createHash('md5').update(originalKey).digest('hex').substring(0, 8).toUpperCase();
}

// Kiểm tra mode từ argument
const mode = process.argv[2] || 'normal';
const isUnityMode = mode === 'unity';

// Load config phù hợp
const CONFIG = isUnityMode 
    ? require('../config/unity-translation.config')
    : require('../config/translation.config');

const { parseXMLEntries, escapeXml } = require('./utils/xml-parser');

const BATCH_SIZE = CONFIG.translation.batchSize;
const PARALLEL_BATCHES = CONFIG.translation.parallelBatches;
const MAX_RETRIES = CONFIG.translation.maxRetries;
const RETRY_DELAY = CONFIG.translation.retryDelay;

// Paths phụ thuộc vào mode
const PROGRESS_FILE = isUnityMode 
    ? path.join(PATHS.TEMP.DIR, 'unity-progress.json')
    : PATHS.TEMP.PROGRESS;
const INPUT_FILE = isUnityMode 
    ? PATHS.UNITY.TEMP_NEW
    : PATHS.TEMP.NEW_CONTENT;
const OUTPUT_FILE = isUnityMode 
    ? PATHS.UNITY.TEMP_TRANSLATED
    : PATHS.TEMP.TRANSLATED;
const TEMP_DIR = isUnityMode 
    ? path.join(PATHS.TEMP.DIR, 'temp-batches-unity')
    : PATHS.TEMP.BATCHES;

// Tạo thư mục temp
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}
if (!fs.existsSync(path.dirname(OUTPUT_FILE))) {
    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
}

const aio = new AIO({
    providers: [{
        provider: CONFIG.api.provider,
        apiKeys: [
            { key: process.env.NVIDIA_API_KEY },
            { key: process.env.NVIDIA_API_KEY_2 }
        ],
        models: [{ modelId: CONFIG.api.model }],
    }],
    disableAutoKeyDisable: true,
    maxRetries: CONFIG.translation.maxRetries,
    retryDelay: CONFIG.translation.retryDelay,
});

function loadProgress() {
    if (fs.existsSync(PROGRESS_FILE)) {
        const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
        if (data.completedBatches && Array.isArray(data.completedBatches)) {
            console.log(`📂 Tiến độ: ${data.completedBatches.length}/${data.total} batch\n`);
            return data;
        }
    }
    return { completedBatches: [], total: 0 };
}

function saveProgress(progress) {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf-8');
}

/**
 * Log AI response vào file để debug
 */
function logAIResponse(batchIndex, request, response, isRetry = false, errorInfo = null) {
    const timestamp = new Date().toISOString();
    const separator = '='.repeat(100);
    
    let logContent = `\n${separator}\n`;
    logContent += `BATCH ${batchIndex + 1} - ${timestamp}${isRetry ? ' (RETRY)' : ''}\n`;
    logContent += `${separator}\n\n`;
    
    logContent += `📤 REQUEST (User Prompt):\n`;
    logContent += `${'-'.repeat(100)}\n`;
    logContent += `${request}\n\n`;
    
    logContent += `📥 RESPONSE (AI Output):\n`;
    logContent += `${'-'.repeat(100)}\n`;
    logContent += `${response}\n\n`;
    
    // Thêm thông tin lỗi nếu có
    if (errorInfo) {
        logContent += `❌ ERROR DETECTED:\n`;
        logContent += `${'-'.repeat(100)}\n`;
        if (errorInfo.tagErrors && errorInfo.tagErrors.length > 0) {
            logContent += `HTML Tag Errors (${errorInfo.tagErrors.length}):\n`;
            errorInfo.tagErrors.forEach((err, i) => {
                logContent += `  ${i + 1}. Key: ${err.key}\n`;
                logContent += `     Expected: [${err.expected.join(', ')}]\n`;
                logContent += `     Got:      [${err.got.join(', ')}]\n`;
            });
            logContent += '\n';
        }
        if (errorInfo.japaneseErrors && errorInfo.japaneseErrors.length > 0) {
            logContent += `Japanese Character Errors (${errorInfo.japaneseErrors.length}):\n`;
            errorInfo.japaneseErrors.forEach((err, i) => {
                logContent += `  ${i + 1}. Key: ${err.key}\n`;
                logContent += `     Text: ${err.text.substring(0, 100)}\n`;
            });
            logContent += '\n';
        }
        if (errorInfo.keyErrors) {
            logContent += `Key Errors:\n`;
            logContent += `  Expected: ${errorInfo.expectedCount} keys\n`;
            logContent += `  Got:      ${errorInfo.gotCount} keys\n`;
            if (errorInfo.missingKeys && errorInfo.missingKeys.length > 0) {
                logContent += `  Missing:  ${errorInfo.missingKeys.join(', ')}\n`;
            }
            if (errorInfo.extraKeys && errorInfo.extraKeys.length > 0) {
                logContent += `  Extra:    ${errorInfo.extraKeys.join(', ')}\n`;
            }
            logContent += '\n';
        }
    } else {
        logContent += `✅ SUCCESS - No errors detected\n\n`;
    }
    
    // Append vào file
    fs.appendFileSync(AI_LOG_FILE, logContent, 'utf-8');
}

async function translateBatch(entries, batchIndex, retryCount = 0, messages = null, totalAttempts = 0, completedBatches = null) {
    // Kiểm tra xem batch đã hoàn thành chưa (do duplicate request khác)
    if (completedBatches && completedBatches.has(batchIndex)) {
        return { batchIndex, success: true, alreadyCompleted: true };
    }
    
    const startIndex = batchIndex * BATCH_SIZE;
    const batch = entries.slice(startIndex, startIndex + BATCH_SIZE);
    const expectedKeys = batch.map(e => e.key);
    
    // Tạo hash key map để AI không bị nhầm với key dài
    const hashKeyMap = new Map();
    const reverseHashMap = new Map();
    batch.forEach(e => {
        const hashKey = createHashKey(e.key);
        hashKeyMap.set(e.key, hashKey);
        reverseHashMap.set(hashKey, e.key);
    });
    
    // Tạo XML input
    let xmlInput;
    
    if (isUnityMode) {
        // Unity mode: Dịch trực tiếp từ JP, dùng hash key ngắn
        xmlInput = batch.map(e => {
            const hashKey = hashKeyMap.get(e.key);
            return `  <Text Key="${hashKey}">${escapeXml(e.text)}</Text>`;
        }).join('\n');
    } else {
        // Normal mode: Load key mapping để lấy JP
        let keyMapping = {};
        if (fs.existsSync(PATHS.MAPPING.KEY_MAPPING)) {
            keyMapping = JSON.parse(fs.readFileSync(PATHS.MAPPING.KEY_MAPPING, 'utf-8'));
        }
        
        // Tạo XML input xen kẽ với JP (text thuần)
        xmlInput = batch.map(e => {
            const jpText = keyMapping[e.key]?.japanese || '';
            const jpLine = jpText ? `JP: ${jpText}\n` : '';
            return `${jpLine}  <Text Key="${e.key}">${e.text}</Text>`;
        }).join('\n');
    }
    
    // Nếu retry quá 3 lần, tạo conversation mới (gọi API mới) cho cùng batch
    if (retryCount > MAX_RETRIES) {
        console.log(`🔄 Batch ${batchIndex + 1}: Đã retry ${MAX_RETRIES} lần, gọi API mới (vẫn dịch batch này, lần thử ${totalAttempts + 1})...`);
        retryCount = 0;
        messages = null;
    }
    
    // Conversation history để retry
    if (!messages) {
        let userPrompt;
        
        if (isUnityMode) {
            // Unity mode: Dịch từ JP sang VI
            userPrompt = `Dịch ${batch.length} thẻ XML tiếng Nhật sang tiếng Việt.

${xmlInput}

⚠️ QUY TẮC QUAN TRỌNG NHẤT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. GIỮ NGUYÊN 100% HTML TAGS - KHÔNG XÓA, KHÔNG THÊM, KHÔNG THAY ĐỔI FORMAT!
   • Nếu gốc có 2 cặp thẻ → Dịch phải có ĐÚNG 2 cặp thẻ (KHÔNG được 1 hoặc 3)
   • Nếu gốc có <style="Major"> → Dịch phải có <style="Major"> (KHÔNG đổi thành <style=Major>)
   • Nếu gốc có <style=Major> → Dịch phải có <style=Major> (KHÔNG đổi thành <style="Major">)
   • Nếu gốc có <style=major> → Dịch phải có <style=major> (KHÔNG đổi thành <style=Major>)
   • TUYỆT ĐỐI KHÔNG THÊM thẻ mới không có trong gốc

2. GIỮ NGUYÊN 100% BIẾN: {#ITEM}, {#OBJECT}, {Name@Role}, {0}, v.v.

3. CHỈ DỊCH TEXT, KHÔNG DỊCH/XÓA/THAY ĐỔI/THÊM TAGS VÀ BIẾN

4. KHÔNG ĐỂ LẠI KÝ TỰ TIẾNG NHẬT (Hiragana/Katakana/Kanji)

VÍ DỤ ĐÚNG:
✓ Input:  この<style="Major">{#OBJECT}</style>を受け取ってください。
  Output: Xin hãy nhận <style="Major">{#OBJECT}</style> này.
  → Có ĐÚNG 1 cặp thẻ + 1 biến ✓

✓ Input:  異性の動物を<style="Major">惹きつけやすく</style>、繁殖の<style="Major">優先権</style>を持っている
  Output: Dễ <style="Major">thu hút</style> động vật khác giới và có <style="Major">quyền ưu tiên</style> sinh sản
  → Có ĐÚNG 2 cặp thẻ ✓

VÍ DỤ SAI (TUYỆT ĐỐI TRÁNH):
✗ Input:  この<style="Major">{#OBJECT}</style>を受け取ってください。
  Output: Xin hãy nhận cái này.
  → SAI: Đã XÓA thẻ và biến! ✗

✗ Input:  異性の動物を<style="Major">惹きつけやすく</style>、繁殖の<style="Major">優先権</style>を持っている
  Output: Dễ <style="Major">thu hút động vật khác giới và có quyền ưu tiên</style> sinh sản
  → SAI: Gộp 2 cặp thẻ thành 1 cặp! ✗

✗ Input:  この<style="Major">{#OBJECT}</style>を受け取ってください。
  Output: Xin hãy nhận <style=Major>{#OBJECT}</style> này.
  → SAI: Đổi format từ <style="Major"> thành <style=Major>! ✗

✗ Input:  その課題は<style="Major">豊穣の畑</style>へ続く道を解放することだ。
  Output: Nhiệm vụ đó là <style="Major">tiến sâu hơn</style> vào rừng, mở đường đến <style="Major">cánh đồng</style>.
  → SAI: Gốc có 1 cặp thẻ, dịch có 2 cặp thẻ (THÊM thẻ không có trong gốc)! ✗

CÁCH KIỂM TRA TRƯỚC KHI TRẢ LỜI:
1. ĐẾM số thẻ mở <...> trong input
2. ĐẾM số thẻ đóng </...> trong input
3. ĐẾM số biến {...} trong input
4. KIỂM TRA output có ĐÚNG số lượng đó không
5. KIỂM TRA format thẻ có CHÍNH XÁC không (có dấu ngoặc kép hay không, viết hoa hay thường)

Trả về ĐÚNG ${batch.length} thẻ <Text> với cấu trúc XML nguyên vẹn.`;
        } else {
            // Normal mode: Dịch từ EN sang VI với JP tham khảo
            userPrompt = `Dịch ${batch.length} thẻ XML tiếng Anh sang tiếng Việt.

Mỗi thẻ có dòng "JP: ..." phía trên là bản Nhật gốc để tham khảo ngữ cảnh.

${xmlInput}

GIỮ NGUYÊN cấu trúc XML và Key, CHỈ dịch nội dung trong thẻ <Text>. KHÔNG ghi dòng JP vào output. Trả về ĐÚNG ${batch.length} thẻ <Text>.`;
        }
        
        messages = [{ role: "user", content: userPrompt }];
    }

    try {
        const response = await aio.chatCompletion({
            provider: CONFIG.api.provider,
            model: CONFIG.api.model,
            systemPrompt: CONFIG.systemPrompt,
            messages: messages,
            temperature: CONFIG.api.temperature,
            top_p: CONFIG.api.top_p,
            max_tokens: CONFIG.api.max_tokens,
        });

        const translatedContent = response.choices[0].message.content.trim();
        
        // Parse XML trả về
        const translatedEntries = parseXMLEntries(translatedContent);
        
        // Map hash key về key gốc (chỉ cho Unity mode)
        if (isUnityMode) {
            translatedEntries.forEach(entry => {
                const originalKey = reverseHashMap.get(entry.key);
                if (originalKey) {
                    entry.key = originalKey;
                }
            });
        }
        
        const translatedKeys = translatedEntries.map(e => e.key);
        
        // Kiểm tra Key chi tiết
        const wrongCount = expectedKeys.length !== translatedKeys.length;
        const missingKeys = expectedKeys.filter(key => !translatedKeys.includes(key));
        const extraKeys = translatedKeys.filter(key => !expectedKeys.includes(key));
        const wrongKeys = expectedKeys.length === translatedKeys.length && 
                        expectedKeys.some((key, i) => key !== translatedKeys[i]);
        
        // Kiểm tra HTML tags (chỉ cho Unity mode)
        const tagRegex = /<[^>]+>/g;
        const tagErrors = [];
        const japaneseErrors = [];
        
        if (isUnityMode) {
            for (let i = 0; i < batch.length; i++) {
                const originalEntry = batch[i];
                const translatedEntry = translatedEntries.find(e => e.key === originalEntry.key);
                
                if (translatedEntry) {
                    // Kiểm tra HTML tags (chỉ bắt tags thật, không bắt text trong <>)
                    // Tags thật: <style=...>, <style="...">, <sprite name="...">, <color=...>, </style>, v.v.
                    const realTagRegex = /<\/?[a-zA-Z][^>]*>/g;
                    const originalTags = (originalEntry.text.match(realTagRegex) || [])
                        .map(tag => tag.toLowerCase()) // Normalize case
                        .sort();
                    const translatedTags = (translatedEntry.text.match(realTagRegex) || [])
                        .map(tag => tag.toLowerCase()) // Normalize case
                        .sort();
                    
                    // CHỈ kiểm tra nếu AI XÓA thẻ (ít hơn gốc)
                    // Cho phép AI THÊM thẻ để nhấn mạnh phù hợp tiếng Việt
                    if (translatedTags.length < originalTags.length) {
                        tagErrors.push({
                            key: originalEntry.key,
                            expected: originalTags,
                            got: translatedTags,
                            reason: 'Thiếu thẻ HTML'
                        });
                    }
                    
                    // Kiểm tra còn tiếng Nhật không (Hiragana, Katakana, Kanji)
                    const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(translatedEntry.text);
                    if (hasJapanese) {
                        japaneseErrors.push({
                            key: originalEntry.key,
                            text: translatedEntry.text
                        });
                    }
                }
            }
        }
        
        const hasError = wrongCount || missingKeys.length > 0 || extraKeys.length > 0 || wrongKeys || tagErrors.length > 0 || japaneseErrors.length > 0;
        
        // Log AI response với thông tin lỗi
        const userPrompt = messages[0].content;
        const errorInfo = hasError ? {
            tagErrors,
            japaneseErrors,
            keyErrors: wrongCount || missingKeys.length > 0 || extraKeys.length > 0 || wrongKeys,
            expectedCount: expectedKeys.length,
            gotCount: translatedKeys.length,
            missingKeys,
            extraKeys
        } : null;
        logAIResponse(batchIndex, userPrompt, translatedContent, retryCount > 0, errorInfo);
        
        if (hasError) {
            console.log(`⚠️  Batch ${batchIndex + 1}: ${japaneseErrors.length > 0 ? 'Còn tiếng Nhật' : tagErrors.length > 0 ? 'Sai HTML tags' : 'Sai Key'} (Retry ${retryCount}/${MAX_RETRIES}, Tổng lần ${totalAttempts + 1})`);
            
            messages.push({
                role: "assistant",
                content: translatedContent
            });
            
            let errorMsg = '';
            
            // Lỗi Key
            if (wrongCount || missingKeys.length > 0 || extraKeys.length > 0 || wrongKeys) {
                errorMsg += `LỖI: Key không đúng!\n`;
                errorMsg += `Cần: ${expectedKeys.length} thẻ, Nhận: ${translatedKeys.length} thẻ\n\n`;
                
                if (missingKeys.length > 0) {
                    errorMsg += `❌ THIẾU các Key:\n${missingKeys.join('\n')}\n\n`;
                }
                if (extraKeys.length > 0) {
                    errorMsg += `❌ THỪA các Key:\n${extraKeys.join('\n')}\n\n`;
                }
                if (wrongKeys && missingKeys.length === 0 && extraKeys.length === 0) {
                    errorMsg += `❌ SAI THỨ TỰ!\n\n`;
                }
                
                errorMsg += `✅ Trả về ĐÚNG ${expectedKeys.length} thẻ theo THỨ TỰ này:\n`;
                expectedKeys.forEach((key, i) => {
                    errorMsg += `${i + 1}. Key="${key}"\n`;
                });
            }
            
            // Lỗi tiếng Nhật
            if (japaneseErrors.length > 0) {
                if (errorMsg) errorMsg += '\n\n';
                errorMsg += `LỖI NGHIÊM TRỌNG: Còn ký tự tiếng Nhật!\n\n`;
                errorMsg += `Bạn đã để lại ký tự Hiragana/Katakana/Kanji trong ${japaneseErrors.length} thẻ:\n\n`;
                
                japaneseErrors.forEach((err, i) => {
                    errorMsg += `${i + 1}. Key="${err.key}"\n`;
                    errorMsg += `   Text: ${err.text.substring(0, 100)}${err.text.length > 100 ? '...' : ''}\n\n`;
                });
                
                errorMsg += `QUY TẮC:\n`;
                errorMsg += `- TUYỆT ĐỐI KHÔNG được có ký tự tiếng Nhật trong kết quả\n`;
                errorMsg += `- Tên riêng: Chuyển sang chữ La-tinh (romanization)\n`;
                errorMsg += `- Từ thông dụng: Dịch nghĩa sang tiếng Việt\n`;
                errorMsg += `- 100% kết quả phải là tiếng Việt hoặc chữ La-tinh\n\n`;
                errorMsg += `Vui lòng dịch lại các thẻ bị lỗi, loại bỏ HOÀN TOÀN tiếng Nhật.`;
            }
            
            // Lỗi HTML tags
            if (tagErrors.length > 0) {
                if (errorMsg) errorMsg += '\n\n';
                errorMsg += `LỖI: HTML tags không khớp với bản gốc!\n\n`;
                errorMsg += `Bạn đã thay đổi/xóa/thêm HTML tags trong ${tagErrors.length} thẻ:\n\n`;
                
                tagErrors.forEach((err, i) => {
                    errorMsg += `${i + 1}. Key="${err.key}"\n`;
                    errorMsg += `   Gốc có: [${err.expected.join(', ')}]\n`;
                    errorMsg += `   Bạn trả: [${err.got.join(', ')}]\n\n`;
                });
                
                errorMsg += `QUY TẮC:\n`;
                errorMsg += `- GIỮ NGUYÊN 100% các HTML tags từ bản gốc\n`;
                errorMsg += `- KHÔNG thay đổi format: <style="Major"> khác với <style=Major>\n`;
                errorMsg += `- KHÔNG xóa tags, KHÔNG thêm tags\n`;
                errorMsg += `- CHỈ dịch text bên ngoài và giữa các tags\n\n`;
                errorMsg += `Vui lòng dịch lại các thẻ bị lỗi với HTML tags CHÍNH XÁC như bản gốc.`;
            }
            
            messages.push({
                role: "user",
                content: errorMsg
            });
            
            console.log(`🔄 Retry ${retryCount + 1}/${MAX_RETRIES}...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            
            return translateBatch(entries, batchIndex, retryCount + 1, messages, totalAttempts + 1, completedBatches);
        }
        
        // Key đúng, lưu file
        console.log(`✅ Batch ${batchIndex + 1}: Hoàn thành với ${translatedEntries.length} thẻ`);
        const tempFile = path.join(TEMP_DIR, `batch-${String(batchIndex).padStart(6, '0')}.xml`);
        
        // Lưu dạng XML
        let xmlOutput = '';
        for (const entry of translatedEntries) {
            xmlOutput += `  <Text Key="${entry.key}">${entry.text}</Text>\n`;
        }
        
        fs.writeFileSync(tempFile, xmlOutput, 'utf-8');
        return { batchIndex, success: true, entries: translatedEntries };
        
    } catch (error) {
        const isRateLimit = error.message.includes('rate limit') || error.message.includes('429');
        const waitTime = isRateLimit ? 5000 : RETRY_DELAY;
        
        console.error(`❌ Batch ${batchIndex + 1} lỗi: ${error.message}`);
        console.log(`🔄 Retry sau ${waitTime/1000}s...`);
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return translateBatch(entries, batchIndex, retryCount + 1, messages, totalAttempts + 1, completedBatches);
    }
}



async function main() {
    // Kiểm tra mode từ argument
    const mode = process.argv[2] || 'normal';
    
    // Khởi tạo log file
    if (mode === 'unity') {
        const logHeader = `${'='.repeat(100)}\n`;
        const logTitle = `AI TRANSLATION LOG - ${new Date().toISOString()}\n`;
        const logInfo = `Mode: Unity (Japanese → Vietnamese)\n`;
        fs.writeFileSync(AI_LOG_FILE, logHeader + logTitle + logInfo + logHeader + '\n', 'utf-8');
        console.log(`📝 AI responses sẽ được log vào: ${AI_LOG_FILE}\n`);
    }
    
    let entries;
    let totalBatches;
    
    if (mode === 'unity') {
        console.log('🚀 Dịch Unity JSON (Nhật → Việt)\n');
        
        // Đọc Unity XML (Japanese source)
        const xmlContent = fs.readFileSync(PATHS.UNITY.TEMP_NEW, 'utf-8');
        entries = parseXMLEntries(xmlContent);
        totalBatches = Math.ceil(entries.length / BATCH_SIZE);
        
        // Unity mode không cần JP reference vì source đã là JP
        entries = entries.map(e => ({
            key: e.key,
            text: e.text,
            japanese: '' // Không cần vì đang dịch từ JP
        }));
    } else if (mode === 'fix-empty') {
        console.log('🔧 Sửa thẻ trống trong file dịch\n');
        
        // Load key mapping
        const keyMapping = JSON.parse(fs.readFileSync(PATHS.MAPPING.KEY_MAPPING, 'utf-8'));
        
        // Đọc cả 2 file (EN gốc và VI hiện tại)
        const enContent = fs.readFileSync(PATHS.SOURCE.CURRENT_XML, 'utf-8');
        const viContent = fs.readFileSync(PATHS.TRANSLATION.CURRENT_XML, 'utf-8');
        
        const enEntries = parseXMLEntries(enContent);
        const viEntries = parseXMLEntries(viContent);
        
        // Tạo map
        const enMap = new Map();
        enEntries.forEach(e => enMap.set(e.key, e.text));
        
        const viMap = new Map();
        viEntries.forEach(e => viMap.set(e.key, e.text));
        
        // Tìm thẻ trống trong VI
        const emptyKeys = viEntries.filter(e => !e.text || e.text.trim() === '').map(e => e.key);
        
        console.log(`📊 Tìm thấy ${emptyKeys.length} thẻ trống\n`);
        
        if (emptyKeys.length === 0) {
            console.log('✅ Không có thẻ trống cần sửa!');
            return;
        }
        
        // Tạo entries chỉ với thẻ trống (lấy text từ EN)
        entries = emptyKeys.map(key => ({
            key: key,
            text: enMap.get(key) || '',
            japanese: keyMapping[key]?.japanese || ''
        }));
        
        totalBatches = Math.ceil(entries.length / BATCH_SIZE);
        
        console.log(`📋 Sẽ dịch ${entries.length} thẻ trống, ${totalBatches} batch\n`);
    } else {
        console.log('🚀 Dịch Princess Connect! Re:Dive XML (Song song x10)\n');
        
        const xmlContent = fs.readFileSync(INPUT_FILE, 'utf-8');
        entries = parseXMLEntries(xmlContent);
        totalBatches = Math.ceil(entries.length / BATCH_SIZE);
    }
    
    console.log(`📊 ${entries.length} thẻ XML, ${totalBatches} batch\n`);
    
    let progress = loadProgress();
    if (progress.completedBatches.length === 0) {
        progress = { completedBatches: [], total: totalBatches };
    }
    
    const pendingBatches = [];
    for (let i = 0; i < totalBatches; i++) {
        if (!progress.completedBatches.includes(i)) {
            pendingBatches.push(i);
        }
    }
    
    console.log(`📋 Còn lại: ${pendingBatches.length} batch\n`);
    
    const runningPromises = new Set();
    const completedBatches = new Set(progress.completedBatches);
    
    // Chạy đơn giản: PARALLEL_BATCHES batch song song
    let currentIndex = 0;
    
    async function processNextBatch() {
        if (currentIndex >= pendingBatches.length) return;
        
        const batchIndex = pendingBatches[currentIndex];
        currentIndex++;
        
        // Nếu batch này đã hoàn thành, bỏ qua
        if (completedBatches.has(batchIndex)) {
            if (currentIndex < pendingBatches.length) {
                return processNextBatch();
            }
            return;
        }
        
        console.log(`⚡ Batch ${batchIndex + 1}/${totalBatches}`);
        
        const result = await translateBatch(entries, batchIndex, 0, null, 0, completedBatches);
        
        // Đánh dấu batch đã hoàn thành
        if (!result.alreadyCompleted && !completedBatches.has(result.batchIndex)) {
            completedBatches.add(result.batchIndex);
            progress.completedBatches.push(result.batchIndex);
            saveProgress(progress);
            
            console.log(`✅ Batch ${result.batchIndex + 1} → temp-batches-new-content/batch-${String(result.batchIndex).padStart(6, '0')}.xml`);
        }
        
        // Xử lý batch tiếp theo
        if (currentIndex < pendingBatches.length) {
            return processNextBatch();
        }
    }
    
    // Khởi động PARALLEL_BATCHES workers
    for (let i = 0; i < Math.min(PARALLEL_BATCHES, pendingBatches.length); i++) {
        const promise = processNextBatch();
        runningPromises.add(promise);
        promise.finally(() => runningPromises.delete(promise));
    }
    
    // Chờ xong
    while (runningPromises.size > 0) {
        await Promise.race(Array.from(runningPromises));
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Ghép file XML
    console.log('\n📝 Tạo file XML...');
    
    if (mode === 'fix-empty') {
        // Mode fix-empty: Cập nhật file hiện tại
        const viContent = fs.readFileSync(PATHS.TRANSLATION.CURRENT_XML, 'utf-8');
        let updatedContent = viContent;
        
        // Đọc các thẻ đã dịch từ temp files
        const fixedEntries = new Map();
        for (let i = 0; i < totalBatches; i++) {
            const tempFile = path.join(TEMP_DIR, `batch-${String(i).padStart(6, '0')}.xml`);
            if (fs.existsSync(tempFile)) {
                const batchContent = fs.readFileSync(tempFile, 'utf-8');
                const batchEntries = parseXMLEntries(batchContent);
                batchEntries.forEach(e => fixedEntries.set(e.key, e.text));
            }
        }
        
        // Thay thế thẻ trống
        for (const [key, text] of fixedEntries) {
            const emptyPattern = new RegExp(`<Text Key="${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"></Text>`, 'g');
            const replacement = `<Text Key="${key}">${text}</Text>`;
            updatedContent = updatedContent.replace(emptyPattern, replacement);
        }
        
        // Backup
        fs.copyFileSync(PATHS.TRANSLATION.CURRENT_XML, PATHS.TRANSLATION.CURRENT_XML + '.backup');
        console.log(`💾 Đã backup → ${path.basename(PATHS.TRANSLATION.CURRENT_XML)}.backup`);
        
        // Lưu file mới
        fs.writeFileSync(PATHS.TRANSLATION.CURRENT_XML, updatedContent, 'utf-8');
        
        console.log('\n🎉 HOÀN THÀNH!');
        console.log(`✅ ${PATHS.TRANSLATION.CURRENT_XML}`);
        console.log(`📊 Đã sửa ${fixedEntries.size} thẻ trống`);
    } else {
        // Mode normal: Tạo file mới
        let xmlOutput = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<STBLKeyStringList>\n';
        
        for (let i = 0; i < totalBatches; i++) {
            const tempFile = path.join(TEMP_DIR, `batch-${String(i).padStart(6, '0')}.xml`);
            if (fs.existsSync(tempFile)) {
                xmlOutput += fs.readFileSync(tempFile, 'utf-8');
            }
        }
        
        xmlOutput += '</STBLKeyStringList>';
        
        fs.writeFileSync(OUTPUT_FILE, xmlOutput, 'utf-8');
        
        console.log('\n🎉 HOÀN THÀNH!');
        console.log(`✅ ${OUTPUT_FILE}`);
        console.log(`📊 Đã dịch ${entries.length} thẻ`);
    }
    
    if (fs.existsSync(PROGRESS_FILE)) {
        fs.unlinkSync(PROGRESS_FILE);
    }
}

main().catch(console.error);
