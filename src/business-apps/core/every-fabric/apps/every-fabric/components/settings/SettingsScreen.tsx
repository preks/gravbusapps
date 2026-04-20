import { useCallback, useEffect, useState } from 'react'
import { Button } from '@newwork/nw-design-system'
import { ArrowLeftIcon, XIcon } from '@phosphor-icons/react'
import { useEnterpriseAgentClient } from '../../hooks/useEnterpriseAgentClient'
import type { AgentSettings } from './agentSettings.types'
import { loadSettings, persistSettings } from './agentSettings.utils'
import { ConfigurationSection } from './components/ConfigurationSection'
import { MemorySection } from './components/MemorySection'
import { SkillsSection } from './components/SkillsSection'
import { MetricsSection } from './components/MetricsSection'

interface SettingsScreenProps {
  accessToken: string
  onBack: () => void
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ accessToken, onBack }) => {
  const client = useEnterpriseAgentClient(accessToken)
  const [settings, setSettings] = useState<AgentSettings>(loadSettings)
  const [isInitialLoading, setIsInitialLoading] = useState(true)

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await Promise.all([client.getMemory('*'), client.listEnterpriseSkills(), client.getSessions({ limit: 200 })])
      } catch {
        // Data loading errors are handled in individual sections
      } finally {
        setIsInitialLoading(false)
      }
    }

    loadInitialData()
  }, [client])

  const updateSetting = useCallback(<K extends keyof AgentSettings>(key: K, value: AgentSettings[K]) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value }
      persistSettings(next)
      return next
    })
  }, [])

  const handleSetDefaultSkill = useCallback(
    (skillId: string) => {
      updateSetting('defaultSkillId', settings.defaultSkillId === skillId ? undefined : skillId)
    },
    [settings.defaultSkillId, updateSetting]
  )

  if (isInitialLoading) {
    return (
      <div
        className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:gap-3"
        data-testid="fabric-settings-loading"
      >
        <div className="gba:h-8 gba:w-8 gba:border-2 gba:border-primary gba:border-t-transparent gba:rounded-full gba:animate-spin" />
        <p className="gba:text-sm gba:text-muted-foreground">Loading settings...</p>
      </div>
    )
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:bg-background" data-testid="fabric-settings-screen">
      <div className="gba:shrink-0 gba:px-4 sm:gba:px-6 lg:gba:px-8 gba:py-4 sm:gba:py-5">
        <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
          <div className="gba:flex gba:min-w-0 gba:items-center gba:gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="gba:h-10 gba:w-10 gba:rounded-full"
              onClick={onBack}
              data-testid="settings-back-button"
            >
              <ArrowLeftIcon className="gba:h-5 gba:w-5" />
            </Button>
            <h1 className="gba:text-xl sm:gba:text-2xl gba:font-semibold gba:text-foreground">Agent Settings</h1>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="gba:h-10 gba:w-10 gba:rounded-full gba:shrink-0"
            onClick={onBack}
            data-testid="settings-close-button"
          >
            <XIcon className="gba:h-5 gba:w-5" />
          </Button>
        </div>
      </div>

      <div className="gba:flex-1 gba:overflow-y-auto">
        <div className="gba:max-w-5xl gba:mx-auto gba:px-4 sm:gba:px-6 lg:gba:px-8 gba:py-6 sm:gba:py-8 lg:gba:py-12">
          <ConfigurationSection settings={settings} updateSetting={updateSetting} />
          <div className="gba:h-12 lg:gba:h-16" />
          <MemorySection client={client} isOpen />
          <div className="gba:h-12 lg:gba:h-16" />
          <SkillsSection
            client={client}
            isOpen
            defaultSkillId={settings.defaultSkillId}
            onSetDefaultSkill={handleSetDefaultSkill}
          />
          <div className="gba:h-12 lg:gba:h-16" />
          <MetricsSection client={client} isOpen />
        </div>
      </div>
    </div>
  )
}
