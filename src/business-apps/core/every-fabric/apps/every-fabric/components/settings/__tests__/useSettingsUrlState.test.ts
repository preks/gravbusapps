/** @jest-environment jsdom */
import { renderHook, act } from '@testing-library/react'
import { useSettingsUrlState } from '../useSettingsUrlState'

function setUrl(search: string) {
  globalThis.history.replaceState({}, '', `/platform/every-fabric${search}`)
}

describe('useSettingsUrlState', () => {
  beforeEach(() => {
    setUrl('?view=settings')
  })

  it('initializes with default tab when no tab param', () => {
    setUrl('?view=settings')
    const { result } = renderHook(() => useSettingsUrlState())
    expect(result.current.tab).toBe('settings')
    expect(result.current.agentId).toBeNull()
    expect(result.current.skillId).toBeNull()
  })

  it('initializes with tab from URL', () => {
    setUrl('?view=settings&tab=agents')
    const { result } = renderHook(() => useSettingsUrlState())
    expect(result.current.tab).toBe('agents')
  })

  it('defaults to settings tab for invalid tab values', () => {
    setUrl('?view=settings&tab=invalid')
    const { result } = renderHook(() => useSettingsUrlState())
    expect(result.current.tab).toBe('settings')
  })

  it('reads agentId from URL', () => {
    setUrl('?view=settings&tab=agents&agentId=agent-123')
    const { result } = renderHook(() => useSettingsUrlState())
    expect(result.current.tab).toBe('agents')
    expect(result.current.agentId).toBe('agent-123')
  })

  it('reads skillId from URL', () => {
    setUrl('?view=settings&tab=skills&skillId=skill-456')
    const { result } = renderHook(() => useSettingsUrlState())
    expect(result.current.tab).toBe('skills')
    expect(result.current.skillId).toBe('skill-456')
  })

  it('updates tab via setTab', () => {
    const { result } = renderHook(() => useSettingsUrlState())
    act(() => {
      result.current.setTab('agents')
    })
    expect(result.current.tab).toBe('agents')
    expect(globalThis.location.search).toContain('tab=agents')
  })

  it('clears agentId and skillId when switching tabs', () => {
    setUrl('?view=settings&tab=agents&agentId=agent-123')
    const { result } = renderHook(() => useSettingsUrlState())
    act(() => {
      result.current.setTab('skills')
    })
    expect(result.current.tab).toBe('skills')
    expect(result.current.agentId).toBeNull()
    expect(result.current.skillId).toBeNull()
    expect(globalThis.location.search).not.toContain('agentId=')
  })

  it('removes default tab from URL to keep links clean', () => {
    setUrl('?view=settings&tab=agents')
    const { result } = renderHook(() => useSettingsUrlState())
    act(() => {
      result.current.setTab('settings')
    })
    expect(result.current.tab).toBe('settings')
    expect(globalThis.location.search).not.toContain('tab=')
  })

  it('updates agentId via setAgent', () => {
    setUrl('?view=settings&tab=agents')
    const { result } = renderHook(() => useSettingsUrlState())
    act(() => {
      result.current.setAgent('agent-789')
    })
    expect(result.current.agentId).toBe('agent-789')
    expect(globalThis.location.search).toContain('agentId=agent-789')
  })

  it('clears agentId via setAgent(null)', () => {
    setUrl('?view=settings&tab=agents&agentId=agent-123')
    const { result } = renderHook(() => useSettingsUrlState())
    act(() => {
      result.current.setAgent(null)
    })
    expect(result.current.agentId).toBeNull()
    expect(globalThis.location.search).not.toContain('agentId=')
  })

  it('updates skillId via setSkill', () => {
    setUrl('?view=settings&tab=skills')
    const { result } = renderHook(() => useSettingsUrlState())
    act(() => {
      result.current.setSkill('skill-999')
    })
    expect(result.current.skillId).toBe('skill-999')
    expect(globalThis.location.search).toContain('skillId=skill-999')
  })

  it('responds to popstate events for browser back/forward', () => {
    setUrl('?view=settings&tab=agents')
    const { result } = renderHook(() => useSettingsUrlState())
    expect(result.current.tab).toBe('agents')

    act(() => {
      setUrl('?view=settings&tab=skills')
      globalThis.dispatchEvent(new Event('popstate'))
    })

    expect(result.current.tab).toBe('skills')
  })

  it('handles all valid tab values', () => {
    const validTabs: Array<'settings' | 'agents' | 'skills' | 'tools'> = ['settings', 'agents', 'skills', 'tools']
    for (const tab of validTabs) {
      setUrl(`?view=settings&tab=${tab}`)
      const { result } = renderHook(() => useSettingsUrlState())
      expect(result.current.tab).toBe(tab)
    }
  })
})
