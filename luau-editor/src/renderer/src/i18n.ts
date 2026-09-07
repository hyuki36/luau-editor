/** Ngôn ngữ UI: Tiếng Việt + English (mặc định). Lưu localStorage, offline. */

export type Lang = 'vi' | 'en'

export const LANG_KEY = 'luau-editor:lang'

const en = {
  openFile: 'Open File',
  openFolder: 'Open Folder',
  save: 'Save',
  saveAs: 'Save As',
  execute: 'Run',
  runTitle: 'Run code (Ctrl+Enter)',
  settings: 'Settings',
  untitled: 'Untitled',
  explorer: 'EXPLORER',
  refreshTitle: 'Refresh',
  noFolder: 'No folder opened.',
  folderEmpty: 'Empty folder.',
  output: 'OUTPUT',
  clearTitle: 'Clear output',
  clear: 'Clear',
  okLines: 'OK',
  warnSuffix: 'warnings',
  linesSuffix: 'lines',
  saved: 'Saved',
  unsaved: 'Unsaved',
  spaces: 'Spaces',
  ghostHint: 'Tab accept • Esc dismiss',
  aiOn: 'AI: On',
  aiOff: 'AI: Off',
  aiToggleTitle: 'Toggle AI ghost-text',
  settingsTitle: 'Settings',
  languageLabel: 'Language',
  close: 'Close',
  confirmUnsaved: 'Current file has unsaved changes. Open another file and discard them?',
  logReady: 'Luau Editor ready. Open a file or folder to start.',
  logOpenedFile: 'Opened file:',
  logOpenedFolder: 'Opened folder:',
  logSavedNew: 'Saved new file:',
  logSaved: 'Saved:',
  logRefreshed: 'Explorer refreshed.',
  logAiOn: 'AI ghost-text: ON — type, wait 300ms, Tab to accept, Esc to dismiss.',
  logAiOff: 'AI ghost-text: OFF.',
  logRunStart: 'Running (local sandbox, Roblox APIs not supported)...',
  logRunOk: 'Run finished.',
  logRunPrint: 'print',
  logRunError: 'Run error:',
  logOpenErr: 'Open failed:',
  logFolderErr: 'Open folder failed:',
  logSaveErr: 'Save failed:',
  logSaveAsErr: 'Save As failed:',
  logRefreshErr: 'Refresh failed:'
}

export type StrKey = keyof typeof en

const vi: Record<StrKey, string> = {
  openFile: 'Mở File',
  openFolder: 'Mở Folder',
  save: 'Lưu',
  saveAs: 'Lưu thành...',
  execute: 'Chạy',
  runTitle: 'Chạy thử code (Ctrl+Enter)',
  settings: 'Cài đặt',
  untitled: 'Chưa đặt tên',
  explorer: 'EXPLORER',
  refreshTitle: 'Làm mới',
  noFolder: 'Chưa mở folder nào.',
  folderEmpty: 'Folder trống.',
  output: 'OUTPUT',
  clearTitle: 'Xóa output',
  clear: 'Xóa',
  okLines: 'OK',
  warnSuffix: 'cảnh báo',
  linesSuffix: 'dòng',
  saved: 'Đã lưu',
  unsaved: 'Chưa lưu',
  spaces: 'Khoảng trắng',
  ghostHint: 'Tab nhận • Esc hủy',
  aiOn: 'AI: Bật',
  aiOff: 'AI: Tắt',
  aiToggleTitle: 'Bật/tắt gợi ý AI ghost-text',
  settingsTitle: 'Cài đặt',
  languageLabel: 'Ngôn ngữ',
  close: 'Đóng',
  confirmUnsaved: 'File hiện tại chưa lưu. Mở file khác và bỏ thay đổi?',
  logReady: 'Luau Editor sẵn sàng. Mở file hoặc folder để bắt đầu.',
  logOpenedFile: 'Đã mở file:',
  logOpenedFolder: 'Đã mở folder:',
  logSavedNew: 'Đã lưu file mới:',
  logSaved: 'Đã lưu:',
  logRefreshed: 'Đã làm mới Explorer.',
  logAiOn: 'AI ghost-text: BẬT — gõ rồi chờ 300ms, Tab để nhận, Esc để hủy.',
  logAiOff: 'AI ghost-text: TẮT.',
  logRunStart: 'Đang chạy (sandbox local, không hỗ trợ API Roblox)...',
  logRunOk: 'Chạy xong.',
  logRunPrint: 'in',
  logRunError: 'Lỗi chạy:',
  logOpenErr: 'Lỗi mở file:',
  logFolderErr: 'Lỗi mở folder:',
  logSaveErr: 'Lỗi lưu file:',
  logSaveAsErr: 'Lỗi Save As:',
  logRefreshErr: 'Lỗi làm mới folder:'
}

export function t(lang: Lang, key: StrKey): string {
  return lang === 'vi' ? vi[key] : en[key]
}

export function loadLang(): Lang {
  try {
    const v = localStorage.getItem(LANG_KEY)
    return v === 'vi' ? 'vi' : 'en'
  } catch {
    return 'en'
  }
}

export function saveLang(lang: Lang): void {
  try {
    localStorage.setItem(LANG_KEY, lang)
  } catch {
    /* ignore */
  }
}
