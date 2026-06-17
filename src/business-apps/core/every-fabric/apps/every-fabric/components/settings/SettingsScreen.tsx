import React, { useMemo } from 'react'
import { Button } from '@newwork/nw-design-system'
import { ArrowLeftIcon, GearSixIcon, UsersThreeIcon, LightbulbIcon, WrenchIcon } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { useEnterpriseAgentClient } from '../../hooks/useEnterpriseAgentClient'
import { AgentsScreen } from '../agents/AgentsScreen'
import { SkillsScreen } from '../skills/SkillsScreen'
import { useAgentSettings } from '../../hooks/useAgentSettings'
import { SettingsSidebar } from './components/SettingsSidebar'
import { SettingsSectionsPanel } from './components/SettingsSectionsPanel'
import { getVisibleSettingsSections, normaliseSettingsSection } from './settingsSections.constants'
import { ToolsTab } from './ToolsTab'
import { useSettingsUrlState, type SettingsTab } from './useSettingsUrlState'

const TABS: { key: SettingsTab; label: string; icon: Icon }[] = [
  { key: 'settings', label: 'Settings', icon: GearSixIcon },
  { key: 'agents', label: 'Agents', icon: UsersThreeIcon },
  { key: 'skills', label: 'Skills', icon: LightbulbIcon },
  { key: 'tools', label: 'Tools', icon: WrenchIcon }
]

const PAGE_TITLES: Partial<Record<SettingsTab, string>> = {
  agents: 'Agent Studio'
}

interface SettingsScreenProps {
  accessToken: string
  devToolsEnabled: boolean
  onBack: () => void
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ accessToken, devToolsEnabled, onBack }) => {
  const client = useEnterpriseAgentClient(accessToken)
  const { settings, updateSetting } = useAgentSettings()
  const { tab, section, agentId, skillId, setTab, setSection, setAgent, setSkill } = useSettingsUrlState()
  const visibleTabs = devToolsEnabled ? TABS : TABS.filter(item => item.key !== 'tools')
  const activeTab = devToolsEnabled || tab !== 'tools' ? tab : 'settings'
  const activeSection = normaliseSettingsSection(section, devToolsEnabled)
  const visibleSections = useMemo(() => getVisibleSettingsSections(devToolsEnabled), [devToolsEnabled])
  const pageTitle = PAGE_TITLES[activeTab] ?? TABS.find(item => item.key === activeTab)?.label ?? 'Settings'

  return (
    <div className="gba:flex gba:h-full gba:flex-col gba:bg-background" data-testid="fabric-settings-screen">
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
          <h1 className="gba:text-xl sm:gba:text-2xl gba:font-semibold gba:text-foreground">{pageTitle}</h1>
        </div>

        <nav className="gba:flex gba:gap-1 gba:mt-4 gba:border-b gba:border-border/50" data-testid="settings-tabs">
          {visibleTabs.map(item => {
            const TabIcon = item.icon
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`gba:inline-flex gba:items-center gba:gap-1.5 gba:px-4 gba:py-2 gba:text-sm gba:font-medium gba:transition-colors gba:border-b-2 gba:-mb-px ${
                  activeTab === item.key
                    ? 'gba:border-primary gba:text-foreground'
                    : 'gba:border-transparent gba:text-muted-foreground gba:hover:text-foreground gba:hover:border-border'
                }`}
                data-testid={`settings-tab-${item.key}`}
              >
                <TabIcon className="gba:h-4 gba:w-4" />
                {item.label}
              </button>
            )
          })}
        </nav>
      </div>

      {activeTab === 'settings' && (
        <div className="gba:flex gba:min-h-0 gba:flex-1" data-testid="settings-panel-layout">
          <aside
            className="gba:w-52 gba:shrink-0 gba:border-r gba:border-border/50 gba:overflow-y-auto gba:px-2 gba:py-4 sm:gba:w-56 lg:gba:w-60"
            data-testid="settings-sidebar-aside"
          >
            <SettingsSidebar activeSection={activeSection} sections={visibleSections} onSectionChange={setSection} />
          </aside>

          <main
            className="gba:min-w-0 gba:flex-1 gba:overflow-hidden gba:px-4 gba:py-6 sm:gba:px-6 lg:gba:px-8 sm:gba:py-8"
            data-testid="settings-content-canvas"
          >
            <div className="gba:mx-auto gba:h-full gba:max-w-5xl">
              <SettingsSectionsPanel
                accessToken={accessToken}
                devToolsEnabled={devToolsEnabled}
                activeSection={activeSection}
                settings={settings}
                updateSetting={updateSetting}
                client={client}
              />
            </div>
          </main>
        </div>
      )}

      {activeTab === 'agents' && (
        <div className="gba:flex-1 gba:min-h-0">
          <AgentsScreen
            accessToken={accessToken}
            agentId={agentId}
            onAgentChange={setAgent}
            onBack={() => setTab('settings')}
            embedded
          />
        </div>
      )}

      {activeTab === 'skills' && (
        <div className="gba:flex-1 gba:min-h-0">
          <SkillsScreen
            accessToken={accessToken}
            skillId={skillId}
            onSkillChange={setSkill}
            onBack={() => setTab('settings')}
            embedded
          />
        </div>
      )}

      {devToolsEnabled && activeTab === 'tools' && (
        <div className="gba:flex-1 gba:overflow-y-auto">
          <ToolsTab accessToken={accessToken} />
        </div>
      )}
    </div>
  )
}
