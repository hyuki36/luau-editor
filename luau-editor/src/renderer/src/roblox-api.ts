import type * as Monaco from 'monaco-editor'

/**
 * Roblox Luau API — 100% OFFLINE, tối ưu tốc độ.
 *
 * - Toàn bộ dữ liệu nằm tĩnh trong file này: không fetch, không CDN, không async.
 * - Completion: dữ liệu gốc (ROBLOX_ENTRIES) được build sẵn ở module-scope;
 *   mỗi lần gõ chỉ map thêm `range` (~90 object nhỏ) và để Monaco tự lọc fuzzy.
 * - Hover: chỉ đọc 1 dòng tại con trỏ + regex, không quét cả file.
 */

export type RobloxKind = 'service' | 'class' | 'method' | 'function' | 'snippet' | 'keyword'

export interface RobloxEntry {
  label: string
  kind: RobloxKind
  /** Text chèn vào. Snippet dùng cú pháp ${1:...} với tab-stop. */
  insertText: string
  /** true nếu insertText chứa tab-stop ${...} (cần InsertAsSnippet). */
  isSnippet?: boolean
  detail?: string
  /** Docs Markdown ngắn — hiện ở panel gợi ý. */
  doc?: string
}

// ---------------------------------------------------------------------------
// Services (game, workspace, Players, TweenService, ReplicatedStorage, ...)
// ---------------------------------------------------------------------------

const SERVICES: RobloxEntry[] = [
  {
    label: 'game',
    kind: 'service',
    insertText: 'game',
    detail: 'Service — DataModel root',
    doc: '**game** — gốc của DataModel.\n\nLấy service qua `GetService`:\n\n```lua\nlocal Players = game:GetService("Players")\n```'
  },
  {
    label: 'workspace',
    kind: 'service',
    insertText: 'workspace',
    detail: 'Service — thế giới 3D',
    doc: '**workspace** — chứa Part/Model trong map.\n\n```lua\nlocal spawn = workspace:FindFirstChild("SpawnLocation")\n```'
  },
  {
    label: 'Players',
    kind: 'service',
    insertText: 'Players',
    detail: 'Service — người chơi',
    doc: '**Players** — quản lý người chơi vào/ra.\n\n```lua\nlocal Players = game:GetService("Players")\nPlayers.PlayerAdded:Connect(function(player)\n\tprint(player.Name)\nend)\n-- Client: Players.LocalPlayer\n```'
  },
  {
    label: 'TweenService',
    kind: 'service',
    insertText: 'TweenService',
    detail: 'Service — animation mượt',
    doc: '**TweenService** — tạo tween chuyển động mượt.\n\n```lua\nlocal TS = game:GetService("TweenService")\nTS:Create(part, TweenInfo.new(1), { Position = Vector3.new(0, 10, 0) }):Play()\n```'
  },
  {
    label: 'ReplicatedStorage',
    kind: 'service',
    insertText: 'ReplicatedStorage',
    detail: 'Service — share client/server',
    doc: '**ReplicatedStorage** — chứa đồ dùng chung client + server (RemoteEvent, ModuleScript...).\n\n```lua\nlocal RS = game:GetService("ReplicatedStorage")\nlocal event = RS:WaitForChild("MyEvent")\n```'
  },
  { label: 'ServerScriptService', kind: 'service', insertText: 'ServerScriptService', detail: 'Service — script server', doc: '**ServerScriptService** — chứa Script chạy phía server.' },
  { label: 'ServerStorage', kind: 'service', insertText: 'ServerStorage', detail: 'Service — lưu trữ server', doc: '**ServerStorage** — lưu đồ chỉ server thấy (map mẫu, tool...).' },
  { label: 'StarterGui', kind: 'service', insertText: 'StarterGui', detail: 'Service — UI khởi đầu', doc: '**StarterGui** — UI được clone cho mỗi player khi vào game.' },
  { label: 'Lighting', kind: 'service', insertText: 'Lighting', detail: 'Service — ánh sáng', doc: '**Lighting** — chỉnh sáng, bầu trời, hiệu ứng (Atmosphere, Bloom...).' },
  { label: 'SoundService', kind: 'service', insertText: 'SoundService', detail: 'Service — âm thanh', doc: '**SoundService** — phát/điều khiển âm thanh toàn game.' },
  { label: 'RunService', kind: 'service', insertText: 'RunService', detail: 'Service — vòng lặp game', doc: '**RunService** — `Heartbeat`, `RenderStepped`: chạy code mỗi frame.' },
  { label: 'UserInputService', kind: 'service', insertText: 'UserInputService', detail: 'Service — input', doc: '**UserInputService** — bắt phím/chuột/cảm ứng phía client.' },
  { label: 'DataStoreService', kind: 'service', insertText: 'DataStoreService', detail: 'Service — lưu data', doc: '**DataStoreService** — lưu dữ liệu lâu dài (`GetDataStore`, `GetAsync`, `SetAsync`).' },
  { label: 'HttpService', kind: 'service', insertText: 'HttpService', detail: 'Service — HTTP/JSON', doc: '**HttpService** — gọi web API, `JSONEncode`/`JSONDecode`.' },
  { label: 'Debris', kind: 'service', insertText: 'Debris', detail: 'Service — dọn rác', doc: '**Debris** — tự hủy object sau N giây: `Debris:AddItem(part, 5)`.' },
  { label: 'Teams', kind: 'service', insertText: 'Teams', detail: 'Service — đội', doc: '**Teams** — chia đội cho player (`player.Team`).' },
  { label: 'MarketplaceService', kind: 'service', insertText: 'MarketplaceService', detail: 'Service — mua bán', doc: '**MarketplaceService** — bán GamePass/DevProduct (`PromptPurchase`).' },
  { label: 'TeleportService', kind: 'service', insertText: 'TeleportService', detail: 'Service — chuyển map', doc: '**TeleportService** — chuyển player sang place khác (`Teleport`).' }
]

// ---------------------------------------------------------------------------
// Methods (gõ sau `:` / `.`)
// ---------------------------------------------------------------------------

const METHODS: RobloxEntry[] = [
  { label: 'GetService', kind: 'method', insertText: 'GetService', detail: 'method — game', doc: '`game:GetService("Players")` — lấy service theo tên.' },
  { label: 'FindFirstChild', kind: 'method', insertText: 'FindFirstChild', detail: 'method — Instance', doc: '`parent:FindFirstChild("Tên")` — tìm con trực tiếp, nil nếu không có.' },
  { label: 'WaitForChild', kind: 'method', insertText: 'WaitForChild', detail: 'method — Instance', doc: '`parent:WaitForChild("Tên")` — chờ tới khi con xuất hiện (yield).' },
  { label: 'FindFirstAncestor', kind: 'method', insertText: 'FindFirstAncestor', detail: 'method — Instance' },
  { label: 'GetChildren', kind: 'method', insertText: 'GetChildren', detail: 'method — Instance' },
  { label: 'GetDescendants', kind: 'method', insertText: 'GetDescendants', detail: 'method — Instance' },
  { label: 'Clone', kind: 'method', insertText: 'Clone', detail: 'method — Instance' },
  { label: 'Destroy', kind: 'method', insertText: 'Destroy', detail: 'method — Instance' },
  { label: 'Connect', kind: 'method', insertText: 'Connect', detail: 'method — Event', doc: '`event:Connect(function(...) end)` — đăng ký lắng nghe sự kiện.' },
  { label: 'FireServer', kind: 'method', insertText: 'FireServer', detail: 'method — RemoteEvent', doc: '`event:FireServer(...)` — client gửi lên server.' },
  { label: 'FireClient', kind: 'method', insertText: 'FireClient', detail: 'method — RemoteEvent', doc: '`event:FireClient(player, ...)` — server gửi cho 1 client.' },
  { label: 'FireAllClients', kind: 'method', insertText: 'FireAllClients', detail: 'method — RemoteEvent' },
  { label: 'InvokeServer', kind: 'method', insertText: 'InvokeServer', detail: 'method — RemoteFunction' },
  { label: 'OnServerEvent', kind: 'method', insertText: 'OnServerEvent', detail: 'event — RemoteEvent' },
  { label: 'OnClientEvent', kind: 'method', insertText: 'OnClientEvent', detail: 'event — RemoteEvent' },
  { label: 'Create', kind: 'method', insertText: 'Create', detail: 'method — TweenService', doc: '`TweenService:Create(obj, TweenInfo.new(1), { Position = ... })`.' },
  { label: 'Play', kind: 'method', insertText: 'Play', detail: 'method — Tween/Sound' },
  { label: 'GetAsync', kind: 'method', insertText: 'GetAsync', detail: 'method — DataStore' },
  { label: 'SetAsync', kind: 'method', insertText: 'SetAsync', detail: 'method — DataStore' },
  { label: 'Kick', kind: 'method', insertText: 'Kick', detail: 'method — Player' }
]

// ---------------------------------------------------------------------------
// Instance classes (dùng với Instance.new("..."))
// ---------------------------------------------------------------------------

const CLASSES: RobloxEntry[] = [
  { label: 'Part', kind: 'class', insertText: 'Part', detail: 'Instance class', doc: '**Part** — khối gạch cơ bản trong world.' },
  { label: 'Model', kind: 'class', insertText: 'Model', detail: 'Instance class', doc: '**Model** — nhóm nhiều Part (`:PivotTo()`, `PrimaryPart`).' },
  { label: 'Folder', kind: 'class', insertText: 'Folder', detail: 'Instance class', doc: '**Folder** — nhóm đồ trong Explorer (vd: `leaderstats`).' },
  { label: 'Script', kind: 'class', insertText: 'Script', detail: 'Instance class', doc: '**Script** — chạy phía server.' },
  { label: 'LocalScript', kind: 'class', insertText: 'LocalScript', detail: 'Instance class', doc: '**LocalScript** — chạy phía client.' },
  { label: 'ModuleScript', kind: 'class', insertText: 'ModuleScript', detail: 'Instance class', doc: '**ModuleScript** — module dùng chung qua `require()`.' },
  { label: 'RemoteEvent', kind: 'class', insertText: 'RemoteEvent', detail: 'Instance class', doc: '**RemoteEvent** — client/server bắn sự kiện 1 chiều (`FireServer`).' },
  { label: 'RemoteFunction', kind: 'class', insertText: 'RemoteFunction', detail: 'Instance class', doc: '**RemoteFunction** — gọi hàm xuyên client/server (`InvokeServer`).' },
  { label: 'BindableEvent', kind: 'class', insertText: 'BindableEvent', detail: 'Instance class' },
  { label: 'IntValue', kind: 'class', insertText: 'IntValue', detail: 'Instance class', doc: '**IntValue** — chứa số nguyên (vd: Coins trong leaderstats).' },
  { label: 'NumberValue', kind: 'class', insertText: 'NumberValue', detail: 'Instance class' },
  { label: 'StringValue', kind: 'class', insertText: 'StringValue', detail: 'Instance class' },
  { label: 'BoolValue', kind: 'class', insertText: 'BoolValue', detail: 'Instance class' },
  { label: 'ObjectValue', kind: 'class', insertText: 'ObjectValue', detail: 'Instance class' },
  { label: 'ScreenGui', kind: 'class', insertText: 'ScreenGui', detail: 'Instance class' },
  { label: 'Frame', kind: 'class', insertText: 'Frame', detail: 'Instance class' },
  { label: 'TextLabel', kind: 'class', insertText: 'TextLabel', detail: 'Instance class' },
  { label: 'TextButton', kind: 'class', insertText: 'TextButton', detail: 'Instance class' },
  { label: 'Humanoid', kind: 'class', insertText: 'Humanoid', detail: 'Instance class', doc: '**Humanoid** — điều khiển nhân vật (`Health`, `WalkSpeed`, `LoadAnimation`).' },
  { label: 'Tool', kind: 'class', insertText: 'Tool', detail: 'Instance class' }
]

// ---------------------------------------------------------------------------
// Globals / constructors
// ---------------------------------------------------------------------------

const FUNCTIONS: RobloxEntry[] = [
  { label: 'Instance.new', kind: 'function', insertText: 'Instance.new("${1:Part}")', isSnippet: true, detail: 'Instance.new(className)', doc: 'Tạo Instance mới. Hover để xem docs + ví dụ.' },
  { label: 'Vector3.new', kind: 'function', insertText: 'Vector3.new(${1:0}, ${2:0}, ${3:0})', isSnippet: true, detail: 'Vector3.new(x, y, z)' },
  { label: 'CFrame.new', kind: 'function', insertText: 'CFrame.new(${1:0}, ${2:0}, ${3:0})', isSnippet: true, detail: 'CFrame.new(x, y, z)' },
  { label: 'UDim2.new', kind: 'function', insertText: 'UDim2.new(${1:0}, ${2:0}, ${3:0})', isSnippet: true, detail: 'UDim2.new(sx, ox, sy, oy)' },
  { label: 'Color3.fromRGB', kind: 'function', insertText: 'Color3.fromRGB(${1:255}, ${2:255}, ${3:255})', isSnippet: true, detail: 'Color3.fromRGB(r, g, b)' },
  { label: 'TweenInfo.new', kind: 'function', insertText: 'TweenInfo.new(${1:1})', isSnippet: true, detail: 'TweenInfo.new(time)' },
  { label: 'BrickColor.new', kind: 'function', insertText: 'BrickColor.new("${1:Bright red}")', isSnippet: true, detail: 'BrickColor.new(name)' },
  { label: 'task.wait', kind: 'function', insertText: 'task.wait', detail: 'task — chờ N giây' },
  { label: 'task.spawn', kind: 'function', insertText: 'task.spawn', detail: 'task — chạy thread mới' },
  { label: 'task.delay', kind: 'function', insertText: 'task.delay', detail: 'task — hẹn giờ chạy' },
  { label: 'task.defer', kind: 'function', insertText: 'task.defer', detail: 'task — chạy cuối frame' },
  { label: 'typeof', kind: 'function', insertText: 'typeof', detail: 'Luau — kiểu runtime' },
  { label: 'require', kind: 'function', insertText: 'require', detail: 'Luau — nạp ModuleScript' },
  { label: 'print', kind: 'function', insertText: 'print', detail: 'global — in log' },
  { label: 'warn', kind: 'function', insertText: 'warn', detail: 'global — log vàng' },
  { label: 'tick', kind: 'function', insertText: 'tick', detail: 'global — thời gian' },
  { label: 'pairs', kind: 'function', insertText: 'pairs', detail: 'Lua — duyệt dict' },
  { label: 'ipairs', kind: 'function', insertText: 'ipairs', detail: 'Lua — duyệt mảng' },
  { label: 'tostring', kind: 'function', insertText: 'tostring', detail: 'Lua — sang string' },
  { label: 'tonumber', kind: 'function', insertText: 'tonumber', detail: 'Lua — sang number' },
  { label: 'Enum', kind: 'function', insertText: 'Enum', detail: 'Roblox — enum' },
  { label: 'script', kind: 'function', insertText: 'script', detail: 'script đang chạy' }
]

// ---------------------------------------------------------------------------
// Snippets: LocalScript, ModuleScript, RemoteEvent (+ keywords Luau cơ bản)
// ---------------------------------------------------------------------------

const SNIPPETS: RobloxEntry[] = [
  {
    label: 'LocalScript',
    kind: 'snippet',
    insertText: [
      '-- LocalScript: chay tren Client (StarterPlayerScripts / StarterGui)',
      'local Players = game:GetService("Players")',
      'local player = Players.LocalPlayer',
      '',
      '${1:-- code o day}'
    ].join('\n'),
    isSnippet: true,
    detail: 'Snippet — LocalScript boilerplate',
    doc: 'Khung LocalScript: lấy `LocalPlayer`, code chạy phía client.'
  },
  {
    label: 'ModuleScript',
    kind: 'snippet',
    insertText: [
      'local ${1:ModuleName} = {}',
      '',
      'function ${1:ModuleName}.${2:Hello}()',
      '\t${3:-- TODO}',
      'end',
      '',
      'return ${1:ModuleName}'
    ].join('\n'),
    isSnippet: true,
    detail: 'Snippet — ModuleScript boilerplate',
    doc: 'Khung ModuleScript: `local M = {} ... return M`, dùng qua `require()`.'
  },
  {
    label: 'RemoteEvent',
    kind: 'snippet',
    insertText: [
      '-- RemoteEvent ${1:EventName} (dat trong ReplicatedStorage)',
      'local ReplicatedStorage = game:GetService("ReplicatedStorage")',
      'local ${1:EventName} = Instance.new("RemoteEvent")',
      '${1:EventName}.Name = "${1:EventName}"',
      '${1:EventName}.Parent = ReplicatedStorage',
      '',
      '-- Server nhan:',
      '${1:EventName}.OnServerEvent:Connect(function(player${2:, ...})',
      '\t${3:-- TODO}',
      'end)',
      '-- Client gui: ${1:EventName}:FireServer(${2:...})'
    ].join('\n'),
    isSnippet: true,
    detail: 'Snippet — RemoteEvent server+client',
    doc: 'Khung RemoteEvent: tạo trong ReplicatedStorage + `OnServerEvent` + ví dụ `FireServer`.'
  }
]

const KEYWORDS: RobloxEntry[] = [
  { label: 'local function', kind: 'keyword', insertText: 'local function', detail: 'Luau keyword' },
  { label: 'function', kind: 'keyword', insertText: 'function', detail: 'Luau keyword' },
  { label: 'if then end', kind: 'keyword', insertText: 'if then end', detail: 'Luau keyword' },
  { label: 'for i = 1, 10 do end', kind: 'keyword', insertText: 'for i = 1, 10 do end', detail: 'Luau keyword' },
  { label: 'while do end', kind: 'keyword', insertText: 'while do end', detail: 'Luau keyword' },
  { label: 'local', kind: 'keyword', insertText: 'local', detail: 'Luau keyword' },
  { label: 'return', kind: 'keyword', insertText: 'return', detail: 'Luau keyword' },
  { label: 'type', kind: 'keyword', insertText: 'type', detail: 'Luau keyword' },
  { label: 'export type', kind: 'keyword', insertText: 'export type', detail: 'Luau keyword' }
]

/** Toàn bộ entries — build 1 lần, tái dùng cho mọi lần gợi ý (tốc độ). */
const ALL_ENTRIES: RobloxEntry[] = [
  ...SERVICES,
  ...METHODS,
  ...CLASSES,
  ...FUNCTIONS,
  ...SNIPPETS,
  ...KEYWORDS
]

const KIND_ORDER: Record<RobloxKind, string> = {
  service: '0',
  class: '1',
  method: '2',
  function: '3',
  snippet: '4',
  keyword: '5'
}

function toMonacoKind(monaco: typeof Monaco, kind: RobloxKind): Monaco.languages.CompletionItemKind {
  switch (kind) {
    case 'service': return monaco.languages.CompletionItemKind.Module
    case 'class': return monaco.languages.CompletionItemKind.Class
    case 'method': return monaco.languages.CompletionItemKind.Method
    case 'function': return monaco.languages.CompletionItemKind.Function
    case 'snippet': return monaco.languages.CompletionItemKind.Snippet
    case 'keyword': return monaco.languages.CompletionItemKind.Keyword
  }
}

interface StaticItem {
  entry: RobloxEntry
  kind: Monaco.languages.CompletionItemKind
}

/** Phần tĩnh của suggestion (không phụ thuộc vị trí con trỏ) — cache 1 lần. */
let staticCache: StaticItem[] | null = null

function getStaticItems(monaco: typeof Monaco): StaticItem[] {
  if (!staticCache) {
    staticCache = ALL_ENTRIES.map((entry) => ({
      entry,
      kind: toMonacoKind(monaco, entry.kind)
    }))
  }
  return staticCache
}

/**
 * Build suggestions cho 1 lần gọi provider.
 * Chỉ tạo object mới để gán `range` theo vị trí hiện tại (~90 object nhẹ),
 * Monaco tự lọc fuzzy theo từ đang gõ — không lọc bằng JS để giữ tốc độ.
 */
export function buildRobloxCompletions(
  monaco: typeof Monaco,
  range: Monaco.IRange
): Monaco.languages.CompletionItem[] {
  const statics = getStaticItems(monaco)
  const snippetRule = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
  return statics.map((s) => {
    const e = s.entry
    const item: Monaco.languages.CompletionItem = {
      label: e.label,
      kind: s.kind,
      insertText: e.insertText,
      range,
      detail: e.detail,
      sortText: KIND_ORDER[e.kind] + '_' + e.label
    }
    if (e.doc) item.documentation = { value: e.doc }
    if (e.isSnippet) item.insertTextRules = snippetRule
    return item
  })
}

// ---------------------------------------------------------------------------
// Hover docs (thuần logic — dễ test, không phụ thuộc Monaco)
// ---------------------------------------------------------------------------

/** Docs ngắn khi hover vào `Instance.new`. */
export const INSTANCE_NEW_DOC = [
  '**Instance.new** — tạo một Instance Roblox mới.',
  '',
  '```lua',
  'local part = Instance.new("Part") -- className: string',
  'part.Anchored = true',
  'part.Parent = workspace',
  '```',
  '',
  'Nên gán `Parent` sau cùng để tránh tốn hiệu năng replicate.'
].join('\n')

const CLASS_DOCS: Record<string, string> = {
  Part: '**Part** — khối gạch cơ bản trong world.',
  Model: '**Model** — nhóm nhiều Part (`:PivotTo()`, `PrimaryPart`).',
  Folder: '**Folder** — nhóm đồ trong Explorer (vd: `leaderstats`).',
  Script: '**Script** — chạy phía server.',
  LocalScript: '**LocalScript** — chạy phía client.',
  ModuleScript: '**ModuleScript** — module dùng chung qua `require()`.',
  RemoteEvent: '**RemoteEvent** — client/server bắn sự kiện 1 chiều (`FireServer`).',
  RemoteFunction: '**RemoteFunction** — gọi hàm xuyên client/server (`InvokeServer`).',
  IntValue: '**IntValue** — chứa số nguyên (vd: Coins trong leaderstats).',
  Humanoid: '**Humanoid** — điều khiển nhân vật (`Health`, `WalkSpeed`).'
}

const CLASS_NAMES = new Set(CLASSES.map((c) => c.label))
const SERVICE_DOCS: Record<string, string> = {}
for (const s of SERVICES) {
  if (s.doc) SERVICE_DOCS[s.label] = s.doc
}

export interface HoverHit {
  startColumn: number
  endColumn: number
  doc: string
}

function isWordChar(ch: string): boolean {
  return /[A-Za-z0-9_]/.test(ch)
}

/**
 * Tìm docs cho vị trí hover. `column` theo chuẩn Monaco (1-based).
 * Ưu tiên `Instance.new`, sau đó là service, rồi tên class.
 */
export function getHoverDoc(lineText: string, column: number): HoverHit | null {
  // 1. Hover vào cụm `Instance.new`
  const needle = 'Instance.new'
  let from = 0
  for (;;) {
    const i = lineText.indexOf(needle, from)
    if (i < 0) break
    const startColumn = i + 1
    const endColumn = i + 1 + needle.length
    if (column >= startColumn && column <= endColumn) {
      return { startColumn, endColumn, doc: INSTANCE_NEW_DOC }
    }
    from = i + needle.length
  }

  // 2. Từ tại vị trí hover -> docs service / class
  const idx = Math.min(Math.max(column - 1, 0), lineText.length)
  let left = idx
  while (left > 0 && isWordChar(lineText[left - 1])) left--
  let right = idx
  while (right < lineText.length && isWordChar(lineText[right])) right++
  if (left >= right) return null
  const word = lineText.slice(left, right)

  const serviceDoc = SERVICE_DOCS[word]
  if (serviceDoc) {
    return { startColumn: left + 1, endColumn: right + 1, doc: serviceDoc }
  }
  const classDoc = CLASS_DOCS[word]
  if (classDoc) {
    return { startColumn: left + 1, endColumn: right + 1, doc: classDoc }
  }
  if (CLASS_NAMES.has(word)) {
    return {
      startColumn: left + 1,
      endColumn: right + 1,
      doc: `**${word}** — Instance class, dùng với \`Instance.new("${word}")\`.`
    }
  }
  return null
}
