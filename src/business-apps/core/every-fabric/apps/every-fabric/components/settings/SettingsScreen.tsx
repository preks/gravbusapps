import { useState } from 'react'
import { Button } from '@newwork/nw-design-system'
import { ArrowLeftIcon, GearSixIcon, UsersThreeIcon, LightbulbIcon, WrenchIcon } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { useEnterpriseAgentClient } from '../../hooks/useEnterpriseAgentClient'
import { AgentsScreen } from '../agents/AgentsScreen'
import { SkillsScreen } from '../skills/SkillsScreen'
import { useAgentSettings } from '../../hooks/useAgentSettings'
import { ConfigurationSection } from './components/ConfigurationSection'
import { MemorySection } from './components/MemorySection'
import { PoliciesSection } from './components/PoliciesSection'
import { MetricsSection } from './components/MetricsSection'
import { ToolsTab } from './ToolsTab'

type SettingsTab = 'settings' | 'agents' | 'skills' | 'tools'

const TABS: { key: SettingsTab; label: string; icon: Icon }[] = [
  { key: 'settings', label: 'Settings', icon: GearSixIcon },
  { key: 'agents', label: 'Agents', icon: UsersThreeIcon },
  { key: 'skills', label: 'Skills', icon: LightbulbIcon },
  { key: 'tools', label: 'Tools', icon: WrenchIcon }
]

interface SettingsScreenProps {
  accessToken: string
  initialTab?: SettingsTab
  onBack: () => void
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ accessToken, initialTab = 'settings', onBack }) => {
  const client = useEnterpriseAgentClient(accessToken)
  const { settings, updateSetting } = useAgentSettings()
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab)

  // Each tab/section loads its own data (MemorySection, SkillsSection, MetricsSection,
  // SkillsScreen). A global preload here blocked the whole screen when any single
  // request hung (e.g. GET /deep-agent/sessions?limit=200).

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:bg-background" data-testid="fabric-settings-screen">
      <div className="gba:shrink-0 gba:px-4 sm:gba:px-6 lg:gba:px-8 gba:py-4 sm:gba:py-5">
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

        <nav className="gba:flex gba:gap-1 gba:mt-4 gba:border-b gba:border-border/50" data-testid="settings-tabs">
          {TABS.map(tab => {
            const TabIcon = tab.icon
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`gba:inline-flex gba:items-center gba:gap-1.5 gba:px-4 gba:py-2 gba:text-sm gba:font-medium gba:transition-colors gba:border-b-2 gba:-mb-px ${
                  activeTab === tab.key
                    ? 'gba:border-primary gba:text-foreground'
                    : 'gba:border-transparent gba:text-muted-foreground gba:hover:text-foreground gba:hover:border-border'
                }`}
                data-testid={`settings-tab-${tab.key}`}
              >
                <TabIcon className="gba:h-4 gba:w-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {activeTab === 'settings' && (
        <div className="gba:flex-1 gba:overflow-y-auto">
          <div className="gba:max-w-5xl gba:mx-auto gba:px-4 sm:gba:px-6 lg:gba:px-8 gba:py-6 sm:gba:py-8 lg:gba:py-12">
            <ConfigurationSection settings={settings} updateSetting={updateSetting} />
            <div className="gba:h-12 lg:gba:h-16" />
            <MemorySection client={client} isOpen />
            <div className="gba:h-12 lg:gba:h-16" />
            <PoliciesSection accessToken={accessToken} isOpen />
            <div className="gba:h-12 lg:gba:h-16" />
            <MetricsSection client={client} isOpen />
          </div>
        </div>
      )}

      {activeTab === 'agents' && (
        <div className="gba:flex-1 gba:min-h-0">
          <AgentsScreen accessToken={accessToken} onBack={() => setActiveTab('settings')} embedded />
        </div>
      )}

      {activeTab === 'skills' && (
        <div className="gba:flex-1 gba:min-h-0">
          <SkillsScreen accessToken={accessToken} onBack={() => setActiveTab('settings')} embedded />
        </div>
      )}

      {activeTab === 'tools' && (
        <div className="gba:flex-1 gba:overflow-y-auto">
          <ToolsTab accessToken={accessToken} />
        </div>
      )}
    </div>
  )
}
