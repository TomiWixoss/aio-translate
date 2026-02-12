module.exports = {
  // API Configuration
  api: {
    provider: 'nvidia',
    model: 'stepfun-ai/step-3.5-flash',
    temperature: 0.3,
    top_p: 0.9,
    max_tokens: 16384,
  },
  
  // Translation settings
  translation: {
    batchSize: 50,              // Số entries mỗi batch
    parallelBatches: 10,        // Số batch chạy song song
    maxRetries: 3,              // Số lần retry trước khi gọi API mới
    retryDelay: 2000,           // Delay giữa các retry (ms)
  },
  
  // System prompt
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
  
  // Version format
  version: {
    format: 'v{major}.{minor}.{patch}',
    autoIncrement: true,
  },
  
  // Backup settings
  backup: {
    enabled: true,
    keepVersions: 10,           // Giữ 10 version gần nhất
    timestampFormat: 'YYYY-MM-DD_HH-mm-ss',
  }
};
