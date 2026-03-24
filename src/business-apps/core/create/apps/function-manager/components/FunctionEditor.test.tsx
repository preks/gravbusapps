import React from 'react'
import { render, screen } from '@testing-library/react'
import { FunctionEditor } from './FunctionEditor'

const useFunctionEditorStateMock = jest.fn()

jest.mock('@newwork/nw-design-system', () => ({
  Avatar: ({ children }: any) => <div data-testid="mock-avatar">{children}</div>,
  AvatarFallback: ({ children }: any) => <div data-testid="mock-avatar-fallback">{children}</div>,
  Button: ({ children, onClick, type = 'button', ...props }: any) => (
    <button type={type} onClick={onClick} {...props}>
      {children}
    </button>
  ),
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>
}))

jest.mock('../hooks/useFunctionEditorState', () => ({
  useFunctionEditorState: (...args: unknown[]) => useFunctionEditorStateMock(...args)
}))

jest.mock('@/components/create-layout', () => ({
  CreateLayout: ({ onBack, canvasPanel, chatPanel }: any) => (
    <div data-testid="mock-create-layout">
      {onBack ? (
        <button type="button" onClick={onBack} data-testid="mock-create-layout-back">
          Back
        </button>
      ) : null}
      <div data-testid="mock-create-layout-chat">{chatPanel}</div>
      <div data-testid="mock-create-layout-canvas">{canvasPanel}</div>
    </div>
  )
}))

jest.mock('./FunctionAssistantSidebar', () => ({
  FunctionAssistantSidebar: () => <div data-testid="function-assistant-sidebar" />
}))

jest.mock('./editor/FunctionDefinitionCard', () => ({
  FunctionDefinitionCard: () => <div data-testid="function-definition-card" />
}))

function createFunctionEditorStateMock() {
  return {
    assistantMode: 'default',
    assistantOpen: false,
    setAssistantOpen: jest.fn(),
    existingSnapshot: null,
    applyDraft: jest.fn(),
    canUndoAssistantApply: false,
    undoAssistantApply: jest.fn(),
    dismissAssistantUndo: jest.fn(),
    name: 'Example function',
    setName: jest.fn(),
    description: 'Description',
    setDescription: jest.fn(),
    agentEnabled: false,
    setAgentEnabled: jest.fn(),
    workflowEnabled: false,
    setWorkflowEnabled: jest.fn(),
    connectorEnabled: false,
    setConnectorEnabled: jest.fn(),
    connectorKind: 'NONE',
    setConnectorKind: jest.fn(),
    source: 'return true',
    setSource: jest.fn(),
    inputSchema: {},
    setInputSchema: jest.fn(),
    outputSchema: {},
    setOutputSchema: jest.fn(),
    configKeys: [],
    setConfigKeys: jest.fn(),
    connectionOptions: [],
    selectedConnectionId: null,
    setSelectedConnectionId: jest.fn(),
    isLoadingConnections: false,
    isValid: true,
    isSaving: false,
    error: null,
    onSave: jest.fn(),
    schemaProperties: [],
    requiredFields: [],
    testPayloadObj: {},
    setTestPayloadObj: jest.fn(),
    updatePayloadField: jest.fn(),
    testResult: null,
    testLogs: [],
    isTesting: false,
    testError: null,
    onTest: jest.fn(),
    buildTestIterationSnapshot: jest.fn(() => null)
  }
}

describe('FunctionEditor', () => {
  beforeEach(() => {
    useFunctionEditorStateMock.mockReturnValue(createFunctionEditorStateMock())
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('keeps a single back action when rendered inside CreateLayout', () => {
    render(
      <FunctionEditor
        mode="create"
        accessToken="token"
        onSaved={jest.fn()}
        onBack={jest.fn()}
        heroTitle="Create function"
        heroSubtitle="Build a function"
      />
    )

    expect(screen.getByTestId('mock-create-layout-back')).toBeInTheDocument()
    expect(screen.queryByTestId('function-editor-header-back')).not.toBeInTheDocument()
  })

  it('keeps the header back action when CreateLayout is not used', () => {
    render(<FunctionEditor mode="create" accessToken="token" onSaved={jest.fn()} onBack={jest.fn()} />)

    expect(screen.getByTestId('function-editor-header-back')).toBeInTheDocument()
    expect(screen.queryByTestId('mock-create-layout')).not.toBeInTheDocument()
  })
})
