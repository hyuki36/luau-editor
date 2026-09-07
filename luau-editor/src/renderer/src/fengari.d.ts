// Type tối thiểu cho API fengari mà app dùng (khớp runtime đã kiểm chứng,
// fengari không kèm types). Không có @types/fengari trên npm.
declare module 'fengari' {
  export type lua_State = any
  export function to_luastring(s: string): Uint8Array
  export namespace lua {
    const LUA_OK: number
    const LUA_MASKCOUNT: number
    function lua_gettop(L: lua_State): number
    function lua_pushjsfunction(L: lua_State, fn: (L: lua_State) => number): void
    function lua_setglobal(L: lua_State, name: string): void
    function lua_tojsstring(L: lua_State, idx: number): string
    function lua_pop(L: lua_State, n: number): void
    function lua_sethook(
      L: lua_State,
      fn: (L: lua_State) => void,
      mask: number,
      count: number
    ): void
  }
  export namespace lauxlib {
    function luaL_newstate(): lua_State
    function luaL_dostring(L: lua_State, code: Uint8Array): number
    function luaL_tolstring(L: lua_State, idx: number, len: null): unknown
    function luaL_error(L: lua_State, msg: string): never
  }
  export namespace lualib {
    function luaL_openlibs(L: lua_State): void
  }
}
