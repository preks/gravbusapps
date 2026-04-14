type EnvMap = Record<string, string | undefined>

const originalWindow = globalThis.window

function loadServiceResolver(envMap: EnvMap, hostname = 'app.newwork.com'): typeof import('./serviceResolver') {
  jest.resetModules()
  jest.doMock('@/common/env/EnvUtils', () => ({
    env: (key: string) => envMap[key]
  }))

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { location: { hostname } }
  })

  let loaded: typeof import('./serviceResolver') | undefined
  jest.isolateModules(() => {
    loaded = jest.requireActual('./serviceResolver') as typeof import('./serviceResolver')
  })

  if (!loaded) {
    throw new Error('Failed to load serviceResolver module')
  }

  return loaded
}

describe('serviceResolver document resolution', () => {
  afterEach(() => {
    jest.resetModules()
    jest.unmock('@/common/env/EnvUtils')
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: originalWindow
    })
  })

  it('prefers the explicit document debug URL', () => {
    const { getDocumentServiceApiUrl } = loadServiceResolver({
      NEXT_PUBLIC_DOCUMENT_SERVICE_DEBUG_URL: 'http://localhost:3002/api/v1/'
    })

    expect(getDocumentServiceApiUrl()).toBe('http://localhost:3002/api/v1')
  })

  it('builds the local document API URL from a local base URL', () => {
    const { getDocumentServiceApiUrl } = loadServiceResolver(
      {
        NEXT_PUBLIC_BASE_URL: 'http://localhost:5001/'
      },
      'localhost'
    )

    expect(getDocumentServiceApiUrl()).toBe('http://localhost:5001/document/api/v1')
  })

  it('derives the office websocket base from a mounted document API path', () => {
    const { getDocumentOfficeWebSocketBaseUrl } = loadServiceResolver({
      NEXT_PUBLIC_DOCUMENT_SERVICE_URL: 'https://example.com/document/api/v1'
    })

    expect(getDocumentOfficeWebSocketBaseUrl()).toBe('https://example.com/document')
  })

  it('uses the origin when the document API is mounted without the /document prefix', () => {
    const { getDocumentOfficeWebSocketBaseUrl } = loadServiceResolver({
      NEXT_PUBLIC_DOCUMENT_SERVICE_URL: 'https://example.com/api/v1'
    })

    expect(getDocumentOfficeWebSocketBaseUrl()).toBe('https://example.com')
  })
})
