/** @jest-environment jsdom */
import { act, renderHook } from '@testing-library/react'
import { useWorkforceUrlState } from '../useWorkforceUrlState'

function setUrl(search: string) {
  globalThis.history.pushState({}, '', `/test${search}`)
}

describe('useWorkforceUrlState', () => {
  beforeEach(() => {
    setUrl('')
  })

  it('initialises state from the URL query string', () => {
    setUrl('?agentId=a-1&tab=runs&runId=s-2')
    const { result } = renderHook(() => useWorkforceUrlState())
    expect(result.current.agentId).toBe('a-1')
    expect(result.current.tab).toBe('runs')
    expect(result.current.runId).toBe('s-2')
  })

  it('falls back to overview tab when missing or invalid', () => {
    setUrl('?agentId=a-1&tab=garbage')
    const { result } = renderHook(() => useWorkforceUrlState())
    expect(result.current.tab).toBe('overview')
  })

  it('setAgent writes agentId and stays on default tab', () => {
    const { result } = renderHook(() => useWorkforceUrlState())
    act(() => result.current.setAgent('a-1'))
    expect(globalThis.location.search).toContain('agentId=a-1')
    expect(result.current.agentId).toBe('a-1')
  })

  it('setAgent(null) also clears tab and runId from the URL', () => {
    setUrl('?agentId=a-1&tab=runs&runId=s-2')
    const { result } = renderHook(() => useWorkforceUrlState())
    act(() => result.current.setAgent(null))
    expect(globalThis.location.search).not.toContain('agentId')
    expect(globalThis.location.search).not.toContain('tab=')
    expect(globalThis.location.search).not.toContain('runId')
    expect(result.current.agentId).toBeNull()
    expect(result.current.tab).toBe('overview')
    expect(result.current.runId).toBeNull()
  })

  it('setTab to default drops the param from the URL', () => {
    setUrl('?agentId=a-1&tab=runs')
    const { result } = renderHook(() => useWorkforceUrlState())
    act(() => result.current.setTab('overview'))
    expect(globalThis.location.search).not.toContain('tab=')
    expect(result.current.tab).toBe('overview')
  })

  it('setTab to non-default writes the param', () => {
    setUrl('?agentId=a-1')
    const { result } = renderHook(() => useWorkforceUrlState())
    act(() => result.current.setTab('trace'))
    expect(globalThis.location.search).toContain('tab=trace')
    expect(result.current.tab).toBe('trace')
  })

  it('setRun toggles the runId param', () => {
    setUrl('?agentId=a-1&tab=trace')
    const { result } = renderHook(() => useWorkforceUrlState())
    act(() => result.current.setRun('s-9'))
    expect(globalThis.location.search).toContain('runId=s-9')
    act(() => result.current.setRun(null))
    expect(globalThis.location.search).not.toContain('runId')
  })

  it('updateUrl handles combined transitions atomically', () => {
    const { result } = renderHook(() => useWorkforceUrlState())
    act(() => result.current.updateUrl({ agentId: 'a-2', tab: 'inbox', runId: 's-5' }))
    expect(result.current.agentId).toBe('a-2')
    expect(result.current.tab).toBe('inbox')
    expect(result.current.runId).toBe('s-5')
  })

  it('syncs state on popstate so back/forward buttons work', () => {
    const { result } = renderHook(() => useWorkforceUrlState())
    act(() => {
      setUrl('?agentId=a-7&tab=runs')
      globalThis.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(result.current.agentId).toBe('a-7')
    expect(result.current.tab).toBe('runs')
  })
})
