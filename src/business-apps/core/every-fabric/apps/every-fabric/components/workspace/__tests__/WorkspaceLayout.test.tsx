import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { WorkspaceLayout } from '../WorkspaceLayout'

const mockUseFabric = jest.fn()
const mockUseFabricConnectors = jest.fn()

jest.mock('../../../context/FabricContext', () => ({
  useFabric: (...args: unknown[]) => mockUseFabric(...args)
}))

jest.mock('../../../hooks/useFabricConnectors', () => ({
  useFabricConnectors: (...args: unknown[]) => mockUseFabricConnectors(...args)
}))

jest.mock('../ArtifactViewer', () => ({
  ArtifactViewer: () => null
}))

jest.mock('../ClarificationPrompt', () => ({
  ClarificationPrompt: () => null
}))

jest.mock('../ConversationPanel', () => ({
  ConversationPanel: () => <div data-testid="fabric-conversation-panel" />
}))

jest.mock('../WorkspaceRightPanel', () => ({
  WorkspaceRightPanel: () => <div data-testid="fabric-right-panel" />
}))

jest.mock('../WorkspaceSkillIndicator', () => ({
  WorkspaceSkillIndicator: () => null
}))

jest.mock('../WorkspaceStreamingIsland', () => ({
  WorkspaceStreamingIsland: () => null
}))

jest.mock('../../landing/FabricInput', () => ({
  FabricInput: () => <div data-testid="fabric-input" />
}))

jest.mock('../../connectors/ConnectorPickerSheet', () => ({
  ConnectorPickerSheet: () => null
}))

function setWindowWidth(width: number): void {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width
  })
}

function resizeWindow(width: number): void {
  setWindowWidth(width)
  act(() => {
    window.dispatchEvent(new Event('resize'))
  })
}

function createFabricState() {
  return {
    session: {
      session_id: 'session-1',
      status: 'running',
      human_question: null,
      structured_input_request: null
    },
    messages: [],
    streamingGreeting: '',
    streamingContent: '',
    statusHeadline: null,
    accessToken: 'token',
    isStreaming: false,
    isConnected: true,
    isWaitingForInput: false,
    taskNodes: [],
    completedCount: 0,
    totalCount: 0,
    progressPercent: 0,
    activityEvents: [],
    activeSkill: null,
    artifacts: [],
    workspaceDocs: [],
    activeArtifact: null,
    reply: jest.fn(),
    stopSession: jest.fn(),
    newSession: jest.fn(),
    setActiveArtifactId: jest.fn()
  }
}

describe('WorkspaceLayout responsive right panel', () => {
  beforeEach(() => {
    setWindowWidth(1200)
    mockUseFabric.mockReturnValue(createFabricState())
    mockUseFabricConnectors.mockReturnValue({
      availableConnectors: [],
      activeConnectors: [],
      toggleConnector: jest.fn(),
      isLoading: false
    })
  })

  it('keeps the panel open by default on desktop widths', () => {
    setWindowWidth(1600)

    render(<WorkspaceLayout onOpenHistory={jest.fn()} onOpenSettings={jest.fn()} />)

    expect(screen.getByTestId('fabric-workspace-panel-toggle')).toHaveAttribute('aria-label', 'Close workspace panel')
  })

  it('starts with the panel collapsed on standard overlay widths', () => {
    setWindowWidth(900)

    render(<WorkspaceLayout onOpenHistory={jest.fn()} onOpenSettings={jest.fn()} />)

    expect(screen.getByTestId('fabric-workspace-panel-toggle')).toHaveAttribute('aria-label', 'Open workspace panel')
    expect(screen.queryByLabelText('Close workspace panel overlay')).not.toBeInTheDocument()
  })

  it('still lets the user open the panel manually on overlay widths', () => {
    setWindowWidth(900)

    render(<WorkspaceLayout onOpenHistory={jest.fn()} onOpenSettings={jest.fn()} />)

    fireEvent.click(screen.getByTestId('fabric-workspace-panel-toggle'))

    expect(screen.getByTestId('fabric-workspace-panel-toggle')).toHaveAttribute('aria-label', 'Close workspace panel')
    expect(screen.getByLabelText('Close workspace panel overlay')).toBeInTheDocument()
  })

  it('reopens the panel automatically when resizing back to desktop width', () => {
    setWindowWidth(900)

    render(<WorkspaceLayout onOpenHistory={jest.fn()} onOpenSettings={jest.fn()} />)

    expect(screen.getByTestId('fabric-workspace-panel-toggle')).toHaveAttribute('aria-label', 'Open workspace panel')

    resizeWindow(1600)

    expect(screen.getByTestId('fabric-workspace-panel-toggle')).toHaveAttribute('aria-label', 'Close workspace panel')
    expect(screen.queryByLabelText('Close workspace panel overlay')).not.toBeInTheDocument()
  })
})
