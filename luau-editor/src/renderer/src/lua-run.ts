import { lua, lauxlib, lualib, to_luastring } from 'fengari'
import type { Lang } from './i18n'

export interface RunResult {
  /** Các dòng print() thu được. */
  lines: string[]
  /** Lỗi runtime/cú pháp (nếu có). */
  error?: string
  /** Ghi chú thêm (vd: giới hạn sandbox). */
  note?: string
}

/** Các global Roblox hay gặp — sandbox không có, báo gợi ý rõ ràng. */
const ROBLOX_GLOBALS = [
  'game', 'workspace', 'script', 'plugin', 'owner', 'Instance', 'Players',
  'Vector3', 'CFrame', 'UDim2', 'Color3', 'BrickColor', 'Enum', 'TweenInfo',
  'NumberRange', 'Ray', 'task'
]

const SANDBOX_NOTE: Record<Lang, string> = {
  vi: 'Sandbox chỉ chạy subset Lua cơ bản — API Roblox (game, Instance...) và cú pháp Luau-only (type, continue, +=) sẽ báo lỗi. Muốn test full, chạy trong Roblox Studio.',
  en: 'Sandbox runs a basic Lua subset only — Roblox APIs (game, Instance...) and Luau-only syntax (types, continue, +=) will error. For full testing, run in Roblox Studio.'
}

/** Chặn vòng lặp vô hạn: ngắt sau chừng này lệnh Lua. */
const MAX_STEPS = 500000
/** Chặn output flood: chỉ giữ chừng này dòng đầu. */
const MAX_LINES = 200

/**
 * Chạy thử code trong sandbox Lua local (offline 100%, không chạm vào Roblox).
 * Hỗ trợ subset Lua tương thích: print, biến, hàm, vòng lặp, table, string...
 * KHÔNG hỗ trợ API Roblox (game, Instance...) và cú pháp Luau-only
 * (type annotation, `continue`, `+=`...) — sẽ báo lỗi cú pháp rõ ràng.
 */
export function runLuauSnippet(code: string, lang: Lang): RunResult {
  const vi = lang === 'vi'
  const lines: string[] = []
  try {
    const L = lauxlib.luaL_newstate()
    lualib.luaL_openlibs(L)

    // Chống treo app khi code có vòng lặp vô hạn
    let steps = 0
    const timeoutMsg = vi
      ? 'Hết giờ (quá 500.000 lệnh) — có vòng lặp vô hạn?'
      : 'Timed out (over 500,000 instructions) — infinite loop?'
    lua.lua_sethook(
      L,
      (HL) => {
        steps++
        if (steps > MAX_STEPS) lauxlib.luaL_error(HL, timeoutMsg)
      },
      lua.LUA_MASKCOUNT,
      1000
    )

    // Gom print() về mảng thay vì in ra console
    lua.lua_pushjsfunction(L, (L2) => {
      const n = lua.lua_gettop(L2)
      const parts: string[] = []
      for (let i = 1; i <= n; i++) {
        lauxlib.luaL_tolstring(L2, i, null) // đẩy chuỗi lên stack
        parts.push(lua.lua_tojsstring(L2, -1))
        lua.lua_pop(L2, 1)
      }
      if (lines.length < MAX_LINES) lines.push(parts.join('\t'))
      return 0
    })
    lua.lua_setglobal(L, 'print')

    const status = lauxlib.luaL_dostring(L, to_luastring(code))
    if (status !== lua.LUA_OK) {
      const raw = lua.lua_tojsstring(L, -1) || 'Unknown error'
      const error = String(raw)
      const looksSyntax = /syntax|unexpected|expected|near/i.test(error)
      const nilGlobal = error.match(/nil value \(global '(\w+)'\)/)
      const isRobloxApi =
        nilGlobal !== null && ROBLOX_GLOBALS.includes(nilGlobal[1])
      return {
        lines,
        error,
        note: looksSyntax || isRobloxApi ? SANDBOX_NOTE[lang] : undefined
      }
    }
    return { lines }
  } catch (e) {
    return { lines, error: String(e) }
  }
}
