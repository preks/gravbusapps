import { act, renderHook } from '@testing-library/react'
import { SIDEBAR_COLLAPSED_STORAGE_KEY } from '../sidebarLayout.constants'
import { useSidebarCollapsedState } from '../useSidebarCollapsedState'

function resizeTo(width: number): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width })
  window.dispatchEvent(new Event('resize'))
}

describe('useSidebarCollapsedState', () => {
  beforeEach(() => {
    window.localStorage.clear()
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1440 })
  })

  it('defaults to expanded on wide viewports when no preference is stored', () => {
    const { result } = renderHook(() => useSidebarCollapsedState())
    expect(result.current.isCollapsed).toBe(false)
  })

  it('defaults to collapsed below the responsive breakpoint', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 900 })
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
    })

    expect(result.current.isCollapsed).toBe(true)
  })
})
