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
    expect(screen.queryByTestId('settings-metrics-section')).not.toBeInTheDocument()
    expect(screen.getByTestId('settings-memory-section')).toBeInTheDocument()
    expect(screen.getByTestId('settings-policies-section')).toBeInTheDocument()
  })

  it('shows devtools settings when the tenant flag is on', () => {
    render(<SettingsScreen accessToken="token" devToolsEnabled onBack={jest.fn()} />)

    expect(screen.getByTestId('settings-dev-mode-toggle')).toBeInTheDocument()
    expect(screen.getByText('Reflection Mode')).toBeInTheDocument()
    expect(screen.getByTestId('settings-tab-tools')).toBeInTheDocument()
    expect(screen.getByTestId('settings-metrics-section')).toBeInTheDocument()
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

  it('defaults to settings tab when no URL param', () => {
    setUrl('?view=settings')
    render(<SettingsScreen accessToken="token" devToolsEnabled onBack={jest.fn()} />)

    expect(screen.getByTestId('settings-memory-section')).toBeInTheDocument()
    expect(screen.queryByTestId('settings-agents-screen')).not.toBeInTheDocument()
  })

  it('shows agents tab when URL has tab=agents', () => {
    setUrl('?view=settings&tab=agents')
    render(<SettingsScreen accessToken="token" devToolsEnabled onBack={jest.fn()} />)

    expect(screen.getByTestId('settings-agents-screen')).toBeInTheDocument()
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

  it('updates URL when clicking tab buttons', () => {
    setUrl('?view=settings')
    render(<SettingsScreen accessToken="token" devToolsEnabled onBack={jest.fn()} />)

    const agentsTab = screen.getByTestId('settings-tab-agents')
    fireEvent.click(agentsTab)

    expect(globalThis.location.search).toContain('tab=agents')
  })
})
