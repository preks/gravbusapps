import React, { useState } from 'react'
import '@newwork/nw-design-system/style'
import { Avatar, AvatarFallback, Button, Card, CreateLayout } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { LatestFunctionItem } from '@/common/network/functions/FunctionsServiceClient'
import { PremiumHeroBackground } from '@/common/components/premium-hero-background'
import { FunctionAssistantSidebar } from './FunctionAssistantSidebar'
import { FunctionEditorHeaderBar } from './editor/FunctionEditorHeaderBar'
import { FunctionDefinitionCard, type FunctionDefinitionTab } from './editor/FunctionDefinitionCard'
import { useFunctionEditorState } from '../hooks/useFunctionEditorState'
import { Code, RotateCcw, Sparkles, X } from 'lucide-react'

export interface FunctionEditorProps extends BusinessAppContextProps {
  mode: 'create' | 'edit'
  function?: LatestFunctionItem | null
  onSaved: () => void
  onBack?: () => void
  /** Opens Function Manager → Credentials (tenant scope) and leaves the editor. */
  onOpenTenantCredentials?: () => void
  heroTitle?: string
  heroSubtitle?: string
  className?: string
  'data-testid'?: string
}

const DATA_TEST_ID = 'function-editor'

export const FunctionEditor: React.FC<FunctionEditorProps> = props => {
  const {
    mode,
    function: func,
    onSaved,
    accessToken,
    onBack,
    onOpenTenantCredentials,
    userInfo,
    heroTitle,
    heroSubtitle,
    className,
    'data-testid': testId = DATA_TEST_ID
  } = props
  const [definitionTab, setDefinitionTab] = React.useState<FunctionDefinitionTab>('general')
  const [isFixingWithAi, setIsFixingWithAi] = React.useState(false)
  const [fixWithAiError, setFixWithAiError] = React.useState<string | null>(null)
  const [chatPanelCollapsed, setChatPanelCollapsed] = useState(false)
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
    buildTestIterationSnapshot,

    storedSecrets,
    credentialBindOptions,
    testOverrideRows,
    setTestOverrideRows
  } = useFunctionEditorState({ accessToken, mode, func })

  const handleSave = React.useCallback(() => onSave(onSaved), [onSave, onSaved])
  const openDefinitionTab = React.useCallback((tab: FunctionDefinitionTab) => setDefinitionTab(tab), [])

  const handleFixWithAi = React.useCallback(() => {
    // Open the assistant and let the chat run the "fix test" iteration flow.
    setAssistantOpen(true)
    setFixWithAiError(null)
    let snap: ReturnType<typeof buildTestIterationSnapshot> = null
    try {
      snap = buildTestIterationSnapshot()
    } catch (e) {
      setFixWithAiError(e instanceof Error ? e.message : 'Unable to start AI fix')
      return
    }
    if (!snap) return
    setIsFixingWithAi(true)
    setFixTestRequest({ nonce: `${Date.now()}-${Math.random().toString(16).slice(2)}`, ...snap })
  }, [buildTestIterationSnapshot, setAssistantOpen])

  React.useEffect(() => {
    setDefinitionTab('general')
  }, [mode, func?.id])

  const openAssistant = React.useCallback(() => {
    setAssistantOpen(true)
    setChatPanelCollapsed(false)
  }, [setAssistantOpen])

  const closeAssistant = React.useCallback(() => {
    setAssistantOpen(false)
    setChatPanelCollapsed(true)
  }, [setAssistantOpen])

  const handleCollapseChange = React.useCallback(
    (collapsed: boolean) => {
      setChatPanelCollapsed(collapsed)
      if (!collapsed) setAssistantOpen(true)
    },
    [setAssistantOpen]
  )

  const usesCreateLayoutHero = heroTitle != null && onBack != null

  const mainContent = (
    <>
      <FunctionEditorHeaderBar
        mode={mode}
        isSaving={isSaving}
        isValid={isValid}
        assistantOpen={assistantOpen}
        onAssistantOpen={openAssistant}
        onSave={handleSave}
        onBack={usesCreateLayoutHero ? undefined : onBack}
        data-testid="function-editor-header"
      />

      {error && (
        <div className="gba:text-destructive" data-testid="function-editor-error">
          {error}
        </div>
      )}

      <div className="gba:space-y-4 gba:mt-4">
        {canUndoAssistantApply ? (
          <Card className="gba:p-3 gba:border gba:border-border gba:bg-muted" data-testid="function-editor-undo-banner">
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
          storedSecrets={storedSecrets}
          credentialBindOptions={credentialBindOptions}
          testOverrideRows={testOverrideRows}
          onTestOverrideRowsChange={setTestOverrideRows}
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
          isFixingWithAi={isFixingWithAi}
          fixWithAiError={fixWithAiError}
          activeTab={definitionTab}
          onTabChange={setDefinitionTab}
          data-testid="function-editor-definition"
        />
      </div>
    </>
  )

  if (usesCreateLayoutHero) {
    return (
      <CreateLayout
        data-testid={testId}
        heroVariant="editor"
        heroIcon={Code}
        heroTitle={heroTitle}
        heroSubtitle={heroSubtitle}
        heroBackground={<PremiumHeroBackground />}
        onBack={onBack}
        chatPanel={
          <FunctionAssistantSidebar
            accessToken={accessToken}
            userInfo={userInfo}
            mode={assistantMode}
            existing={existingSnapshot}
            onApply={applyDraft}
            onOpenDefinitionTab={openDefinitionTab}
            onOpenTenantCredentials={onOpenTenantCredentials}
            fixTestRequest={fixTestRequest}
            onFixTestRequestHandled={() => setFixTestRequest(null)}
            onFixTestStateChange={({ isFixing, error }) => {
              setIsFixingWithAi(isFixing)
              setFixWithAiError(error)
            }}
            onClose={closeAssistant}
            data-testid="function-assistant"
          />
        }
        canvasPanel={
          <div className="gba:flex gba:h-full gba:min-h-0 gba:flex-col gba:overflow-y-auto gba:p-6">{mainContent}</div>
        }
        chatPanelCollapsed={chatPanelCollapsed}
        onChatPanelCollapseChange={handleCollapseChange}
        className={className}
      />
    )
  }

  return (
    <div
      data-testid={testId}
      className={['gba:flex gba:flex-col gba:h-full gba:min-h-0 gba:w-full', className].filter(Boolean).join(' ')}
    >
      <div className="gba:flex gba:flex-1 gba:min-h-0 gba:min-w-0 gba:overflow-hidden gba:flex-row">
        <div className="gba:flex-1 gba:min-h-0 gba:min-w-0 gba:overflow-auto gba:p-6">{mainContent}</div>

        {assistantOpen ? (
          <FunctionAssistantSidebar
            accessToken={accessToken}
            userInfo={userInfo}
            mode={assistantMode}
            existing={existingSnapshot}
            onApply={applyDraft}
            onOpenDefinitionTab={openDefinitionTab}
            onOpenTenantCredentials={onOpenTenantCredentials}
            fixTestRequest={fixTestRequest}
            onFixTestRequestHandled={() => setFixTestRequest(null)}
            onFixTestStateChange={({ isFixing, error }) => {
              setIsFixingWithAi(isFixing)
              setFixWithAiError(error)
            }}
            onClose={closeAssistant}
            data-testid="function-assistant"
          />
        ) : null}
      </div>
    </div>
  )
}
