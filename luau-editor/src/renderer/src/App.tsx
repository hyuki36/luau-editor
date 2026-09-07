import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import MonacoEditor from './MonacoEditor'
import type { FileNode } from './types'
import { runLuauSnippet } from './lua-run'
import { loadAnims, loadLang, saveAnims, saveLang, t, type Lang } from './i18n'
import './App.css'

const APP_VERSION = 'v0.1.4'

const SAMPLE = `-- Eras
-- Open a .lua / .luau file, or press Run (Ctrl+Enter) to test basic logic

local function greet(name)
\tprint("Hello, " .. name)
end

greet("world")
print("2 + 3 =", 2 + 3)
`

type View = 'home' | 'editor' | 'settings'

interface Cursor {
  line: number
  col: number
}

function now(): string {
  const d = new Date()
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/** Kiểm tra Luau cơ bản: cân bằng block đơn giản */
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

/** Lọc cây file theo từ khóa search (giữ cha của node khớp). */
function filterTree(node: FileNode, q: string): FileNode | null {
  const query = q.trim().toLowerCase()
  if (!query) return node
  if (node.type === 'file') {
    return node.name.toLowerCase().includes(query) ? node : null
  }
  const kids = (node.children ?? [])
    .map((c) => filterTree(c, q))
    .filter((c): c is FileNode => c !== null)
  if (node.name.toLowerCase().includes(query)) return { ...node }
  if (kids.length > 0) return { ...node, children: kids }
  return null
}

// ---------- SVG icons (nét mảnh, đồng bộ) ----------
function Icon({ d, size = 16 }: { d: string; size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}
const IconHome = (): JSX.Element => (
  <Icon d="M3 11.5 12 4l9 7.5M5.5 10.5V20h13v-9.5" />
)
const IconCode = (): JSX.Element => (
  <Icon d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14" />
)
const IconGear = (): JSX.Element => (
  <Icon d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19 12a7 7 0 0 0-.14-1.4l2-1.55-2-3.46-2.36.95a7 7 0 0 0-2.42-1.4L13.7 2.6h-3.4l-.38 2.54a7 7 0 0 0-2.42 1.4l-2.36-.95-2 3.46 2 1.55a7 7 0 0 0 0 2.8l-2 1.55 2 3.46 2.36-.95a7 7 0 0 0 2.42 1.4l.38 2.54h3.4l.38-2.54a7 7 0 0 0 2.42-1.4l2.36.95 2-3.46-2-1.55c.1-.46.14-.93.14-1.4Z" />
)
const IconPlay = (): JSX.Element => (
  <Icon d="M7 4.5v15l12-7.5-12-7.5Z" />
)
const IconDoc = (): JSX.Element => (
  <Icon d="M6 2.5h8L19 8v13.5H6V2.5ZM14 2.5V8h5" />
)
const IconFolder = (): JSX.Element => (
  <Icon d="M3 6.5h6l2 2.5h10V19H3V6.5Z" />
)
const IconSave = (): JSX.Element => (
  <Icon d="M5 3.5h11L20 7.5V20.5H5V3.5ZM8 3.5v5h7v-5M8 20.5v-6h8v6" />
)
const IconClear = (): JSX.Element => (
  <Icon d="M4 7h16M9 4.5h6M6.5 7l1 13.5h9l1-13.5M10 11v6M14 11v6" />
)
const IconRefresh = (): JSX.Element => (
  <Icon d="M20 12a8 8 0 1 1-2.34-5.66M20 3.5V8h-4.5" />
)

// ---------- Toggle switch ----------
function Switch({ on, onFlip, label }: { on: boolean; onFlip: () => void; label: string }): JSX.Element {
  return (
    <button
      className={`switch${on ? ' on' : ''}`}
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onFlip}
    >
      <span className="knob" />
    </button>
  )
}

export default function App(): JSX.Element {
  const [lang, setLang] = useState<Lang>(() => loadLang())
  const [view, setView] = useState<View>('home')
  const [folderRoot, setFolderRoot] = useState<FileNode | null>(null)
  const [currentFile, setCurrentFile] = useState<string | null>(null)
  const [content, setContent] = useState<string>(SAMPLE)
  const [savedContent, setSavedContent] = useState<string>(SAMPLE)
  const [logs, setLogs] = useState<string[]>([])
  const [cursor, setCursor] = useState<Cursor>({ line: 1, col: 1 })
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [aiEnabled, setAiEnabled] = useState<boolean>(true)
  const [search, setSearch] = useState<string>('')
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [isMax, setIsMax] = useState<boolean>(false)
  const animInit = useRef(loadAnims())
  const [animsOn, setAnimsOn] = useState<boolean>(animInit.current.on)
  const [reduceMotion, setReduceMotion] = useState<boolean>(animInit.current.reduce)
  const dirty = content !== savedContent

  const pushLog = useCallback((msg: string) => {
    setLogs((prev) => [...prev.slice(-300), `[${now()}] ${msg}`])
  }, [])

  const welcomed = useRef(false)
  useEffect(() => {
    if (!welcomed.current) {
      welcomed.current = true
      pushLog(t(loadLang(), 'logReady'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    saveAnims(animsOn, reduceMotion)
  }, [animsOn, reduceMotion])

  useEffect(() => {
    window.api.windowIsMaximized().then(setIsMax).catch(() => undefined)
  }, [])

  const changeLang = (next: Lang): void => {
    setLang(next)
    saveLang(next)
  }

  const warnings = useMemo(() => basicLuauCheck(content), [content])
  const lineCount = useMemo(() => content.split('\n').length, [content])
  const visibleTree = useMemo(
    () => (folderRoot ? filterTree(folderRoot, search) : null),
    [folderRoot, search]
  )

  const doOpenFile = useCallback(async () => {
    try {
      const picked = await window.api.openFileDialog()
      if (!picked) return
      const text = await window.api.readFile(picked)
      setCurrentFile(picked)
      setContent(text)
      setSavedContent(text)
      setView('editor')
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
      setView('editor')
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

  const doNewScript = useCallback(() => {
    if (dirty && !window.confirm(t(loadLang(), 'confirmUnsaved'))) return
    setCurrentFile(null)
    setContent('')
    setSavedContent('')
    setView('editor')
    pushLog(t(loadLang(), 'logNewScript'))
  }, [dirty, pushLog])

  const doRun = useCallback(() => {
    if (isRunning) return
    setIsRunning(true)
    pushLog(t(loadLang(), 'logRunStart'))
    setTimeout(() => {
      try {
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
      } finally {
        setIsRunning(false)
      }
    }, 30)
  }, [content, isRunning, pushLog])

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

  const toggleMax = async (): Promise<void> => {
    try {
      const maximized = await window.api.windowToggleMaximize()
      setIsMax(maximized)
    } catch {
      /* ignore */
    }
  }

  const untitled = t(lang, 'untitled')

  const renderTree = (node: FileNode, depth: number): JSX.Element | null => {
    if (node.type === 'file') {
      const active = node.path === currentFile
      const isLuau = /\.luau?$/.test(node.name)
      return (
        <div
          key={node.path}
          className={`tree-item file${active ? ' active' : ''}`}
          style={{ paddingLeft: 10 + depth * 14 }}
          title={node.path}
          onClick={() => void openSpecificFile(node.path)}
        >
          <span className={`file-dot${isLuau ? ' luau' : ''}`}>●</span>
          <span className="tree-label">{node.name}</span>
        </div>
      )
    }
    const open = expanded.has(node.path)
    const kids = node.children ?? []
    if (depth > 0 && kids.length === 0) return null
    return (
      <div key={node.path}>
        <div
          className="tree-item dir"
          style={{ paddingLeft: 10 + depth * 14 }}
          title={node.path}
          onClick={() => toggleDir(node.path)}
        >
          <span className="tree-arrow">{open ? '▾' : '▸'}</span>
          <span className="tree-label dir-label">{node.name}</span>
        </div>
        {open && kids.map((child) => <div key={child.path}>{renderTree(child, depth + 1)}</div>)}
      </div>
    )
  }

  const appClass = `app${animsOn ? '' : ' no-anim'}${reduceMotion ? ' reduce-motion' : ''}`

  return (
    <div className={appClass}>
      {/* Titlebar tự vẽ (frameless) */}
      <header className="titlebar">
        <div className="tb-left">
          <span className="e-logo">E</span>
        </div>
        <nav className="tb-nav">
          <button
            className={`tb-nav-btn${view === 'home' ? ' active' : ''}`}
            title={t(lang, 'homeNav')}
            onClick={() => setView('home')}
          >
            <IconHome />
          </button>
          <button
            className={`tb-nav-btn${view === 'editor' ? ' active' : ''}`}
            title={t(lang, 'editorNav')}
            onClick={() => setView('editor')}
          >
            <IconCode />
          </button>
          <button
            className={`tb-nav-btn${view === 'settings' ? ' active' : ''}`}
            title={t(lang, 'settings')}
            onClick={() => setView('settings')}
          >
            <IconGear />
          </button>
        </nav>
        <div className="tb-right">
          <button className="tb-win-btn" title={t(lang, 'minimizeWin')} onClick={() => void window.api.windowMinimize()}>
            <span className="win-min" />
          </button>
          <button
            className="tb-win-btn"
            title={isMax ? t(lang, 'restoreWin') : t(lang, 'maximizeWin')}
            onClick={() => void toggleMax()}
          >
            {isMax ? <span className="win-restore" /> : <span className="win-max" />}
          </button>
          <button className="tb-win-btn danger" title={t(lang, 'closeWin')} onClick={() => void window.api.windowClose()}>
            <span className="win-close">✕</span>
          </button>
        </div>
      </header>

      {/* ---------- HOME ---------- */}
      {view === 'home' && (
        <div className="view view-home" key={`home-${lang}`}>
          <h1 className="welcome-title">{t(lang, 'welcomeTitle')}</h1>
          <p className="welcome-sub">{t(lang, 'welcomeSub')}</p>

          <div className="quick-grid">
            <button className="quick-card" onClick={() => doNewScript()}>
              <span className="quick-icon"><IconDoc /></span>
              <span className="quick-text">
                <span className="quick-title">{t(lang, 'newScript')}</span>
                <span className="quick-sub">{t(lang, 'newScriptSub')}</span>
              </span>
              <span className="quick-arrow">›</span>
            </button>
            <button className="quick-card" onClick={() => void doOpenFile()}>
              <span className="quick-icon"><IconDoc /></span>
              <span className="quick-text">
                <span className="quick-title">{t(lang, 'openFile')}</span>
                <span className="quick-sub">.lua / .luau</span>
              </span>
              <span className="quick-arrow">›</span>
            </button>
            <button className="quick-card" onClick={() => void doOpenFolder()}>
              <span className="quick-icon"><IconFolder /></span>
              <span className="quick-text">
                <span className="quick-title">{t(lang, 'openFolder')}</span>
                <span className="quick-sub">{t(lang, 'workspace')}</span>
              </span>
              <span className="quick-arrow">›</span>
            </button>
            <button className="quick-card" onClick={() => setView('settings')}>
              <span className="quick-icon"><IconGear /></span>
              <span className="quick-text">
                <span className="quick-title">{t(lang, 'settings')}</span>
                <span className="quick-sub">{t(lang, 'languageLabel')} • AI</span>
              </span>
              <span className="quick-arrow">›</span>
            </button>
          </div>

          <div className="info-card">
            <div className="info-title">{t(lang, 'infoTitle')}</div>
            <div className="info-row">
              <span>{t(lang, 'versionRow')}</span>
              <span className="info-val">{APP_VERSION}</span>
            </div>
            <div className="info-row">
              <span>{t(lang, 'engineRow')}</span>
              <span className="info-val">{t(lang, 'engineVal')}</span>
            </div>
            <div className="info-row">
              <span>{t(lang, 'sandboxRow')}</span>
              <span className="info-val ok">{t(lang, 'sandboxVal')}</span>
            </div>
            <div className="info-row">
              <span>{t(lang, 'ghostRow')}</span>
              <span className={`info-val${aiEnabled ? ' ok' : ''}`}>
                {aiEnabled ? t(lang, 'aiOn') : t(lang, 'aiOff')}
              </span>
            </div>
          </div>

          <div className="info-card">
            <div className="info-title">{t(lang, 'changelogTitle')}</div>
            <div className="cl-entry">
              <span className="cl-ver">v0.1.4</span>
              <span className="cl-lines">{t(lang, 'cl140')}<br />{t(lang, 'cl140b')}</span>
            </div>
            <div className="cl-entry">
              <span className="cl-ver">v0.1.3</span>
              <span className="cl-lines">{t(lang, 'cl130')}</span>
            </div>
            <div className="cl-entry">
              <span className="cl-ver">v0.1.2</span>
              <span className="cl-lines">{t(lang, 'cl120')}</span>
            </div>
          </div>
        </div>
      )}

      {/* ---------- EDITOR ---------- */}
      {view === 'editor' && (
        <div className="view view-editor" key={`editor-${lang}`}>
          <section className="center">
            <div className="tabs">
              <div className="tab active" title={currentFile ?? untitled}>
                <span className="tab-name">
                  {fileNameOf(currentFile, untitled)}
                  {dirty && <span className="dirty-dot" />}
                </span>
                <span className="tab-lang">Luau</span>
              </div>
              <span className="spacer" />
              <span className="cursor-pos">
                Ln {cursor.line}, Col {cursor.col}
              </span>
            </div>

            <div className="editor-wrap">
              <div className="editor-watermark" aria-hidden="true">E</div>
              <MonacoEditor
                value={content}
                filePath={currentFile}
                aiEnabled={aiEnabled}
                onChange={(v) => setContent(v)}
                onCursor={(line, col) => setCursor({ line, col })}
              />
            </div>

            <div className="actionbar">
              <button className={`act-btn primary${isRunning ? ' running' : ''}`} onClick={() => doRun()} disabled={isRunning} title={t(lang, 'runTitle')}>
                <IconPlay />
                {isRunning ? t(lang, 'running') : t(lang, 'execute')}
              </button>
              <button className="act-btn" onClick={() => setLogs([])}>
                <IconClear />
                {t(lang, 'clearBtn')}
              </button>
              <button className="act-btn" onClick={() => void doOpenFile()}>
                <IconDoc />
                {t(lang, 'openBtn')}
              </button>
              <button className="act-btn" onClick={() => void doSave()}>
                <IconSave />
                {t(lang, 'saveBtn')}
              </button>
              <button className="act-btn" onClick={() => void doSaveAs()}>
                {t(lang, 'saveAs')}
              </button>
              <span className="spacer" />
              {aiEnabled && <span className="ai-hint">{t(lang, 'ghostHint')}</span>}
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
            </div>

            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">{t(lang, 'terminal')}</span>
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
                  <div key={`w${i}`} className="log warn">{w}</div>
                ))}
                {logs.map((l, i) => (
                  <div key={i} className="log">{l}</div>
                ))}
              </div>
            </div>
          </section>

          <aside className="workspace">
            <div className="ws-header">
              <span>{t(lang, 'workspace')}</span>
              <button className="icon-btn" onClick={() => void refreshFolder()} title={t(lang, 'refreshTitle')}>
                <IconRefresh />
              </button>
            </div>
            <div className="ws-search">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t(lang, 'searchScripts')}
              />
            </div>
            <div className="ws-body">
              {visibleTree ? (
                renderTree(visibleTree, 0)
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
        </div>
      )}

      {/* ---------- SETTINGS ---------- */}
      {view === 'settings' && (
        <div className="view view-settings" key={`settings-${lang}`}>
          <h1 className="welcome-title small">{t(lang, 'settingsTitle')}</h1>
          <div className="set-card">
            <div className="set-title">{t(lang, 'appearance')}</div>
            <div className="set-sub">{t(lang, 'appearanceSub')}</div>
            <div className="set-row">
              <span className="set-text">
                <span className="set-name">{t(lang, 'animations')}</span>
                <span className="set-desc">{t(lang, 'animationsSub')}</span>
              </span>
              <Switch on={animsOn} onFlip={() => setAnimsOn((v) => !v)} label={t(lang, 'animations')} />
            </div>
            <div className="set-row">
              <span className="set-text">
                <span className="set-name">{t(lang, 'reduceMotion')}</span>
                <span className="set-desc">{t(lang, 'reduceMotionSub')}</span>
              </span>
              <Switch on={reduceMotion} onFlip={() => setReduceMotion((v) => !v)} label={t(lang, 'reduceMotion')} />
            </div>
          </div>
          <div className="set-card">
            <div className="set-title">{t(lang, 'languageLabel')}</div>
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
          <div className="set-card">
            <div className="set-title">{t(lang, 'aiSettings')}</div>
            <div className="set-row">
              <span className="set-text">
                <span className="set-name">{t(lang, 'aiSettings')}</span>
                <span className="set-desc">{t(lang, 'aiSettingsSub')}</span>
              </span>
              <Switch
                on={aiEnabled}
                onFlip={() => {
                  const next = !aiEnabled
                  setAiEnabled(next)
                  pushLog(next ? t(loadLang(), 'logAiOn') : t(loadLang(), 'logAiOff'))
                }}
                label={t(lang, 'aiSettings')}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
