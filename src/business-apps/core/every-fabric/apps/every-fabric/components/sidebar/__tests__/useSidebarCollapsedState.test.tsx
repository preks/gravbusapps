import { act, renderHook } from '@testing-library/react'
import { SIDEBAR_COLLAPSED_STORAGE_KEY } from '../sidebarLayout.constants'
import { useSidebarCollapsedState } from '../useSidebarCollapsedState'

function setViewportMetrics(metrics: {
  innerWidth: number
  innerHeight: number
  outerWidth: number
  outerHeight: number
}): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: metrics.innerWidth })
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: metrics.innerHeight })
  Object.defineProperty(window, 'outerWidth', { configurable: true, writable: true, value: metrics.outerWidth })
  Object.defineProperty(window, 'outerHeight', { configurable: true, writable: true, value: metrics.outerHeight })
}

function resizeTo(width: number): void {
  setViewportMetrics({
    innerWidth: width,
    innerHeight: 900,
    outerWidth: width,
    outerHeight: 900
  })
  window.dispatchEvent(new Event('resize'))
}

describe('useSidebarCollapsedState', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    window.localStorage.clear()
    setViewportMetrics({
      innerWidth: 1440,
      innerHeight: 900,
      outerWidth: 1440,
      outerHeight: 900
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('defaults to expanded on wide viewports when no preference is stored', () => {
    const { result } = renderHook(() => useSidebarCollapsedState())
    expect(result.current.isCollapsed).toBe(false)
  })

  it('defaults to collapsed below the responsive breakpoint', () => {
    setViewportMetrics({
      innerWidth: 900,
      innerHeight: 900,
      outerWidth: 900,
      outerHeight: 900
    })
    const { result } = renderHook(() => useSidebarCollapsedState())
    expect(result.current.isCollapsed).toBe(true)
  })

  it('honors a persisted preference over the viewport default', () => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, 'true')
    const { result } = renderHook(() => useSidebarCollapsedState())
    expect(result.current.isCollapsed).toBe(true)
  })

  it('persists a user toggle to localStorage', () => {
    const { result } = renderHook(() => useSidebarCollapsedState())

    act(() => {
      result.current.toggleCollapsed()
    })

    expect(result.current.isCollapsed).toBe(true)
    expect(window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe('true')
  })

  it('stops following resize once the user has expressed a preference', () => {
    const { result } = renderHook(() => useSidebarCollapsedState())

    act(() => {
      result.current.setCollapsed(false)
    })

    act(() => {
      resizeTo(700)
    })

    expect(result.current.isCollapsed).toBe(false)
  })

  it('tracks resize while no preference is stored', () => {
    const { result } = renderHook(() => useSidebarCollapsedState())
    expect(result.current.isCollapsed).toBe(false)

    act(() => {
      resizeTo(700)
      jest.advanceTimersByTime(200)
    })

    expect(result.current.isCollapsed).toBe(true)
  })

  it('ignores DevTools dock resize while no preference is stored', () => {
    const { result } = renderHook(() => useSidebarCollapsedState())
    expect(result.current.isCollapsed).toBe(false)

    act(() => {
      setViewportMetrics({
        innerWidth: 700,
        innerHeight: 900,
        outerWidth: 1440,
        outerHeight: 900
      })
      window.dispatchEvent(new Event('resize'))
      jest.advanceTimersByTime(200)
    })

    expect(result.current.isCollapsed).toBe(false)
  })
})
