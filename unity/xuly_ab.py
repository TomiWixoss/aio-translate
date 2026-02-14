import os

# --- TỰ ĐỘNG LẤY ĐƯỜNG DẪN THƯ MỤC CHỨA SCRIPT ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 1. File gốc trong thư mục game (Giữ nguyên vì đây là đường dẫn thật)
FILE_GOC = r'C:\Users\tomis\Docs\Starsand Island\StarsandIsland_Data\StreamingAssets\Bundles\Windows\local\2304\589831.ab'

# 2. Các file tạm và file dịch (Tự động lấy cùng chỗ với file script này)
FILE_SAU_KHI_DICH = os.path.join(BASE_DIR, "589831_translated.ab")
HEADER_TEMP = os.path.join(BASE_DIR, "header_backup.bin")
CLEAN_AB = os.path.join(BASE_DIR, "589831_clean_to_translate.ab")

def prepare_for_translation():
    if not os.path.exists(FILE_GOC):
        print(f"LỖI: Không tìm thấy file gốc tại: {FILE_GOC}")
        return

    with open(FILE_GOC, 'rb') as f:
        data = f.read()
    
    pos = data.find(b'UnityFS')
    if pos == -1:
        print("LỖI: File này không phải Unity Bundle chuẩn!")
        return
    
    with open(HEADER_TEMP, 'wb') as f_h:
        f_h.write(data[:pos])
    
    with open(CLEAN_AB, 'wb') as f_c:
        f_c.write(data[pos:])
    
    print(f"--- THÀNH CÔNG GIAI ĐOẠN 1 ---")
    print(f"Đã tạo file sạch tại: {CLEAN_AB}")

def pack_back_to_game():
    # Kiểm tra xem các file có tồn tại không
    if not os.path.exists(HEADER_TEMP):
        print(f"LỖI: Thiếu file {HEADER_TEMP}")
        return
    if not os.path.exists(FILE_SAU_KHI_DICH):
        print(f"LỖI: Thiếu file đã dịch tại {FILE_SAU_KHI_DICH}")
        print("Mẹo: Hãy đảm bảo bạn đã lưu file từ UABEA với tên chính xác là 589831_translated.ab")
        return

    with open(HEADER_TEMP, 'rb') as f_h:
        header = f_h.read()
    
    with open(FILE_SAU_KHI_DICH, 'rb') as f_d:
        translated_data = f_d.read()
    
    # Ghi đè vào game
    with open(FILE_GOC, 'wb') as f_f:
        f_f.write(header + translated_data)
    
    print(f"--- THÀNH CÔNG GIAI ĐOẠN 2 ---")
    print("Đã đóng gói và ghi đè vào game thành công!")

print("1. Chạy chuẩn bị (Xóa rác để dịch)")
print("2. Chạy đóng gói (Dán rác lại để chơi)")
choice = input("Chọn 1 hoặc 2: ")

if choice == "1":
    prepare_for_translation()
elif choice == "2":
    pack_back_to_game()