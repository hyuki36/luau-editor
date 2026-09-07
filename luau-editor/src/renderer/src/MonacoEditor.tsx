import { useEffect, useRef } from 'react'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import { registerLuau } from './luau'
import { getGhostSuggestion } from './ghostAI'

// Worker local, không dùng CDN — chạy offline tốt trên Windows
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(self as any).MonacoEnvironment = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getWorker(_moduleId: any, _label: string): Worker {
    return new editorWorker()
  }
}

let luauRegistered = false
function ensureLuau(): void {
  if (!luauRegistered) {
    registerLuau(monaco)
    luauRegistered = true
  }
}

// Bật/tắt AI từ React (provider đăng ký 1 lần, đọc flag này mỗi lần gợi ý)
let aiEnabledFlag = true
let ghostRegistered = false

function ensureGhostProvider(): void {
  if (ghostRegistered) return
  ghostRegistered = true

  const provider: monaco.languages.InlineCompletionsProvider = {
    provideInlineCompletions: async (model, position, _context, token) => {
      if (!aiEnabledFlag) return { items: [] }

      // Debounce 300ms sau khi ngừng gõ — hủy nếu user gõ tiếp
      await new Promise((resolve) => setTimeout(resolve, 300))
      if (token.isCancellationRequested || !aiEnabledFlag) return { items: [] }

      // Ngữ cảnh: tối đa 50 dòng trước con trỏ
      const startLine = Math.max(1, position.lineNumber - 50)
      const prefixRange = new monaco.Range(startLine, 1, position.lineNumber, position.column)
      const fullPrefix = model.getValueInRange(prefixRange)
      const linesBefore = fullPrefix.split('\n')
      const currentLineBeforeCursor = model.getValueInRange(
        new monaco.Range(position.lineNumber, 1, position.lineNumber, position.column)
      )
      const afterCursor = model.getValueInRange(
        new monaco.Range(
          position.lineNumber,
          position.column,
          position.lineNumber,
          Math.min(model.getLineMaxColumn(position.lineNumber), position.column + 30)
        )
      )

      const suggestion = getGhostSuggestion({
        linesBefore,
        currentLineBeforeCursor,
        fullPrefix,
        afterCursor
      })
      if (!suggestion || token.isCancellationRequested) return { items: [] }

      // Range rỗng tại con trỏ = chèn inline sau con trỏ (chữ mờ ghost-text).
      // Tab nhận / Esc hủy là phím mặc định của Monaco inline-suggest.
      return {
        items: [
          {
            insertText: suggestion,
            range: new monaco.Range(
              position.lineNumber,
              position.column,
              position.lineNumber,
              position.column
            )
          }
        ]
      }
    },
    freeInlineCompletions: () => undefined
  }

  monaco.languages.registerInlineCompletionsProvider('luau', provider)
}

interface Props {
  value: string
  filePath: string | null
  aiEnabled: boolean
  onChange: (value: string) => void
  onCursor: (line: number, col: number) => void
}

export default function MonacoEditor({ value, filePath, aiEnabled, onChange, onCursor }: Props): JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const onChangeRef = useRef(onChange)
  const onCursorRef = useRef(onCursor)
  const aiEnabledRef = useRef(aiEnabled)
  onChangeRef.current = onChange
  onCursorRef.current = onCursor
  aiEnabledRef.current = aiEnabled

  // Đồng bộ nút bật/tắt AI ở status bar -> Monaco
  useEffect(() => {
    aiEnabledFlag = aiEnabled
    const editor = editorRef.current
    if (editor) {
      editor.updateOptions({ inlineSuggest: { enabled: aiEnabled } })
      if (!aiEnabled) {
        editor.trigger('ai-toggle', 'editor.action.inlineSuggest.hide', null)
      }
    }
  }, [aiEnabled])

  // Tạo editor 1 lần
  useEffect(() => {
    if (!hostRef.current || editorRef.current) return
    ensureLuau()
    ensureGhostProvider()
    aiEnabledFlag = aiEnabledRef.current

    const editor = monaco.editor.create(hostRef.current, {
      value: '',
      language: 'luau',
      theme: 'luau-dark',
      fontFamily: "'JetBrains Mono', Consolas, 'Courier New', monospace",
      fontSize: 14,
      lineHeight: 21,
      minimap: { enabled: true },
      automaticLayout: true,
      scrollBeyondLastLine: false,
      renderLineHighlight: 'line',
      smoothScrolling: true,
      padding: { top: 8 },
      tabSize: 4,
      insertSpaces: true,
      wordWrap: 'on',
      bracketPairColorization: { enabled: true },
      // Ghost-text Copilot-style: chữ mờ inline, Tab nhận, Esc hủy (mặc định Monaco)
      inlineSuggest: { enabled: aiEnabledRef.current }
    })
    editorRef.current = editor

    editor.onDidChangeModelContent(() => {
      onChangeRef.current(editor.getValue())
    })
    editor.onDidChangeCursorPosition((e) => {
      onCursorRef.current(e.position.lineNumber, e.position.column)
    })

    const resize = (): void => editor.layout()
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      editor.dispose()
      editorRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Đồng bộ value khi đổi file (không phá undo khi đang gõ)
  const lastPath = useRef<string | null | undefined>(undefined)
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    if (lastPath.current !== filePath) {
      lastPath.current = filePath
      if (editor.getValue() !== value) {
        editor.setValue(value)
        editor.setScrollPosition({ scrollTop: 0 })
      }
    } else if (editor.getValue() !== value && document.activeElement !== hostRef.current?.querySelector('textarea')) {
      // fallback hiếm khi cần
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, filePath])

  return <div ref={hostRef} className="monaco-host" />
}
