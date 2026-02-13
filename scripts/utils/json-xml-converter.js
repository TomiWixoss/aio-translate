const { parseXMLToMap, unescapeXml } = require('./xml-parser');

/**
 * Utils chuyển đổi giữa JSON Unity và XML dự án
 */

// Escape XML special characters
function escapeXml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Chuyển JSON Unity → XML dự án
 */
function jsonToXml(jsonData) {
  let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  xml += '<STBLKeyStringList>\n';
  
  if (!jsonData.Translations || !Array.isArray(jsonData.Translations)) {
    throw new Error('JSON không đúng format. Cần có field "Translations" là array');
  }
  
  let count = 0;
  for (const entry of jsonData.Translations) {
    if (!entry.Key || entry.Value === undefined || entry.Value === null) {
      console.warn(`⚠️  Bỏ qua entry không hợp lệ:`, entry);
      continue;
    }
    
    const key = entry.Key;
    const value = escapeXml(entry.Value);
    
    xml += `  <Text Key="${key}">${value}</Text>\n`;
    count++;
  }
  
  xml += '</STBLKeyStringList>';
  
  return { xml, count };
}

/**
 * Chuyển XML dự án → JSON Unity
 */
function xmlToJson(xmlContent, title = 'vi') {
  const entries = parseXMLToMap(xmlContent);
  
  const translations = [];
  entries.forEach((value, key) => {
    translations.push({
      Key: key,
      Version: 1,
      Value: unescapeXml(value)
    });
  });
  
  return {
    Title: title,
    Translations: translations
  };
}

module.exports = {
  jsonToXml,
  xmlToJson,
  escapeXml
};
