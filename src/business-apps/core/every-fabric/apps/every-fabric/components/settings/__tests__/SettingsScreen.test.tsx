import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { SettingsScreen } from '../SettingsScreen'

function setUrl(search: string) {
  globalThis.history.replaceState({}, '', `/platform/every-fabric${search}`)
}

const mockUseAgentSettings = jest.fn()

jest.mock('../../../hooks/useEnterpriseAgentClient', () => ({
  useEnterpriseAgentClient: () => ({})
}))

jest.mock('../../../hooks/useAgentSettings', () => ({
  useAgentSettings: (...args: unknown[]) => mockUseAgentSettings(...args)
}))

jest.mock('../components/MemorySection', () => ({
  MemorySection: () => <div data-testid="settings-memory-section" />
}))

jest.mock('../components/PoliciesSection', () => ({
  PoliciesSection: () => <div data-testid="settings-policies-section" />
}))

jest.mock('../components/MetricsSection', () => ({
  MetricsSection: () => <div data-testid="settings-metrics-section" />
}))

jest.mock('../../agents/AgentsScreen', () => ({
  AgentsScreen: () => <div data-testid="settings-agents-screen" />
}))

jest.mock('../../skills/SkillsScreen', () => ({
  SkillsScreen: () => <div data-testid="settings-skills-screen" />
}))

jest.mock('../ToolsTab', () => ({
  ToolsTab: () => <div data-testid="settings-tools-tab" />
}))

describe('SettingsScreen layout', () => {
  beforeEach(() => {
    setUrl('?view=settings')
    mockUseAgentSettings.mockReset()
    mockUseAgentSettings.mockReturnValue({
      settings: {
        enableMemory: true,
        enableReflection: 'adaptive',
        devModeEnabled: true
      },
      updateSetting: jest.fn()
    })
  })

  it('shows sidebar layout only on the settings tab', () => {
    render(<SettingsScreen accessToken="token" devToolsEnabled onBack={jest.fn()} />)

    expect(screen.getByTestId('settings-panel-layout')).toBeInTheDocument()
    expect(screen.getByTestId('settings-sidebar-aside')).toBeInTheDocument()
    expect(screen.getByTestId('settings-content-canvas')).toBeInTheDocument()
    expect(screen.getByTestId('settings-tabs')).toBeInTheDocument()
  })

  it('hides the settings sidebar on the agents tab', () => {
    setUrl('?view=settings&tab=agents')
    render(<SettingsScreen accessToken="token" devToolsEnabled onBack={jest.fn()} />)

    expect(screen.queryByTestId('settings-panel-layout')).not.toBeInTheDocument()
    expect(screen.queryByTestId('settings-sidebar-aside')).not.toBeInTheDocument()
    expect(screen.getByTestId('settings-agents-screen')).toBeInTheDocument()
  })
})

describe('SettingsScreen devtools gate', () => {
  beforeEach(() => {
    setUrl('?view=settings')
    mockUseAgentSettings.mockReset()
    mockUseAgentSettings.mockReturnValue({
      settings: {
        enableMemory: true,
        enableReflection: 'adaptive',
        devModeEnabled: true
      },
      updateSetting: jest.fn()
    })
  })

  it('hides devtools settings when the tenant flag is off', () => {
    render(<SettingsScreen accessToken="token" devToolsEnabled={false} onBack={jest.fn()} />)

    expect(screen.queryByTestId('settings-dev-mode-toggle')).not.toBeInTheDocument()
    expect(screen.queryByText('Reflection Mode')).not.toBeInTheDocument()
    expect(screen.queryByTestId('settings-tab-tools')).not.toBeInTheDocument()
    expect(screen.queryByTestId('settings-section-nav-metrics')).not.toBeInTheDocument()
    expect(screen.queryByTestId('settings-memory-section')).not.toBeInTheDocument()
    expect(screen.queryByTestId('settings-policies-section')).not.toBeInTheDocument()
    expect(screen.getByTestId('settings-section-content-configuration')).toBeInTheDocument()
  })

  it('shows devtools settings when the tenant flag is on', () => {
    render(<SettingsScreen accessToken="token" devToolsEnabled onBack={jest.fn()} />)

    expect(screen.getByTestId('settings-dev-mode-toggle')).toBeInTheDocument()
    expect(screen.getByText('Reflection Mode')).toBeInTheDocument()
    expect(screen.getByTestId('settings-tab-tools')).toBeInTheDocument()
    expect(screen.getByTestId('settings-section-nav-metrics')).toBeInTheDocument()
    expect(screen.queryByTestId('settings-metrics-section')).not.toBeInTheDocument()
  })
})

describe('SettingsScreen URL state', () => {
  beforeEach(() => {
    mockUseAgentSettings.mockReset()
    mockUseAgentSettings.mockReturnValue({
      settings: {
        enableMemory: true,
        enableReflection: 'adaptive',
        devModeEnabled: true
      },
      updateSetting: jest.fn()
    })
  })

  it('defaults to configuration section when no URL param', () => {
    setUrl('?view=settings')
    render(<SettingsScreen accessToken="token" devToolsEnabled onBack={jest.fn()} />)

    expect(screen.getByTestId('settings-section-content-configuration')).toBeInTheDocument()
    expect(screen.queryByTestId('settings-memory-section')).not.toBeInTheDocument()
    expect(screen.queryByTestId('settings-agents-screen')).not.toBeInTheDocument()
  })

  it('shows memory section when URL has section=memory', () => {
    setUrl('?view=settings&section=memory')
    render(<SettingsScreen accessToken="token" devToolsEnabled onBack={jest.fn()} />)

    expect(screen.getByTestId('settings-memory-section')).toBeInTheDocument()
    expect(screen.queryByTestId('settings-dev-mode-toggle')).not.toBeInTheDocument()
  })

  it('shows agents tab when URL has tab=agents', () => {
    setUrl('?view=settings&tab=agents')
    render(<SettingsScreen accessToken="token" devToolsEnabled onBack={jest.fn()} />)

    expect(screen.getByTestId('settings-agents-screen')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Agent Studio' })).toBeInTheDocument()
    expect(screen.queryByTestId('settings-memory-section')).not.toBeInTheDocument()
  })

  it('shows skills tab when URL has tab=skills', () => {
    setUrl('?view=settings&tab=skills')
    render(<SettingsScreen accessToken="token" devToolsEnabled onBack={jest.fn()} />)

    expect(screen.getByTestId('settings-skills-screen')).toBeInTheDocument()
    expect(screen.queryByTestId('settings-memory-section')).not.toBeInTheDocument()
  })

  it('shows tools tab when URL has tab=tools and devtools enabled', () => {
    setUrl('?view=settings&tab=tools')
    render(<SettingsScreen accessToken="token" devToolsEnabled onBack={jest.fn()} />)

    expect(screen.getByTestId('settings-tools-tab')).toBeInTheDocument()
    expect(screen.queryByTestId('settings-memory-section')).not.toBeInTheDocument()
  })

  it('updates URL when clicking top tab buttons', () => {
    setUrl('?view=settings')
    render(<SettingsScreen accessToken="token" devToolsEnabled onBack={jest.fn()} />)

    fireEvent.click(screen.getByTestId('settings-tab-agents'))

    expect(globalThis.location.search).toContain('tab=agents')
  })

  it('updates URL when clicking section nav items', () => {
    setUrl('?view=settings')
    render(<SettingsScreen accessToken="token" devToolsEnabled onBack={jest.fn()} />)

    fireEvent.click(screen.getByTestId('settings-section-nav-memory'))

    expect(globalThis.location.search).toContain('section=memory')
    expect(screen.getByTestId('settings-memory-section')).toBeInTheDocument()
  })
})
