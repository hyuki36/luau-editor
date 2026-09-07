export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

export interface EditorOpts {
  fontSize: number
  minimap: boolean
  wordWrap: boolean
  tabSize: number
}

export interface PreloadApi {
  openFileDialog: () => Promise<string | null>
  openFolderDialog: () => Promise<string | null>
  saveAsDialog: (defaultPath?: string) => Promise<string | null>
  readFile: (filePath: string) => Promise<string>
  writeFile: (filePath: string, content: string) => Promise<boolean>
  listDir: (dirPath: string) => Promise<FileNode>
  showInFolder: (filePath: string) => Promise<boolean>
  windowMinimize: () => Promise<boolean>
  windowToggleMaximize: () => Promise<boolean>
  windowIsMaximized: () => Promise<boolean>
  windowClose: () => Promise<boolean>
}

declare global {
  interface Window {
    api: PreloadApi
  }
}
