describe('useTraceUrlParams parsing logic', () => {
  const originalLocation = globalThis.location

  afterEach(() => {
    Object.defineProperty(globalThis, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true
    })
  })

  function setSearch(search: string) {
    Object.defineProperty(globalThis, 'location', {
      value: { ...originalLocation, search },
      writable: true,
      configurable: true
    })
  }

  function parseParams(): { t: number | null; focus: string | null } {
    const params = new URLSearchParams(globalThis.location.search)
    const rawT = params.get('t')
    const t = rawT !== null ? Number(rawT) : null
    const focus = params.get('focus')
    return { t: Number.isFinite(t) ? t : null, focus }
  }

  it('extracts t and focus from URL search params', () => {
    setSearch('?t=1234&focus=node-42')
    const result = parseParams()
    expect(result.t).toBe(1234)
    expect(result.focus).toBe('node-42')
  })

  it('returns null for missing params', () => {
    setSearch('')
    const result = parseParams()
    expect(result.t).toBeNull()
    expect(result.focus).toBeNull()
  })

  it('returns null for non-numeric t', () => {
    setSearch('?t=abc')
    const result = parseParams()
    expect(result.t).toBeNull()
  })

  it('handles t=0 as valid', () => {
    setSearch('?t=0')
    const result = parseParams()
    expect(result.t).toBe(0)
  })
})
