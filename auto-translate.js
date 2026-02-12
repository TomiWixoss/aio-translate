const { AIO } = require('aio-llm');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const BATCH_SIZE = 50;
const PARALLEL_BATCHES = 10;
const MAX_RETRIES = 3; // Sau 3 lần retry sẽ gọi API mới
const RETRY_DELAY = 2000;
const PROGRESS_FILE = 'translation-progress-pricone.json';
const INPUT_FILE = 'merged_translations.xml';
const OUTPUT_FILE = 'merged_translations_vi.xml';
const TEMP_DIR = 'temp-batches-pricone';

// Tạo thư mục temp
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR);
}
if (!fs.existsSync(path.dirname(OUTPUT_FILE))) {
    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
}

const aio = new AIO({
    providers: [{
        provider: "nvidia",
        apiKeys: [
            { key: process.env.NVIDIA_API_KEY },
            { key: process.env.NVIDIA_API_KEY_2 }
        ],
        models: [{ modelId: "stepfun-ai/step-3.5-flash" }],
    }],
    disableAutoKeyDisable: true, // Không tự động disable key khi gặp lỗi
    maxRetries: 3,
    retryDelay: 1000,
});

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
                    text: textMatch ? textMatch[1] : ''
                });
            }
            
            i = currentIndex;
        }
    }
    
    return entries;
}

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

async function translateBatch(entries, batchIndex, retryCount = 0, messages = null, totalAttempts = 0, completedBatches = null) {
    // Kiểm tra xem batch đã hoàn thành chưa (do duplicate request khác)
    if (completedBatches && completedBatches.has(batchIndex)) {
        return { batchIndex, success: true, alreadyCompleted: true };
    }
    
    const startIndex = batchIndex * BATCH_SIZE;
    const batch = entries.slice(startIndex, startIndex + BATCH_SIZE);
    const expectedKeys = batch.map(e => e.key);
    
    // Tạo XML input
    const xmlInput = batch.map(e => 
        `  <Text Key="${e.key}">${e.text}</Text>`
    ).join('\n');
    
    // Nếu retry quá 3 lần, tạo conversation mới (gọi API mới) cho cùng batch
    if (retryCount > MAX_RETRIES) {
        console.log(`🔄 Batch ${batchIndex + 1}: Đã retry ${MAX_RETRIES} lần, gọi API mới (vẫn dịch batch này, lần thử ${totalAttempts + 1})...`);
        retryCount = 0;
        messages = null;
    }
    
    // Conversation history để retry
    if (!messages) {
        messages = [
            { 
                role: "user", 
                content: `Dịch ${batch.length} thẻ XML sau sang tiếng Việt. GIỮ NGUYÊN Key và cấu trúc XML. CHỈ dịch nội dung bên trong thẻ <Text>. Trả về ĐÚNG ${batch.length} thẻ với đúng Key.\n\n${xmlInput}` 
            }
        ];
    }

    try {
        const response = await aio.chatCompletion({
            provider: "nvidia",
            model: "stepfun-ai/step-3.5-flash",
            systemPrompt: `Bạn là chuyên gia dịch game Princess Connect! Re:Dive sang tiếng Việt.

QUY TẮC BẮT BUỘC:
1. TUYỆT ĐỐI giữ nguyên:
   - Tên nhân vật, guild, địa danh, boss
   - Tên kỹ năng và phép thuật

2. TUYỆT ĐỐI giữ nguyên cú pháp:
   - Biến số và placeholder
   - Thẻ màu và format
   - Ký tự xuống dòng
   - Ký tự đặc biệt và biểu tượng
   - Pattern regex

3. Dịch tự nhiên:
   - Phong cách game anime Nhật
   - Giữ cảm xúc và ngữ điệu nhân vật
   - Dịch sát nghĩa, không thêm bớt

4. Cấu trúc XML:
   - CHỈ dịch nội dung trong thẻ <Text>
   - Giữ nguyên Key
   - Giữ nguyên số lượng và thứ tự thẻ`,
            messages: messages,
            temperature: 0.3,
            top_p: 0.9,
            max_tokens: 16384,
        });

        const translatedContent = response.choices[0].message.content.trim();
        
        // Parse XML trả về
        const translatedEntries = parseXMLEntries(translatedContent);
        const translatedKeys = translatedEntries.map(e => e.key);
        
        // Kiểm tra Key chi tiết
        const wrongCount = expectedKeys.length !== translatedKeys.length;
        const missingKeys = expectedKeys.filter(key => !translatedKeys.includes(key));
        const extraKeys = translatedKeys.filter(key => !expectedKeys.includes(key));
        const wrongKeys = expectedKeys.length === translatedKeys.length && 
                        expectedKeys.some((key, i) => key !== translatedKeys[i]);
        
        const hasError = wrongCount || missingKeys.length > 0 || extraKeys.length > 0 || wrongKeys;
        
        if (hasError) {
            console.log(`⚠️  Batch ${batchIndex + 1}: Sai Key (Retry ${retryCount}/${MAX_RETRIES}, Tổng lần ${totalAttempts + 1})`);
            
            messages.push({
                role: "assistant",
                content: translatedContent
            });
            
            let errorMsg = `LỖI: Key không đúng!\n`;
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
    console.log('🚀 Dịch Princess Connect! Re:Dive XML (Song song x10)\n');
    
    const xmlContent = fs.readFileSync(INPUT_FILE, 'utf-8');
    const entries = parseXMLEntries(xmlContent);
    const totalBatches = Math.ceil(entries.length / BATCH_SIZE);
    
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
    
    // Chế độ thông minh: Tự động chuyển sang phụ giúp khi còn < 10 batch
    {
        // Chế độ bình thường: Chạy PARALLEL_BATCHES batch khác nhau
        let currentIndex = 0;
        const activeBatches = new Map(); // Track các batch đang xử lý
        
        async function processNextBatch() {
            if (currentIndex >= pendingBatches.length) return;
            
            const batchIndex = pendingBatches[currentIndex];
            currentIndex++;
            
            // Nếu batch này đã hoàn thành (do duplicate request), bỏ qua
            if (completedBatches.has(batchIndex)) {
                if (currentIndex < pendingBatches.length) {
                    const promise = processNextBatch();
                    runningPromises.add(promise);
                    promise.finally(() => runningPromises.delete(promise));
                }
                return;
            }
            
            console.log(`⚡ Batch ${batchIndex + 1}/${totalBatches}`);
            
            // Đánh dấu batch đang xử lý
            if (!activeBatches.has(batchIndex)) {
                activeBatches.set(batchIndex, 1);
            } else {
                activeBatches.set(batchIndex, activeBatches.get(batchIndex) + 1);
            }
            
            const result = await translateBatch(entries, batchIndex, 0, null, 0, completedBatches);
            
            // Xóa khỏi danh sách đang xử lý
            const count = activeBatches.get(batchIndex) - 1;
            if (count <= 0) {
                activeBatches.delete(batchIndex);
            } else {
                activeBatches.set(batchIndex, count);
            }
            
            // Đánh dấu batch đã hoàn thành
            if (!result.alreadyCompleted && !completedBatches.has(result.batchIndex)) {
                completedBatches.add(result.batchIndex);
                progress.completedBatches.push(result.batchIndex);
                saveProgress(progress);
                
                console.log(`✅ Batch ${result.batchIndex + 1} → temp-batches/batch-${String(result.batchIndex).padStart(6, '0')}.xml`);
            }
            
            // Kiểm tra còn bao nhiêu batch chưa xử lý
            const remainingBatches = pendingBatches.length - completedBatches.size;
            
            if (currentIndex < pendingBatches.length) {
                // Còn batch mới chưa bắt đầu
                const promise = processNextBatch();
                runningPromises.add(promise);
                promise.finally(() => runningPromises.delete(promise));
            } else if (remainingBatches > 0 && remainingBatches < PARALLEL_BATCHES) {
                // Hết batch mới, nhưng còn < 10 batch đang xử lý → Phụ giúp
                const activeBatchList = Array.from(activeBatches.keys()).filter(b => !completedBatches.has(b));
                if (activeBatchList.length > 0) {
                    // Chọn batch đang xử lý ít worker nhất
                    const targetBatch = activeBatchList.reduce((min, b) => 
                        activeBatches.get(b) < activeBatches.get(min) ? b : min
                    );
                    
                    console.log(`🔥 Worker rảnh → Phụ Batch ${targetBatch + 1} (${activeBatches.get(targetBatch)} workers)`);
                    
                    const promise = (async () => {
                        if (!activeBatches.has(targetBatch)) {
                            activeBatches.set(targetBatch, 1);
                        } else {
                            activeBatches.set(targetBatch, activeBatches.get(targetBatch) + 1);
                        }
                        
                        const result = await translateBatch(entries, targetBatch, 0, null, 0, completedBatches);
                        
                        const count = activeBatches.get(targetBatch) - 1;
                        if (count <= 0) {
                            activeBatches.delete(targetBatch);
                        } else {
                            activeBatches.set(targetBatch, count);
                        }
                        
                        if (!result.alreadyCompleted && !completedBatches.has(result.batchIndex)) {
                            completedBatches.add(result.batchIndex);
                            progress.completedBatches.push(result.batchIndex);
                            saveProgress(progress);
                            
                            console.log(`✅ Batch ${result.batchIndex + 1} → temp-batches/batch-${String(result.batchIndex).padStart(6, '0')}.xml`);
                        }
                        
                        // Tiếp tục phụ giúp nếu còn batch
                        const remaining = pendingBatches.length - completedBatches.size;
                        if (remaining > 0 && remaining < PARALLEL_BATCHES) {
                            const stillActive = Array.from(activeBatches.keys()).filter(b => !completedBatches.has(b));
                            if (stillActive.length > 0) {
                                const nextTarget = stillActive.reduce((min, b) => 
                                    activeBatches.get(b) < activeBatches.get(min) ? b : min
                                );
                                const p = processNextBatch();
                                runningPromises.add(p);
                                p.finally(() => runningPromises.delete(p));
                            }
                        }
                    })();
                    
                    runningPromises.add(promise);
                    promise.finally(() => runningPromises.delete(promise));
                }
            }
        }
        
        for (let i = 0; i < Math.min(PARALLEL_BATCHES, pendingBatches.length); i++) {
            const promise = processNextBatch();
            runningPromises.add(promise);
            promise.finally(() => runningPromises.delete(promise));
        }
    }
    
    // Chờ xong
    while (runningPromises.size > 0) {
        await Promise.race(Array.from(runningPromises));
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Ghép file XML
    console.log('\n📝 Tạo file XML...');
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
    
    if (fs.existsSync(PROGRESS_FILE)) {
        fs.unlinkSync(PROGRESS_FILE);
    }
}

main().catch(console.error);
