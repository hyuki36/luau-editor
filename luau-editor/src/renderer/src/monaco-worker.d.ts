// Khai báo type cho worker import của Monaco (không phụ thuộc vite/client).
declare module 'monaco-editor/esm/vs/editor/editor.worker?worker' {
  const EditorWorker: new () => Worker
  export default EditorWorker
}
