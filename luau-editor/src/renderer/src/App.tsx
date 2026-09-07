import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import MonacoEditor from './MonacoEditor'
import type { FileNode } from './types'
import { runLuauSnippet } from './lua-run'
import { loadLang, saveLang, t, type Lang } from './i18n'
import './App.css'

const SAMPLE = `-- Luau Editor
-- Open a .lua / .luau file with File > Open File or Open Folder (Ctrl+O)
-- Chay thu: nhan Run (Ctrl+Enter) de chay logic co ban trong sandbox local

local Players = game:GetService("Players")

local function greet(player)
\tprint("Hello, " .. player.Name)
end

print("2 + 3 =", 2 + 3)
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

/** Kiểm tra Luau cơ bản: đếm dòng + cân bằng block đơn giản */
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
    warnings.push(`block balance: open=${open + dos}, 'end'=${ends}`)
  }
  const repeats = (stripped.match(/\brepeat\b/g) || []).length
  const untils = (stripped.match(/\buntil\b/g) || []).length
  if (repeats !== untils) {
    warnings.push(`repeat (${repeats}) / until (${untils}) mismatch`)
  }
  return warnings
}

function fileNameOf(path: string | null, untitled: string): string {
  if (!path) return untitled
  const parts = path.split(/[/\\]/)
  return parts[parts.length - 1] || path
}

export default function App(): JSX.Element {
  const [lang, setLang] = useState<Lang>(() => loadLang())
  const [folderRoot, setFolderRoot] = useState<FileNode | null>(null)
  const [currentFile, setCurrentFile] = useState<string | null>(null)
  const [content, setContent] = useState<string>(SAMPLE)
  const [savedContent, setSavedContent] = useState<string>(SAMPLE)
  const [logs, setLogs] = useState<string[]>([])
  const [cursor, setCursor] = useState<Cursor>({ line: 1, col: 1 })
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [aiEnabled, setAiEnabled] = useState<boolean>(true)
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false)
  const dirty = content !== savedContent

  const pushLog = useCallback((msg: string) => {
    setLogs((prev) => [...prev.slice(-300), `[${now()}] ${msg}`])
  }, [])

  // Log chào mừng theo ngôn ngữ hiện tại (chỉ 1 lần lúc mở app)
  const welcomed = useRef(false)
  useEffect(() => {
    if (!welcomed.current) {
      welcomed.current = true
      pushLog(t(loadLang(), 'logReady'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const changeLang = (next: Lang): void => {
    setLang(next)
    saveLang(next)
    setSettingsOpen(false)
  }

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
      pushLog(`${t(loadLang(), 'logOpenedFile')} ${picked} (${text.split('\n').length})`)
    } catch (e) {
      pushLog(`${t(loadLang(), 'logOpenErr')} ${String(e)}`)
    }
  }, [pushLog])

  const doOpenFolder = useCallback(async () => {
    try {
      const picked = await window.api.openFolderDialog()
      if (!picked) return
      const tree = await window.api.listDir(picked)
      setFolderRoot(tree)
      setExpanded(new Set([tree.path]))
      pushLog(`${t(loadLang(), 'logOpenedFolder')} ${picked}`)
    } catch (e) {
      pushLog(`${t(loadLang(), 'logFolderErr')} ${String(e)}`)
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
        pushLog(`${t(loadLang(), 'logSavedNew')} ${picked}`)
        return
      }
      await window.api.writeFile(currentFile, content)
      setSavedContent(content)
      pushLog(`${t(loadLang(), 'logSaved')} ${currentFile}`)
    } catch (e) {
      pushLog(`${t(loadLang(), 'logSaveErr')} ${String(e)}`)
    }
  }, [content, currentFile, pushLog])

  const doSaveAs = useCallback(async () => {
    try {
      const picked = await window.api.saveAsDialog(currentFile ?? 'script.luau')
      if (!picked) return
      await window.api.writeFile(picked, content)
      setCurrentFile(picked)
      setSavedContent(content)
      pushLog(`${t(loadLang(), 'logSavedNew')} ${picked}`)
    } catch (e) {
      pushLog(`${t(loadLang(), 'logSaveAsErr')} ${String(e)}`)
    }
  }, [content, currentFile, pushLog])

  // Chạy thử code trong sandbox Lua local (offline, không chạm Roblox)
  const doRun = useCallback(() => {
    pushLog(t(loadLang(), 'logRunStart'))
    // setTimeout để log "start" kịp hiện trước khi chạy (tránh đơ UI 1 nhịp)
    setTimeout(() => {
      const res = runLuauSnippet(content, loadLang())
      for (const line of res.lines) {
        pushLog(`${t(loadLang(), 'logRunPrint')}: ${line}`)
      }
      if (res.error) {
        pushLog(`${t(loadLang(), 'logRunError')} ${res.error}`)
        if (res.note) pushLog(res.note)
      } else {
        pushLog(t(loadLang(), 'logRunOk'))
      }
    }, 30)
  }, [content, pushLog])

  const openSpecificFile = useCallback(
    async (path: string) => {
      if (dirty && currentFile) {
        const ok = window.confirm(t(loadLang(), 'confirmUnsaved'))
        if (!ok) return
      }
      try {
        const text = await window.api.readFile(path)
        setCurrentFile(path)
        setContent(text)
        setSavedContent(text)
        pushLog(`${t(loadLang(), 'logOpenedFile')} ${path}`)
      } catch (e) {
        pushLog(`${t(loadLang(), 'logOpenErr')} ${String(e)}`)
      }
    },
    [currentFile, dirty, pushLog]
  )

  const refreshFolder = useCallback(async () => {
    if (!folderRoot) return
    try {
      const tree = await window.api.listDir(folderRoot.path)
      setFolderRoot(tree)
      pushLog(t(loadLang(), 'logRefreshed'))
    } catch (e) {
      pushLog(`${t(loadLang(), 'logRefreshErr')} ${String(e)}`)
    }
  }, [folderRoot, pushLog])

  // Phím tắt: Ctrl+S lưu, Ctrl+O mở file, Ctrl+Enter chạy thử
  const saveRef = useRef(doSave)
  const openRef = useRef(doOpenFile)
  const runRef = useRef(doRun)
  saveRef.current = doSave
  openRef.current = doOpenFile
  runRef.current = doRun
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === 's' && !e.shiftKey) {
        e.preventDefault()
        void saveRef.current()
      } else if (mod && e.key.toLowerCase() === 'o') {
        e.preventDefault()
        void openRef.current()
      } else if (mod && e.key === 'Enter') {
        e.preventDefault()
        runRef.current()
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

  const untitled = t(lang, 'untitled')

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
      {/* Top bar */}
      <header className="menubar">
        <div className="menu-left">
          <span className="brand">
            <span className="brand-mark" aria-hidden="true" />
            <span className="app-title">Luau Editor</span>
          </span>
          <button className="menu-btn" onClick={() => void doOpenFile()} title="Ctrl+O">
            {t(lang, 'openFile')}
          </button>
          <button className="menu-btn" onClick={() => void doOpenFolder()}>
            {t(lang, 'openFolder')}
          </button>
          <button className="menu-btn" onClick={() => void doSave()} title="Ctrl+S">
            {t(lang, 'save')}
          </button>
          <button className="menu-btn" onClick={() => void doSaveAs()}>
            {t(lang, 'saveAs')}
          </button>
          <button className="run-btn" onClick={() => doRun()} title={t(lang, 'runTitle')}>
            ▶ {t(lang, 'execute')}
          </button>
        </div>
        <div className="menu-center" title={currentFile ?? untitled}>
          {currentFile ?? untitled}{dirty ? ' ●' : ''}
        </div>
        <div className="menu-right">
          <button className="menu-btn" onClick={() => setSettingsOpen(true)}>
            {t(lang, 'settings')}
          </button>
          <span className="lang-badge">Luau</span>
        </div>
      </header>

      <div className="main">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="side-header">
            <span>{t(lang, 'explorer')}</span>
            <button className="icon-btn" onClick={() => void refreshFolder()} title={t(lang, 'refreshTitle')}>
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
                  <div className="side-empty">{t(lang, 'folderEmpty')}</div>
                )}
              </>
            ) : (
              <div className="side-empty">
                <p>{t(lang, 'noFolder')}</p>
                <button className="primary-btn" onClick={() => void doOpenFolder()}>
                  {t(lang, 'openFolder')}
                </button>
                <button className="ghost-btn" onClick={() => void doOpenFile()}>
                  {t(lang, 'openFile')}
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Center */}
        <section className="center">
          <div className="tabs">
            <div className="tab active" title={currentFile ?? untitled}>
              <span className="tab-name">
                {fileNameOf(currentFile, untitled)}
                {dirty && <span className="dirty-dot" />}
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
              <span className="panel-title">{t(lang, 'output')}</span>
              <span className="panel-sub">
                {warnings.length === 0
                  ? `${t(lang, 'okLines')} — ${lineCount} ${t(lang, 'linesSuffix')}`
                  : `${warnings.length} ${t(lang, 'warnSuffix')} — ${lineCount} ${t(lang, 'linesSuffix')}`}
              </span>
              <span className="spacer" />
              <button className="icon-btn" onClick={() => setLogs([])} title={t(lang, 'clearTitle')}>
                {t(lang, 'clear')}
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

      {/* Status bar — divider bằng CSS, không dùng ký tự "|" */}
      <footer className="statusbar">
        <div className="status-left">
          <button
            className={`ai-toggle${aiEnabled ? ' on' : ''}`}
            title={t(lang, 'aiToggleTitle')}
            onClick={() => {
              const next = !aiEnabled
              setAiEnabled(next)
              pushLog(next ? t(loadLang(), 'logAiOn') : t(loadLang(), 'logAiOff'))
            }}
          >
            {aiEnabled ? t(lang, 'aiOn') : t(lang, 'aiOff')}
          </button>
          <span className="vdiv" />
          <span>{fileNameOf(currentFile, untitled)}</span>
          <span className="vdiv" />
          <span>{dirty ? t(lang, 'unsaved') : t(lang, 'saved')}</span>
        </div>
        <div className="status-right">
          {aiEnabled && (
            <>
              <span className="ai-hint">{t(lang, 'ghostHint')}</span>
              <span className="vdiv" />
            </>
          )}
          <span>
            Ln {cursor.line}, Col {cursor.col}
          </span>
          <span className="vdiv" />
          <span>
            {t(lang, 'spaces')}: 4
          </span>
          <span className="vdiv" />
          <span>UTF-8</span>
          <span className="vdiv" />
          <span>Luau</span>
        </div>
      </footer>

      {/* Settings modal */}
      {settingsOpen && (
        <div className="modal-overlay" onClick={() => setSettingsOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{t(lang, 'settingsTitle')}</div>
            <div className="modal-row">
              <span className="modal-label">{t(lang, 'languageLabel')}</span>
              <div className="lang-options">
                <button
                  className={`lang-option${lang === 'vi' ? ' selected' : ''}`}
                  onClick={() => changeLang('vi')}
                >
                  Tiếng Việt
                </button>
                <button
                  className={`lang-option${lang === 'en' ? ' selected' : ''}`}
                  onClick={() => changeLang('en')}
                >
                  English
                </button>
              </div>
            </div>
            <button className="primary-btn modal-close" onClick={() => setSettingsOpen(false)}>
              {t(lang, 'close')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
