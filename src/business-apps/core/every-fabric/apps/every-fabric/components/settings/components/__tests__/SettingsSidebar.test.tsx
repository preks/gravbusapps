import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { GearIcon, BrainIcon } from '@phosphor-icons/react'
import { SettingsSidebar } from '../SettingsSidebar'
import type { SettingsSectionDefinition } from '../../settingsSections.constants'

const SECTIONS: SettingsSectionDefinition[] = [
  {
    id: 'configuration',
    label: 'Configuration',
    icon: GearIcon,
    testId: 'settings-section-nav-configuration'
  },
  {
    id: 'memory',
    label: 'Memory',
    icon: BrainIcon,
    testId: 'settings-section-nav-memory'
  }
]

describe('SettingsSidebar', () => {
  it('renders a vertical nav link for each section', () => {
    render(<SettingsSidebar activeSection="configuration" sections={SECTIONS} onSectionChange={jest.fn()} />)

    expect(screen.getByTestId('settings-sidebar')).toBeInTheDocument()
    expect(screen.getByTestId('settings-section-nav-configuration')).toBeInTheDocument()
    expect(screen.getByTestId('settings-section-nav-memory')).toBeInTheDocument()
  })

  it('calls onSectionChange when a section link is clicked', () => {
    const onSectionChange = jest.fn()
    render(<SettingsSidebar activeSection="configuration" sections={SECTIONS} onSectionChange={onSectionChange} />)

    fireEvent.click(screen.getByTestId('settings-section-nav-memory'))

    expect(onSectionChange).toHaveBeenCalledWith('memory')
  })
})
