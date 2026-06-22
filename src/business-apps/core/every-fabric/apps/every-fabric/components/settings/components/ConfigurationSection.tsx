import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { GearIcon } from '@phosphor-icons/react'
import type { AgentSettings } from '../agentSettings.types'
import { SectionHeader, ToggleRow } from './SettingsShared'
import translations from '../../../_i18n'

interface ConfigurationSectionProps {
  settings: AgentSettings
  updateSetting: <K extends keyof AgentSettings>(key: K, value: AgentSettings[K]) => void
  devToolsEnabled: boolean
}

const REFLECTION_MODES = ['adaptive', 'always', 'disabled'] as const

const REFLECTION_LABEL_KEYS: Record<(typeof REFLECTION_MODES)[number], string> = {
  adaptive: 'settings-reflection-adaptive',
  always: 'settings-reflection-always',
  disabled: 'settings-reflection-disabled'
}

export const ConfigurationSection: React.FC<ConfigurationSectionProps> = ({
  settings,
  updateSetting,
  devToolsEnabled
}) => {
  const { t } = useTranslation(translations)

  return (
    <>
      <SectionHeader
        icon={<GearIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground/60" />}
        title={t('settings-configuration-title')}
      />
      <div className="gba:px-3 sm:gba:px-4 gba:pb-2 sm:gba:pb-3">
        <ToggleRow
          label={t('settings-memory-toggle-label')}
          description={t('settings-memory-toggle-desc')}
          enabled={settings.enableMemory}
          onToggle={() => updateSetting('enableMemory', !settings.enableMemory)}
        />
        <ToggleRow
          label={t('settings-auto-approve-label')}
          description={t('settings-auto-approve-desc')}
          enabled={settings.autoApproveModeEnabled}
          onToggle={() => updateSetting('autoApproveModeEnabled', !settings.autoApproveModeEnabled)}
          data-testid="settings-auto-approve-mode-toggle"
        />
        {devToolsEnabled && (
          <>
            <ToggleRow
              label={t('settings-dev-mode-label')}
              description={t('settings-dev-mode-desc')}
              enabled={settings.devModeEnabled}
              onToggle={() => updateSetting('devModeEnabled', !settings.devModeEnabled)}
              data-testid="settings-dev-mode-toggle"
            />
            <div className="gba:px-3 sm:gba:px-4 gba:py-2.5 sm:gba:py-3">
              <p className="gba:text-sm gba:font-medium gba:text-foreground">{t('settings-reflection-mode-label')}</p>
              <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">{t('settings-reflection-mode-desc')}</p>
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
                    {t(REFLECTION_LABEL_KEYS[mode])}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
