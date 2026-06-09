import React from 'react'
import { render, screen } from '@testing-library/react'
import { EveryFabricApp } from '../EveryFabricApp'

const mockUseFeature = jest.fn()
const mockUseAgentSettings = jest.fn()
const mockUseSessionUrlState = jest.fn()
const mockUseSidebarCollapsedState = jest.fn()
const mockUseActiveSessions = jest.fn()

jest.mock('@/common/hooks/useFeature', () => ({
  useFeature: (...args: unknown[]) => mockUseFeature(...args)
}))

jest.mock('../hooks/useAgentSettings', () => ({
  useAgentSettings: (...args: unknown[]) => mockUseAgentSettings(...args)
}))

jest.mock('../hooks/useSessionUrlState', () => ({
  useSessionUrlState: (...args: unknown[]) => mockUseSessionUrlState(...args)
}))

jest.mock('../components/sidebar/useSidebarCollapsedState', () => ({
  useSidebarCollapsedState: (...args: unknown[]) => mockUseSidebarCollapsedState(...args)
}))

jest.mock('../hooks/useActiveSessions', () => ({
  useActiveSessions: (...args: unknown[]) => mockUseActiveSessions(...args)
}))

jest.mock('../components/sidebar/Sidebar', () => ({
  Sidebar: () => null
}))

jest.mock('../components/EveryFabricErrorBoundary', () => ({
  EveryFabricErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>
}))

jest.mock('../EveryFabricMainView', () => ({
  EveryFabricMainView: ({
    devModeEnabled,
    devToolsEnabled,
    showTraceExplorer,
    showTraceLens
  }: {
    devModeEnabled: boolean
    devToolsEnabled: boolean
    showTraceExplorer: boolean
    showTraceLens: boolean
  }) => (
    <div
      data-testid="every-fabric-main-view"
      data-dev-mode={devModeEnabled ? 'true' : 'false'}
      data-dev-tools={devToolsEnabled ? 'true' : 'false'}
      data-show-trace-explorer={showTraceExplorer ? 'true' : 'false'}
      data-show-trace-lens={showTraceLens ? 'true' : 'false'}
    />
  )
}))

jest.mock('../context/FabricContext', () => ({
  FabricProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useFabric: () => ({
    session: null,
    sessions: [],
    activeSessionId: null,
    accessToken: 'token',
    userInfo: {},
    selectSession: jest.fn(),
    deleteSession: jest.fn(),
    newSession: jest.fn(),
    startSession: jest.fn(),
    sessionLoadError: null,
    retrySessionLoad: jest.fn()
  })
}))

const renderApp = () => render(<EveryFabricApp accessToken="token" userInfo={{}} />)
const originalLocation = globalThis.location

const setCurrentUrl = (url: string): void => {
  Object.defineProperty(globalThis, 'location', {
    configurable: true,
    value: new URL(url)
  })
}

describe('EveryFabricApp devtools gate', () => {
  beforeEach(() => {
    mockUseFeature.mockReset()
    mockUseAgentSettings.mockReset()
    mockUseSessionUrlState.mockReset()
    mockUseSidebarCollapsedState.mockReset()
    mockUseActiveSessions.mockReset()

    mockUseAgentSettings.mockReturnValue({ devModeEnabled: true })
    mockUseSessionUrlState.mockReturnValue({ urlView: null, updateUrl: jest.fn() })
    mockUseSidebarCollapsedState.mockReturnValue({
      isCollapsed: false,
      toggleCollapsed: jest.fn(),
      setCollapsed: jest.fn()
    })
    mockUseActiveSessions.mockReturnValue({ activeSessions: {}, removeActive: jest.fn() })
    setCurrentUrl('https://tenant.newwork.com/platform/apps/every-fabric')
  })

  afterAll(() => {
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: originalLocation
    })
  })

  it('does not enable dev mode when the tenant devtools flag is off', () => {
    mockUseFeature.mockReturnValue(false)

    renderApp()

    expect(screen.getByTestId('every-fabric-main-view')).toHaveAttribute('data-dev-tools', 'false')
    expect(screen.getByTestId('every-fabric-main-view')).toHaveAttribute('data-dev-mode', 'false')
  })

  it('enables local devtools on localhost even when the tenant flag is off', () => {
    mockUseFeature.mockReturnValue(false)
    setCurrentUrl('http://localhost:3000/?app=core/every-fabric/apps/every-fabric')

    renderApp()

    expect(screen.getByTestId('every-fabric-main-view')).toHaveAttribute('data-dev-tools', 'true')
    expect(screen.getByTestId('every-fabric-main-view')).toHaveAttribute('data-dev-mode', 'true')
  })

  it('blocks direct trace views when the tenant devtools flag is off', () => {
    mockUseFeature.mockReturnValue(false)
    mockUseSessionUrlState.mockReturnValue({ urlView: 'trace-explorer', updateUrl: jest.fn() })

    renderApp()

    expect(screen.getByTestId('every-fabric-main-view')).toHaveAttribute('data-show-trace-explorer', 'false')
    expect(screen.getByTestId('every-fabric-main-view')).toHaveAttribute('data-show-trace-lens', 'false')
  })

  it('enables dev mode when the tenant devtools flag and local setting are both on', () => {
    mockUseFeature.mockReturnValue(true)

    renderApp()

    expect(screen.getByTestId('every-fabric-main-view')).toHaveAttribute('data-dev-tools', 'true')
    expect(screen.getByTestId('every-fabric-main-view')).toHaveAttribute('data-dev-mode', 'true')
  })
})
