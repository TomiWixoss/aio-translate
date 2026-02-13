const path = require('path');

const ROOT = path.resolve(__dirname, '..');

module.exports = {
  // Thư mục gốc
  ROOT,
  
  // Data directories
  DATA: path.join(ROOT, 'data'),
  
  // Source (EN)
  SOURCE: {
    ROOT: path.join(ROOT, 'data', 'source'),
    CURRENT: path.join(ROOT, 'data', 'source', 'current'),
    CURRENT_TEXT: path.join(ROOT, 'data', 'source', 'current', 'Text'),
    CURRENT_XML: path.join(ROOT, 'data', 'source', 'current', 'merged.xml'),
    VERSIONS: path.join(ROOT, 'data', 'source', 'versions'),
  },
  
  // Translation (VI)
  TRANSLATION: {
    ROOT: path.join(ROOT, 'data', 'translation'),
    CURRENT: path.join(ROOT, 'data', 'translation', 'current'),
    CURRENT_TEXT: path.join(ROOT, 'data', 'translation', 'current', 'Text_VI'),
    CURRENT_XML: path.join(ROOT, 'data', 'translation', 'current', 'merged_vi.xml'),
    VERSIONS: path.join(ROOT, 'data', 'translation', 'versions'),
  },
  
  // Temp
  TEMP: {
    DIR: path.join(ROOT, 'data', 'temp'),
    NEW_CONTENT: path.join(ROOT, 'data', 'temp', 'new_content.xml'),
    TRANSLATED: path.join(ROOT, 'data', 'temp', 'translated.xml'),
    BATCHES: path.join(ROOT, 'data', 'temp', 'temp-batches-new-content'),
    PROGRESS: path.join(ROOT, 'data', 'temp', 'progress.json'),
  },
  
  // Unity JSON workflow
  UNITY: {
    // Input/Output JSON files
    INPUT_JSON: path.join(ROOT, 'unity', 'input.json'),
    OUTPUT_JSON: path.join(ROOT, 'unity', 'output.json'),
    
    // Temp XML files (EN = Japanese source)
    TEMP_EN_XML: path.join(ROOT, 'data', 'temp', 'unity-ja.xml'),      // Japanese source
    TEMP_NEW: path.join(ROOT, 'data', 'temp', 'unity-new.xml'),        // New entries to translate
    TEMP_TRANSLATED: path.join(ROOT, 'data', 'temp', 'unity-translated.xml'),  // Translated entries
    TEMP_MERGED: path.join(ROOT, 'data', 'temp', 'unity-merged.xml'),  // Final merged VI
  },
  
  // Mapping
  MAPPING: {
    KEY_MAPPING: path.join(ROOT, 'data', 'key_mapping.json'),
    TRANSLATION_MAP: path.join(ROOT, 'data', 'translation_map.json'),
  },
  
  // Legacy (để migrate)
  LEGACY: {
    TEXT: path.join(ROOT, 'Text'),
    MERGED_EN: path.join(ROOT, 'merged_translations.xml'),
    MERGED_VI: path.join(ROOT, 'merged_translations_vi.xml'),
    BACKUP: path.join(ROOT, 'backup'),
    OUTPUT: path.join(ROOT, 'output'),
  }
};
