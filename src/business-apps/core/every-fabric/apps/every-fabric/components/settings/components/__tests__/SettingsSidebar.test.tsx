import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { LocalizationProvider } from '@newwork/nw-design-system'
import { GearIcon, BrainIcon } from '@phosphor-icons/react'
import { SettingsSidebar } from '../SettingsSidebar'
import type { SettingsSectionDefinition } from '../../settingsSections.constants'

const SECTIONS: SettingsSectionDefinition[] = [
  {
    id: 'configuration',
    icon: GearIcon,
    testId: 'settings-section-nav-configuration'
  },
  {
    id: 'memory',
    icon: BrainIcon,
    testId: 'settings-section-nav-memory'
  }
]

function renderSidebar(ui: React.ReactElement) {
  return render(<LocalizationProvider locale="en-US">{ui}</LocalizationProvider>)
}

describe('SettingsSidebar', () => {
  it('renders a vertical nav link for each section', () => {
    renderSidebar(<SettingsSidebar activeSection="configuration" sections={SECTIONS} onSectionChange={jest.fn()} />)

    expect(screen.getByTestId('settings-sidebar')).toBeInTheDocument()
    expect(screen.getByTestId('settings-section-nav-configuration')).toBeInTheDocument()
    expect(screen.getByTestId('settings-section-nav-memory')).toBeInTheDocument()
  })

  it('calls onSectionChange when a section link is clicked', () => {
    const onSectionChange = jest.fn()
    renderSidebar(
      <SettingsSidebar activeSection="configuration" sections={SECTIONS} onSectionChange={onSectionChange} />
    )

    fireEvent.click(screen.getByTestId('settings-section-nav-memory'))

    expect(onSectionChange).toHaveBeenCalledWith('memory')
  })
})
