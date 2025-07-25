import type { ProcessRequest } from "@shared/schema";

interface ProcessResult {
  outputCode: string;
  variablesRenamed: number;
  stringsEncoded: number;
}

export async function processLuaCode(request: ProcessRequest): Promise<ProcessResult> {
  if (request.mode === 'obfuscate') {
    return obfuscateCode(request.inputCode, request.settings);
  } else {
    return deobfuscateCode(request.inputCode);
  }
}

function obfuscateCode(code: string, settings?: ProcessRequest['settings']): ProcessResult {
  let obfuscated = code;
  let variablesRenamed = 0;
  let stringsEncoded = 0;

  const config = {
    variableRenaming: settings?.variableRenaming ?? true,
    stringEncoding: settings?.stringEncoding ?? true,
    controlFlowObfuscation: settings?.controlFlowObfuscation ?? false,
    obfuscationLevel: settings?.obfuscationLevel ?? 'medium',
  };

  // Variable renaming
  if (config.variableRenaming) {
    const variablePattern = /\b(local\s+)([a-zA-Z_][a-zA-Z0-9_]*)/g;
    const variables = new Map<string, string>();
    
    // Extract variable declarations
    let match;
    while ((match = variablePattern.exec(code)) !== null) {
      const originalName = match[2];
      if (!variables.has(originalName) && !isReservedWord(originalName)) {
        const obfuscatedName = generateObfuscatedName(variables.size);
        variables.set(originalName, obfuscatedName);
        variablesRenamed++;
      }
    }

    // Replace variables throughout the code
    variables.forEach((obfuscatedName, originalName) => {
      const regex = new RegExp(`\\b${escapeRegExp(originalName)}\\b`, 'g');
      obfuscated = obfuscated.replace(regex, obfuscatedName);
    });

    // Also obfuscate function names
    const functionPattern = /\bfunction\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
    const functions = new Map<string, string>();
    
    while ((match = functionPattern.exec(code)) !== null) {
      const originalName = match[1];
      if (!functions.has(originalName) && !isReservedWord(originalName)) {
        const obfuscatedName = generateObfuscatedName(variables.size + functions.size);
        functions.set(originalName, obfuscatedName);
        variablesRenamed++;
      }
    }

    functions.forEach((obfuscatedName, originalName) => {
      const regex = new RegExp(`\\b${escapeRegExp(originalName)}\\b`, 'g');
      obfuscated = obfuscated.replace(regex, obfuscatedName);
    });
  }

  // String encoding
  if (config.stringEncoding) {
    // Encode single-quoted strings
    obfuscated = obfuscated.replace(/'([^'\\]*(\\.[^'\\]*)*)'/g, (match, content) => {
      if (content && content.length > 0) {
        stringsEncoded++;
        return encodeString(content, config.obfuscationLevel);
      }
      return match;
    });

    // Encode double-quoted strings
    obfuscated = obfuscated.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match, content) => {
      if (content && content.length > 0) {
        stringsEncoded++;
        return encodeString(content, config.obfuscationLevel);
      }
      return match;
    });
  }

  // Basic control flow obfuscation
  if (config.controlFlowObfuscation) {
    // Add dummy conditions and loops
    const lines = obfuscated.split('\n');
    const obfuscatedLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      obfuscatedLines.push(line);

      // Randomly insert dummy code
      if (Math.random() > 0.8 && line.trim() && !line.trim().startsWith('--')) {
        const dummyCode = generateDummyCode();
        obfuscatedLines.push(dummyCode);
      }
    }

    obfuscated = obfuscatedLines.join('\n');
  }

  return {
    outputCode: obfuscated,
    variablesRenamed,
    stringsEncoded,
  };
}

function deobfuscateCode(code: string): ProcessResult {
  let deobfuscated = code;
  let variablesRenamed = 0;
  let stringsEncoded = 0;

  // Decode hex-encoded strings
  deobfuscated = deobfuscated.replace(/string\.char\(([^)]+)\)/g, (match, args) => {
    try {
      const numbers = args.split(',').map((n: string) => parseInt(n.trim()));
      const decoded = String.fromCharCode(...numbers);
      stringsEncoded++;
      return `"${decoded}"`;
    } catch (e) {
      return match;
    }
  });

  // Decode concatenated character codes
  deobfuscated = deobfuscated.replace(/string\.char\((\d+)\)\s*\.\.\s*string\.char\((\d+)\)/g, (match, code1, code2) => {
    try {
      const char1 = String.fromCharCode(parseInt(code1));
      const char2 = String.fromCharCode(parseInt(code2));
      stringsEncoded++;
      return `"${char1}${char2}"`;
    } catch (e) {
      return match;
    }
  });

  // Try to restore meaningful variable names
  const obfuscatedVariables = code.match(/_0x[a-fA-F0-9]+/g) || [];
  const uniqueVariables = [...new Set(obfuscatedVariables)];
  
  const commonNames = [
    'player', 'character', 'humanoid', 'input', 'data', 'value', 'result',
    'position', 'rotation', 'velocity', 'force', 'part', 'model', 'script',
    'service', 'event', 'connection', 'gui', 'frame', 'button', 'text',
    'health', 'walkSpeed', 'jumpPower', 'camera', 'mouse', 'keyboard'
  ];

  uniqueVariables.forEach((obfuscatedVar, index) => {
    if (index < commonNames.length) {
      const meaningfulName = commonNames[index];
      const regex = new RegExp(`\\b${escapeRegExp(obfuscatedVar)}\\b`, 'g');
      deobfuscated = deobfuscated.replace(regex, meaningfulName);
      variablesRenamed++;
    }
  });

  // Remove dummy code patterns
  deobfuscated = deobfuscated.replace(/if true then\s*end/g, '');
  deobfuscated = deobfuscated.replace(/while false do\s*end/g, '');
  deobfuscated = deobfuscated.replace(/for i = 1, 0 do\s*end/g, '');

  // Clean up extra whitespace
  deobfuscated = deobfuscated.replace(/\n\s*\n\s*\n/g, '\n\n');

  return {
    outputCode: deobfuscated,
    variablesRenamed,
    stringsEncoded,
  };
}

function generateObfuscatedName(index: number): string {
  const prefixes = ['_0x', '_', '__', '___'];
  const prefix = prefixes[index % prefixes.length];
  const suffix = (index + 1).toString(16).padStart(4, '0');
  return prefix + suffix;
}

function encodeString(content: string, level: 'light' | 'medium' | 'heavy'): string {
  switch (level) {
    case 'light':
      // Simple character code encoding
      const codes = Array.from(content).map(char => char.charCodeAt(0));
      return `string.char(${codes.join(', ')})`;
    
    case 'medium':
      // Split into chunks and encode
      const chunks = content.match(/.{1,2}/g) || [];
      const encodedChunks = chunks.map(chunk => {
        const codes = Array.from(chunk).map(char => char.charCodeAt(0));
        return `string.char(${codes.join(', ')})`;
      });
      return encodedChunks.join(' .. ');
    
    case 'heavy':
      // Add mathematical operations to character codes
      const heavyCodes = Array.from(content).map(char => {
        const code = char.charCodeAt(0);
        const offset = Math.floor(Math.random() * 10) + 1;
        return `(${code + offset} - ${offset})`;
      });
      return `string.char(${heavyCodes.join(', ')})`;
    
    default:
      return `"${content}"`;
  }
}

function generateDummyCode(): string {
  const dummyPatterns = [
    'if true then end',
    'while false do end',
    'for i = 1, 0 do end',
    '-- dummy comment',
    'local _ = nil',
  ];
  return dummyPatterns[Math.floor(Math.random() * dummyPatterns.length)];
}

function isReservedWord(word: string): boolean {
  const reserved = [
    'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for',
    'function', 'if', 'in', 'local', 'nil', 'not', 'or', 'repeat',
    'return', 'then', 'true', 'until', 'while',
    // Roblox-specific globals
    'game', 'workspace', 'script', 'print', 'wait', 'spawn', 'delay',
    'Players', 'LocalPlayer', 'UserInputService', 'RunService', 'TweenService',
  ];
  return reserved.includes(word.toLowerCase());
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
