import React, { useState, useEffect, useMemo } from 'react'
import { Label } from '@newwork/nw-design-system'
import { Space, Card, Spin, Alert } from 'antd'
import { Select as DSSelect, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@newwork/nw-design-system'
import { Code2 } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  FunctionsServiceClient,
  type LatestFunctionItem,
  type FunctionVersionMeta,
  type FunctionVersionsResponse
} from '@/common/network/functions/FunctionsServiceClient'
import { ExpressionInput } from '../shared/ExpressionInput'

interface FunctionConfigurationProps {
  step: any
  stepIndex: number
  testId: string
  onUpdateStep: (updates: any) => void
  showParametersOnly?: boolean
  template?: any
}

export const FunctionConfiguration: React.FC<FunctionConfigurationProps> = ({
  step,
  stepIndex,
  testId,
  onUpdateStep,
  showParametersOnly = false,
  template
}) => {
  const [functions, setFunctions] = useState<LatestFunctionItem[]>([])
  const [isLoadingFunctions, setIsLoadingFunctions] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [versions, setVersions] = useState<FunctionVersionMeta[]>([])
  const [isLoadingVersions, setIsLoadingVersions] = useState(false)
  const [versionsError, setVersionsError] = useState<string | null>(null)

  // Initialize function config if not present
  const functionConfig = step.functionConfig || {
    functionId: '',
    version: undefined,
    inputExpressionMap: {},
    outputExpressionMap: {}
  }

  // Get selected function details
  const selectedFunction = functions.find(f => f.id === functionConfig.functionId)

  // Load versions when a function is selected
  useEffect(() => {
    const loadVersions = async (fnId: string) => {
      setIsLoadingVersions(true)
      setVersionsError(null)
      try {
        const client = new FunctionsServiceClient()
        const response: FunctionVersionsResponse = await client.getVersions(fnId)
        // Sort versions desc (high to low)
        const sorted = (response.versions || []).slice().sort((a, b) => (b.version || 0) - (a.version || 0))
        setVersions(sorted)
      } catch (e) {
        setVersions([])
        setVersionsError(e instanceof Error ? e.message : 'Failed to load versions')
      } finally {
        setIsLoadingVersions(false)
      }
    }
    if (functionConfig.functionId) {
      loadVersions(functionConfig.functionId)
    } else {
      setVersions([])
    }
  }, [functionConfig.functionId])

  // Parse input schema to get parameter names
  const effectiveInputSchema = useMemo(() => {
    // Prefer selected version schema if chosen
    const ver = functionConfig.version
    if (ver && versions.length > 0) {
      const v = versions.find(x => x.version === ver)
      if (v?.inputSchema) return v.inputSchema as any
    }
    return (selectedFunction?.latestVersion?.inputSchema as any) || null
  }, [functionConfig.version, versions, selectedFunction])

  const effectiveOutputSchema = useMemo(() => {
    const ver = functionConfig.version
    if (ver && versions.length > 0) {
      const v = versions.find(x => x.version === ver)
      if (v?.outputSchema) return v.outputSchema as any
    }
    return (selectedFunction?.latestVersion?.outputSchema as any) || null
  }, [functionConfig.version, versions, selectedFunction])

  const inputParameters = React.useMemo(() => {
    const schema = effectiveInputSchema
    if (!schema) return []
    if (schema.type === 'object' && schema.properties) {
      return Object.keys(schema.properties).map(key => ({
        name: key,
        required: schema.required?.includes(key) || false,
        type: schema.properties[key].type || 'string',
        description: schema.properties[key].description
      }))
    }
    return []
  }, [effectiveInputSchema])

  // Parse output schema to get field names
  const outputFields = React.useMemo(() => {
    const schema = effectiveOutputSchema
    if (!schema) return []
    if (schema.type === 'object' && schema.properties) {
      return Object.keys(schema.properties).map(key => ({
        name: key,
        type: schema.properties[key].type || 'string',
        description: schema.properties[key].description
      }))
    }
    return []
  }, [effectiveOutputSchema])

  // Load available workflow-enabled functions
  useEffect(() => {
    const loadFunctions = async () => {
      setIsLoadingFunctions(true)
      setError(null)
      try {
        const client = new FunctionsServiceClient()
        const response = await client.listLatest({ workflowEnabled: true })
        setFunctions(response || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load functions')
      } finally {
        setIsLoadingFunctions(false)
      }
    }

    loadFunctions()
  }, [])

  // Auto-initialize mappings when function is selected
  useEffect(() => {
    if (!selectedFunction) return

    // Initialize input mappings for all parameters
    const currentInputMap = functionConfig.inputExpressionMap || {}
    const hasAllInputParams = inputParameters.every(param => param.name in currentInputMap)

    if (!hasAllInputParams && inputParameters.length > 0) {
      const newInputMap = { ...currentInputMap }
      inputParameters.forEach(param => {
        if (!(param.name in newInputMap)) {
          newInputMap[param.name] = '' // Empty expression, user will fill it
        }
      })
      updateFunctionConfig({ inputExpressionMap: newInputMap })
    }

    // Persist output schema into step for expression builder rendering (for resultData expansion)
    if (effectiveOutputSchema) {
      updateFunctionConfig({ outputSchema: effectiveOutputSchema })
    }
  }, [selectedFunction, inputParameters, outputFields, effectiveOutputSchema])

  const updateFunctionConfig = (updates: any) => {
    onUpdateStep({
      functionConfig: {
        ...functionConfig,
        ...updates
      }
    })
  }

  const updateInputExpression = (paramName: string, expression: string) => {
    const currentMap = { ...(functionConfig.inputExpressionMap || {}) }
    currentMap[paramName] = expression

    updateFunctionConfig({
      inputExpressionMap: currentMap
    })
  }

  // If showParametersOnly is true, only render input mapping section
  if (showParametersOnly) {
    return (
      <div className="gba:space-y-4 gba:pt-2" data-testid={`${testId}-function-params`}>
        {/* Input Parameters Mapping */}
        {selectedFunction && inputParameters.length > 0 && (
          <div className="gba:space-y-2">
            <Label>{getTranslationFromI18nKeyAndLabel('flow.creator.inputMapping', 'Input Parameters')}</Label>
            <div className="gba:text-sm gba:text-muted-foreground gba:mb-3">
              Map workflow expressions to function input parameters
            </div>

            <div className="gba:space-y-4">
              {inputParameters.map((param, idx) => (
                <div key={param.name} className="gba:space-y-1">
                  <div className="gba:flex gba:flex-col gba:gap-1">
                    <Label className="gba:text-sm gba:font-mono">
                      {param.name}
                      {param.required && <span className="gba:text-destructive"> *</span>}
                    </Label>
                    <ExpressionInput
                      key={`${param.name}-${stepIndex}`}
                      value={functionConfig.inputExpressionMap?.[param.name] || ''}
                      onChange={value => updateInputExpression(param.name, value)}
                      mode="auto"
                      template={template}
                      stepIndex={stepIndex}
                      useTreeBuilder={true}
                      placeholder="Expression (e.g., {{$steps.step_0.output.formData.field}})"
                      data-testid={`${testId}-input-param-${idx}`}
                    />
                  </div>
                  {param.description && (
                    <div className="gba:text-xs gba:text-muted-foreground">{param.description}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Help Text */}
        <Card size="small" className="gba:bg-muted">
          <div className="gba:text-sm gba:space-y-2">
            <p className="gba:font-semibold">Expression Examples:</p>
            <ul className="gba:list-disc gba:pl-4 gba:space-y-1">
              <li>
                <code className="gba:text-xs gba:bg-background gba:px-1 gba:py-0.5 gba:rounded">
                  {'{'}
                  {'{'} $steps.step_0.output.formData.fieldName {'}'}
                  {'}'}
                </code>{' '}
                - Reference a field from a previous step
              </li>
              <li>
                <code className="gba:text-xs gba:bg-background gba:px-1 gba:py-0.5 gba:rounded">
                  {'{'}
                  {'{'} $workflow.variables.key {'}'}
                  {'}'}
                </code>{' '}
                - Reference a workflow variable
              </li>
              <li>
                <code className="gba:text-xs gba:bg-background gba:px-1 gba:py-0.5 gba:rounded">
                  {'{'}
                  {'{'} $catalog.CatalogName[0].field {'}'}
                  {'}'}
                </code>{' '}
                - Reference catalog data
              </li>
            </ul>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="gba:space-y-4 gba:pt-2" data-testid={`${testId}-function-config`}>
      {/* Function Selection */}
      <div className="gba:space-y-2">
        <Label>
          <Space>
            <Code2 className="gba:h-4 gba:w-4" />
            {getTranslationFromI18nKeyAndLabel('flow.creator.functionSelection', 'Function')}:
          </Space>
        </Label>

        {error && (
          <Alert
            message="Error loading functions"
            description={error}
            type="error"
            closable
            onClose={() => setError(null)}
            data-testid={`${testId}-function-error`}
          />
        )}

        {isLoadingFunctions ? (
          <div className="gba:flex gba:items-center gba:gap-2 gba:p-2">
            <Spin size="small" />
            <span className="gba:text-sm">Loading functions...</span>
          </div>
        ) : (
          <div>
            {/* Keep antd Select for function list to minimize change, but keep structure simple */}
            <Space direction="vertical" style={{ width: '100%' }}>
              <select
                className="gba:w-full gba:border gba:rounded gba:p-2"
                value={functionConfig.functionId}
                onChange={e => updateFunctionConfig({ functionId: e.target.value, version: undefined })}
                data-testid={`${testId}-function-select`}
              >
                <option value="" disabled>
                  Select a function
                </option>
                {functions.map(func => (
                  <option key={func.id} value={func.id}>
                    {func.name}
                  </option>
                ))}
              </select>
            </Space>
          </div>
        )}
      </div>

      {/* Version (Optional) */}
      <div className="gba:space-y-2">
        <Label>{getTranslationFromI18nKeyAndLabel('flow.creator.functionVersion', 'Version (optional)')}</Label>
        {isLoadingVersions ? (
          <div className="gba:flex gba:items-center gba:gap-2 gba:p-2">
            <Spin size="small" />
            <span className="gba:text-sm">Loading versions...</span>
          </div>
        ) : versionsError ? (
          <Alert
            message="Error loading versions"
            description={versionsError}
            type="error"
            closable
            onClose={() => setVersionsError(null)}
            data-testid={`${testId}-function-version-error`}
          />
        ) : (
          <DSSelect
            value={functionConfig.version ? String(functionConfig.version) : 'latest'}
            onValueChange={val => updateFunctionConfig({ version: val === 'latest' ? undefined : parseInt(val, 10) })}
          >
            <SelectTrigger data-testid={`${testId}-function-version-select`}>
              <SelectValue placeholder="Latest" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">Latest</SelectItem>
              {versions.map(v => (
                <SelectItem key={`ver-${v.version}`} value={String(v.version)}>
                  v{v.version}
                </SelectItem>
              ))}
            </SelectContent>
          </DSSelect>
        )}
      </div>

      {/* Output Information - Show available output fields */}
      {selectedFunction && outputFields.length > 0 && (
        <div className="gba:space-y-2">
          <Label>{getTranslationFromI18nKeyAndLabel('flow.creator.outputFields', 'Output Fields')}</Label>
          <Card size="small" className="gba:bg-muted">
            <div className="gba:text-sm gba:space-y-2">
              <p className="gba:font-semibold">Available in next steps as:</p>
              <code className="gba:text-xs gba:bg-background gba:px-2 gba:py-1 gba:rounded gba:block">
                {'{'}
                {'{'} $steps.step_{stepIndex}.output.{'{'}fieldName{'}'} {'}'}
                {'}'}
              </code>
              <div className="gba:space-y-1 gba:mt-2">
                <p className="gba:text-muted-foreground">Output fields:</p>
                <ul className="gba:list-disc gba:pl-4">
                  {outputFields.map(field => (
                    <li key={field.name} className="gba:font-mono gba:text-xs">
                      {field.name}
                      {field.description && (
                        <span className="gba:text-muted-foreground gba:font-sans"> - {field.description}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
