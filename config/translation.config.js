module.exports = {
  // API Configuration
  api: {
    provider: 'nvidia',
    model: 'stepfun-ai/step-3.5-flash',
    temperature: 0.7,
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
   - Dịch như người Việt nói chuyện thật, không máy móc
   - Linh hoạt trong cách diễn đạt, không dịch từng từ
   - PHẢI dịch đúng nghĩa gốc, không bịa đặt hoặc thêm nội dung không có
   - Xưng hô phù hợp: tránh "mày/tao", dùng "cậu/mình/bạn" hoặc phù hợp tính cách nhân vật

4. Đặc biệt cho cốt truyện:
   - Bắt giữ tính cách nhân vật (Pecorine năng động, Kyaru tsundere, Kokkoro lịch sự...)
   - Giữ nguyên hậu tố tên (-chan, -sama, -san...)
   - Dịch đại từ nhân xưng tự nhiên (watashi, boku, ore → em, mình, tôi phù hợp ngữ cảnh)
   - Giữ tone cảm xúc: vui, buồn, căng thẳng, hài hước

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
    keepVersions: 10,           // Giữ 10 version gần nhất
    timestampFormat: 'YYYY-MM-DD_HH-mm-ss',
  }
};
