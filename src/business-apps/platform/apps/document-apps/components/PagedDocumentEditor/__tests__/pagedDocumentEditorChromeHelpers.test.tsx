import { act, renderHook } from '@testing-library/react'
import { usePagedDocumentChromeMetrics } from '../hooks/usePagedDocumentChromeMetrics'
import { formatLastSavedLabel } from '../pagedDocumentEditorHeaderUtils'

describe('formatLastSavedLabel', () => {
  it('formats recent and older saved times with the translation callback', () => {
    const t = jest.fn((key: string, vars?: Record<string, string | number>) => {
      if (vars?.count != null) return `${key}:${vars.count}`
      if (vars?.time != null) return `${key}:${vars.time}`
      return key
    })

    expect(formatLastSavedLabel(new Date(), t)).toBe('editor-status-saved-now')

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    expect(formatLastSavedLabel(fiveMinutesAgo, t)).toBe('editor-status-saved-minutes:5')
  })
})

describe('usePagedDocumentChromeMetrics', () => {
  const originalResizeObserver = globalThis.ResizeObserver

  afterEach(() => {
    globalThis.ResizeObserver = originalResizeObserver
  })

  it('measures the bottom edge of the chrome node', () => {
    class ResizeObserverMock {
      private readonly callback: () => void

      constructor(callback: () => void) {
        this.callback = callback
      }

      observe() {
        this.callback()
      }

      disconnect() {}
    }

    globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver

    const editorChromeRef = { current: null as HTMLDivElement | null }
    const { result } = renderHook(() => usePagedDocumentChromeMetrics(editorChromeRef))

    act(() => {
      result.current.setHeaderChromeNode({
        getBoundingClientRect: () => ({ bottom: 132 }) as DOMRect
      } as HTMLDivElement)
    })

    expect(result.current.measuredHeaderHeight).toBe(132)
  })
})
