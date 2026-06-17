import React from 'react'
import type { AgentSettings } from '../agentSettings.types'
import { normaliseSettingsSection, type SettingsSectionId } from '../settingsSections.constants'
import type { useEnterpriseAgentClient } from '../../../hooks/useEnterpriseAgentClient'
import { ConfigurationSection } from './ConfigurationSection'
import { MemorySection } from './MemorySection'
import { PoliciesSection } from './PoliciesSection'
import { MetricsSection } from './MetricsSection'

interface SettingsSectionsPanelProps {
  accessToken: string
  devToolsEnabled: boolean
  activeSection: SettingsSectionId
  settings: AgentSettings
  updateSetting: <K extends keyof AgentSettings>(key: K, value: AgentSettings[K]) => void
  client: ReturnType<typeof useEnterpriseAgentClient>
}

export const SettingsSectionsPanel: React.FC<SettingsSectionsPanelProps> = ({
  accessToken,
  devToolsEnabled,
  activeSection,
  settings,
  updateSetting,
  client
}) => {
  const section = normaliseSettingsSection(activeSection, devToolsEnabled)

  return (
    <div className="gba:h-full gba:overflow-y-auto" data-testid={`settings-section-content-${section}`}>
      {section === 'configuration' && (
        <ConfigurationSection settings={settings} updateSetting={updateSetting} devToolsEnabled={devToolsEnabled} />
      )}
      {section === 'memory' && <MemorySection client={client} isOpen />}
      {section === 'policies' && <PoliciesSection accessToken={accessToken} isOpen />}
      {section === 'metrics' && devToolsEnabled && <MetricsSection client={client} isOpen />}
    </div>
  )
}
