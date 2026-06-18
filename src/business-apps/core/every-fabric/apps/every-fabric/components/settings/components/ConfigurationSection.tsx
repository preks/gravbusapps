import React from 'react'
import { GearIcon } from '@phosphor-icons/react'
import type { AgentSettings } from '../agentSettings.types'
import { SectionHeader, ToggleRow } from './SettingsShared'

interface ConfigurationSectionProps {
  settings: AgentSettings
  updateSetting: <K extends keyof AgentSettings>(key: K, value: AgentSettings[K]) => void
  devToolsEnabled: boolean
}

const REFLECTION_MODES = ['adaptive', 'always', 'disabled'] as const

export const ConfigurationSection: React.FC<ConfigurationSectionProps> = ({
  settings,
  updateSetting,
  devToolsEnabled
}) => (
  <>
    <SectionHeader
      icon={<GearIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground/60" />}
      title="Configuration"
    />
    <div className="gba:px-3 sm:gba:px-4 gba:pb-2 sm:gba:pb-3">
      <ToggleRow
        label="Memory"
        description="Remember preferences and context across sessions"
        enabled={settings.enableMemory}
        onToggle={() => updateSetting('enableMemory', !settings.enableMemory)}
      />
      <ToggleRow
        label="Auto-Approve Mode"
        description="Let the agent proceed without asking for confirmation on actions that normally require approval"
        enabled={settings.autoApproveModeEnabled}
        onToggle={() => updateSetting('autoApproveModeEnabled', !settings.autoApproveModeEnabled)}
        data-testid="settings-auto-approve-mode-toggle"
      />
      {devToolsEnabled && (
        <>
          <ToggleRow
            label="Developer mode"
            description="Show model picker, trace explorer, and debug trace tools"
            enabled={settings.devModeEnabled}
            onToggle={() => updateSetting('devModeEnabled', !settings.devModeEnabled)}
            data-testid="settings-dev-mode-toggle"
          />
          <div className="gba:px-3 sm:gba:px-4 gba:py-2.5 sm:gba:py-3">
            <p className="gba:text-sm gba:font-medium gba:text-foreground">Reflection Mode</p>
            <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">
              Controls whether the agent reviews its work before finishing
            </p>
            <div className="gba:flex gba:gap-2 gba:mt-2.5">
              {REFLECTION_MODES.map(mode => (
                <button
                  key={mode}
                  onClick={() => updateSetting('enableReflection', mode)}
                  className={`gba:px-3 gba:py-1.5 gba:rounded-full gba:text-xs gba:font-medium gba:transition-colors ${
                    settings.enableReflection === mode
                      ? 'gba:bg-foreground gba:text-background'
                      : 'gba:bg-muted/40 gba:text-muted-foreground gba:hover:bg-muted/60'
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  </>
)
