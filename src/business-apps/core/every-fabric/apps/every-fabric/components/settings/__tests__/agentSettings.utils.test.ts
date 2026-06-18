import { AGENT_SETTINGS_CHANGED_EVENT, DEFAULT_SETTINGS, SETTINGS_KEY } from '../agentSettings.types'
import { loadSettings, persistSettings } from '../agentSettings.utils'

describe('agentSettings.utils', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults devModeEnabled to false', () => {
    expect(loadSettings().devModeEnabled).toBe(false)
  })

  it('defaults autoApproveModeEnabled to false', () => {
    expect(loadSettings().autoApproveModeEnabled).toBe(false)
  })

  it('merges persisted settings with defaults', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ enableMemory: false, devModeEnabled: true }))
    expect(loadSettings()).toEqual({
      ...DEFAULT_SETTINGS,
      enableMemory: false,
      devModeEnabled: true
    })
  })

  it('dispatches settings changed event on persist', () => {
    const handler = jest.fn()
    globalThis.addEventListener(AGENT_SETTINGS_CHANGED_EVENT, handler)
    persistSettings({ ...DEFAULT_SETTINGS, devModeEnabled: true })
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler.mock.calls[0][0].detail.devModeEnabled).toBe(true)
    globalThis.removeEventListener(AGENT_SETTINGS_CHANGED_EVENT, handler)
  })
})
