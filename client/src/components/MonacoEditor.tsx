import { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';

interface MonacoEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: string;
  readOnly?: boolean;
  placeholder?: string;
  height?: string;
}

export default function MonacoEditor({ 
  value, 
  onChange, 
  language = 'lua', 
  readOnly = false, 
  placeholder = '',
  height = '100%' 
}: MonacoEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorInstanceRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    // Configure Monaco Editor theme
    monaco.editor.defineTheme('roblox-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '569CD6' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'comment', foreground: '6A9955' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'function', foreground: 'DCDCAA' },
        { token: 'variable', foreground: '9CDCFE' },
      ],
      colors: {
        'editor.background': '#1E1E1E',
        'editor.foreground': '#D4D4D4',
        'editor.lineHighlightBackground': '#2A2D2E',
        'editor.selectionBackground': '#264F78',
        'editor.inactiveSelectionBackground': '#3A3D41',
        'editorLineNumber.foreground': '#858585',
        'editorLineNumber.activeForeground': '#C6C6C6',
        'editorGutter.background': '#1E1E1E',
        'editorIndentGuide.background': '#404040',
        'editorIndentGuide.activeBackground': '#707070',
        'editorWhitespace.foreground': '#404040',
        'editorCursor.foreground': '#AEAFAD',
        'editor.findMatchBackground': '#515C6A',
        'editor.findMatchHighlightBackground': '#EA5C004D',
        'editor.findRangeHighlightBackground': '#3A3D4166',
        'editorHoverWidget.background': '#252526',
        'editorHoverWidget.border': '#454545',
        'editorSuggestWidget.background': '#252526',
        'editorSuggestWidget.border': '#454545',
        'editorSuggestWidget.selectedBackground': '#094771',
        'editorWidget.background': '#252526',
        'editorWidget.border': '#454545',
        'input.background': '#3C3C3C',
        'input.border': '#3C3C3C',
        'inputOption.activeBorder': '#007ACC',
        'scrollbar.shadow': '#000000',
        'scrollbarSlider.background': '#79797966',
        'scrollbarSlider.hoverBackground': '#646464B3',
        'scrollbarSlider.activeBackground': '#BFBFBFCC'
      }
    });

    // Register Lua language if not already registered
    if (!monaco.languages.getLanguages().some(lang => lang.id === 'lua')) {
      monaco.languages.register({ id: 'lua' });
      
      monaco.languages.setMonarchTokensProvider('lua', {
        keywords: [
          'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for',
          'function', 'if', 'in', 'local', 'nil', 'not', 'or', 'repeat',
          'return', 'then', 'true', 'until', 'while'
        ],
        
        operators: [
          '=', '>', '<', '!', '~', '?', ':',
          '==', '<=', '>=', '!=', '&&', '||', '++', '--',
          '+', '-', '*', '/', '&', '|', '^', '%', '<<',
          '>>', '>>>', '+=', '-=', '*=', '/=', '&=', '|=',
          '^=', '%=', '<<=', '>>=', '>>>='
        ],

        symbols: /[=><!~?:&|+\-*\/\^%]+/,

        tokenizer: {
          root: [
            [/[a-zA-Z_]\w*/, {
              cases: {
                '@keywords': 'keyword',
                '@default': 'identifier'
              }
            }],
            [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
            [/0[xX][0-9a-fA-F]+/, 'number.hex'],
            [/\d+/, 'number'],
            [/"([^"\\]|\\.)*$/, 'string.invalid'],
            [/"/, 'string', '@string_double'],
            [/'([^'\\]|\\.)*$/, 'string.invalid'],
            [/'/, 'string', '@string_single'],
            [/--\[\[/, 'comment', '@comment'],
            [/--.*$/, 'comment'],
            [/@symbols/, {
              cases: {
                '@operators': 'operator',
                '@default': ''
              }
            }],
          ],

          string_double: [
            [/[^\\"]+/, 'string'],
            [/\\./, 'string.escape.invalid'],
            [/"/, 'string', '@pop']
          ],

          string_single: [
            [/[^\\']+/, 'string'],
            [/\\./, 'string.escape.invalid'],
            [/'/, 'string', '@pop']
          ],

          comment: [
            [/[^\]]+/, 'comment'],
            [/\]\]/, 'comment', '@pop'],
            [/[\]]/, 'comment']
          ],
        }
      });
    }

    const editor = monaco.editor.create(editorRef.current, {
      value: value || placeholder,
      language: language,
      theme: 'roblox-dark',
      readOnly: readOnly,
      automaticLayout: true,
      fontSize: 14,
      fontFamily: 'Fira Code, Monaco, Consolas, monospace',
      lineNumbers: 'on',
      roundedSelection: false,
      scrollBeyondLastLine: false,
      minimap: { enabled: false },
      wordWrap: 'on',
      lineHeight: 22,
      renderLineHighlight: 'line',
      selectionHighlight: false,
      folding: true,
      foldingHighlight: false,
      contextmenu: true,
      mouseWheelZoom: false,
      cursorSmoothCaretAnimation: 'off',
      scrollbar: {
        vertical: 'visible',
        horizontal: 'visible',
        verticalScrollbarSize: 12,
        horizontalScrollbarSize: 12,
      },
    });

    editorInstanceRef.current = editor;

    if (onChange && !readOnly) {
      const disposable = editor.onDidChangeModelContent(() => {
        onChange(editor.getValue());
      });

      return () => {
        disposable.dispose();
        editor.dispose();
      };
    }

    return () => {
      editor.dispose();
    };
  }, []);

  useEffect(() => {
    if (editorInstanceRef.current && value !== editorInstanceRef.current.getValue()) {
      editorInstanceRef.current.setValue(value || '');
    }
  }, [value]);

  return (
    <div 
      ref={editorRef} 
      className="monaco-editor-container w-full"
      style={{ height }}
      data-testid="monaco-editor"
    />
  );
}
