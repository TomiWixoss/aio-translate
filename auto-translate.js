const { AIO } = require('aio-llm');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const BATCH_SIZE = 100;
const PARALLEL_BATCHES = 10;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;
const PROGRESS_FILE = 'translation-progress.json';
const INPUT_FILE = 'original-texts.txt';
const OUTPUT_FILE = 'translated-texts.txt';
const TEMP_DIR = 'temp-batches';

// Tạo thư mục temp
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR);
}

const aio = new AIO({
    providers: [{
        provider: "nvidia",
        apiKeys: [{ key: process.env.NVIDIA_API_KEY }],
        models: [{ modelId: "stepfun-ai/step-3.5-flash" }],
    }],
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

async function translateBatch(lines, batchIndex, retryCount = 0) {
    const startIndex = batchIndex * BATCH_SIZE;
    const batch = lines.slice(startIndex, startIndex + BATCH_SIZE);

    try {
        const response = await aio.chatCompletion({
            provider: "nvidia",
            model: "stepfun-ai/step-3.5-flash",
            systemPrompt: `Bạn là chuyên gia dịch The Sims 4 sang tiếng Việt. KHÔNG dịch: "The Sims 4", "Sims", "Sim", "Social Bunny", "EA app", "Gallery". Giữ nguyên thẻ HTML, biến {0.String}, ký tự đặc biệt. Trả về đúng số dòng.`,
            messages: [{ role: "user", content: batch.join('\n') }],
            temperature: 1,
            top_p: 0.9,
            max_tokens: 16384,
        });

        const translatedLines = response.choices[0].message.content.trim().split('\n');
        
        // Ghi vào file tạm
        const tempFile = path.join(TEMP_DIR, `batch-${String(batchIndex).padStart(6, '0')}.txt`);
        fs.writeFileSync(tempFile, translatedLines.join('\n'), 'utf-8');
        
        return { batchIndex, success: true };
    } catch (error) {
        if (retryCount < MAX_RETRIES) {
            console.error(`❌ Batch ${batchIndex + 1} lỗi, retry ${retryCount + 1}/${MAX_RETRIES}...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            return translateBatch(lines, batchIndex, retryCount + 1);
        } else {
            // Giữ nguyên gốc
            const tempFile = path.join(TEMP_DIR, `batch-${String(batchIndex).padStart(6, '0')}.txt`);
            fs.writeFileSync(tempFile, batch.join('\n'), 'utf-8');
            return { batchIndex, success: false };
        }
    }
}

async function main() {
    console.log('🚀 Dịch The Sims 4 (Song song x10)\n');
    
    const content = fs.readFileSync(INPUT_FILE, 'utf-8');
    const lines = content.split('\n');
    const totalBatches = Math.ceil(lines.length / BATCH_SIZE);
    
    console.log(`📊 ${lines.length} dòng, ${totalBatches} batch\n`);
    
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
        
        const result = await translateBatch(lines, batchIndex);
        
        progress.completedBatches.push(result.batchIndex);
        saveProgress(progress);
        
        console.log(`✅ Batch ${result.batchIndex + 1} → temp-batches/batch-${String(result.batchIndex).padStart(6, '0')}.txt`);
        
        if (currentIndex < pendingBatches.length) {
            const promise = processNextBatch();
            runningPromises.add(promise);
            promise.finally(() => runningPromises.delete(promise));
        }
    }
    
    // Khởi động 10 batch đầu
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
    
    // Ghép file
    console.log('\n📝 Ghép file...');
    const finalLines = [];
    for (let i = 0; i < totalBatches; i++) {
        const tempFile = path.join(TEMP_DIR, `batch-${String(i).padStart(6, '0')}.txt`);
        if (fs.existsSync(tempFile)) {
            finalLines.push(fs.readFileSync(tempFile, 'utf-8'));
        }
    }
    
    fs.writeFileSync(OUTPUT_FILE, finalLines.join('\n'), 'utf-8');
    
    console.log('\n🎉 HOÀN THÀNH!');
    console.log(`✅ ${OUTPUT_FILE}`);
    console.log(`\n▶️  node translate-xml.js apply`);
    
    if (fs.existsSync(PROGRESS_FILE)) {
        fs.unlinkSync(PROGRESS_FILE);
    }
}

main().catch(console.error);
