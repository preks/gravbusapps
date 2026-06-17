import React from 'react'
import { TabNav, TabNavLink } from '@newwork/nw-design-system'
import type { SettingsSectionDefinition, SettingsSectionId } from '../settingsSections.constants'

interface SettingsSidebarProps {
  activeSection: SettingsSectionId
  sections: SettingsSectionDefinition[]
  onSectionChange: (section: SettingsSectionId) => void
}

export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({ activeSection, sections, onSectionChange }) => (
  <nav className="gba:h-full gba:w-full" data-testid="settings-sidebar" aria-label="Settings sections">
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
            {section.label}
          </TabNavLink>
        )
      })}
    </TabNav>
  </nav>
)
