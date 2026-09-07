/**
 * Kho scripts LOCAL (offline 100%) cho tab Scripts.
 * - Ví dụ học tập có sẵn: các pattern Roblox dev chuẩn, chạy trong Studio.
 * - Script người dùng tự lưu (localStorage).
 * KHÔNG nối API ngoài (rscripts/scriptblox...).
 */

export interface ScriptEntry {
  id: string
  title: string
  desc: string
  code: string
  builtin?: boolean
}

export const BUILTIN_SCRIPTS: ScriptEntry[] = [
  {
    id: 'builtin-leaderstats',
    title: 'DataStore + leaderstats',
    desc: 'Coins leaderboard lưu lâu dài (ServerScriptService)',
    builtin: true,
    code: [
      'local DataStoreService = game:GetService("DataStoreService")',
      'local CoinsStore = DataStoreService:GetDataStore("Coins")',
      'local Players = game:GetService("Players")',
      '',
      'local function setupLeaderstats(player)',
      '\tlocal leaderstats = Instance.new("Folder")',
      '\tleaderstats.Name = "leaderstats"',
      '\tleaderstats.Parent = player',
      '',
      '\tlocal coins = Instance.new("IntValue")',
      '\tcoins.Name = "Coins"',
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
      'end)'
    ].join('\n')
  },
  {
    id: 'builtin-tween-door',
    title: 'Tween sliding door',
    desc: 'Cửa trượt mượt bằng TweenService (Touched)',
    builtin: true,
    code: [
      'local TweenService = game:GetService("TweenService")',
      '',
      'local door = script.Parent',
      'local openPos = door.Position + Vector3.new(0, 0, -6)',
      'local closedPos = door.Position',
      'local isOpen = false',
      'local busy = false',
      '',
      'local function toggle()',
      '\tif busy then return end',
      '\tbusy = true',
      '\tisOpen = not isOpen',
      '\tlocal tween = TweenService:Create(',
      '\t\tdoor,',
      '\t\tTweenInfo.new(1, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),',
      '\t\t{ Position = isOpen and openPos or closedPos }',
      '\t)',
      '\ttween:Play()',
      '\ttween.Completed:Wait()',
      '\tbusy = false',
      'end',
      '',
      'door.Touched:Connect(toggle)'
    ].join('\n')
  },
  {
    id: 'builtin-remote-greet',
    title: 'RemoteEvent greeting',
    desc: 'Client gửi — server chào lại (ReplicatedStorage)',
    builtin: true,
    code: [
      '-- Server Script: dat RemoteEvent ten "Greet" trong ReplicatedStorage',
      'local ReplicatedStorage = game:GetService("ReplicatedStorage")',
      'local greetEvent = ReplicatedStorage:WaitForChild("Greet")',
      '',
      'greetEvent.OnServerEvent:Connect(function(player, message)',
      '\tprint(player.Name .. " says: " .. tostring(message))',
      '\tgreetEvent:FireClient(player, "Hello, " .. player.Name .. "!")',
      'end)',
      '',
      '-- LocalScript phia client:',
      '-- greetEvent:FireServer("hi")'
    ].join('\n')
  },
  {
    id: 'builtin-day-night',
    title: 'Day / night cycle',
    desc: 'Vòng ngày đêm bằng Lighting.ClockTime',
    builtin: true,
    code: [
      'local Lighting = game:GetService("Lighting")',
      '',
      'local DAY_LENGTH = 300 -- giay cho 1 ngay',
      '',
      'while true do',
      '\tLighting.ClockTime = (Lighting.ClockTime + 24 / DAY_LENGTH) % 24',
      '\ttask.wait(1)',
      'end'
    ].join('\n')
  },
  {
    id: 'builtin-click-door',
    title: 'ClickDetector door',
    desc: 'Bấm để mở/đóng part (Server)',
    builtin: true,
    code: [
      'local part = script.Parent',
      'local click = Instance.new("ClickDetector")',
      'click.MaxActivationDistance = 12',
      'click.Parent = part',
      '',
      'local open = false',
      'click.MouseClick:Connect(function(player)',
      '\topen = not open',
      '\tpart.Transparency = open and 0.5 or 0',
      '\tpart.CanCollide = not open',
      '\tprint(player.Name .. (open and " opened" or " closed") .. " the door")',
      'end)'
    ].join('\n')
  },
  {
    id: 'builtin-coin-spin',
    title: 'Spinning coin',
    desc: 'Đồng xu xoay + phát sáng (RunService)',
    builtin: true,
    code: [
      'local RunService = game:GetService("RunService")',
      '',
      'local coin = script.Parent',
      'local spinSpeed = math.rad(120)',
      '',
      'RunService.Heartbeat:Connect(function(dt)',
      '\tcoin.CFrame = coin.CFrame * CFrame.Angles(0, spinSpeed * dt, 0)',
      'end)'
    ].join('\n')
  }
]

const USER_KEY = 'eras:scripts'

export function loadUserScripts(): ScriptEntry[] {
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as ScriptEntry[]
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export function saveUserScripts(list: ScriptEntry[]): void {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}
