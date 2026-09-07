/** Ngôn ngữ UI: English (mặc định) + Tiếng Việt. Lưu localStorage, offline. */

export type Lang = 'vi' | 'en'

export const LANG_KEY = 'eras:lang'
export const ANIM_KEY = 'eras:animations'

const en = {
  openFile: 'Open File',
  openFolder: 'Open Folder',
  save: 'Save',
  saveAs: 'Save As',
  execute: 'Execute',
  runTitle: 'Run code (Ctrl+Enter)',
  running: 'Running...',
  clearBtn: 'Clear',
  openBtn: 'Open',
  saveBtn: 'Save',
  settings: 'Settings',
  untitled: 'Untitled',
  workspace: 'Workspace',
  searchScripts: 'Search scripts',
  refreshTitle: 'Refresh',
  noFolder: 'No folder opened.',
  folderEmpty: 'Empty folder.',
  terminal: 'Terminal',
  output: 'OUTPUT',
  clearTitle: 'Clear output',
  clear: 'Clear',
  okLines: 'OK',
  warnSuffix: 'warnings',
  linesSuffix: 'lines',
  saved: 'Saved',
  unsaved: 'Unsaved',
  ghostHint: 'Tab accept • Esc dismiss',
  aiOn: 'AI: On',
  aiOff: 'AI: Off',
  aiToggleTitle: 'Toggle AI ghost-text',
  aiSettings: 'Ghost AI',
  aiSettingsSub: 'Inline suggestions as you type',
  settingsTitle: 'Settings',
  appearance: 'Appearance',
  appearanceSub: 'Motion and overall look',
  animations: 'Animations',
  animationsSub: 'Smooth transitions and motion effects',
  reduceMotion: 'Reduce motion',
  reduceMotionSub: 'Keep fades only, disable floats and pops',
  languageLabel: 'Language',
  close: 'Close',
  homeNav: 'Home',
  editorNav: 'Editor',
  minimizeWin: 'Minimize',
  maximizeWin: 'Maximize',
  restoreWin: 'Restore',
  closeWin: 'Close',
  welcomeTitle: 'Write Luau. Run it.',
  welcomeSub: 'Local Luau workspace — ghost AI, offline run, no Roblox needed for practice.',
  newScript: 'New script',
  newScriptSub: 'Open an empty script',
  infoTitle: 'Information',
  versionRow: 'Version',
  engineRow: 'Lua engine',
  engineVal: 'fengari (offline)',
  sandboxRow: 'Local run',
  sandboxVal: 'Ready',
  ghostRow: 'Ghost AI',
  changelogTitle: 'Changelogs',
  cl140: 'New executor-style UI, E brand, frameless window',
  cl140b: 'Ghost prefix hints (print, loc...), settings with animations',
  cl130: 'Local Run sandbox, VI/EN settings, new skin',
  cl120: 'Windows exe build, Roblox API hints, hover docs',
  confirmUnsaved: 'Current file has unsaved changes. Open another file and discard them?',
  logReady: 'Eras ready. Open a file or folder to start.',
  logOpenedFile: 'Opened file:',
  logOpenedFolder: 'Opened folder:',
  logSavedNew: 'Saved new file:',
  logSaved: 'Saved:',
  logRefreshed: 'Workspace refreshed.',
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
  logRefreshErr: 'Refresh failed:',
  logNewScript: 'New empty script.'
}

export type StrKey = keyof typeof en

const vi: Record<StrKey, string> = {
  openFile: 'Mở File',
  openFolder: 'Mở Folder',
  save: 'Lưu',
  saveAs: 'Lưu thành...',
  execute: 'Chạy',
  runTitle: 'Chạy thử code (Ctrl+Enter)',
  running: 'Đang chạy...',
  clearBtn: 'Xóa',
  openBtn: 'Mở',
  saveBtn: 'Lưu',
  settings: 'Cài đặt',
  untitled: 'Chưa đặt tên',
  workspace: 'Workspace',
  searchScripts: 'Tìm script',
  refreshTitle: 'Làm mới',
  noFolder: 'Chưa mở folder nào.',
  folderEmpty: 'Folder trống.',
  terminal: 'Terminal',
  output: 'OUTPUT',
  clearTitle: 'Xóa output',
  clear: 'Xóa',
  okLines: 'OK',
  warnSuffix: 'cảnh báo',
  linesSuffix: 'dòng',
  saved: 'Đã lưu',
  unsaved: 'Chưa lưu',
  ghostHint: 'Tab nhận • Esc hủy',
  aiOn: 'AI: Bật',
  aiOff: 'AI: Tắt',
  aiToggleTitle: 'Bật/tắt gợi ý AI ghost-text',
  aiSettings: 'Ghost AI',
  aiSettingsSub: 'Gợi ý inline khi gõ',
  settingsTitle: 'Cài đặt',
  appearance: 'Giao diện',
  appearanceSub: 'Chuyển động và tổng thể',
  animations: 'Animations',
  animationsSub: 'Hiệu ứng chuyển động mượt',
  reduceMotion: 'Giảm chuyển động',
  reduceMotionSub: 'Chỉ giữ fade, tắt float và pop',
  languageLabel: 'Ngôn ngữ',
  close: 'Đóng',
  homeNav: 'Trang chủ',
  editorNav: 'Soạn thảo',
  minimizeWin: 'Thu nhỏ',
  maximizeWin: 'Phóng to',
  restoreWin: 'Khôi phục',
  closeWin: 'Đóng',
  welcomeTitle: 'Viết Luau. Chạy luôn.',
  welcomeSub: 'Không gian Luau local — ghost AI, chạy thử offline, không cần Roblox để luyện tập.',
  newScript: 'Script mới',
  newScriptSub: 'Mở script trống',
  infoTitle: 'Thông tin',
  versionRow: 'Phiên bản',
  engineRow: 'Engine Lua',
  engineVal: 'fengari (offline)',
  sandboxRow: 'Chạy local',
  sandboxVal: 'Sẵn sàng',
  ghostRow: 'Ghost AI',
  changelogTitle: 'Nhật ký đổi mới',
  cl140: 'UI kiểu executor mới, brand E, cửa sổ frameless',
  cl140b: 'Ghost gợi ý theo tiền tố, settings có animations',
  cl130: 'Sandbox Run local, settings VI/EN, skin mới',
  cl120: 'Build exe Windows, gợi ý Roblox API, hover docs',
  confirmUnsaved: 'File hiện tại chưa lưu. Mở file khác và bỏ thay đổi?',
  logReady: 'Eras sẵn sàng. Mở file hoặc folder để bắt đầu.',
  logOpenedFile: 'Đã mở file:',
  logOpenedFolder: 'Đã mở folder:',
  logSavedNew: 'Đã lưu file mới:',
  logSaved: 'Đã lưu:',
  logRefreshed: 'Đã làm mới Workspace.',
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
  logRefreshErr: 'Lỗi làm mới:',
  logNewScript: 'Script trống mới.'
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

export function loadAnims(): { on: boolean; reduce: boolean } {
  try {
    const raw = localStorage.getItem(ANIM_KEY)
    if (raw) {
      const p = JSON.parse(raw) as { on?: boolean; reduce?: boolean }
      return { on: p.on !== false, reduce: p.reduce === true }
    }
  } catch {
    /* ignore */
  }
  return { on: true, reduce: false }
}

export function saveAnims(on: boolean, reduce: boolean): void {
  try {
    localStorage.setItem(ANIM_KEY, JSON.stringify({ on, reduce }))
  } catch {
    /* ignore */
  }
}
