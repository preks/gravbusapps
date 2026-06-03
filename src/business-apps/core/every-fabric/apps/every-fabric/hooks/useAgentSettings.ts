import { useCallback, useEffect, useState } from 'react'
import type { AgentSettings } from '../components/settings/agentSettings.types'
import { AGENT_SETTINGS_CHANGED_EVENT } from '../components/settings/agentSettings.types'
import { loadSettings, persistSettings } from '../components/settings/agentSettings.utils'

export function useAgentSettings() {
  const [settings, setSettings] = useState<AgentSettings>(loadSettings)

  const refresh = useCallback(() => {
    setSettings(loadSettings())
  }, [])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === 'every-fabric-agent-settings') {
        refresh()
      }
    }
    const onSettingsChanged = () => {
      refresh()
    }
    globalThis.addEventListener('storage', onStorage)
    globalThis.addEventListener(AGENT_SETTINGS_CHANGED_EVENT, onSettingsChanged)
    return () => {
      globalThis.removeEventListener('storage', onStorage)
      globalThis.removeEventListener(AGENT_SETTINGS_CHANGED_EVENT, onSettingsChanged)
    }
  }, [refresh])

  const updateSetting = useCallback(<K extends keyof AgentSettings>(key: K, value: AgentSettings[K]) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value }
      persistSettings(next)
      return next
    })
  }, [])

  return { settings, updateSetting, devModeEnabled: settings.devModeEnabled }
}
