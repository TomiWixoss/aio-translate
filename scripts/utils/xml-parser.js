/**
 * XML Parser utilities
 */

// Parse XML entries
function parseXMLEntries(xmlContent) {
  const entries = [];
  const lines = xmlContent.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.includes('<Text Key=')) {
      let fullLine = line;
      let currentIndex = i;
      
      // Nối các dòng nếu thẻ XML bị ngắt dòng
      while (!fullLine.includes('</Text>') && currentIndex < lines.length - 1) {
        currentIndex++;
        fullLine += ' ' + lines[currentIndex].trim();
      }
      
      const keyMatch = fullLine.match(/Key="([^"]+)"/);
      // Match text content, bao gồm cả escaped HTML tags
      const textMatch = fullLine.match(/>(.+?)<\/Text>/);
      
      if (keyMatch) {
        entries.push({
          key: keyMatch[1],
          text: textMatch ? textMatch[1] : ''
        });
      }
      
      i = currentIndex;
    }
  }
  
  return entries;
}

// Parse XML to Map
function parseXMLToMap(xmlContent) {
  const entries = parseXMLEntries(xmlContent);
  const map = new Map();
  
  entries.forEach(entry => {
    map.set(entry.key, entry.text);
  });
  
  return map;
}

// Escape XML
function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Unescape XML
function unescapeXml(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

// Create XML
function createXML(entries) {
  let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  xml += '<STBLKeyStringList>\n';
  
  for (const entry of entries) {
    xml += `  <Text Key="${entry.key}">${entry.text}</Text>\n`;
  }
  
  xml += '</STBLKeyStringList>';
  
  return xml;
}

module.exports = {
  parseXMLEntries,
  parseXMLToMap,
  escapeXml,
  unescapeXml,
  createXML
};
