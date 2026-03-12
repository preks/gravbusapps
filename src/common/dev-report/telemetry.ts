type ConsoleLevel = 'error' | 'warn'

export type DevReportConsoleEntry = {
  t: string
  level: ConsoleLevel
  message: string
}

export type DevReportNetworkEntry = {
  t: string
  method: string
  url: string
  status: number | null
  ok: boolean
  durationMs: number
}

export type DevReportTelemetrySnapshot = {
  console: DevReportConsoleEntry[]
  network: DevReportNetworkEntry[]
}

const MAX_CONSOLE = 40
const MAX_NETWORK = 40

let started = false
const consoleBuf: DevReportConsoleEntry[] = []
const networkBuf: DevReportNetworkEntry[] = []

function nowIso(): string {
  return new Date().toISOString()
}

function redactSecrets(input: string): string {
  let s = input
  // Bearer tokens
  s = s.replace(/Bearer\s+[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/g, 'Bearer [REDACTED]')
  // JWT-like strings
  s = s.replace(/[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/g, '[REDACTED_JWT]')
  return s
}

function safeStringify(value: unknown): string {
  if (typeof value === 'string') return value
  if (value instanceof Error) return `${value.name}: ${value.message}`
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function pushBounded<T>(buf: T[], item: T, max: number) {
  buf.push(item)
  while (buf.length > max) buf.shift()
}

function sanitizeUrl(raw: string): string {
  try {
    const url = new URL(raw, window.location.origin)
    const keys = Array.from(url.searchParams.keys())
      .filter(k => !/token|auth|password|secret|key/i.test(k))
      .slice(0, 10)
    const suffix = keys.length ? `?keys=${keys.join(',')}` : ''
    return `${url.origin}${url.pathname}${suffix}`
  } catch {
    return String(raw).slice(0, 300)
  }
}

export function startDevReportTelemetry(): void {
  if (started) return
  started = true

  const c = console as any
  const origError = c.error?.bind(console)
  const origWarn = c.warn?.bind(console)

  const capture = (level: ConsoleLevel, args: unknown[]) => {
    const raw = args.map(a => safeStringify(a)).join(' ')
    const msg = redactSecrets(raw).slice(0, 4000)
    pushBounded(consoleBuf, { t: nowIso(), level, message: msg }, MAX_CONSOLE)
  }

  if (origError) {
    console.error = (...args: unknown[]) => {
      capture('error', args)
      origError(...args)
    }
  }
  if (origWarn) {
    console.warn = (...args: unknown[]) => {
      capture('warn', args)
      origWarn(...args)
    }
  }

  const origFetch = globalThis.fetch?.bind(globalThis)
  if (origFetch) {
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const start = performance.now()
      const method = String(
        init?.method || (typeof input === 'object' && 'method' in (input as any) ? (input as any).method : 'GET')
      ).toUpperCase()
      const rawUrl =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url
      try {
        const resp = await origFetch(input as any, init as any)
        const dur = Math.max(0, Math.round(performance.now() - start))
        if (!resp.ok) {
          pushBounded(
            networkBuf,
            { t: nowIso(), method, url: sanitizeUrl(rawUrl), status: resp.status, ok: false, durationMs: dur },
            MAX_NETWORK
          )
        }
        return resp
      } catch (e) {
        const dur = Math.max(0, Math.round(performance.now() - start))
        pushBounded(
          networkBuf,
          { t: nowIso(), method, url: sanitizeUrl(rawUrl), status: null, ok: false, durationMs: dur },
          MAX_NETWORK
        )
        throw e
      }
    }
  }

  // XHR (covers axios and other libs)
  const XHR = (globalThis as any).XMLHttpRequest
  if (XHR?.prototype) {
    const origOpen = XHR.prototype.open
    const origSend = XHR.prototype.send

    XHR.prototype.open = function (...args: any[]) {
      try {
        ;(this as any).__devReportMethod = String(args[0] || 'GET').toUpperCase()
        ;(this as any).__devReportUrl = String(args[1] || '')
      } catch {
        // ignore
      }
      return origOpen.apply(this, args)
    }

    XHR.prototype.send = function (...args: any[]) {
      const start = performance.now()
      const method = String((this as any).__devReportMethod || 'GET').toUpperCase()
      const rawUrl = String((this as any).__devReportUrl || '')
      const onDone = () => {
        try {
          const status = typeof (this as any).status === 'number' ? (this as any).status : null
          const ok = status !== null && status >= 200 && status < 400
          const dur = Math.max(0, Math.round(performance.now() - start))
          if (!ok) {
            pushBounded(
              networkBuf,
              { t: nowIso(), method, url: sanitizeUrl(rawUrl), status, ok: false, durationMs: dur },
              MAX_NETWORK
            )
          }
        } catch {
          // ignore
        }
      }
      try {
        this.addEventListener?.('loadend', onDone)
      } catch {
        // ignore
      }
      return origSend.apply(this, args)
    }
  }
}

export function getDevReportTelemetrySnapshot(): DevReportTelemetrySnapshot {
  return {
    console: [...consoleBuf],
    network: [...networkBuf]
  }
}
