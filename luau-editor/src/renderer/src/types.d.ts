/// <reference types="vite/client" />

interface Window {
  api: {
    openFileDialog: () => Promise<string | null>
    openFolderDialog: () => Promise<string | null>
    saveAsDialog: (defaultPath?: string) => Promise<string | null>
    readFile: (filePath: string) => Promise<string>
    writeFile: (filePath: string, content: string) => Promise<boolean>
    listDir: (dirPath: string) => Promise<import('./types').FileNode>
    showInFolder: (filePath: string) => Promise<boolean>
  }
}
