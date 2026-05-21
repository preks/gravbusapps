/**
 * Diagnostic logger for Every Fabric.
 *
 * Wraps `console.{info,warn,error,debug}` with a structured envelope so
 * the backend can correlate frontend logs with backend session/turn
 * IDs via `@browser-echo/vite`. Each emitted record carries:
 *
 *  - `app`: "every-fabric"
 *  - `category`: a short logical channel (e.g. `sse`, `session`, `trace`)
 *  - `session_id` / `turn_id`: current correlation context
 *  - `url`: window.location.pathname (best-effort)
 *  - `payload`: caller-supplied structured fields
 *
 * Frontend code should call `setFabricLogContext({ session_id, turn_id })`
 * when a new session starts and `clearFabricLogContext()` when it ends.
 * The logger remains useful even when no context is set (records simply
 * omit the missing fields).
 *
 * This logger is intentionally console-based so it integrates with the
 * existing `@browser-echo/vite` plugin in `vite.config.ts` — no new
 * network endpoint, no new transport. The structured JSON envelope means
 * `scripts/agent_debug_context --include-logs` can grep by session_id.
 */

export type FabricLogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface FabricLogContext {
  session_id?: string | null
  turn_id?: string | null
  workspace_id?: string | null
  user_id?: string | null
}

export interface FabricLogRecord extends FabricLogContext {
  app: 'every-fabric'
  ts: string
  level: FabricLogLevel
  category: string
  message: string
  url?: string | null
  payload?: Record<string, unknown>
}

let _context: FabricLogContext = {}

export function setFabricLogContext(next: FabricLogContext): void {
  _context = {
    ..._context,
    ...next
  }
}

export function clearFabricLogContext(): void {
  _context = {}
}

export function getFabricLogContext(): FabricLogContext {
  return { ..._context }
}

function _currentUrl(): string | null {
  try {
    const win = globalThis.window
    if (win?.location) {
      return win.location.pathname + win.location.search
    }
  } catch {
    // ignore
  }
  return null
}

function _consoleFnForLevel(level: FabricLogLevel): typeof console.info {
  switch (level) {
    case 'error':
      return console.error
    case 'warn':
      return console.warn
    case 'debug':
      return console.debug
    default:
      return console.info
  }
}

function _emit(level: FabricLogLevel, category: string, message: string, payload?: Record<string, unknown>): void {
  const record: FabricLogRecord = {
    app: 'every-fabric',
    ts: new Date().toISOString(),
    level,
    category,
    message,
    url: _currentUrl(),
    ..._context,
    payload
  }

  const tag = `[fabric:${category}]`
  const consoleFn = _consoleFnForLevel(level)
  try {
    consoleFn.call(console, tag, JSON.stringify(record))
  } catch {
    consoleFn.call(console, tag, record)
  }
}

export const fabricLog = {
  debug(category: string, message: string, payload?: Record<string, unknown>): void {
    _emit('debug', category, message, payload)
  },
  info(category: string, message: string, payload?: Record<string, unknown>): void {
    _emit('info', category, message, payload)
  },
  warn(category: string, message: string, payload?: Record<string, unknown>): void {
    _emit('warn', category, message, payload)
  },
  error(category: string, message: string, payload?: Record<string, unknown>): void {
    _emit('error', category, message, payload)
  }
}

export default fabricLog
