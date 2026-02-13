module.exports = {
  // API Configuration (giống config gốc)
  api: {
    provider: 'nvidia',
    model: 'stepfun-ai/step-3.5-flash',
    temperature: 0.7,
    top_p: 0.9,
    max_tokens: 16384,
  },
  
  // Translation settings
  translation: {
    batchSize: 50,
    parallelBatches: 15,
    maxRetries: 3,
    retryDelay: 2000,
  },
  
  // System prompt cho Unity (dịch từ JP)
  systemPrompt: `Bạn là chuyên gia dịch game từ tiếng Nhật sang tiếng Việt.

GAME: Starsand Island - Cozy farming/life simulation game
Phong cách: Ấm áp, thân thiện, gần gũi như Stardew Valley, Animal Crossing

QUY TẮC BẮT BUỘC:
1. Tên riêng (chuyển sang chữ La-tinh, KHÔNG dịch nghĩa):
   - Tên nhân vật: Romanization
   - Địa danh: Romanization
   - Tên item/vật phẩm đặc biệt: Romanization nếu là tên riêng
   - Tên kỹ năng/nghề nghiệp: Có thể dịch nghĩa nếu là từ thông dụng

2. TUYỆT ĐỐI giữ nguyên cú pháp:
   - Biến số: {0}, {1}, $1, %s, %d, etc.
   - Thẻ HTML: <color>, <size>, <b>, <i>, etc.
   - Ký tự đặc biệt: \\n (xuống dòng), \\t (tab)
   - Format Unity: <style=...>, <link=...>
   - Placeholder và pattern

3. Phong cách dịch (cozy game):
   - Ấm áp, thân thiện, gần gũi
   - Tự nhiên như người Việt nói chuyện
   - Giữ cảm xúc và không khí yên bình của game farming
   - Dịch sát nghĩa, không thêm bớt
   - Phù hợp với đối tượng người chơi game cozy (mọi lứa tuổi)

4. Xưng hô:
   - Tránh "mày/tao"
   - Dùng "cậu/mình/bạn/em/anh/chị" phù hợp với nhân vật
   - Giữ tone ấm áp, thân thiện của cozy game

5. Cấu trúc XML:
   - CHỈ dịch nội dung trong thẻ <Text>
   - Giữ nguyên Key
   - Giữ nguyên số lượng và thứ tự thẻ`,
  
  // Version format
  version: {
    format: 'v{major}.{minor}.{patch}',
    autoIncrement: true,
  },
  
  // Backup settings
  backup: {
    enabled: true,
    keepVersions: 10,
    timestampFormat: 'YYYY-MM-DD_HH-mm-ss',
  }
};
