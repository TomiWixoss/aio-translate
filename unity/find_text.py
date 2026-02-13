import os
import UnityPy

def scan_for_text(folder_path):
    print(f"--- Đang bắt đầu quét thư mục: {folder_path} ---")
    print("Vui lòng đợi, script đang lục lọi từng ngóc ngách...")
    
    count = 0
    found_count = 0

    for root, dirs, files in os.walk(folder_path):
        for file in files:
            if file.endswith(".ab"):
                count += 1
                file_path = os.path.join(root, file)
                
                try:
                    # Load file bundle bằng UnityPy
                    env = UnityPy.load(file_path)
                    
                    for obj in env.objects:
                        # 1. Tìm TextAsset (Đây là nơi chứa 90% text/script/json)
                        if obj.type.name == "TextAsset":
                            data = obj.read()
                            # In ra đường dẫn file .ab và tên tệp văn bản bên trong
                            print("-" * 50)
                            print(f"[VĂN BẢN CHUẨN] TÌM THẤY TRONG: {file}")
                            print(f"  > Tên Asset: {data.name}")
                            print(f"  > Đường dẫn: {file_path}")
                            found_count += 1
                        
                        # 2. Tìm MonoBehaviour (Nếu Naninovel nén script vào đây)
                        elif obj.type.name == "MonoBehaviour":
                            data = obj.read()
                            # Chỉ hiện những cái tên khả nghi liên quan đến hội thoại/ngôn ngữ
                            name_lower = data.name.lower()
                            suspicious_words = ["script", "dialog", "lang", "loc", "scenario", "text"]
                            if any(word in name_lower for word in suspicious_words):
                                print("-" * 50)
                                print(f"[VĂN BẢN NGHI VẤN] TÌM THẤY TRONG: {file}")
                                print(f"  > Tên Asset: {data.name}")
                                print(f"  > Loại: MonoBehaviour")
                                found_count += 1
                except Exception as e:
                    # Bỏ qua nếu file vẫn lỗi header hoặc không đọc được
                    pass

    print("\n" + "="*30)
    print(f"QUÉT XONG!")
    print(f"Tổng số file .ab đã kiểm tra: {count}")
    print(f"Tổng số file có khả năng chứa Text: {found_count}")
    print("="*30)

# THAY ĐƯỜNG DẪN THƯ MỤC CỦA BẠN VÀO ĐÂY
path = r'C:\Users\tomis\Docs\Starsand Island\StarsandIsland_Data\StreamingAssets\Bundles\Windows\local'
scan_for_text(path)