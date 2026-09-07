import { contextBridge, ipcRenderer } from 'electron'

export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

const api = {
  openFileDialog: (): Promise<string | null> => ipcRenderer.invoke('dialog:openFile'),
  openFolderDialog: (): Promise<string | null> => ipcRenderer.invoke('dialog:openFolder'),
  saveAsDialog: (defaultPath?: string): Promise<string | null> =>
    ipcRenderer.invoke('dialog:saveAs', defaultPath),
  readFile: (filePath: string): Promise<string> =>
    ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath: string, content: string): Promise<boolean> =>
    ipcRenderer.invoke('fs:writeFile', filePath, content),
  listDir: (dirPath: string): Promise<FileNode> =>
    ipcRenderer.invoke('fs:listDir', dirPath),
  showInFolder: (filePath: string): Promise<boolean> =>
    ipcRenderer.invoke('shell:showInFolder', filePath)
}

contextBridge.exposeInMainWorld('api', api)

export type PreloadApi = typeof api
