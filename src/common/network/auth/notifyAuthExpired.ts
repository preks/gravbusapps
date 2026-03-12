import { postToPlatform } from '@/common/utils/postToPlatform'

type AuthExpiredSource =
  | 'global-fetch'
  | 'global-axios'
  | 'global-xhr'
  | 'global-websocket'
  | 'global-eventsource'
  | 'unknown'

export interface AuthExpiredPayload {
  type: 'AUTH_EXPIRED'
  status: 401
  url?: string
  source: AuthExpiredSource
  ts: number
}

interface NotifyAuthExpiredParams {
  status?: number
  url?: string
  source?: AuthExpiredSource
}

const DEDUPE_WINDOW_MS = 3000
let lastNotifiedAt = 0
let lastSignature = ''

function buildSignature(source: string, url: string): string {
  if (url) {
    return `url:${url}`
  }
  return `source:${source}`
}

function postToReactNativeWebView(payload: AuthExpiredPayload) {
  const w = globalThis.window as
    | (Window & { ReactNativeWebView?: { postMessage: (message: string) => void } })
    | undefined
  const bridge = w?.ReactNativeWebView
  if (!bridge || typeof bridge.postMessage !== 'function') return
  bridge.postMessage(JSON.stringify(payload))
}

export function notifyAuthExpired(params: NotifyAuthExpiredParams): void {
  if (params.status !== 401) return

  const source = params.source ?? 'unknown'
  const url = params.url ?? ''
  const now = Date.now()
  const signature = buildSignature(source, url)

  if (signature === lastSignature && now - lastNotifiedAt < DEDUPE_WINDOW_MS) {
    return
  }

  lastSignature = signature
  lastNotifiedAt = now

  const payload: AuthExpiredPayload = {
    type: 'AUTH_EXPIRED',
    status: 401,
    source,
    url: params.url,
    ts: now
  }

  try {
    postToReactNativeWebView(payload)
  } catch {}

  try {
    postToPlatform(payload)
  } catch {}

  try {
    globalThis.window?.dispatchEvent(new CustomEvent('com.newwork.mobile.auth.expired', { detail: payload }))
  } catch {}
}
