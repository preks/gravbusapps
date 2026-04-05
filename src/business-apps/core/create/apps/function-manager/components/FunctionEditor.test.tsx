import React from 'react'
import { render, screen } from '@testing-library/react'

jest.mock('@newwork/nw-design-system/style', () => ({}))

import { FunctionEditor } from './FunctionEditor'

jest.mock('@newwork/nw-design-system', () => {
  const ReactModule = jest.requireActual('react') as typeof import('react')
  const React = ReactModule.default || ReactModule
  const passthrough =
    (tag: string) =>
    ({ children, ...props }: any) =>
      React.createElement(tag, props, children)

  return {
    Avatar: passthrough('div'),
    AvatarFallback: passthrough('div'),
    Button: ({ children, ...props }: any) => React.createElement('button', props, children),
    Card: passthrough('div')
  }
})

const mockUseFunctionEditorState = jest.fn()

jest.mock('../hooks/useFunctionEditorState', () => ({
  useFunctionEditorState: (...args: any[]) => mockUseFunctionEditorState(...args)
}))

jest.mock('./editor/FunctionDefinitionCard', () => ({
  FunctionDefinitionCard: ({ isFixingWithAi, fixWithAiError }: any) => (
    <div data-testid="mock-function-definition-card">
      {isFixingWithAi ? 'fixing' : 'idle'}|{fixWithAiError || ''}
    </div>
  )
}))

jest.mock('./editor/FunctionEditorHeaderBar', () => ({
  FunctionEditorHeaderBar: () => <div data-testid="mock-function-editor-header" />
}))

jest.mock('./FunctionAssistantSidebar', () => ({
  FunctionAssistantSidebar: ({ onFixTestStateChange }: any) => {
    React.useEffect(() => {
      onFixTestStateChange?.({ isFixing: true, error: 'AI returned an incomplete fix' })
    }, [onFixTestStateChange])
    return <div data-testid="mock-function-assistant-sidebar" />
  }
}))

describe('FunctionEditor', () => {
  beforeEach(() => {
    mockUseFunctionEditorState.mockReturnValue({
      assistantMode: 'create',
      assistantOpen: true,
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
      configKeys: [{ key: '', value: '' }],
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
      }))
    })
  })

  it('forwards fix loading and fix error state into the definition card', () => {
    render(<FunctionEditor mode="create" accessToken="token" onSaved={jest.fn()} userInfo={{} as any} />)

    expect(screen.getByTestId('mock-function-definition-card')).toHaveTextContent(
      'fixing|AI returned an incomplete fix'
    )
  })
})
