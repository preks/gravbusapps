import React from 'react'
import { render, screen } from '@testing-library/react'

jest.mock('@newwork/nw-design-system/style', () => ({}))

import { FunctionEditor } from './FunctionEditor'
import { newEmptyConfigRow } from './editor/SettingsEditor'

const useFunctionEditorStateMock = jest.fn()

jest.mock('../hooks/useFunctionEditorState', () => ({
  useFunctionEditorState: (...args: unknown[]) => useFunctionEditorStateMock(...args)
}))

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

jest.mock('./editor/FunctionDefinitionCard', () => ({
  FunctionDefinitionCard: ({ isFixingWithAi, fixWithAiError }: any) => (
    <div data-testid="mock-function-definition-card">
      {isFixingWithAi ? 'fixing' : 'idle'}|{fixWithAiError || ''}
    </div>
  )
}))

jest.mock('./editor/FunctionEditorHeaderBar', () => ({
  FunctionEditorHeaderBar: ({ onBack }: any) => (
    <div data-testid="mock-function-editor-header">
      {onBack ? <button type="button" data-testid="function-editor-header-back" onClick={onBack} /> : null}
    </div>
  )
}))

jest.mock('./FunctionAssistantSidebar', () => ({
  FunctionAssistantSidebar: ({ onFixTestStateChange }: any) => {
    React.useEffect(() => {
      onFixTestStateChange?.({ isFixing: true, error: 'AI returned an incomplete fix' })
    }, [onFixTestStateChange])
    return <div data-testid="mock-function-assistant-sidebar" />
  }
}))

function createFunctionEditorStateMock(overrides: Record<string, unknown> = {}) {
  return {
    assistantMode: 'create',
    assistantOpen: false,
    setAssistantOpen: jest.fn(),
    existingSnapshot: undefined,
    applyDraft: jest.fn(),
    canUndoAssistantApply: false,
    undoAssistantApply: jest.fn(),
    dismissAssistantUndo: jest.fn(),
    name: 'demoFunction',
    setName: jest.fn(),
    description: '',
    setDescription: jest.fn(),
    agentEnabled: false,
    setAgentEnabled: jest.fn(),
    workflowEnabled: false,
    setWorkflowEnabled: jest.fn(),
    connectorEnabled: false,
    setConnectorEnabled: jest.fn(),
    connectorKind: null,
    setConnectorKind: jest.fn(),
    source: 'module.exports.handler = async () => ({ ok: true })',
    setSource: jest.fn(),
    inputSchema: JSON.stringify({ type: 'object', properties: { id: { type: 'string' } } }, null, 2),
    setInputSchema: jest.fn(),
    outputSchema: JSON.stringify({ type: 'object', properties: { ok: { type: 'boolean' } } }, null, 2),
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
    schemaProperties: { id: { type: 'string' } },
    requiredFields: ['id'],
    testPayloadObj: { id: '123' },
    setTestPayloadObj: jest.fn(),
    updatePayloadField: jest.fn(),
    testResult: '',
    testLogs: [],
    isTesting: false,
    testError: 'Runtime error',
    onTest: jest.fn(),
    buildTestIterationSnapshot: jest.fn(() => ({
      source: 'module.exports.handler = async () => ({ ok: true })',
      inputSchema: { type: 'object', properties: { id: { type: 'string' } } },
      outputSchema: { type: 'object', properties: { ok: { type: 'boolean' } } },
      configKeys: [],
      config: {},
      payload: { id: '123' },
      lastError: 'Runtime error',
      lastResult: ''
    })),
    storedSecrets: [],
    refreshSecrets: jest.fn(),
    onCreateStoredSecret: jest.fn(),
    testOverrideRows: [newEmptyConfigRow()],
    setTestOverrideRows: jest.fn(),
    ...overrides
  }
}

describe('FunctionEditor', () => {
  beforeEach(() => {
    useFunctionEditorStateMock.mockReturnValue(createFunctionEditorStateMock())
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('forwards fix loading and fix error state into the definition card', () => {
    useFunctionEditorStateMock.mockReturnValue(createFunctionEditorStateMock({ assistantOpen: true }))

    render(<FunctionEditor mode="create" accessToken="token" onSaved={jest.fn()} userInfo={{} as any} />)

    expect(screen.getByTestId('mock-function-definition-card')).toHaveTextContent(
      'fixing|AI returned an incomplete fix'
    )
  })

  it('keeps a single back action when rendered with a hero', () => {
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

    expect(screen.getByTestId('function-editor-hero-back')).toBeInTheDocument()
    expect(screen.queryByTestId('function-editor-header-back')).not.toBeInTheDocument()
  })

  it('keeps the header back action when the hero is not used', () => {
    render(<FunctionEditor mode="create" accessToken="token" onSaved={jest.fn()} onBack={jest.fn()} />)

    expect(screen.getByTestId('function-editor-header-back')).toBeInTheDocument()
    expect(screen.queryByTestId('function-editor-hero-back')).not.toBeInTheDocument()
  })
})
