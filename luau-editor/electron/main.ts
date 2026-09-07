import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { join } from 'path'
import { promises as fs } from 'fs'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#1e1e1e',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  // electron-vite dev server URL
  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  registerIpc()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ---------- IPC: file system thật trên Windows ----------

export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

const LUA_FILTERS = [{ name: 'Luau', extensions: ['lua', 'luau', 'txt'] }]

async function buildTree(dir: string, depth: number, maxDepth = 4): Promise<FileNode[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  // sort: folder trước, file sau, theo tên
  entries.sort((a, b) => {
    if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  const out: FileNode[] = []
  for (const e of entries) {
    // bỏ qua folder rác
    if (e.name === 'node_modules' || e.name === '.git' || e.name === 'out') continue
    const full = join(dir, e.name)
    if (e.isDirectory()) {
      const node: FileNode = { name: e.name, path: full, type: 'directory' }
      if (depth < maxDepth) {
        try {
          node.children = await buildTree(full, depth + 1, maxDepth)
        } catch {
          node.children = []
        }
      }
      out.push(node)
    } else if (e.isFile()) {
      out.push({ name: e.name, path: full, type: 'file' })
    }
  }
  return out
}

function registerIpc(): void {
  ipcMain.handle('dialog:openFile', async () => {
    const res = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: LUA_FILTERS
    })
    if (res.canceled || res.filePaths.length === 0) return null
    return res.filePaths[0]
  })

  ipcMain.handle('dialog:openFolder', async () => {
    const res = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    if (res.canceled || res.filePaths.length === 0) return null
    return res.filePaths[0]
  })

  ipcMain.handle('dialog:saveAs', async (_e, defaultPath?: string) => {
    const res = await dialog.showSaveDialog({
      defaultPath,
      filters: LUA_FILTERS
    })
    if (res.canceled || !res.filePath) return null
    return res.filePath
  })

  ipcMain.handle('fs:readFile', async (_e, filePath: string) => {
    return fs.readFile(filePath, 'utf-8')
  })

  ipcMain.handle('fs:writeFile', async (_e, filePath: string, content: string) => {
    await fs.writeFile(filePath, content, 'utf-8')
    return true
  })

  ipcMain.handle('fs:listDir', async (_e, dirPath: string) => {
    const children = await buildTree(dirPath, 0)
    const parts = dirPath.split(/[/\\]/)
    const name = parts[parts.length - 1] || dirPath
    const root: FileNode = { name, path: dirPath, type: 'directory', children }
    return root
  })

  ipcMain.handle('shell:showInFolder', async (_e, filePath: string) => {
    shell.showItemInFolder(filePath)
    return true
  })
}
