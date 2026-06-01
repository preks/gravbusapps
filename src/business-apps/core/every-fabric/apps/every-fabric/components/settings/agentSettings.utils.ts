import type { AgentSettings } from './agentSettings.types'
import { AGENT_SETTINGS_CHANGED_EVENT, DEFAULT_SETTINGS, SETTINGS_KEY } from './agentSettings.types'

export function loadSettings(): AgentSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function persistSettings(settings: AgentSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  if (typeof globalThis.dispatchEvent === 'function') {
    globalThis.dispatchEvent(new CustomEvent(AGENT_SETTINGS_CHANGED_EVENT, { detail: settings }))
  }
}
