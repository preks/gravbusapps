import { act, renderHook, waitFor } from '@testing-library/react'
import { SETTINGS_KEY } from '../../components/settings/agentSettings.types'
import { persistSettings } from '../../components/settings/agentSettings.utils'
import { useAgentSettings } from '../useAgentSettings'

describe('useAgentSettings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('reads devModeEnabled from localStorage', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ devModeEnabled: true }))
    const { result } = renderHook(() => useAgentSettings())
    expect(result.current.devModeEnabled).toBe(true)
  })

  it('updates when settings change event fires', async () => {
    const { result } = renderHook(() => useAgentSettings())
    expect(result.current.devModeEnabled).toBe(false)

    act(() => {
      persistSettings({
        enableMemory: true,
        enableReflection: 'adaptive',
        devModeEnabled: true
      })
    })

    await waitFor(() => {
      expect(result.current.devModeEnabled).toBe(true)
    })
  })
})
