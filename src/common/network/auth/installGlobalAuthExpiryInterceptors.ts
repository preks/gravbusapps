import axios, { AxiosInstance } from 'axios'
import { notifyAuthExpired } from './notifyAuthExpired'

const FETCH_PATCHED_KEY = '__nwAuthExpiryFetchPatched__'
const AXIOS_PATCHED_KEY = '__nwAuthExpiryAxiosPatched__'
const AXIOS_INSTANCE_PATCHED_KEY = '__nwAuthExpiryAxiosInstancePatched__'
const XHR_PATCHED_KEY = '__nwAuthExpiryXhrPatched__'
const XHR_URL_KEY = '__nwAuthExpiryRequestUrl__'
const WEBSOCKET_PATCHED_KEY = '__nwAuthExpiryWebSocketPatched__'
const EVENTSOURCE_PATCHED_KEY = '__nwAuthExpiryEventSourcePatched__'

const WEBSOCKET_AUTH_CLOSE_CODES = new Set([4001, 4401])
const AUTH_KEYWORDS = [
  '401',
  'unauthorized',
  'auth expired',
  'auth_expired',
  'auth-expired',
  'token expired',
  'token_expired',
  'token-expired',
  'invalid token',
  'invalid_token',
  'invalid-token',
  'not authorized',
  'not_authorized',
  'not-authorized',
  'authentication failed',
  'authentication_failed',
  'authentication-failed',
  'authentication error',
  'authentication_error',
  'authentication-error'
]
const EVENTSOURCE_AUTH_EVENT_NAMES = ['auth-expired', 'auth_expired', 'unauthorized', 'token-expired', 'token_expired']

type MutableGlobal = typeof globalThis & Record<string, unknown>
type MutableAxiosInstance = AxiosInstance & Record<string, unknown>

function resolveRequestUrl(input: RequestInfo | URL): string | undefined {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.toString()
  if (typeof Request !== 'undefined' && input instanceof Request) return input.url
  return undefined
}

function toLowerCaseText(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value.toLowerCase()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value).toLowerCase()
  try {
    return JSON.stringify(value).toLowerCase()
  } catch {
    return String(value).toLowerCase()
  }
}

function parseStatusCode(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const direct = Number(trimmed)
  if (Number.isFinite(direct)) return direct
  const match = trimmed.match(/\b(401)\b/)
  if (!match) return undefined
  return Number(match[1])
}

function extractStatusCode(payload: unknown): number | undefined {
  const direct = parseStatusCode(payload)
  if (direct !== undefined) return direct
  if (Array.isArray(payload)) {
    for (const item of payload) {
      const status = extractStatusCode(item)
      if (status !== undefined) return status
    }
    return undefined
  }
  if (typeof payload !== 'object' || payload === null) return undefined

  const record = payload as Record<string, unknown>
  const candidates = [
    record.status,
    record.statusCode,
    record.httpStatus,
    record.code,
    record.errorCode,
    record.reason,
    record.message,
    record.detail,
    record.error
  ]

  for (const candidate of candidates) {
    const status = parseStatusCode(candidate)
    if (status !== undefined) return status
  }
  return undefined
}

function shouldTreatAsAuthFailure(payload: unknown): boolean {
  const status = extractStatusCode(payload)
  if (status === 401) return true
  const text = toLowerCaseText(payload)
  return AUTH_KEYWORDS.some(keyword => text.includes(keyword))
}

function notifyFromAuthSignal(
  source: 'global-axios' | 'global-fetch' | 'global-xhr' | 'global-websocket' | 'global-eventsource',
  url: string | undefined,
  payload: unknown
) {
  if (!shouldTreatAsAuthFailure(payload)) return
  notifyAuthExpired({ status: 401, url, source })
}

function patchAxiosInstance(instance: AxiosInstance) {
  const mutable = instance as MutableAxiosInstance
  if (mutable[AXIOS_INSTANCE_PATCHED_KEY]) return

  instance.interceptors.response.use(
    response => {
      notifyFromAuthSignal('global-axios', response.config?.url, response.status)
      return response
    },
    error => {
      notifyFromAuthSignal('global-axios', error?.config?.url, error)
      return Promise.reject(error)
    }
  )

  mutable[AXIOS_INSTANCE_PATCHED_KEY] = true
}

function installGlobalFetchInterceptor() {
  if (typeof window === 'undefined' || typeof globalThis.fetch !== 'function') return
  const g = globalThis as MutableGlobal
  if (g[FETCH_PATCHED_KEY]) return

  const originalFetch = globalThis.fetch.bind(globalThis)

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await originalFetch(input, init)
    notifyAuthExpired({
      status: response.status,
      url: resolveRequestUrl(input),
      source: 'global-fetch'
    })
    return response
  }

  g[FETCH_PATCHED_KEY] = true
}

function installGlobalAxiosInterceptor() {
  if (typeof window === 'undefined') return
  const g = globalThis as MutableGlobal
  if (g[AXIOS_PATCHED_KEY]) return

  patchAxiosInstance(axios as unknown as AxiosInstance)

  const originalCreate = axios.create.bind(axios)
  axios.create = (...args) => {
    const instance = originalCreate(...args)
    patchAxiosInstance(instance)
    return instance
  }

  g[AXIOS_PATCHED_KEY] = true
}

function installGlobalXhrInterceptor() {
  if (typeof window === 'undefined' || typeof XMLHttpRequest === 'undefined') return
  const g = globalThis as MutableGlobal
  if (g[XHR_PATCHED_KEY]) return

  const originalOpen = XMLHttpRequest.prototype.open
  const originalSend = XMLHttpRequest.prototype.send
  const openWithAny = originalOpen as unknown as (...args: unknown[]) => void

  XMLHttpRequest.prototype.open = function patchedOpen(
    this: XMLHttpRequest & Record<string, unknown>,
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null
  ) {
    this[XHR_URL_KEY] = typeof url === 'string' ? url : undefined
    if (typeof async === 'undefined') {
      return openWithAny.call(this, method, url)
    }
    return openWithAny.call(this, method, url, async, username, password)
  }

  XMLHttpRequest.prototype.send = function patchedSend(
    this: XMLHttpRequest & Record<string, unknown>,
    ...args: Parameters<XMLHttpRequest['send']>
  ) {
    this.addEventListener(
      'loadend',
      function onLoadEnd(this: XMLHttpRequest & Record<string, unknown>) {
        notifyAuthExpired({
          status: this.status,
          url: typeof this[XHR_URL_KEY] === 'string' ? (this[XHR_URL_KEY] as string) : undefined,
          source: 'global-xhr'
        })
      },
      { once: true }
    )
    return originalSend.apply(this, args)
  }

  g[XHR_PATCHED_KEY] = true
}

function installGlobalWebSocketInterceptor() {
  if (typeof window === 'undefined' || typeof WebSocket === 'undefined') return
  const g = globalThis as MutableGlobal
  if (g[WEBSOCKET_PATCHED_KEY]) return

  const NativeWebSocket = globalThis.WebSocket

  const WrappedWebSocket = function patchedWebSocket(this: unknown, url: string | URL, protocols?: string | string[]) {
    const socket = protocols === undefined ? new NativeWebSocket(url) : new NativeWebSocket(url, protocols)
    const requestUrl = typeof url === 'string' ? url : url.toString()

    socket.addEventListener('message', event => {
      notifyFromAuthSignal('global-websocket', requestUrl, (event as MessageEvent).data)
    })

    socket.addEventListener('close', event => {
      const closeEvent = event as CloseEvent
      if (WEBSOCKET_AUTH_CLOSE_CODES.has(closeEvent.code)) {
        notifyAuthExpired({ status: 401, url: requestUrl, source: 'global-websocket' })
        return
      }
      if (closeEvent.code === 1008) {
        notifyFromAuthSignal('global-websocket', requestUrl, closeEvent.reason)
      }
    })

    socket.addEventListener('error', event => {
      const errorEvent = event as Event & { message?: string; error?: unknown }
      notifyFromAuthSignal('global-websocket', requestUrl, errorEvent.message ?? errorEvent.error)
    })

    return socket
  } as unknown as typeof WebSocket

  WrappedWebSocket.prototype = NativeWebSocket.prototype
  const mutableWrapped = WrappedWebSocket as unknown as Record<string, unknown>
  mutableWrapped.CONNECTING = NativeWebSocket.CONNECTING
  mutableWrapped.OPEN = NativeWebSocket.OPEN
  mutableWrapped.CLOSING = NativeWebSocket.CLOSING
  mutableWrapped.CLOSED = NativeWebSocket.CLOSED

  globalThis.WebSocket = WrappedWebSocket
  g[WEBSOCKET_PATCHED_KEY] = true
}

function installGlobalEventSourceInterceptor() {
  if (typeof window === 'undefined' || typeof EventSource === 'undefined') return
  const g = globalThis as MutableGlobal
  if (g[EVENTSOURCE_PATCHED_KEY]) return

  const NativeEventSource = globalThis.EventSource

  const WrappedEventSource = function patchedEventSource(
    this: unknown,
    url: string | URL,
    eventSourceInitDict?: EventSourceInit
  ) {
    const stream =
      eventSourceInitDict === undefined ? new NativeEventSource(url) : new NativeEventSource(url, eventSourceInitDict)
    const requestUrl = typeof url === 'string' ? url : url.toString()
    for (const eventName of EVENTSOURCE_AUTH_EVENT_NAMES) {
      stream.addEventListener(eventName, event => {
        notifyFromAuthSignal('global-eventsource', requestUrl, (event as MessageEvent).data)
      })
    }

    stream.addEventListener('message', event => {
      notifyFromAuthSignal('global-eventsource', requestUrl, (event as MessageEvent).data)
    })

    stream.addEventListener('error', event => {
      const errorEvent = event as Event & { message?: string; reason?: string }
      notifyFromAuthSignal('global-eventsource', requestUrl, errorEvent.message ?? errorEvent.reason)
    })

    return stream
  } as unknown as typeof EventSource

  WrappedEventSource.prototype = NativeEventSource.prototype
  const mutableWrapped = WrappedEventSource as unknown as Record<string, unknown>
  mutableWrapped.CONNECTING = NativeEventSource.CONNECTING
  mutableWrapped.OPEN = NativeEventSource.OPEN
  mutableWrapped.CLOSED = NativeEventSource.CLOSED

  globalThis.EventSource = WrappedEventSource
  g[EVENTSOURCE_PATCHED_KEY] = true
}

export function installGlobalAuthExpiryInterceptors() {
  installGlobalFetchInterceptor()
  installGlobalAxiosInterceptor()
  installGlobalXhrInterceptor()
  installGlobalWebSocketInterceptor()
  installGlobalEventSourceInterceptor()
}
