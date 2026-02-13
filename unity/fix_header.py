import os

def fix_unity_header(folder_path):
    for root, dirs, files in os.walk(folder_path):
        for file in files:
            if file.endswith(".ab"):
                file_path = os.path.join(root, file)
                with open(file_path, 'rb') as f:
                    data = f.read()
                
                # Tìm vị trí của chữ UnityFS
                pos = data.find(b'UnityFS')
                if pos != -1 and pos != 0:
                    print(f"Fixing: {file} (Found UnityFS at {pos})")
                    new_data = data[pos:] # Cắt bỏ phần rác phía trước
                    with open(file_path, 'wb') as f:
                        f.write(new_data)

# Thay đường dẫn thư mục local của bạn vào đây
fix_unity_header(r'C:\Users\tomis\Docs\Starsand Island\StarsandIsland_Data\StreamingAssets\Bundles\Windows\local')
print("Xong rồi!")