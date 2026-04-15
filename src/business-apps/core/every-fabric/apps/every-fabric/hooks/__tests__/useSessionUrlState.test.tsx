import { act, renderHook } from '@testing-library/react'
import { useSessionUrlState } from '../useSessionUrlState'

describe('useSessionUrlState', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/platform/every-fabric')
  })

  it('updates URL state without dispatching synthetic popstate events', () => {
    const onPopState = jest.fn()
    window.addEventListener('popstate', onPopState)

    const { result } = renderHook(() => useSessionUrlState())

    act(() => {
      result.current.updateUrl({ view: 'settings' })
    })

    const params = new URLSearchParams(window.location.search)
    expect(params.get('view')).toBe('settings')
    expect(result.current.urlView).toBe('settings')
    expect(onPopState).not.toHaveBeenCalled()

    window.removeEventListener('popstate', onPopState)
  })

  it('clears fabric params while preserving unrelated search params', () => {
    window.history.pushState({}, '', '/platform/every-fabric?sessionId=session-123&view=settings&foo=bar')

    const { result } = renderHook(() => useSessionUrlState())

    act(() => {
      result.current.updateUrl({ sessionId: null, view: null })
    })

    const params = new URLSearchParams(window.location.search)
    expect(params.get('sessionId')).toBeNull()
    expect(params.get('view')).toBeNull()
    expect(params.get('foo')).toBe('bar')
    expect(result.current.urlSessionId).toBeNull()
    expect(result.current.urlView).toBeNull()
  })
})
