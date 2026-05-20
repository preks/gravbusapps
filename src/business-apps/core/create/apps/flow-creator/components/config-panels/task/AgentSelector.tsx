import React, { useEffect, useMemo, useState } from 'react'
import type { FlowStudioUpdateOptions, TaskNodeConfig } from '../../../types/studioTypes'
import type { FlowStudioData } from '../../../hooks/useFlowStudioData'
import { useStudioExpressionSuggestions } from '../../../hooks/useStudioExpressionSuggestions'
import type { PromptODM } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import {
  extractPromptParameters,
  hasPromptParameterMetadata,
  syncPromptParamMap
} from '../../../utils/promptParameterUtils'
import { AgentParamMappingSection } from '../shared/AgentParamMappingSection'
import { TaskExpertSelectorSection } from '../shared/TaskExpertSelectorSection'

interface AgentSelectorProps {
  config: TaskNodeConfig
  update: (partial: Partial<TaskNodeConfig>, options?: FlowStudioUpdateOptions) => void
  studioData: FlowStudioData
  testId: string
}

export const AgentSelector: React.FC<AgentSelectorProps> = ({ config, update, studioData, testId }) => {
  const { agents, agentsLoading } = studioData
  const suggestions = useStudioExpressionSuggestions()
  const stepValueSuggestions = useMemo(
    () =>
      suggestions.filter(
        s => s.source === 'steps' || s.source === 'trigger' || s.source === 'workflow' || s.source === 'orgchart'
      ),
    [suggestions]
  )

  const [paramsLoading, setParamsLoading] = useState(false)
  const [params, setParams] = useState<{ system: string[]; user: string[] }>({ system: [], user: [] })
  const [paramsReadyKey, setParamsReadyKey] = useState('')
  const [versionsLoading, setVersionsLoading] = useState(false)
  const [versions, setVersions] = useState<PromptODM[]>([])
  const selectedPromptKey = useMemo(() => {
    const promptId = String(config.agentConfig?.promptId || '').trim()
    if (!promptId) return ''
    const requestedVersion = Number(config.agentConfig?.version)
    return `${promptId}:${Number.isFinite(requestedVersion) ? requestedVersion : 'latest'}`
  }, [config.agentConfig?.promptId, config.agentConfig?.version])

  const selectedAgent = agents.find(a => a._id === config.agentConfig?.promptId)
  const selectedVersionMeta = useMemo(() => {
    const requestedVersion = Number(config.agentConfig?.version)
    if (!selectedAgent?._id) return undefined

    if (!Number.isFinite(requestedVersion)) {
      return hasPromptParameterMetadata(selectedAgent) ? selectedAgent : undefined
    }

    const matchedVersion = versions.find(item => Number(item.version) === requestedVersion)
    if (matchedVersion) return matchedVersion

    if (Number(selectedAgent.version) === requestedVersion && hasPromptParameterMetadata(selectedAgent)) {
      return selectedAgent
    }

    if (versionsLoading) return undefined
    return undefined
  }, [config.agentConfig?.version, selectedAgent, versions, versionsLoading])

  useEffect(() => {
    setParamsReadyKey(prev => (prev === selectedPromptKey ? prev : ''))
  }, [selectedPromptKey])

  useEffect(() => {
    if (config.stepType !== 'AI_TASK_EXPERT') return
    if (!selectedAgent?._id) return
    if (typeof config.agentConfig?.version === 'number') return

    update(
      {
        agentConfig: {
          ...config.agentConfig,
          promptId: selectedAgent._id,
          promptName: selectedAgent.name,
          version: typeof selectedAgent.version === 'number' ? selectedAgent.version : undefined,
          outputSchema: selectedAgent.response_schema ?? undefined
        }
      },
      { markDirty: false }
    )
  }, [config.agentConfig, config.stepType, selectedAgent, update])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!selectedAgent?._id) {
        setParams({ system: [], user: [] })
        setParamsReadyKey('')
        return
      }
      const derived = extractPromptParameters(selectedVersionMeta)
      if (selectedVersionMeta) {
        setParams(derived)
        setParamsReadyKey(selectedPromptKey)
        return
      }
      setParamsLoading(true)
      try {
        const next = await studioData.loadAgentParameters(selectedAgent._id, config.agentConfig?.version)
        if (!cancelled) {
          setParams(next)
          setParamsReadyKey(selectedPromptKey)
        }
      } finally {
        if (!cancelled) setParamsLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [config.agentConfig?.version, selectedAgent?._id, selectedVersionMeta, studioData])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!selectedAgent?._id) {
        setVersions([])
        return
      }
      setVersionsLoading(true)
      try {
        const next = await studioData.loadAgentVersions(selectedAgent._id)
        if (!cancelled) setVersions(next)
      } finally {
        if (!cancelled) setVersionsLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [selectedAgent?._id, studioData])

  // Auto-initialize parameter maps when new parameters appear
  useEffect(() => {
    if (!selectedPromptKey || paramsReadyKey !== selectedPromptKey) return
    if (!selectedAgent?._id) return
    const current = config.agentConfig ?? { promptId: selectedAgent._id, promptName: selectedAgent.name }
    const { map: systemMap, changed: systemChanged } = syncPromptParamMap(current.systemParamsMap, params.system)
    const { map: userMap, changed: userChanged } = syncPromptParamMap(current.userParamsMap, params.user)
    const changed = systemChanged || userChanged
    if (changed) {
      update(
        {
          agentConfig: {
            ...current,
            systemParamsMap: systemMap,
            userParamsMap: userMap
          }
        },
        { markDirty: false }
      )
    }
  }, [
    config.agentConfig,
    params.system,
    params.user,
    paramsReadyKey,
    selectedAgent?._id,
    selectedAgent?.name,
    selectedPromptKey,
    update
  ])

  const updateParam = (type: 'system' | 'user', name: string, expression: string) => {
    const current = config.agentConfig ?? { promptId: selectedAgent?._id ?? '', promptName: selectedAgent?.name }
    const mapKey = type === 'system' ? 'systemParamsMap' : 'userParamsMap'
    const nextMap = { ...current?.[mapKey] }
    nextMap[name] = expression
    update({
      agentConfig: {
        ...current,
        [mapKey]: nextMap
      }
    })
  }

  const availableVersions = useMemo(() => {
    const loaded = versions.map(version => Number(version.version)).filter(version => Number.isFinite(version))
    const latest = Number(selectedAgent?.version)
    return Array.from(new Set([...loaded, ...(Number.isFinite(latest) ? [latest] : [])])).sort((a, b) => b - a)
  }, [selectedAgent?.version, versions])

  const updateVersion = (version: number) => {
    const current = config.agentConfig ?? { promptId: selectedAgent?._id ?? '', promptName: selectedAgent?.name }
    const selectedVersionMeta =
      versions.find(item => Number(item.version) === version) ??
      (Number(selectedAgent?.version) === version ? selectedAgent : undefined)

    update({
      agentConfig: {
        ...current,
        version,
        outputSchema: selectedVersionMeta?.response_schema ?? undefined
      }
    })
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-2 gba:p-3 gba:rounded-lg gba:bg-muted">
      <TaskExpertSelectorSection
        selectedId={config.agentConfig?.promptId}
        selectedName={selectedAgent?.name}
        selectedDescription={selectedAgent?.description}
        candidates={agents}
        loading={agentsLoading}
        selectedVersion={config.agentConfig?.version}
        availableVersions={availableVersions}
        versionsLoading={versionsLoading}
        onSelect={promptId => {
          const agent = agents.find(item => item._id === promptId)
          update({
            agentConfig: {
              ...config.agentConfig,
              promptId,
              promptName: agent?.name,
              version: typeof agent?.version === 'number' ? agent.version : undefined,
              outputSchema: agent?.response_schema ?? undefined
            }
          })
        }}
        onChangeVersion={updateVersion}
        testId={`${testId}-agent`}
      />

      <AgentParamMappingSection
        params={params}
        values={config.agentConfig}
        loading={paramsLoading}
        suggestions={stepValueSuggestions}
        onChangeParam={updateParam}
        testId={`${testId}-ai-task-expert-params`}
      />
    </div>
  )
}
