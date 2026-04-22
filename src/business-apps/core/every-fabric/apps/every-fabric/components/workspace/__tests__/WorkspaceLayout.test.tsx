import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
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
    sessionConnectorIds: [],
    artifacts: [],
    workspaceDocs: [],
    activeArtifact: null,
    reply: jest.fn(),
    stopSession: jest.fn(),
    newSession: jest.fn(),
    setActiveArtifactId: jest.fn()
  }
}

describe('WorkspaceLayout right panel', () => {
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

  it('opens the panel by default on wide viewports', () => {
    setWindowWidth(1600)

    render(<WorkspaceLayout />)

    expect(screen.getByTestId('fabric-workspace-panel-toggle')).toHaveAttribute('aria-label', 'Close workspace panel')
  })

  it('starts with the panel closed on narrow viewports', () => {
    setWindowWidth(1100)

    render(<WorkspaceLayout />)

    expect(screen.getByTestId('fabric-workspace-panel-toggle')).toHaveAttribute('aria-label', 'Open workspace panel')
  })

  it('never renders a full-viewport overlay backdrop', () => {
    setWindowWidth(1100)

    render(<WorkspaceLayout />)

    // The old "overlay" backdrop used this label; with the unified shell we
    // never dim or blur the background just to show progress info.
    expect(screen.queryByLabelText('Close workspace panel overlay')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('fabric-workspace-panel-toggle'))

    expect(screen.queryByLabelText('Close workspace panel overlay')).not.toBeInTheDocument()
  })

  it('lets the user toggle the panel on narrow viewports', () => {
    setWindowWidth(1100)

    render(<WorkspaceLayout />)

    const toggle = screen.getByTestId('fabric-workspace-panel-toggle')
    expect(toggle).toHaveAttribute('aria-label', 'Open workspace panel')

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-label', 'Close workspace panel')

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-label', 'Open workspace panel')
  })

  it('offsets the chat rail whenever the panel is open, regardless of viewport width', () => {
    setWindowWidth(1600)

    render(<WorkspaceLayout />)

    const composerStack = screen.getByTestId('fabric-workspace-composer-stack')
    expect(composerStack).toHaveAttribute('data-chat-offset', 'true')

    fireEvent.click(screen.getByTestId('fabric-workspace-panel-toggle'))
    expect(composerStack).toHaveAttribute('data-chat-offset', 'false')
  })

  it('offsets the chat rail on narrow viewports too once the user opens the panel', () => {
    setWindowWidth(1100)

    render(<WorkspaceLayout />)

    const composerStack = screen.getByTestId('fabric-workspace-composer-stack')
    expect(composerStack).toHaveAttribute('data-chat-offset', 'false')

    fireEvent.click(screen.getByTestId('fabric-workspace-panel-toggle'))
    expect(composerStack).toHaveAttribute('data-chat-offset', 'true')
  })
})
