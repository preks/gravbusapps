import React from 'react'
import { TabNav, TabNavLink, useTranslation } from '@newwork/nw-design-system'
import type { SettingsSectionDefinition, SettingsSectionId } from '../settingsSections.constants'
import translations from '../../../_i18n'

const SECTION_LABEL_KEYS: Record<SettingsSectionId, string> = {
  configuration: 'settings-section-configuration',
  memory: 'settings-section-memory',
  policies: 'settings-section-policies',
  metrics: 'settings-section-metrics'
}

interface SettingsSidebarProps {
  activeSection: SettingsSectionId
  sections: SettingsSectionDefinition[]
  onSectionChange: (section: SettingsSectionId) => void
}

export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({ activeSection, sections, onSectionChange }) => {
  const { t } = useTranslation(translations)

  return (
    <nav className="gba:h-full gba:w-full" data-testid="settings-sidebar" aria-label={t('settings-sidebar-aria')}>
      <TabNav orientation="vertical" showBorder verticalIndicatorSide="left" data-testid="settings-sidebar-links">
        {sections.map(section => {
          const SectionIcon = section.icon
          return (
            <TabNavLink
              key={section.id}
              href={`#${section.id}`}
              active={activeSection === section.id}
              startIcon={<SectionIcon className="gba:h-4 gba:w-4" />}
              onClick={event => {
                event.preventDefault()
                onSectionChange(section.id)
              }}
              data-testid={section.testId}
            >
              {t(SECTION_LABEL_KEYS[section.id])}
            </TabNavLink>
          )
        })}
      </TabNav>
    </nav>
  )
}
