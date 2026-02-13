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

QUY TẮC BẮT BUỘC:
1. TUYỆT ĐỐI giữ nguyên:
   - Tên nhân vật, địa danh, kỹ năng
   - Tên item, vật phẩm đặc biệt

2. TUYỆT ĐỐI giữ nguyên cú pháp:
   - Biến số: {0}, {1}, $1, %s, %d, etc.
   - Thẻ HTML: <color>, <size>, <b>, <i>, etc.
   - Ký tự đặc biệt: \\n (xuống dòng), \\t (tab)
   - Format Unity: <style=...>, <link=...>
   - Placeholder và pattern

3. Dịch tự nhiên:
   - Phong cách game Nhật Bản
   - Giữ cảm xúc và ngữ điệu
   - Dịch sát nghĩa, không thêm bớt
   - Dịch như người Việt nói chuyện thật
   - Linh hoạt trong cách diễn đạt
   - PHẢI dịch đúng nghĩa gốc

4. Xưng hô:
   - Tránh "mày/tao"
   - Dùng "cậu/mình/bạn/em/anh/chị" phù hợp
   - Giữ tone nhân vật (lịch sự, thân mật, tsundere...)

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
