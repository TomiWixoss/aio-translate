const { AIO } = require('aio-llm');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const BATCH_SIZE = 50; // 50 thẻ XML mỗi batch
const PARALLEL_BATCHES = 10;
const MAX_RETRIES = 999;
const RETRY_DELAY = 2000;
const PROGRESS_FILE = 'translation-progress.json';
const INPUT_FILE = 'en/Strings_ENG_US/Strings_ENG_US.xml';
const OUTPUT_FILE = 'vi/Strings_ENG_US/Strings_VIE_VI.xml';
const TEMP_DIR = 'temp-batches';

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
        apiKeys: [{ key: process.env.NVIDIA_API_KEY }],
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
        
        if (line.includes('<TextStringDefinition')) {
            let fullLine = line;
            let currentIndex = i;
            
            // Nối các dòng nếu thẻ XML bị ngắt dòng
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

async function translateBatch(entries, batchIndex, retryCount = 0, messages = null) {
    const startIndex = batchIndex * BATCH_SIZE;
    const batch = entries.slice(startIndex, startIndex + BATCH_SIZE);
    const expectedIds = batch.map(e => e.instanceId);
    
    // Tạo XML input
    const xmlInput = batch.map(e => 
        `    <TextStringDefinition InstanceID="${e.instanceId}" TextString="${e.text}" />`
    ).join('\n');
    
    // Conversation history để retry
    if (!messages) {
        messages = [
            { 
                role: "user", 
                content: `Dịch ${batch.length} thẻ XML sau sang tiếng Việt. GIỮ NGUYÊN InstanceID và cấu trúc XML. CHỈ dịch nội dung trong TextString. Trả về ĐÚNG ${batch.length} thẻ với đúng InstanceID.\n\n${xmlInput}` 
            }
        ];
    }

    try {
        const response = await aio.chatCompletion({
            provider: "nvidia",
            model: "stepfun-ai/step-3.5-flash",
            systemPrompt: `Bạn là chuyên gia dịch The Sims 4 sang tiếng Việt. Giữ nguyên tên riêng, thẻ HTML, biến, và ký tự đặc biệt. Chỉ dịch văn bản trong TextString, KHÔNG thay đổi InstanceID hay cấu trúc XML.`,
            messages: messages,
            temperature: 0.3,
            top_p: 0.9,
            max_tokens: 16384,
        });

        const translatedContent = response.choices[0].message.content.trim();
        
        // Parse XML trả về
        const translatedEntries = parseXMLEntries(translatedContent);
        const translatedIds = translatedEntries.map(e => e.instanceId);
        
        // Kiểm tra InstanceID chi tiết
        const wrongCount = expectedIds.length !== translatedIds.length;
        const missingIds = expectedIds.filter(id => !translatedIds.includes(id));
        const extraIds = translatedIds.filter(id => !expectedIds.includes(id));
        const wrongIds = expectedIds.length === translatedIds.length && 
                        expectedIds.some((id, i) => id !== translatedIds[i]);
        
        const hasError = wrongCount || missingIds.length > 0 || extraIds.length > 0 || wrongIds;
        
        if (hasError) {
            console.log(`⚠️  Batch ${batchIndex + 1}: Sai InstanceID`);
            
            if (retryCount < MAX_RETRIES) {
                messages.push({
                    role: "assistant",
                    content: translatedContent
                });
                
                let errorMsg = `LỖI: InstanceID không đúng!\n`;
                errorMsg += `Cần: ${expectedIds.length} thẻ, Nhận: ${translatedIds.length} thẻ\n\n`;
                
                if (missingIds.length > 0) {
                    errorMsg += `❌ THIẾU các ID:\n${missingIds.join('\n')}\n\n`;
                }
                if (extraIds.length > 0) {
                    errorMsg += `❌ THỪA các ID:\n${extraIds.join('\n')}\n\n`;
                }
                if (wrongIds && missingIds.length === 0 && extraIds.length === 0) {
                    errorMsg += `❌ SAI THỨ TỰ!\n\n`;
                }
                
                errorMsg += `✅ Trả về ĐÚNG ${expectedIds.length} thẻ theo THỨ TỰ này:\n`;
                expectedIds.forEach((id, i) => {
                    errorMsg += `${i + 1}. InstanceID="${id}"\n`;
                });
                
                messages.push({
                    role: "user",
                    content: errorMsg
                });
                
                console.log(`🔄 Retry ${retryCount + 1}/${MAX_RETRIES}...`);
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                
                return translateBatch(entries, batchIndex, retryCount + 1, messages);
            } else {
                console.error(`❌ Batch ${batchIndex + 1}: Đã retry ${MAX_RETRIES} lần, vẫn sai InstanceID`);
                return { batchIndex, success: false, entries: batch };
            }
        }
        
        // InstanceID đúng, lưu file
        console.log(`✅ Batch ${batchIndex + 1}: Hoàn thành với ${translatedEntries.length} thẻ`);
        const tempFile = path.join(TEMP_DIR, `batch-${String(batchIndex).padStart(6, '0')}.xml`);
        
        // Lưu dạng XML
        let xmlOutput = '';
        for (const entry of translatedEntries) {
            xmlOutput += `    <TextStringDefinition InstanceID="${entry.instanceId}" TextString="${entry.text}" />\n`;
        }
        
        fs.writeFileSync(tempFile, xmlOutput, 'utf-8');
        return { batchIndex, success: true, entries: translatedEntries };
        
    } catch (error) {
        const isRateLimit = error.message.includes('rate limit') || error.message.includes('429');
        const waitTime = isRateLimit ? 5000 : RETRY_DELAY;
        
        console.error(`❌ Batch ${batchIndex + 1} lỗi: ${error.message}`);
        console.log(`🔄 Retry sau ${waitTime/1000}s...`);
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return translateBatch(entries, batchIndex, retryCount + 1, messages);
    }
}



async function main() {
    console.log('🚀 Dịch The Sims 4 XML (Song song x10)\n');
    
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
    
    let currentIndex = 0;
    const runningPromises = new Set();
    
    async function processNextBatch() {
        if (currentIndex >= pendingBatches.length) return;
        
        const batchIndex = pendingBatches[currentIndex];
        currentIndex++;
        
        console.log(`⚡ Batch ${batchIndex + 1}/${totalBatches}`);
        
        const result = await translateBatch(entries, batchIndex);
        
        progress.completedBatches.push(result.batchIndex);
        saveProgress(progress);
        
        console.log(`✅ Batch ${result.batchIndex + 1} → temp-batches/batch-${String(result.batchIndex).padStart(6, '0')}.xml`);
        
        if (currentIndex < pendingBatches.length) {
            const promise = processNextBatch();
            runningPromises.add(promise);
            promise.finally(() => runningPromises.delete(promise));
        }
    }
    
    // Khởi động batch song song
    for (let i = 0; i < Math.min(PARALLEL_BATCHES, pendingBatches.length); i++) {
        const promise = processNextBatch();
        runningPromises.add(promise);
        promise.finally(() => runningPromises.delete(promise));
    }
    
    // Chờ xong
    while (runningPromises.size > 0 || currentIndex < pendingBatches.length) {
        if (runningPromises.size > 0) {
            await Promise.race(Array.from(runningPromises));
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Ghép file XML
    console.log('\n📝 Tạo file XML...');
    let xmlOutput = '<?xml version="1.0" encoding="utf-8"?>\n<StblData>\n  <TextStringDefinitions>\n';
    
    for (let i = 0; i < totalBatches; i++) {
        const tempFile = path.join(TEMP_DIR, `batch-${String(i).padStart(6, '0')}.xml`);
        if (fs.existsSync(tempFile)) {
            xmlOutput += fs.readFileSync(tempFile, 'utf-8');
        }
    }
    
    xmlOutput += '  </TextStringDefinitions>\n</StblData>';
    
    fs.writeFileSync(OUTPUT_FILE, xmlOutput, 'utf-8');
    
    console.log('\n🎉 HOÀN THÀNH!');
    console.log(`✅ ${OUTPUT_FILE}`);
    console.log(`📊 Đã dịch ${entries.length} thẻ`);
    
    if (fs.existsSync(PROGRESS_FILE)) {
        fs.unlinkSync(PROGRESS_FILE);
    }
}

main().catch(console.error);
