import React from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea
} from '@newwork/nw-design-system'
import { Bot, Database, FileText, GitBranch, Plug } from 'lucide-react'
import {
  FUNCTION_CATEGORIES,
  type ConnectorKind,
  type FunctionCategory
} from '@/common/network/functions/FunctionsServiceClient'
import { getSubcategorySuggestions } from '../../config/categorySuggestions'
import { CodeEditor } from './CodeEditor'
import { SettingsEditor, type ConfigRow, type StoredSecretOption } from './SettingsEditor'
import type { CredentialBindOption } from '@/common/utils/credentialBindOptions'
import { TestFunctionCard } from './TestFunctionCard'
import type { FunctionExecutionLogEntry } from '@/common/network/functions/FunctionsServiceClient'

export type FunctionDefinitionTab = 'general' | 'source' | 'inputSchema' | 'outputSchema' | 'settings' | 'test'

export interface FunctionDefinitionCardProps {
  mode: 'create' | 'edit'
  name: string
  description: string
  category: FunctionCategory
  subcategory: string
  agentEnabled: boolean
  workflowEnabled: boolean
  connectorEnabled: boolean
  connectorKind: ConnectorKind | null
  onNameChange: (v: string) => void
  onDescriptionChange: (v: string) => void
  onCategoryChange: (v: FunctionCategory) => void
  onSubcategoryChange: (v: string) => void
  onAgentEnabledChange: (v: boolean) => void
  onWorkflowEnabledChange: (v: boolean) => void
  onConnectorEnabledChange: (v: boolean) => void
  onConnectorKindChange: (v: ConnectorKind) => void
  source: string
  inputSchema: string
  outputSchema: string
  configKeys: ConfigRow[]
  connectionOptions: Array<{ id: string; name: string }>
  selectedConnectionId: string | null
  onSelectedConnectionIdChange: (connectionId: string | null) => void
  isLoadingConnections: boolean
  onSourceChange: (v: string) => void
  onInputSchemaChange: (v: string) => void
  onOutputSchemaChange: (v: string) => void
  onConfigKeysChange: (rows: ConfigRow[]) => void
  storedSecrets?: StoredSecretOption[]
  credentialBindOptions?: CredentialBindOption[]
  testOverrideRows: ConfigRow[]
  onTestOverrideRowsChange: (rows: ConfigRow[]) => void
  testSchemaProperties: Record<string, unknown>
  testRequiredFields: string[]
  testExamples?: Array<{ name: string; description?: string; payload: Record<string, unknown> }>
  testPayload: Record<string, unknown>
  onTestPayloadChange: (payload: Record<string, unknown>) => void
  onTestPayloadFieldChange: (key: string, value: unknown) => void
  onTest: () => void
  isTesting: boolean
  testError: string | null
  testResult: string
  testLogs: FunctionExecutionLogEntry[]
  onFixWithAi?: () => void
  isFixingWithAi?: boolean
  fixWithAiError?: string | null
  activeTab: FunctionDefinitionTab
  onTabChange: (tab: FunctionDefinitionTab) => void
  'data-testid'?: string
}

export const FunctionDefinitionCard: React.FC<FunctionDefinitionCardProps> = ({
  mode,
  name,
  description,
  category,
  subcategory,
  agentEnabled,
  workflowEnabled,
  connectorEnabled,
  connectorKind,
  onNameChange,
  onDescriptionChange,
  onCategoryChange,
  onSubcategoryChange,
  onAgentEnabledChange,
  onWorkflowEnabledChange,
  onConnectorEnabledChange,
  onConnectorKindChange,
  source,
  inputSchema,
  outputSchema,
  configKeys,
  connectionOptions,
  selectedConnectionId,
  onSelectedConnectionIdChange,
  isLoadingConnections,
  onSourceChange,
  onInputSchemaChange,
  onOutputSchemaChange,
  onConfigKeysChange,
  storedSecrets,
  credentialBindOptions,
  testOverrideRows,
  onTestOverrideRowsChange,
  testSchemaProperties,
  testRequiredFields,
  testExamples,
  testPayload,
  onTestPayloadChange,
  onTestPayloadFieldChange,
  onTest,
  isTesting,
  testError,
  testResult,
  testLogs,
  onFixWithAi,
  isFixingWithAi = false,
  fixWithAiError = null,
  activeTab,
  onTabChange,
  'data-testid': testId = 'function-editor-definition'
}) => {
  const sourceOk = String(source || '').includes('module.exports.handler')

  const parseJsonOk = (text: string) => {
    const t = String(text || '').trim()
    if (!t) return { ok: true, error: null as string | null }
    try {
      JSON.parse(t)
      return { ok: true, error: null as string | null }
    } catch (e) {
      return { ok: false, error: (e as Error)?.message || 'Invalid JSON' }
    }
  }
  const inputJson = parseJsonOk(inputSchema)
  const outputJson = parseJsonOk(outputSchema)

  const schemaBadge = (res: { ok: boolean }) =>
    res.ok
      ? ({ variant: 'success' as const, label: 'Valid' } as const)
      : ({ variant: 'destructive' as const, label: 'Invalid' } as const)

  return (
    <Card data-testid={testId}>
      <CardHeader>
        <CardTitle>Function Definition</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs
          value={activeTab}
          onValueChange={v => onTabChange(v as FunctionDefinitionTab)}
          className="gba:w-full"
          data-testid={`${testId}-tabs`}
        >
          <TabsList>
            <TabsTrigger value="general" data-testid={`${testId}-tab-general`}>
              General
            </TabsTrigger>
            <TabsTrigger value="source" data-testid={`${testId}-tab-source`}>
              Source Code
            </TabsTrigger>
            <TabsTrigger value="inputSchema" data-testid={`${testId}-tab-input`}>
              Input Schema
            </TabsTrigger>
            <TabsTrigger value="outputSchema" data-testid={`${testId}-tab-output`}>
              Output Schema
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid={`${testId}-tab-settings`}>
              Settings
            </TabsTrigger>
            <TabsTrigger value="test" data-testid={`${testId}-tab-test`}>
              Test
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="gba:space-y-4 gba:pt-4" data-testid={`${testId}-panel-general`}>
            <div className="gba:space-y-2">
              <Label htmlFor={`${testId}-name`}>Name *</Label>
              <Input
                id={`${testId}-name`}
                value={name}
                onChange={e => onNameChange(e.target.value)}
                placeholder="function-name"
                disabled={mode === 'edit'}
                data-testid={`${testId}-name-input`}
              />
            </div>

            <div className="gba:space-y-2">
              <Label htmlFor={`${testId}-description`}>Description</Label>
              <Textarea
                id={`${testId}-description`}
                value={description}
                onChange={e => onDescriptionChange(e.target.value)}
                placeholder="Function description"
                rows={3}
                data-testid={`${testId}-description-input`}
              />
            </div>

            <div className="gba:grid gba:gap-4 gba:sm:grid-cols-2">
              <div className="gba:space-y-2">
                <Label htmlFor={`${testId}-category`}>Category *</Label>
                <Select value={category} onValueChange={v => onCategoryChange(v as FunctionCategory)}>
                  <SelectTrigger id={`${testId}-category`} data-testid={`${testId}-category-input`}>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {FUNCTION_CATEGORIES.map(c => (
                      <SelectItem key={c} value={c} data-testid={`${testId}-category-option-${c}`}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="gba:text-xs gba:text-muted-foreground">
                  Top-level grouping shown in the Function Manager tabs and consumed by agents via
                  <span className="gba:font-mono"> ?category=</span>.
                </p>
              </div>

              <div className="gba:space-y-2">
                <Label htmlFor={`${testId}-subcategory`}>Subcategory</Label>
                <Input
                  id={`${testId}-subcategory`}
                  value={subcategory}
                  onChange={e => onSubcategoryChange(e.target.value)}
                  placeholder="e.g. employees, time-off"
                  list={`${testId}-subcategory-suggestions`}
                  data-testid={`${testId}-subcategory-input`}
                />
                <datalist id={`${testId}-subcategory-suggestions`}>
                  {getSubcategorySuggestions(category).map(s => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
                <p className="gba:text-xs gba:text-muted-foreground">
                  Optional free-text refinement within the category (e.g. HR &rarr; <em>time-off</em>).
                </p>
              </div>
            </div>

            <div className="gba:space-y-2">
              <Label>Integration Options</Label>
              <div className="gba:flex gba:flex-col gba:gap-3 gba:sm:flex-row">
                <Button
                  type="button"
                  variant={agentEnabled ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => onAgentEnabledChange(!agentEnabled)}
                  className="gba:flex gba:items-center gba:gap-2"
                  data-testid={`${testId}-agent-enabled`}
                >
                  <Bot className="gba:w-5 gba:h-5" />
                  <span className="gba:font-medium">Agent Enabled</span>
                </Button>

                <Button
                  type="button"
                  variant={workflowEnabled ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => onWorkflowEnabledChange(!workflowEnabled)}
                  className="gba:flex gba:items-center gba:gap-2"
                  data-testid={`${testId}-workflow-enabled`}
                >
                  <GitBranch className="gba:w-5 gba:h-5" />
                  <span className="gba:font-medium">Workflow Enabled</span>
                </Button>

                <Button
                  type="button"
                  variant={connectorEnabled ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => onConnectorEnabledChange(!connectorEnabled)}
                  className="gba:flex gba:items-center gba:gap-2"
                  data-testid={`${testId}-connector-enabled`}
                >
                  <Plug className="gba:w-5 gba:h-5" />
                  <span className="gba:font-medium">Connector</span>
                </Button>
              </div>
            </div>

            {connectorEnabled && (
              <div className="gba:space-y-2">
                <Label>Connector Kind</Label>
                <div className="gba:flex gba:gap-2">
                  <Button
                    type="button"
                    variant={connectorKind === 'structured' || !connectorKind ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onConnectorKindChange('structured')}
                    className="gba:flex gba:items-center gba:gap-2"
                    data-testid={`${testId}-connector-kind-structured`}
                  >
                    <Database className="gba:w-4 gba:h-4" />
                    Board Data
                  </Button>
                  <Button
                    type="button"
                    variant={connectorKind === 'unstructured' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onConnectorKindChange('unstructured')}
                    className="gba:flex gba:items-center gba:gap-2"
                    data-testid={`${testId}-connector-kind-unstructured`}
                  >
                    <FileText className="gba:w-4 gba:h-4" />
                    Documents
                  </Button>
                </div>
                <p className="gba:text-xs gba:text-muted-foreground">
                  {connectorKind === 'unstructured'
                    ? 'Imports external documents (Confluence, SharePoint, Drive, S3) into the Document Service.'
                    : 'Imports structured external data (Oracle, SAP, REST APIs) into Board Apps.'}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="source" className="gba:space-y-2 gba:pt-4" data-testid={`${testId}-panel-source`}>
            <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-2">
              <div className="gba:space-y-0.5">
                <div className="gba:text-sm gba:font-medium gba:text-foreground">Source code</div>
                <div className="gba:text-xs gba:text-muted-foreground">
                  Must export <span className="gba:font-mono">module.exports.handler</span>.
                </div>
              </div>
              {sourceOk ? <Badge variant="success">Valid</Badge> : null}
            </div>
            <div className="gba:border gba:rounded-md gba:overflow-hidden gba:min-h-96">
              <CodeEditor
                language="javascript"
                value={source}
                onChange={onSourceChange}
                height="400px"
                data-testid={`${testId}-source-editor`}
              />
            </div>
          </TabsContent>

          <TabsContent value="inputSchema" className="gba:space-y-2 gba:pt-4" data-testid={`${testId}-panel-input`}>
            <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-2">
              <div className="gba:space-y-0.5">
                <div className="gba:text-sm gba:font-medium gba:text-foreground">Input schema</div>
                <div className="gba:text-xs gba:text-muted-foreground">JSON Schema for validating event payload.</div>
              </div>
              <Badge variant={schemaBadge(inputJson).variant}>{schemaBadge(inputJson).label}</Badge>
            </div>
            {!inputJson.ok && inputJson.error ? (
              <div className="gba:text-xs gba:text-destructive" data-testid={`${testId}-input-json-error`}>
                {inputJson.error}
              </div>
            ) : null}
            <div className="gba:border gba:rounded-md gba:overflow-hidden gba:min-h-96">
              <CodeEditor
                language="json"
                value={inputSchema}
                onChange={onInputSchemaChange}
                height="400px"
                data-testid={`${testId}-input-editor`}
              />
            </div>
          </TabsContent>

          <TabsContent value="outputSchema" className="gba:space-y-2 gba:pt-4" data-testid={`${testId}-panel-output`}>
            <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-2">
              <div className="gba:space-y-0.5">
                <div className="gba:text-sm gba:font-medium gba:text-foreground">Output schema</div>
                <div className="gba:text-xs gba:text-muted-foreground">JSON Schema for validating function output.</div>
              </div>
              <Badge variant={schemaBadge(outputJson).variant}>{schemaBadge(outputJson).label}</Badge>
            </div>
            {!outputJson.ok && outputJson.error ? (
              <div className="gba:text-xs gba:text-destructive" data-testid={`${testId}-output-json-error`}>
                {outputJson.error}
              </div>
            ) : null}
            <div className="gba:border gba:rounded-md gba:overflow-hidden gba:min-h-96">
              <CodeEditor
                language="json"
                value={outputSchema}
                onChange={onOutputSchemaChange}
                height="400px"
                data-testid={`${testId}-output-editor`}
              />
            </div>
          </TabsContent>

          <TabsContent value="settings" className="gba:space-y-2 gba:pt-4" data-testid={`${testId}-panel-settings`}>
            <SettingsEditor
              rows={configKeys}
              onChange={onConfigKeysChange}
              connectionOptions={connectionOptions}
              selectedConnectionId={selectedConnectionId}
              onConnectionChange={onSelectedConnectionIdChange}
              isLoadingConnections={isLoadingConnections}
              storedSecrets={storedSecrets}
              credentialBindOptions={credentialBindOptions}
              data-testid={`${testId}-settings`}
            />
          </TabsContent>

          <TabsContent value="test" className="gba:pt-2" data-testid={`${testId}-panel-test`}>
            <TestFunctionCard
              variant="embedded"
              source={source}
              schemaProperties={testSchemaProperties}
              requiredFields={testRequiredFields}
              examples={testExamples}
              payload={testPayload}
              onPayloadChange={onTestPayloadChange}
              onPayloadFieldChange={onTestPayloadFieldChange}
              testOverrideRows={testOverrideRows}
              onTestOverrideRowsChange={onTestOverrideRowsChange}
              credentialBindOptions={credentialBindOptions}
              onTest={onTest}
              isTesting={isTesting}
              testError={testError}
              testResult={testResult}
              testLogs={testLogs}
              onFixWithAi={onFixWithAi}
              isFixingWithAi={isFixingWithAi}
              fixWithAiError={fixWithAiError}
              data-testid="function-editor-test"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

export default FunctionDefinitionCard
