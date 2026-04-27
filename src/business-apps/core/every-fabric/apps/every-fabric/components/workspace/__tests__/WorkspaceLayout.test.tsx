import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { WorkspaceLayout } from '../WorkspaceLayout'
import {
  WORKSPACE_CHAT_RIGHT_OFFSET_OPEN_CLASS,
  WORKSPACE_CHAT_RIGHT_OFFSET_PREVIEW_OPEN_CLASS
} from '../workspaceLayout.constants'

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

// Use a lightweight ConversationPanel stub that echoes `chatOffsetClass` onto
// a testable wrapper so we can assert that the resolved class actually reaches
// it — the real bug was that the offset class was silently cancelled by the
// Tailwind cascade when it was applied to the same element as the gutter.
jest.mock('../ConversationPanel', () => ({
  ConversationPanel: ({ chatOffsetClass }: { chatOffsetClass?: string }) => (
    <div
      data-testid="fabric-conversation-panel"
      data-chat-offset-class={chatOffsetClass ?? ''}
      data-chat-offset={chatOffsetClass && chatOffsetClass.length > 0 ? 'true' : 'false'}
    />
  )
}))

jest.mock('../ClarificationPrompt', () => ({
  ClarificationPrompt: ({ chatOffsetClass }: { chatOffsetClass?: string }) => (
    <div data-testid="fabric-clarification-prompt" data-chat-offset-class={chatOffsetClass ?? ''} />
  )
}))

jest.mock('../WorkspaceRightPanel', () => ({
  WorkspaceRightPanel: () => <div data-testid="fabric-right-panel" />
}))

jest.mock('../WorkspaceSkillIndicator', () => ({
  WorkspaceSkillIndicator: () => null
}))

jest.mock('../WorkspaceConnectorIndicator', () => ({
  WorkspaceConnectorIndicator: () => null
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

function createFabricState(overrides: Record<string, unknown> = {}) {
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
    streamingThinking: '',
    statusHeadline: null,
    accessToken: 'token',
    isStreaming: false,
    isConnected: true,
    isWaitingForInput: false,
    taskNodes: [],
    hasPlan: false,
    completedCount: 0,
    totalCount: 0,
    progressPercent: 0,
    currentTodoText: null,
    activityEvents: [],
    decisions: [],
    activeSkill: null,
    sessionConnectorIds: [],
    artifacts: [],
    workspaceDocs: [],
    activeArtifact: null,
    artifactPreviews: [],
    latestPreview: null,
    hasActivePreview: false,
    refreshArtifacts: jest.fn(),
    reply: jest.fn(),
    stopSession: jest.fn(),
    newSession: jest.fn(),
    setActiveArtifactId: jest.fn(),
    ...overrides
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

  /**
   * Regression: the chat rail inside `ConversationPanel` was visibly not
   * shifting when the panel opened, because the `pr-[calc(20rem+2rem)]` offset
   * class lived on the same element as the responsive gutter
   * (`sm:px-6 / lg:px-8`) and lost the cascade at ≥640px. We now pass the
   * already-resolved class string down and apply it on a separate outer
   * wrapper, so it can't collide with the gutter. These tests assert the
   * offset class actually reaches both conversation + clarification.
   */
  it('passes the chat-offset class string to ConversationPanel and ClarificationPrompt when the panel is open', () => {
    setWindowWidth(1600)
    mockUseFabric.mockReturnValue(
      createFabricState({
        isWaitingForInput: true,
        session: {
          session_id: 'session-1',
          status: 'waiting_for_human',
          human_question: 'Are you sure?',
          structured_input_request: null
        }
      })
    )

    render(<WorkspaceLayout />)

    const conversationPanel = screen.getByTestId('fabric-conversation-panel')
    expect(conversationPanel).toHaveAttribute('data-chat-offset-class', WORKSPACE_CHAT_RIGHT_OFFSET_OPEN_CLASS)

    const clarification = screen.getByTestId('fabric-clarification-prompt')
    expect(clarification).toHaveAttribute('data-chat-offset-class', WORKSPACE_CHAT_RIGHT_OFFSET_OPEN_CLASS)
  })

  it('clears the chat-offset class for ConversationPanel when the panel is closed', () => {
    setWindowWidth(1600)

    render(<WorkspaceLayout />)

    fireEvent.click(screen.getByTestId('fabric-workspace-panel-toggle'))

    expect(screen.getByTestId('fabric-conversation-panel')).toHaveAttribute('data-chat-offset-class', '')
  })

  it('uses the wider preview offset class when a live canvas preview is active', () => {
    setWindowWidth(1600)
    mockUseFabric.mockReturnValue(createFabricState({ hasActivePreview: true }))

    render(<WorkspaceLayout />)

    const composerStack = screen.getByTestId('fabric-workspace-composer-stack')
    expect(composerStack.className).toContain(WORKSPACE_CHAT_RIGHT_OFFSET_PREVIEW_OPEN_CLASS)

    expect(screen.getByTestId('fabric-conversation-panel')).toHaveAttribute(
      'data-chat-offset-class',
      WORKSPACE_CHAT_RIGHT_OFFSET_PREVIEW_OPEN_CLASS
    )
  })
})
