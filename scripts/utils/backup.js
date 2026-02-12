/**
 * Backup utilities
 */

const fs = require('fs');
const path = require('path');

// Tạo timestamp
function getTimestamp() {
  const now = new Date();
  return now.toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .split('Z')[0];
}

// Backup file
function backupFile(filePath, backupDir = null) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  const timestamp = getTimestamp();
  const ext = path.extname(filePath);
  const baseName = path.basename(filePath, ext);
  const dirName = backupDir || path.dirname(filePath);
  
  // Tạo thư mục backup nếu chưa có
  if (!fs.existsSync(dirName)) {
    fs.mkdirSync(dirName, { recursive: true });
  }
  
  const backupPath = path.join(dirName, `${baseName}.backup_${timestamp}${ext}`);
  
  fs.copyFileSync(filePath, backupPath);
  console.log(`💾 Backup: ${path.basename(backupPath)}`);
  
  return backupPath;
}

// Tìm file backup mới nhất
function findLatestBackup(baseName, searchDir = null) {
  const dir = searchDir || path.dirname(baseName);
  const ext = path.extname(baseName);
  const name = path.basename(baseName, ext);
  
  if (!fs.existsSync(dir)) {
    return null;
  }
  
  const files = fs.readdirSync(dir);
  const backupFiles = files
    .filter(f => f.startsWith(`${name}.backup_`) && f.endsWith(ext))
    .sort()
    .reverse();
  
  if (backupFiles.length > 0) {
    return path.join(dir, backupFiles[0]);
  }
  
  return null;
}

// Xóa backup cũ (giữ lại N file mới nhất)
function cleanOldBackups(baseName, searchDir, keepCount = 10) {
  const dir = searchDir || path.dirname(baseName);
  const ext = path.extname(baseName);
  const name = path.basename(baseName, ext);
  
  if (!fs.existsSync(dir)) {
    return;
  }
  
  const files = fs.readdirSync(dir);
  const backupFiles = files
    .filter(f => f.startsWith(`${name}.backup_`) && f.endsWith(ext))
    .sort()
    .reverse();
  
  // Xóa các file cũ
  const toDelete = backupFiles.slice(keepCount);
  
  for (const file of toDelete) {
    const filePath = path.join(dir, file);
    fs.unlinkSync(filePath);
    console.log(`🗑️  Xóa backup cũ: ${file}`);
  }
  
  if (toDelete.length > 0) {
    console.log(`✅ Đã xóa ${toDelete.length} backup cũ`);
  }
}

module.exports = {
  getTimestamp,
  backupFile,
  findLatestBackup,
  cleanOldBackups
};
