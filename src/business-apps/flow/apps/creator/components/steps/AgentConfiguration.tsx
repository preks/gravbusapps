import React, { useState, useEffect } from 'react'
import { Label } from '@newwork/nw-design-system'
import { Select, Space, Card, Spin, Alert } from 'antd'
import { Select as DSSelect, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@newwork/nw-design-system'
import { Bot } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type { PromptODM } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import { ExpressionInput } from '../shared/ExpressionInput'

interface AgentConfigurationProps {
  step: any
  stepIndex: number
  testId: string
  onUpdateStep: (updates: any) => void
  accessToken: string
  showParametersOnly?: boolean
  template?: any
}

export const AgentConfiguration: React.FC<AgentConfigurationProps> = ({
  step,
  stepIndex,
  testId,
  onUpdateStep,
  accessToken,
  showParametersOnly = false,
  template
}) => {
  const client = usePromptManagerClient(accessToken)
  const [agents, setAgents] = useState<PromptODM[]>([])
  const [isLoadingAgents, setIsLoadingAgents] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [versions, setVersions] = useState<number[]>([])
  const [isLoadingVersions, setIsLoadingVersions] = useState(false)
  const [versionsError, setVersionsError] = useState<string | null>(null)

  // Initialize agent config if not present
  const agentConfig = step.agentConfig || {
    promptId: '',
    version: undefined,
    systemParamsMap: {},
    userParamsMap: {},
    outputExpressionMap: {},
    modelSettings: {}
  }

  // Get selected agent details
  const selectedAgent = agents.find(a => a._id === agentConfig.promptId)

  // State for parameters fetched from API
  const [systemParameters, setSystemParameters] = useState<string[]>([])
  const [userParameters, setUserParameters] = useState<string[]>([])
  const [isLoadingParameters, setIsLoadingParameters] = useState(false)

  // Load available agents
  useEffect(() => {
    const loadAgents = async () => {
      setIsLoadingAgents(true)
      setError(null)
      try {
        const response = await client.getPrompts({ limit: 100, offset: 0 })
        setAgents(response.data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load agents')
      } finally {
        setIsLoadingAgents(false)
      }
    }

    if (accessToken) {
      loadAgents()
    }
  }, [accessToken, client])

  // Load versions when an agent is selected
  useEffect(() => {
    const loadVersions = async (id: string) => {
      setIsLoadingVersions(true)
      setVersionsError(null)
      try {
        const res = await client.getPromptVersions(id, { limit: 100, offset: 0, returnTotalRecords: false })
        const verNums = (res.data || [])
          .map(v => Number(v.version))
          .filter(v => !Number.isNaN(v))
          .sort((a, b) => b - a)
        setVersions(verNums)
      } catch (e) {
        setVersions([])
        setVersionsError(e instanceof Error ? e.message : 'Failed to load versions')
      } finally {
        setIsLoadingVersions(false)
      }
    }
    if (agentConfig.promptId) {
      loadVersions(agentConfig.promptId)
    } else {
      setVersions([])
    }
  }, [agentConfig.promptId, client])

  // Load parameters when agent is selected
  useEffect(() => {
    const loadParameters = async () => {
      if (!selectedAgent?._id) {
        setSystemParameters([])
        setUserParameters([])
        return
      }

      setIsLoadingParameters(true)
      try {
        const params = await client.getPromptParameters(selectedAgent._id)
        setSystemParameters(params.system_parameters || [])
        setUserParameters(params.user_parameters || [])
      } catch (err) {
        console.error('Failed to load agent parameters:', err)
        setSystemParameters([])
        setUserParameters([])
      } finally {
        setIsLoadingParameters(false)
      }
    }

    loadParameters()
  }, [selectedAgent, client])

  // Auto-initialize parameter mappings when agent is selected
  useEffect(() => {
    if (!selectedAgent) return

    // Initialize system parameters
    const currentSystemMap = agentConfig.systemParamsMap || {}
    const hasAllSystemParams = systemParameters.every(param => param in currentSystemMap)

    if (!hasAllSystemParams && systemParameters.length > 0) {
      const newSystemMap = { ...currentSystemMap }
      systemParameters.forEach(param => {
        if (!(param in newSystemMap)) {
          newSystemMap[param] = '' // Empty expression, user will fill it
        }
      })
      updateAgentConfig({ systemParamsMap: newSystemMap })
    }

    // Initialize user parameters
    const currentUserMap = agentConfig.userParamsMap || {}
    const hasAllUserParams = userParameters.every(param => param in currentUserMap)

    if (!hasAllUserParams && userParameters.length > 0) {
      const newUserMap = { ...currentUserMap }
      userParameters.forEach(param => {
        if (!(param in newUserMap)) {
          newUserMap[param] = '' // Empty expression, user will fill it
        }
      })
      updateAgentConfig({ userParamsMap: newUserMap })
    }

    // Persist output schema into step for expression builder rendering (for resultData expansion)
    if (selectedAgent?.response_schema) {
      updateAgentConfig({ outputSchema: selectedAgent.response_schema })
    } else {
      // Fallback minimal schema to expose a useful 'content' field
      updateAgentConfig({
        outputSchema: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'Primary agent response content' }
          }
        }
      })
    }
  }, [selectedAgent, systemParameters, userParameters])

  const updateAgentConfig = (updates: any) => {
    onUpdateStep({
      agentConfig: {
        ...agentConfig,
        ...updates
      }
    })
  }

  const updateParameterExpression = (type: 'system' | 'user', paramName: string, expression: string) => {
    const mapKey = type === 'system' ? 'systemParamsMap' : 'userParamsMap'
    const currentMap = { ...(agentConfig[mapKey] || {}) }
    currentMap[paramName] = expression

    updateAgentConfig({
      [mapKey]: currentMap
    })
  }

  // (renderParameterList removed - consolidated into showParametersOnly section)

  // If showParametersOnly is true, only render parameter mapping section
  if (showParametersOnly) {
    return (
      <div className="gba:space-y-4 gba:pt-2" data-testid={`${testId}-agent-params`}>
        {/* Input Parameters - Combined System and User */}
        <div className="gba:space-y-2">
          <Label>{getTranslationFromI18nKeyAndLabel('flow.creator.inputParameters', 'Input Parameters')}</Label>
          <div className="gba:text-sm gba:text-muted-foreground gba:mb-3">
            Map workflow expressions to agent prompt parameters
          </div>

          {isLoadingParameters ? (
            <div className="gba:flex gba:items-center gba:gap-2 gba:p-2">
              <Spin size="small" />
              <span className="gba:text-sm">Loading parameters...</span>
            </div>
          ) : systemParameters.length === 0 && userParameters.length === 0 ? (
            <div className="gba:text-muted-foreground gba:text-sm gba:italic">
              No parameters found in agent templates
            </div>
          ) : (
            <div className="gba:space-y-4">
              {/* System Parameters */}
              {systemParameters.length > 0 && (
                <div className="gba:space-y-3">
                  <div className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase">
                    System Parameters
                  </div>
                  {systemParameters.map((param, idx) => (
                    <div key={param} className="gba:flex gba:flex-col gba:gap-1">
                      <Label className="gba:text-sm gba:font-mono">{param}</Label>
                      <ExpressionInput
                        key={`system-${param}-${stepIndex}`}
                        value={agentConfig.systemParamsMap?.[param] || ''}
                        onChange={value => updateParameterExpression('system', param, value)}
                        mode="auto"
                        template={template}
                        stepIndex={stepIndex}
                        useTreeBuilder={true}
                        placeholder="Expression (e.g., {{$steps.step_0.output.formData.field}})"
                        data-testid={`${testId}-system-param-${idx}`}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* User Parameters */}
              {userParameters.length > 0 && (
                <div className="gba:space-y-3">
                  <div className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase">
                    User Parameters
                  </div>
                  {userParameters.map((param, idx) => (
                    <div key={param} className="gba:flex gba:flex-col gba:gap-1">
                      <Label className="gba:text-sm gba:font-mono">{param}</Label>
                      <ExpressionInput
                        key={`user-${param}-${stepIndex}`}
                        value={agentConfig.userParamsMap?.[param] || ''}
                        onChange={value => updateParameterExpression('user', param, value)}
                        mode="auto"
                        template={template}
                        stepIndex={stepIndex}
                        useTreeBuilder={true}
                        placeholder="Expression (e.g., {{$steps.step_0.output.formData.field}})"
                        data-testid={`${testId}-user-param-${idx}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

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
    <div className="gba:space-y-4 gba:pt-2" data-testid={`${testId}-agent-config`}>
      {/* Agent Selection */}
      <div className="gba:space-y-2">
        <Label>
          <Space>
            <Bot className="gba:h-4 gba:w-4" />
            {getTranslationFromI18nKeyAndLabel('flow.creator.agentSelection', 'Agent')}:
          </Space>
        </Label>

        {error && (
          <Alert
            message="Error loading agents"
            description={error}
            type="error"
            closable
            onClose={() => setError(null)}
            data-testid={`${testId}-agent-error`}
          />
        )}

        {isLoadingAgents ? (
          <div className="gba:flex gba:items-center gba:gap-2 gba:p-2">
            <Spin size="small" />
            <span className="gba:text-sm">Loading agents...</span>
          </div>
        ) : (
          <Select
            value={agentConfig.promptId}
            onChange={value => updateAgentConfig({ promptId: value })}
            style={{ width: '100%' }}
            placeholder="Select an agent"
            data-testid={`${testId}-agent-select`}
            showSearch
            filterOption={(input, option) => (option?.children as string)?.toLowerCase().includes(input.toLowerCase())}
          >
            {agents.map(agent => (
              <Select.Option key={agent._id} value={agent._id || ''}>
                {agent.name}
                {agent.description && <span className="gba:text-muted-foreground"> - {agent.description}</span>}
              </Select.Option>
            ))}
          </Select>
        )}
      </div>

      {/* Version (Optional) */}
      <div className="gba:space-y-2">
        <Label>{getTranslationFromI18nKeyAndLabel('flow.creator.agentVersion', 'Version (optional)')}</Label>
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
            data-testid={`${testId}-agent-version-error`}
          />
        ) : (
          <DSSelect
            value={agentConfig.version ? String(agentConfig.version) : 'latest'}
            onValueChange={val => updateAgentConfig({ version: val === 'latest' ? undefined : parseInt(val, 10) })}
          >
            <SelectTrigger data-testid={`${testId}-agent-version-select`}>
              <SelectValue placeholder="Latest" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">Latest</SelectItem>
              {versions.map(v => (
                <SelectItem key={`agent-ver-${v}`} value={String(v)}>
                  v{v}
                </SelectItem>
              ))}
            </SelectContent>
          </DSSelect>
        )}
      </div>

      {/* Output Information */}
      {selectedAgent && (
        <div className="gba:space-y-2">
          <Label>{getTranslationFromI18nKeyAndLabel('flow.creator.agentOutput', 'Agent Output')}</Label>
          <Card size="small" className="gba:bg-muted">
            <div className="gba:text-sm gba:space-y-2">
              <p className="gba:font-semibold">Available in next steps as:</p>
              <code className="gba:text-xs gba:bg-background gba:px-2 gba:py-1 gba:rounded gba:block">
                {'{'}
                {'{'} $steps.step_{stepIndex}.output.content {'}'}
                {'}'}
              </code>
              <p className="gba:text-muted-foreground gba:mt-2">
                The agent's response will be available as the{' '}
                <code className="gba:bg-background gba:px-1 gba:py-0.5 gba:rounded">content</code> field. If tools are
                used, their results may also be available in the output.
              </p>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
