import React from 'react'
import '@newwork/nw-design-system/style'
import { Avatar, AvatarFallback, Button, Card } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { LatestFunctionItem } from '@/common/network/functions/FunctionsServiceClient'
import { FunctionAssistantSidebar } from './FunctionAssistantSidebar'
import { FunctionEditorHeaderBar } from './editor/FunctionEditorHeaderBar'
import { FunctionDefinitionCard, type FunctionDefinitionTab } from './editor/FunctionDefinitionCard'
import { useFunctionEditorState } from '../hooks/useFunctionEditorState'
import { RotateCcw, Sparkles, X } from 'lucide-react'

export interface FunctionEditorProps extends BusinessAppContextProps {
  mode: 'create' | 'edit'
  function?: LatestFunctionItem | null
  onSaved: () => void
  onBack?: () => void
}

export const FunctionEditor: React.FC<FunctionEditorProps> = props => {
  const { mode, function: func, onSaved, accessToken, onBack, userInfo } = props
  const [definitionTab, setDefinitionTab] = React.useState<FunctionDefinitionTab>('general')
  const [fixTestRequest, setFixTestRequest] = React.useState<null | {
    nonce: string
    source: string
    inputSchema?: Record<string, unknown>
    outputSchema?: Record<string, unknown>
    configKeys?: string[]
    config?: Record<string, string>
    payload?: Record<string, unknown>
    lastError?: string | null
  }>(null)

  const {
    assistantMode,
    assistantOpen,
    setAssistantOpen,
    existingSnapshot,
    applyDraft,
    canUndoAssistantApply,
    undoAssistantApply,
    dismissAssistantUndo,

    name,
    setName,
    description,
    setDescription,
    agentEnabled,
    setAgentEnabled,
    workflowEnabled,
    setWorkflowEnabled,
    connectorEnabled,
    setConnectorEnabled,
    connectorKind,
    setConnectorKind,
    source,
    setSource,
    inputSchema,
    setInputSchema,
    outputSchema,
    setOutputSchema,
    configKeys,
    setConfigKeys,
    connectionOptions,
    selectedConnectionId,
    setSelectedConnectionId,
    isLoadingConnections,

    isValid,
    isSaving,
    error,
    onSave,

    schemaProperties,
    requiredFields,
    testPayloadObj,
    setTestPayloadObj,
    updatePayloadField,
    testResult,
    testLogs,
    isTesting,
    testError,
    onTest,
    buildTestIterationSnapshot
  } = useFunctionEditorState({ accessToken, mode, func })

  const handleSave = React.useCallback(() => onSave(onSaved), [onSave, onSaved])
  const openDefinitionTab = React.useCallback((tab: FunctionDefinitionTab) => setDefinitionTab(tab), [])

  const handleFixWithAi = React.useCallback(() => {
    // Open the assistant and let the chat run the "fix test" iteration flow.
    setAssistantOpen(true)
    const snap = buildTestIterationSnapshot()
    if (!snap) return
    setFixTestRequest({ nonce: `${Date.now()}-${Math.random().toString(16).slice(2)}`, ...snap })
  }, [buildTestIterationSnapshot, setAssistantOpen])

  React.useEffect(() => {
    setDefinitionTab('general')
  }, [mode, func?.id])

  return (
    <div data-testid="function-editor" className="gba:flex gba:flex-col gba:h-full gba:min-h-0 gba:w-full">
      <div className="gba:flex gba:flex-1 gba:min-h-0 gba:min-w-0 gba:overflow-hidden gba:flex-row">
        <div className="gba:flex-1 gba:min-h-0 gba:min-w-0 gba:overflow-auto gba:p-6">
          <FunctionEditorHeaderBar
            mode={mode}
            isSaving={isSaving}
            isValid={isValid}
            assistantOpen={assistantOpen}
            onAssistantOpen={() => setAssistantOpen(true)}
            onSave={handleSave}
            onBack={onBack}
            data-testid="function-editor-header"
          />

          {error && (
            <div className="gba:text-destructive" data-testid="function-editor-error">
              {error}
            </div>
          )}

          <div className="gba:space-y-4 gba:mt-4">
            {canUndoAssistantApply ? (
              <Card
                className="gba:p-3 gba:border gba:border-border gba:bg-muted"
                data-testid="function-editor-undo-banner"
              >
                <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
                  <div className="gba:flex gba:items-start gba:gap-2 gba:min-w-0">
                    <Avatar className="gba:h-6 gba:w-6 gba:shrink-0">
                      <AvatarFallback>
                        <Sparkles className="gba:h-4 gba:w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="gba:min-w-0">
                      <div className="gba:text-sm gba:font-medium gba:text-foreground">AI changes applied</div>
                      <div className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">
                        Review the edits, then save to create a new version. You can undo this apply.
                      </div>
                    </div>
                  </div>
                  <div className="gba:flex gba:items-center gba:gap-1 gba:shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={undoAssistantApply}
                      data-testid="function-editor-undo"
                    >
                      <RotateCcw className="gba:h-4 gba:w-4 gba:mr-2" />
                      Undo
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={dismissAssistantUndo}
                      data-testid="function-editor-undo-dismiss"
                      aria-label="Dismiss"
                    >
                      <X className="gba:h-4 gba:w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ) : null}

            <FunctionDefinitionCard
              mode={mode}
              name={name}
              description={description}
              agentEnabled={agentEnabled}
              workflowEnabled={workflowEnabled}
              connectorEnabled={connectorEnabled}
              connectorKind={connectorKind}
              onNameChange={setName}
              onDescriptionChange={setDescription}
              onAgentEnabledChange={setAgentEnabled}
              onWorkflowEnabledChange={setWorkflowEnabled}
              onConnectorEnabledChange={setConnectorEnabled}
              onConnectorKindChange={setConnectorKind}
              source={source}
              inputSchema={inputSchema}
              outputSchema={outputSchema}
              configKeys={configKeys}
              connectionOptions={connectionOptions}
              selectedConnectionId={selectedConnectionId}
              onSelectedConnectionIdChange={setSelectedConnectionId}
              isLoadingConnections={isLoadingConnections}
              onSourceChange={setSource}
              onInputSchemaChange={setInputSchema}
              onOutputSchemaChange={setOutputSchema}
              onConfigKeysChange={setConfigKeys}
              testSchemaProperties={schemaProperties}
              testRequiredFields={requiredFields}
              testPayload={testPayloadObj}
              onTestPayloadChange={setTestPayloadObj}
              onTestPayloadFieldChange={updatePayloadField}
              onTest={onTest}
              isTesting={isTesting}
              testError={testError}
              testResult={testResult}
              testLogs={testLogs}
              onFixWithAi={handleFixWithAi}
              activeTab={definitionTab}
              onTabChange={setDefinitionTab}
              data-testid="function-editor-definition"
            />
          </div>
        </div>

        {assistantOpen ? (
          <FunctionAssistantSidebar
            accessToken={accessToken}
            userInfo={userInfo}
            mode={assistantMode}
            existing={existingSnapshot}
            onApply={applyDraft}
            onOpenDefinitionTab={openDefinitionTab}
            fixTestRequest={fixTestRequest}
            onFixTestRequestHandled={() => setFixTestRequest(null)}
            onClose={() => setAssistantOpen(false)}
            data-testid="function-assistant"
          />
        ) : null}
      </div>
    </div>
  )
}
