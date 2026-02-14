import asyncio
import aiohttp
import aiofiles
import json
import os

# --- CẤU HÌNH SIÊU TỐC ĐỘ ---
CONCURRENCY = 500  # Số lượng request đồng thời. Máy mạnh có thể để 1000.
SAVE_DIR = "./all_stories_turbo"
# TẬP TRUNG VÀO CÁC DẢI ID CÓ THẬT (BỎ QUA CÁC ĐOẠN TRỐNG HÀNG TRIỆU SỐ)
RANGES = [
    (11, 1000),         # Main Story đầu
    (1001001, 1150000), # Character Stories (Mỏ vàng 1)
    (2001001, 2150000), # Event Stories (Mỏ vàng 2)
    (5001001, 5100000), # Luna Tower / Guild (Mỏ vàng 3)
    (6001001, 6050000), # Special
    (7001001, 7020000), # Extra
    (9001105, 9101016)  # Cuối
]

os.makedirs(SAVE_DIR, exist_ok=True)

async def worker(queue, session, pbar):
    while True:
        s_id = await queue.get()
        if s_id is None: break
        
        s_id_str = str(s_id).zfill(7)
        url = f"https://redive.estertion.win/story/data/{s_id_str}.json"
        filepath = os.path.join(SAVE_DIR, f"{s_id_str}.json")

        if os.path.exists(filepath):
            queue.task_done()
            continue

        try:
            async with session.get(url, timeout=5) as response:
                if response.status == 200:
                    raw = await response.text()
                    data = json.loads(raw)
                    pretty = json.dumps(data, ensure_ascii=False, indent=4)
                    async with aiofiles.open(filepath, mode='w', encoding='utf-8') as f:
                        await f.write(pretty)
                    print(f"[FOUND] {s_id_str}")
        except:
            pass
        
        queue.task_done()

async def main():
    # Giới hạn kết nối để không bị treo OS
    conn = aiohttp.TCPConnector(limit=CONCURRENCY, ttl_dns_cache=300)
    async with aiohttp.ClientSession(connector=conn) as session:
        queue = asyncio.Queue(maxsize=2000)
        
        # Tạo các công nhân (workers)
        workers = [asyncio.create_task(worker(queue, session, None)) for _ in range(CONCURRENCY)]

        print(f"🚀 Đang quét thần tốc với {CONCURRENCY} luồng...")
        
        for start, end in RANGES:
            print(f"--- Đang quét dải: {start} -> {end} ---")
            for s_id in range(start, end + 1):
                await queue.put(s_id)

        # Đóng hàng đợi
        await queue.join()
        for _ in range(CONCURRENCY): await queue.put(None)
        await asyncio.gather(*workers)

if __name__ == "__main__":
    asyncio.run(main())