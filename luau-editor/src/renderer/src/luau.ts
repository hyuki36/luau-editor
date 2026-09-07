import type * as Monaco from 'monaco-editor'
import { buildRobloxCompletions, getHoverDoc } from './roblox-api'

// Guard chống đăng ký provider trùng (StrictMode/HMR gọi registerLuau nhiều lần)
let completionRegistered = false
let hoverRegistered = false

/**
 * Đăng ký ngôn ngữ Luau cho Monaco.
 * Luau ~ Lua + type annotations + `continue`, `type`, `export`, `typeof`, compound assign.
 */
export function registerLuau(monaco: typeof Monaco): void {
  const LANG = 'luau'

  const existing = monaco.languages.getLanguages().some((l) => l.id === LANG)
  if (!existing) {
    monaco.languages.register({
      id: LANG,
      extensions: ['.lua', '.luau'],
      aliases: ['Luau', 'luau']
    })
  }

  monaco.languages.setLanguageConfiguration(LANG, {
    comments: {
      lineComment: '--',
      blockComment: ['--[[', ']]']
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')']
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: '[[', close: ']]' }
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" }
    ],
    indentationRules: {
      increaseIndentPattern: /^\s*(function\b.*|if\b.*\bthen\b|for\b.*\bdo\b|while\b.*\bdo\b|do\b|repeat\b|else\b|elseif\b.*\bthen\b).*$/,
      decreaseIndentPattern: /^\s*(end\b|else\b|elseif\b|until\b).*$/
    }
  })

  monaco.languages.setMonarchTokensProvider(LANG, {
    keywords: [
      'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for', 'function',
      'if', 'in', 'local', 'nil', 'not', 'or', 'repeat', 'return', 'then',
      'true', 'until', 'while', 'continue', 'type', 'export', 'self', 'typeof'
    ],
    builtins: [
      'game', 'workspace', 'script', 'plugin', 'owner',
      'Players', 'TweenService', 'ReplicatedStorage', 'ServerScriptService',
      'ServerStorage', 'StarterGui', 'Lighting', 'SoundService', 'RunService',
      'UserInputService', 'DataStoreService', 'HttpService', 'Debris', 'Teams',
      'MarketplaceService', 'TeleportService',
      'Instance', 'Vector3', 'Vector2', 'CFrame', 'UDim', 'UDim2', 'Color3',
      'BrickColor', 'Enum', 'TweenInfo', 'NumberRange', 'NumberSequence',
      'Part', 'Model', 'Folder', 'Script', 'LocalScript', 'ModuleScript',
      'RemoteEvent', 'RemoteFunction', 'IntValue', 'StringValue', 'Humanoid',
      'Rect', 'Ray', 'Region3', 'task', 'math', 'string', 'table', 'os',
      'io', 'coroutine', 'utf8', 'buffer', 'pairs', 'ipairs', 'pcall',
      'xpcall', 'require', 'print', 'warn', 'error', 'assert', 'select',
      'tostring', 'tonumber', 'rawequal', 'rawget', 'rawset', 'setmetatable',
      'getmetatable', 'tick', 'time', 'elapsedTime', 'wait', 'spawn', 'delay'
    ],
    tokenizer: {
      root: [
        [/--\[\[[\s\S]*?\]\]/, 'comment'],
        [/--[^\n]*/, 'comment'],
        [/"([^"\\]|\\.)*"/, 'string'],
        [/'([^'\\]|\\.)*'/, 'string'],
        [/\[\[[\s\S]*?\]\]/, 'string'],
        [/\b\d+(\.\d+)?([eE][+-]?\d+)?\b/, 'number'],
        [/[a-zA-Z_]\w*(?=\s*:+\s*[a-zA-Z_])/, 'type'],
        [
          /[a-zA-Z_]\w*/,
          {
            cases: {
              '@keywords': 'keyword',
              '@builtins': 'type',
              '@default': 'identifier'
            }
          }
        ],
        [/[{}()[\]]/, '@brackets'],
        [/[:,.]/, 'delimiter'],
        [/[+\-*/%^#<>=~|&]+/, 'operator']
      ]
    }
  })

  // Gợi ý Roblox Luau — nhanh + offline 100%:
  // dữ liệu tĩnh cache sẵn trong roblox-api.ts, mỗi lần gõ chỉ gán `range`
  // theo từ hiện tại, Monaco tự lọc fuzzy. trigger sau `.` và `:`.
  if (!completionRegistered) {
    completionRegistered = true
    monaco.languages.registerCompletionItemProvider(LANG, {
      triggerCharacters: ['.', ':'],
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position)
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        }
        return { suggestions: buildRobloxCompletions(monaco, range) }
      }
    })
  }

  // Hover docs — chỉ đọc 1 dòng tại con trỏ, đồng bộ, không fetch.
  if (!hoverRegistered) {
    hoverRegistered = true
    monaco.languages.registerHoverProvider(LANG, {
      provideHover: (model, position) => {
        const hit = getHoverDoc(
          model.getLineContent(position.lineNumber),
          position.column
        )
        if (!hit) return null
        return {
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: hit.startColumn,
            endColumn: hit.endColumn
          },
          contents: [{ value: hit.doc }]
        }
      }
    })
  }

  // Theme dark duy nhất, nền #1E1E1E
  monaco.editor.defineTheme('luau-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '569CD6' },
      { token: 'type', foreground: '4EC9B0' },
      { token: 'string', foreground: 'CE9178' },
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'comment', foreground: '6A9955' },
      { token: 'identifier', foreground: '9CDCFE' },
      { token: 'operator', foreground: 'D4D4D4' },
      { token: 'delimiter', foreground: 'D4D4D4' }
    ],
    colors: {
      'editor.background': '#1E1E1E',
      'editor.foreground': '#D4D4D4',
      'editor.lineHighlightBackground': '#2A2D2E',
      'editorLineNumber.foreground': '#858585',
      'editorLineNumber.activeForeground': '#C6C6C6',
      'editorCursor.foreground': '#AEAFAD',
      'editor.selectionBackground': '#264F78',
      'editor.inactiveSelectionBackground': '#3A3D41',
      'editorGhostText.foreground': '#8a8a8a'
    }
  })
}
