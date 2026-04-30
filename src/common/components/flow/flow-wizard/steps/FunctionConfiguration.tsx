import React, { useEffect, useMemo, useState } from 'react'
import {
  Label,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Select as DSSelect
} from '@newwork/nw-design-system'
import { Alert, Card, Space, Spin } from 'antd'
import { Code2 } from 'lucide-react'
import {
  FunctionsServiceClient,
  type FunctionVersionMeta,
  type FunctionVersionsResponse,
  type LatestFunctionItem
} from '@/common/network/functions/FunctionsServiceClient'
import { ExpressionInput } from '@/common/components/flow/flow-expression/ExpressionInput'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface FunctionConfigurationProps {
  step: any
  stepIndex: number
  testId: string
  onUpdateStep: (updates: any) => void
  showParametersOnly?: boolean
  template?: any
  accessToken?: string
}

export const FunctionConfiguration: React.FC<FunctionConfigurationProps> = ({
  step,
  stepIndex,
  testId,
  onUpdateStep,
  showParametersOnly = false,
  template,
  accessToken
}) => {
  const [functions, setFunctions] = useState<LatestFunctionItem[]>([])
  const [isLoadingFunctions, setIsLoadingFunctions] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [versions, setVersions] = useState<FunctionVersionMeta[]>([])
  const [isLoadingVersions, setIsLoadingVersions] = useState(false)
  const [versionsError, setVersionsError] = useState<string | null>(null)

  const functionConfig = step.functionConfig || {
    functionId: '',
    version: undefined,
    inputExpressionMap: {},
    outputExpressionMap: {}
  }

  const selectedFunction = functions.find(fn => fn.id === functionConfig.functionId)

  useEffect(() => {
    const loadVersions = async (functionId: string) => {
      setIsLoadingVersions(true)
      setVersionsError(null)
      try {
        const client = new FunctionsServiceClient(accessToken)
        const response: FunctionVersionsResponse = await client.getVersions(functionId)
        const sortedVersions = (response.versions || []).slice().sort((a, b) => (b.version || 0) - (a.version || 0))
        setVersions(sortedVersions)
      } catch (error) {
        setVersions([])
        setVersionsError(error instanceof Error ? error.message : 'Failed to load versions')
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

  const effectiveInputSchema = useMemo(() => {
    const version = functionConfig.version
    if (version && versions.length > 0) {
      const selectedVersion = versions.find(item => item.version === version)
      if (selectedVersion?.inputSchema) return selectedVersion.inputSchema as any
    }
    return (selectedFunction?.latestVersion?.inputSchema as any) || null
  }, [functionConfig.version, versions, selectedFunction])

  const effectiveOutputSchema = useMemo(() => {
    const version = functionConfig.version
    if (version && versions.length > 0) {
      const selectedVersion = versions.find(item => item.version === version)
      if (selectedVersion?.outputSchema) return selectedVersion.outputSchema as any
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

  useEffect(() => {
    const loadFunctions = async () => {
      setIsLoadingFunctions(true)
      setError(null)
      try {
        const client = new FunctionsServiceClient(accessToken)
        const response = await client.listLatest({ workflowEnabled: true })
        setFunctions(response || [])
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to load functions')
      } finally {
        setIsLoadingFunctions(false)
      }
    }

    loadFunctions()
  }, [])

  useEffect(() => {
    if (!selectedFunction) return

    const currentInputMap = functionConfig.inputExpressionMap || {}
    const hasAllInputParameters = inputParameters.every(parameter => parameter.name in currentInputMap)

    if (!hasAllInputParameters && inputParameters.length > 0) {
      const newInputMap = { ...currentInputMap }
      inputParameters.forEach(parameter => {
        if (!(parameter.name in newInputMap)) {
          newInputMap[parameter.name] = ''
        }
      })
      updateFunctionConfig({ inputExpressionMap: newInputMap })
    }

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

  const updateInputExpression = (parameterName: string, expression: string) => {
    const currentMap = { ...(functionConfig.inputExpressionMap || {}) }
    currentMap[parameterName] = expression

    updateFunctionConfig({
      inputExpressionMap: currentMap
    })
  }

  if (showParametersOnly) {
    return (
      <div className="gba:space-y-4 gba:pt-2" data-testid={`${testId}-function-params`}>
        {selectedFunction && inputParameters.length > 0 && (
          <div className="gba:space-y-2">
            <Label>{getTranslationFromI18nKeyAndLabel('flow.creator.inputMapping', 'Input Parameters')}</Label>
            <div className="gba:text-sm gba:text-muted-foreground gba:mb-3">
              Map workflow expressions to function input parameters
            </div>

            <div className="gba:space-y-4">
              {inputParameters.map((parameter, parameterIndex) => (
                <div key={parameter.name} className="gba:space-y-1">
                  <div className="gba:flex gba:flex-col gba:gap-1">
                    <Label className="gba:text-sm gba:font-mono">
                      {parameter.name}
                      {parameter.required && <span className="gba:text-destructive"> *</span>}
                    </Label>
                    <ExpressionInput
                      key={`${parameter.name}-${stepIndex}`}
                      value={functionConfig.inputExpressionMap?.[parameter.name] || ''}
                      onChange={value => updateInputExpression(parameter.name, value)}
                      mode="auto"
                      template={template}
                      stepIndex={stepIndex}
                      useTreeBuilder={true}
                      placeholder="Expression (e.g., {{$steps.step_0.output.formData.field}})"
                      data-testid={`${testId}-input-param-${parameterIndex}`}
                    />
                  </div>
                  {parameter.description && (
                    <div className="gba:text-xs gba:text-muted-foreground">{parameter.description}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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
            <Space direction="vertical" style={{ width: '100%' }}>
              <select
                className="gba:w-full gba:border gba:rounded gba:p-2"
                value={functionConfig.functionId}
                onChange={event => updateFunctionConfig({ functionId: event.target.value, version: undefined })}
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
            onValueChange={value =>
              updateFunctionConfig({ version: value === 'latest' ? undefined : parseInt(value, 10) })
            }
          >
            <SelectTrigger data-testid={`${testId}-function-version-select`}>
              <SelectValue placeholder="Latest" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">Latest</SelectItem>
              {versions.map(version => (
                <SelectItem key={`ver-${version.version}`} value={String(version.version)}>
                  v{version.version}
                </SelectItem>
              ))}
            </SelectContent>
          </DSSelect>
        )}
      </div>

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
