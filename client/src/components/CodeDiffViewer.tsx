import { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';

interface CodeDiffViewerProps {
  originalCode: string;
  modifiedCode: string;
  language?: string;
  height?: string;
  viewMode?: 'side-by-side' | 'inline';
}

export default function CodeDiffViewer({ 
  originalCode, 
  modifiedCode, 
  language = 'lua', 
  height = '100%',
  viewMode = 'side-by-side'
}: CodeDiffViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const diffEditorRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Configure Monaco Editor theme
    try {
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
          'diffEditor.insertedTextBackground': '#4EC9B025',
          'diffEditor.removedTextBackground': '#F1434425',
          'diffEditor.insertedLineBackground': '#4EC9B015',
          'diffEditor.removedLineBackground': '#F1434415',
          'diffEditor.border': '#393B44',
          'scrollbar.shadow': '#000000',
          'scrollbarSlider.background': '#79797966',
          'scrollbarSlider.hoverBackground': '#646464B3',
          'scrollbarSlider.activeBackground': '#BFBFBFCC'
        }
      });
    } catch (error) {
      // Theme already exists, continue
    }

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

    const diffEditor = monaco.editor.createDiffEditor(containerRef.current, {
      theme: 'roblox-dark',
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
      renderSideBySide: viewMode === 'side-by-side',
      ignoreTrimWhitespace: false,
      renderWhitespace: 'boundary',
      diffWordWrap: 'on',
      scrollbar: {
        vertical: 'visible',
        horizontal: 'visible',
        verticalScrollbarSize: 12,
        horizontalScrollbarSize: 12,
      },
    });

    diffEditorRef.current = diffEditor;

    // Set the models
    const originalModel = monaco.editor.createModel(originalCode, language);
    const modifiedModel = monaco.editor.createModel(modifiedCode, language);

    diffEditor.setModel({
      original: originalModel,
      modified: modifiedModel
    });

    return () => {
      originalModel.dispose();
      modifiedModel.dispose();
      diffEditor.dispose();
    };
  }, []);

  useEffect(() => {
    if (diffEditorRef.current) {
      const model = diffEditorRef.current.getModel();
      if (model) {
        model.original.setValue(originalCode);
        model.modified.setValue(modifiedCode);
      }
    }
  }, [originalCode, modifiedCode]);

  useEffect(() => {
    if (diffEditorRef.current) {
      diffEditorRef.current.updateOptions({
        renderSideBySide: viewMode === 'side-by-side'
      });
    }
  }, [viewMode]);

  return (
    <div 
      ref={containerRef} 
      className="monaco-diff-editor-container w-full border border-border-dark rounded"
      style={{ height }}
      data-testid="code-diff-viewer"
    />
  );
}