import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import MonacoEditor from './MonacoEditor'
import type { FileNode } from './types'
import './App.css'

const SAMPLE = `-- Luau Editor (MVP)
-- Mở file .lua / .luau thật bằng File > Open File hoặc Open Folder (Ctrl+O)

local Players = game:GetService("Players")

local function greet(player: Player)
\tprint("Hello, " .. player.Name)
end

Players.PlayerAdded:Connect(greet)

export type Config = {
\tmaxPlayers: number,
\tdebug: boolean,
}

local config: Config = { maxPlayers = 10, debug = true }
print(config)
`

interface Cursor {
  line: number
  col: number
}

function now(): string {
  const d = new Date()
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/** Kiểm tra Luau cơ bản cho MVP: đếm dòng + cân bằng block đơn giản */
function basicLuauCheck(src: string): string[] {
  const warnings: string[] = []
  const stripped = src
    .replace(/--\[\[[\s\S]*?\]\]/g, '')
    .replace(/--[^\n]*/g, '')
    .replace(/"([^"\\]|\\.)*"/g, '""')
    .replace(/'([^'\\]|\\.)*'/g, "''")
  const open = (stripped.match(/\b(function|if|for|while)\b/g) || []).length
  const dos = (stripped.match(/\bdo\b/g) || []).length
  const ends = (stripped.match(/\bend\b/g) || []).length
  if (open + dos !== ends) {
    warnings.push(
      `Có thể thiếu 'end': mở block (function/if/for/while/do) = ${open + dos}, 'end' = ${ends}.`
    )
  }
  const repeats = (stripped.match(/\brepeat\b/g) || []).length
  const untils = (stripped.match(/\buntil\b/g) || []).length
  if (repeats !== untils) {
    warnings.push(`repeat (${repeats}) và until (${untils}) không khớp.`)
  }
  return warnings
}

function fileNameOf(path: string | null): string {
  if (!path) return 'Untitled'
  const parts = path.split(/[/\\]/)
  return parts[parts.length - 1] || path
}

export default function App(): JSX.Element {
  const [folderRoot, setFolderRoot] = useState<FileNode | null>(null)
  const [currentFile, setCurrentFile] = useState<string | null>(null)
  const [content, setContent] = useState<string>(SAMPLE)
  const [savedContent, setSavedContent] = useState<string>(SAMPLE)
  const [logs, setLogs] = useState<string[]>([
    `[${now()}] Luau Editor sẵn sàng. Mở file hoặc folder để bắt đầu.`
  ])
  const [cursor, setCursor] = useState<Cursor>({ line: 1, col: 1 })
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [aiEnabled, setAiEnabled] = useState<boolean>(true)
  const dirty = content !== savedContent

  const pushLog = useCallback((msg: string) => {
    setLogs((prev) => [...prev.slice(-300), `[${now()}] ${msg}`])
  }, [])

  const warnings = useMemo(() => basicLuauCheck(content), [content])
  const lineCount = useMemo(() => content.split('\n').length, [content])

  const doOpenFile = useCallback(async () => {
    try {
      const picked = await window.api.openFileDialog()
      if (!picked) return
      const text = await window.api.readFile(picked)
      setCurrentFile(picked)
      setContent(text)
      setSavedContent(text)
      pushLog(`Đã mở file: ${picked} (${text.split('\n').length} dòng)`)
    } catch (e) {
      pushLog(`Lỗi mở file: ${String(e)}`)
    }
  }, [pushLog])

  const doOpenFolder = useCallback(async () => {
    try {
      const picked = await window.api.openFolderDialog()
      if (!picked) return
      const tree = await window.api.listDir(picked)
      setFolderRoot(tree)
      setExpanded(new Set([tree.path]))
      pushLog(`Đã mở folder: ${picked}`)
    } catch (e) {
      pushLog(`Lỗi mở folder: ${String(e)}`)
    }
  }, [pushLog])

  const doSave = useCallback(async () => {
    try {
      if (!currentFile) {
        const picked = await window.api.saveAsDialog('script.luau')
        if (!picked) return
        await window.api.writeFile(picked, content)
        setCurrentFile(picked)
        setSavedContent(content)
        pushLog(`Đã lưu file mới: ${picked}`)
        return
      }
      await window.api.writeFile(currentFile, content)
      setSavedContent(content)
      pushLog(`Đã lưu: ${currentFile}`)
    } catch (e) {
      pushLog(`Lỗi lưu file: ${String(e)}`)
    }
  }, [content, currentFile, pushLog])

  const doSaveAs = useCallback(async () => {
    try {
      const picked = await window.api.saveAsDialog(currentFile ?? 'script.luau')
      if (!picked) return
      await window.api.writeFile(picked, content)
      setCurrentFile(picked)
      setSavedContent(content)
      pushLog(`Đã lưu thành: ${picked}`)
    } catch (e) {
      pushLog(`Lỗi Save As: ${String(e)}`)
    }
  }, [content, currentFile, pushLog])

  const openSpecificFile = useCallback(
    async (path: string) => {
      if (dirty && currentFile) {
        const ok = window.confirm(`File hiện tại chưa lưu. Mở file khác và bỏ thay đổi?`)
        if (!ok) return
      }
      try {
        const text = await window.api.readFile(path)
        setCurrentFile(path)
        setContent(text)
        setSavedContent(text)
        pushLog(`Đã mở file: ${path}`)
      } catch (e) {
        pushLog(`Lỗi mở file: ${String(e)}`)
      }
    },
    [currentFile, dirty, pushLog]
  )

  const refreshFolder = useCallback(async () => {
    if (!folderRoot) return
    try {
      const tree = await window.api.listDir(folderRoot.path)
      setFolderRoot(tree)
      pushLog('Đã làm mới Explorer.')
    } catch (e) {
      pushLog(`Lỗi làm mới folder: ${String(e)}`)
    }
  }, [folderRoot, pushLog])

  // Phím tắt: Ctrl+S lưu, Ctrl+O mở file, Ctrl+K Ctrl+O mở folder
  const saveRef = useRef(doSave)
  const openRef = useRef(doOpenFile)
  saveRef.current = doSave
  openRef.current = doOpenFile
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === 's' && !e.shiftKey) {
        e.preventDefault()
        void saveRef.current()
      } else if (mod && e.key.toLowerCase() === 'o') {
        e.preventDefault()
        void openRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const toggleDir = (path: string): void => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const renderTree = (node: FileNode, depth: number): JSX.Element => {
    if (node.type === 'file') {
      const active = node.path === currentFile
      const isLuau = /\.luau?$/.test(node.name)
      return (
        <div
          key={node.path}
          className={`tree-item file${active ? ' active' : ''}`}
          style={{ paddingLeft: 12 + depth * 14 }}
          title={node.path}
          onClick={() => void openSpecificFile(node.path)}
        >
          <span className={`file-dot${isLuau ? ' luau' : ''}`}>●</span>
          <span className="tree-label">{node.name}</span>
        </div>
      )
    }
    const open = expanded.has(node.path)
    return (
      <div key={node.path}>
        <div
          className="tree-item dir"
          style={{ paddingLeft: 12 + depth * 14 }}
          title={node.path}
          onClick={() => toggleDir(node.path)}
        >
          <span className="tree-arrow">{open ? '▾' : '▸'}</span>
          <span className="tree-label dir-label">{node.name}</span>
        </div>
        {open &&
          (node.children ?? []).map((child) => (
            <div key={child.path}>{renderTree(child, depth + 1)}</div>
          ))}
      </div>
    )
  }

  return (
    <div className="app">
      {/* Menu bar tối giản */}
      <header className="menubar">
        <div className="menu-left">
          <span className="app-title">Luau Editor</span>
          <button className="menu-btn" onClick={() => void doOpenFile()} title="Mở file (Ctrl+O)">
            Open File
          </button>
          <button className="menu-btn" onClick={() => void doOpenFolder()} title="Mở folder">
            Open Folder
          </button>
          <button className="menu-btn" onClick={() => void doSave()} title="Lưu (Ctrl+S)">
            Save
          </button>
          <button className="menu-btn" onClick={() => void doSaveAs()} title="Lưu thành file mới">
            Save As
          </button>
        </div>
        <div className="menu-center" title={currentFile ?? 'Chưa có file'}>
          {currentFile ?? 'Untitled'}{dirty ? ' ●' : ''}
        </div>
        <div className="menu-right">
          <span className="lang-badge">Luau</span>
        </div>
      </header>

      <div className="main">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="side-header">
            <span>EXPLORER</span>
            <button className="icon-btn" onClick={() => void refreshFolder()} title="Làm mới">
              ⟳
            </button>
          </div>
          <div className="side-body">
            {folderRoot ? (
              <>
                <div
                  className="tree-item dir root"
                  title={folderRoot.path}
                  onClick={() => toggleDir(folderRoot.path)}
                >
                  <span className="tree-arrow">
                    {expanded.has(folderRoot.path) ? '▾' : '▸'}
                  </span>
                  <span className="tree-label dir-label">{folderRoot.name}</span>
                </div>
                {expanded.has(folderRoot.path) &&
                  (folderRoot.children ?? []).map((child) => (
                    <div key={child.path}>{renderTree(child, 1)}</div>
                  ))}
                {(folderRoot.children ?? []).length === 0 && (
                  <div className="side-empty">Folder trống.</div>
                )}
              </>
            ) : (
              <div className="side-empty">
                <p>Chưa mở folder nào.</p>
                <button className="primary-btn" onClick={() => void doOpenFolder()}>
                  Open Folder
                </button>
                <button className="ghost-btn" onClick={() => void doOpenFile()}>
                  Open File
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Center */}
        <section className="center">
          <div className="tabs">
            <div className="tab active" title={currentFile ?? 'Untitled'}>
              <span className="tab-name">
                {fileNameOf(currentFile)}
                {dirty ? <span className="dirty-dot"> ●</span> : ''}
              </span>
              <span className="tab-lang">Luau</span>
            </div>
          </div>

          <div className="editor-wrap">
            <MonacoEditor
              value={content}
              filePath={currentFile}
              aiEnabled={aiEnabled}
              onChange={(v) => setContent(v)}
              onCursor={(line, col) => setCursor({ line, col })}
            />
          </div>

          {/* Output */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">OUTPUT</span>
              <span className="panel-sub">
                {warnings.length === 0
                  ? `OK — ${lineCount} dòng`
                  : `${warnings.length} cảnh báo — ${lineCount} dòng`}
              </span>
              <span className="spacer" />
              <button className="icon-btn" onClick={() => setLogs([])} title="Xóa output">
                Clear
              </button>
            </div>
            <div className="panel-body">
              {warnings.map((w, i) => (
                <div key={`w${i}`} className="log warn">
                  {w}
                </div>
              ))}
              {logs.map((l, i) => (
                <div key={i} className="log">
                  {l}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Status bar */}
      <footer className="statusbar">
        <div className="status-left">
          <button
            className={`ai-toggle${aiEnabled ? ' on' : ''}`}
            title="Bật/tắt gợi ý AI ghost-text"
            onClick={() => {
              const next = !aiEnabled
              setAiEnabled(next)
              pushLog(
                next
                  ? 'AI ghost-text: BẬT — gõ rồi chờ 300ms, Tab để nhận, Esc để hủy.'
                  : 'AI ghost-text: TẮT.'
              )
            }}
          >
            AI: {aiEnabled ? 'On' : 'Off'}
          </button>
          <span className="status-sep">|</span>
          <span>{fileNameOf(currentFile)}</span>
          <span className="status-sep">|</span>
          <span>{dirty ? 'Chưa lưu' : 'Đã lưu'}</span>
        </div>
        <div className="status-right">
          {aiEnabled && (
            <>
              <span className="ai-hint" title="Gõ rồi chờ 300ms để hiện chữ mờ, Tab nhận, Esc hủy">
                Tab nhận • Esc hủy
              </span>
              <span className="status-sep">|</span>
            </>
          )}
          <span>
            Ln {cursor.line}, Col {cursor.col}
          </span>
          <span className="status-sep">|</span>
          <span>Spaces: 4</span>
          <span className="status-sep">|</span>
          <span>UTF-8</span>
          <span className="status-sep">|</span>
          <span>Luau</span>
        </div>
      </footer>
    </div>
  )
}
