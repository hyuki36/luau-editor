/**
 * Mock Ghost-Text-AI (kiểu Copilot) cho Luau Editor.
 *
 * - Hàm chính: getGhostSuggestion(context) — nhận tối đa 50 dòng trước con trỏ,
 *   trả về chuỗi gợi ý để chèn ngay sau con trỏ, hoặc null nếu không gợi ý.
 * - Hiện tại là mock theo quy tắc (rule-based), sau này thay bằng gọi model thật
 *   mà không cần đổi phía MonacoEditor.
 */

export interface GhostContext {
  /**
   * Tối đa 50 dòng tính đến con trỏ. Phần tử cuối là phần dòng hiện tại
   * nằm TRƯỚC con trỏ (có thể là chuỗi rỗng nếu con trỏ ở đầu dòng).
   */
  linesBefore: string[]
  /** Phần dòng hiện tại nằm trước con trỏ (tiện dùng, === linesBefore.at(-1) ?? ''). */
  currentLineBeforeCursor: string
  /** Text từ (đầu file hoặc 50 dòng trước) đến con trỏ — dùng để soi ngữ cảnh gần. */
  fullPrefix: string
  /** Vài ký tự ngay SAU con trỏ (nếu có) — dùng để tránh gợi ý trùng lặp. */
  afterCursor?: string
}

/** Block chuẩn Roblox: DataStore + leaderstats. Test bắt buộc phải gợi ý block này. */
export const LEADERSTATS_SNIPPET = [
  '',
  '-- AI: DataStore + leaderstats',
  'local DataStoreService = game:GetService("DataStoreService")',
  'local CoinsStore = DataStoreService:GetDataStore("Coins")',
  'local Players = game:GetService("Players")',
  '',
  'local function setupLeaderstats(player: Player)',
  '\tlocal leaderstats = Instance.new("Folder")',
  '\tleaderstats.Name = "leaderstats"',
  '\tleaderstats.Parent = player',
  '',
  '\tlocal coins = Instance.new("IntValue")',
  '\tcoins.Name = "Coins"',
  '\tcoins.Value = 0',
  '\tcoins.Parent = leaderstats',
  '',
  '\tlocal ok, saved = pcall(function()',
  '\t\treturn CoinsStore:GetAsync("coins-" .. player.UserId)',
  '\tend)',
  '\tif ok and typeof(saved) == "number" then',
  '\t\tcoins.Value = saved',
  '\tend',
  'end',
  '',
  'Players.PlayerAdded:Connect(setupLeaderstats)',
  '',
  'Players.PlayerRemoving:Connect(function(player)',
  '\tlocal stats = player:FindFirstChild("leaderstats")',
  '\tlocal coins = stats and stats:FindFirstChild("Coins")',
  '\tif coins then',
  '\t\tpcall(function()',
  '\t\t\tCoinsStore:SetAsync("coins-" .. player.UserId, coins.Value)',
  '\t\tend)',
  '\tend',
  'end)',
  ''
].join('\n')

/** Dấu hiệu block DataStore đã tồn tại ngay trước đó (để không gợi ý lặp). */
const DATASTORE_MARKER = 'CoinsStore:SetAsync'

const CONNECT_SNIPPET = [
  'function(player)',
  '\tprint("Welcome, " .. player.Name)',
  'end)'
].join('\n')

const FUNCTION_TAIL = '\n\t-- TODO\nend'
const IF_TAIL = '\n\t-- TODO\nend'

function lastNonBlank(lines: string[], skipLast: boolean): string {
  const arr = skipLast ? lines.slice(0, -1) : lines
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i].trim() !== '') return arr[i]
  }
  return ''
}

/**
 * Đoán gợi ý từ ngữ cảnh. Trả về text chèn SAU con trỏ (không thay thế text đã gõ).
 */
export function getGhostSuggestion(ctx: GhostContext): string | null {
  const line = ctx.currentLineBeforeCursor ?? ''
  const prefix = ctx.fullPrefix ?? ''
  const tail = prefix.slice(-800)

  // 0. Tránh gợi ý trùng: ngay sau con trỏ đã là phần đầu của snippet leaderstats.
  if (
    ctx.afterCursor &&
    ctx.afterCursor.length > 0 &&
    LEADERSTATS_SNIPPET.startsWith(ctx.afterCursor.slice(0, 24))
  ) {
    return null
  }

  // 1. BẮT BUỘC: gõ "leaderstats" -> gợi ý nguyên block DataStore + leaderstats.
  const leaderOnCurrentLine = /leaderstats/i.test(line)
  if (leaderOnCurrentLine) {
    return LEADERSTATS_SNIPPET
  }
  // Con trỏ ở dòng trống, dòng code gần nhất phía trên nhắc leaderstats,
  // mà block DataStore chưa có -> gợi ý luôn.
  if (/^\s*$/.test(line)) {
    const prev = lastNonBlank(ctx.linesBefore, true)
    if (/leaderstats/i.test(prev) && !tail.includes(DATASTORE_MARKER)) {
      return LEADERSTATS_SNIPPET
    }
  }

  // 2. Các mẫu mock thêm cho giống Copilot (chỉ khi dòng hiện tại khớp rõ).
  // Con trỏ đứng ngay sau "Connect(" -> chèn function vào trong ngoặc.
  if (/PlayerAdded\s*:\s*Connect\(\s*$/.test(line)) {
    return CONNECT_SNIPPET
  }
  // "local part = Instance.new("Part")" -> gợi ý gán thuộc tính cho đúng tên biến.
  const partMatch = line.match(/local\s+(\w+)\s*=\s*Instance\.new\(\s*"Part"\s*\)\s*$/)
  if (partMatch) {
    const name = partMatch[1]
    return [
      '',
      `${name}.Anchored = true`,
      `${name}.Size = Vector3.new(4, 1, 2)`,
      `${name}.Position = Vector3.new(0, 10, 0)`,
      `${name}.Parent = workspace`
    ].join('\n')
  }
  if (/^\s*(local\s+)?function\b.*\)\s*$/.test(line)) {
    return FUNCTION_TAIL
  }
  if (/^\s*if\b.*\bthen\s*$/.test(line)) {
    return IF_TAIL
  }

  // 3. Gợi ý theo tiền tố: gõ `print` -> mờ thêm `("hello world")`, v.v.
  // (suggestion được CHÈN SAU con trỏ nên chỉ trả về phần còn thiếu).
  // Bỏ qua dòng comment để khỏi gợi ý linh tinh.
  if (!/^\s*--/.test(line)) {
    const tail = prefixTail(line)
    if (tail) return tail
    const rest = completePartialWord(line)
    if (rest) return rest
  }

  return null
}

/** Đuôi gợi ý cho những đầu câu lệnh quen thuộc (khớp từ biên từ). */
function prefixTail(line: string): string | null {
  if (/(^|[^A-Za-z0-9_.:])print$/.test(line)) return '("hello world")'
  if (/print\($/.test(line)) return '"hello world")'
  if (/game:GetService\($/.test(line)) return '"Players")'
  if (/Instance\.new\($/.test(line)) return '"Part")'
  if (/task\.wait\($/.test(line)) return '1)'
  if (/Vector3\.new\($/.test(line)) return '0, 0, 0)'
  if (/CFrame\.new\($/.test(line)) return '0, 0, 0)'
  if (/require\($/.test(line)) return 'script.Parent.Module)'
  return null
}

/** Từ khóa/dựng sẵn để hoàn thành khi user mới gõ dở (vd `loc` -> `al`). */
const PREFIX_WORDS = [
  'and', 'break', 'continue', 'do', 'else', 'elseif', 'end', 'export',
  'false', 'for', 'function', 'if', 'in', 'local', 'nil', 'not', 'or',
  'repeat', 'return', 'self', 'then', 'true', 'type', 'typeof', 'until',
  'while', 'game', 'workspace', 'script', 'Players', 'TweenService',
  'ReplicatedStorage', 'Instance', 'Vector3', 'CFrame', 'task', 'print',
  'warn', 'require', 'pairs', 'ipairs', 'tick', 'Enum', 'Color3',
  'BrickColor', 'TweenInfo', 'table', 'string', 'math', 'pcall',
  'tostring', 'tonumber', 'assert', 'error', 'select'
]

/** Nếu cuối dòng là 1 từ đang gõ dở, trả về phần còn thiếu của từ đó. */
function completePartialWord(line: string): string | null {
  const m = line.match(/([A-Za-z_]\w*)$/)
  if (!m) return null
  const word = m[1]
  if (word.length < 2) return null
  for (const cand of PREFIX_WORDS) {
    if (cand.length > word.length && cand.startsWith(word)) {
      return cand.slice(word.length)
    }
  }
  return null
}
