/**
 * Prompt Manager SSE client using fetch + Authorization header.
 *
 * Browser EventSource cannot set custom headers; Kong on dev redirects
 * `?token=` SSE requests to Keycloak. fetch() sends Bearer like other API calls.
 */

export interface PromptManagerSseConnection {
  abort: () => void
}

export interface ConnectPromptManagerSseOptions {
  url: string
  accessToken: string
  signal?: AbortSignal
  onOpen?: () => void
  onMessage: (data: string) => void
  onError?: () => void
  onClose?: () => void
}

/** Parse complete SSE frames from a buffer; returns the incomplete trailing chunk. */
export function parseSseMessageBuffer(buffer: string, onData: (data: string) => void): string {
  const parts = buffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n\n')
  const remainder = parts.pop() ?? ''
  for (const frame of parts) {
    if (!frame.trim()) continue
    const dataLines: string[] = []
    for (const line of frame.split('\n')) {
      if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart())
      }
    }
    const data = dataLines.join('\n')
    if (data) onData(data)
  }
  return remainder
}

export function connectPromptManagerSse(options: ConnectPromptManagerSseOptions): PromptManagerSseConnection {
  const controller = new AbortController()

  if (options.signal) {
    if (options.signal.aborted) {
      controller.abort()
    } else {
      options.signal.addEventListener('abort', () => controller.abort(), { once: true })
    }
  }

  void (async () => {
    try {
      const response = await fetch(options.url, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          Authorization: `Bearer ${options.accessToken}`
        },
        signal: controller.signal
      })

      if (!response.ok || !response.body) {
        options.onError?.()
        return
      }

      options.onOpen?.()

      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          options.onClose?.()
          break
        }
        buffer = parseSseMessageBuffer(buffer + value, options.onMessage)
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return
      options.onError?.()
    }
  })()

  return {
    abort: () => controller.abort()
  }
}
