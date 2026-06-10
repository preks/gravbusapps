import React, { useCallback, useState } from 'react'
import { Button } from '@newwork/nw-design-system'
import { GearIcon, XIcon } from '@phosphor-icons/react'
import { useFeature } from '@/common/hooks/useFeature'
import { Feature } from '@/common/types/constants/FeatureHub'
import { useEnterpriseAgentClient } from '../../hooks/useEnterpriseAgentClient'
import { isEveryFabricDevToolsEnabled } from '../../utils/devToolsGate'
import type { AgentSettings } from './agentSettings.types'
import { loadSettings, persistSettings } from './agentSettings.utils'
import { ConfigurationSection } from './components/ConfigurationSection'
import { MemorySection } from './components/MemorySection'
import { MetricsSection } from './components/MetricsSection'

interface AgentSettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  accessToken: string
}

export const AgentSettingsPanel: React.FC<AgentSettingsPanelProps> = ({ isOpen, onClose, accessToken }) => {
  const client = useEnterpriseAgentClient(accessToken)
  const devToolsFeature = useFeature<boolean>(Feature.EveryFabric.DevTools.Key)
  const devToolsEnabled = isEveryFabricDevToolsEnabled(devToolsFeature)
  const [settings, setSettings] = useState<AgentSettings>(loadSettings)

  const updateSetting = useCallback(<K extends keyof AgentSettings>(key: K, value: AgentSettings[K]) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value }
      persistSettings(next)
      return next
    })
  }, [])

  return (
    <div
      className={`gba:fixed gba:top-16 sm:gba:top-20 gba:right-4 sm:gba:right-6 lg:gba:right-8 gba:z-50 gba:w-[min(20rem,calc(100vw-2rem))] sm:gba:w-[20rem] lg:gba:w-[22rem] xl:gba:w-[24rem] gba:transition-all gba:duration-200 ${
        isOpen
          ? 'gba:opacity-100 gba:translate-y-0 gba:pointer-events-auto'
          : 'gba:opacity-0 -gba:translate-y-2 gba:pointer-events-none'
      }`}
      data-testid="fabric-settings-panel"
    >
      <div className="gba:rounded-[1.75rem] gba:border gba:border-border/80 gba:bg-card/98 gba:backdrop-blur-md gba:shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
        <div className="gba:flex gba:items-center gba:justify-between gba:px-4 sm:gba:px-5 gba:py-3 sm:gba:py-4 gba:border-b gba:border-border/60">
          <div className="gba:flex gba:items-center gba:gap-2.5">
            <GearIcon className="gba:h-[18px] gba:w-[18px] gba:text-foreground" />
            <span className="gba:text-[15px] gba:font-semibold gba:text-foreground">Agent Settings</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="gba:h-8 gba:w-8 gba:rounded-full"
            onClick={onClose}
            data-testid="settings-panel-close"
          >
            <XIcon className="gba:h-4 gba:w-4" />
          </Button>
        </div>

        <div className="gba:max-h-[70vh] sm:gba:max-h-[min(42rem,80vh)] gba:overflow-y-auto">
          <ConfigurationSection settings={settings} updateSetting={updateSetting} devToolsEnabled={devToolsEnabled} />
          <div className="gba:mx-4 sm:gba:mx-5 gba:border-t gba:border-border/40" />
          <MemorySection client={client} isOpen={isOpen} />
          {devToolsEnabled && (
            <>
              <div className="gba:mx-4 sm:gba:mx-5 gba:border-t gba:border-border/40" />
              <MetricsSection client={client} isOpen={isOpen} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
