import { useCallback, useEffect, useMemo } from 'react'
import type { FlowStudioData } from '../../../../hooks/useFlowStudioData'
import type { DecisionNodeConfig } from '../../../../types/studioTypes'
import { AssignmentMode } from '@/business-apps/flow/apps/creator/types/flowTemplate'
import type { ContentEntry } from '@/common/data/content/types/contentEntryTypes'
import type { AIExecutor } from './DecisionExecutorTabs'
import { buildDefaultTaskExpertMapping } from './taskExpertMappingUtils'
import { useDecisionTaskExperts } from './useDecisionTaskExperts'
import { useDecisionTaskExpertPromptMetadata } from './useDecisionTaskExpertPromptMetadata'
import { useTaskExpertMappingSuggestions } from './useTaskExpertMappingSuggestions'
import { syncPromptParamMap } from '../../../../utils/promptParameterUtils'

const DEFAULT_EVERYAI_FALLBACK_MESSAGE =
  "The AI couldn't decide. Please select the most appropriate outcome.\n\nDecision instructions:\n{{$steps.self.decisionInstructions}}\n\nReasoning:\n{{$steps.self.resultData.reasoning}}"

function extractDecisionResultEnumFromSchema(schema: any): string[] {
  const props = schema && typeof schema === 'object' ? schema.properties : undefined
  const dr = props && typeof props === 'object' ? (props as Record<string, unknown>).decisionResult : undefined
  const en = dr && typeof dr === 'object' ? (dr as Record<string, unknown>).enum : undefined
  if (!Array.isArray(en)) return []
  return en.map((v: any) => String(v || '').trim()).filter(Boolean)
}

interface Params {
  config: DecisionNodeConfig
  update: (partial: Partial<DecisionNodeConfig>) => void
  studioData: FlowStudioData
}

export function useAIDecisionConfigState({ config, update, studioData }: Params) {
  const deriveExecutor = useCallback((): AIExecutor => {
    const v = config.aiConfig?.executor
    return v === 'TASK_EXPERT' || v === 'EVERYAI' ? v : 'EVERYAI'
  }, [config.aiConfig?.executor])

  const getAiConfigOrDefault = useCallback(
    (fallbackExecutor: AIExecutor = 'EVERYAI') => {
      const existing = config.aiConfig
      const executor = (existing?.executor as AIExecutor | undefined) ?? fallbackExecutor
      const defaultEscalation = {
        mode: 'USER' as const,
        assignment: { targets: null, assignmentMode: AssignmentMode.CLAIM }
      }

      return existing
        ? {
            ...existing,
            executor,
            humanInstructions: existing.humanInstructions ?? '',
            escalation: existing.escalation ?? defaultEscalation
          }
        : {
            executor,
            promptId: undefined,
            promptName: undefined,
            promptVersion: undefined,
            promptUserContent: undefined,
            policyDocumentId: undefined,
            policyDocumentTitle: undefined,
            policyDocumentVersion: undefined,
            instructions: '',
            humanInstructions: '',
            mapping: undefined,
            systemParamsMap: undefined,
            userParamsMap: undefined,
            reasoningPath: undefined,
            escalation: defaultEscalation
          }
    },
    [config.aiConfig]
  )

  useEffect(() => {
    if (!config.aiConfig) return
    if (config.aiConfig.escalation) return
    update({
      aiConfig: {
        ...config.aiConfig,
        escalation: { mode: 'USER', assignment: { targets: null, assignmentMode: AssignmentMode.CLAIM } }
      }
    })
  }, [config.aiConfig, update])

  useEffect(() => {
    const executor = deriveExecutor()
    const ai = getAiConfigOrDefault(executor)
    const msg = String(ai.humanInstructions || '').trim()
    if (msg) return
    update({ aiConfig: { ...ai, executor, humanInstructions: DEFAULT_EVERYAI_FALLBACK_MESSAGE } })
  }, [deriveExecutor, getAiConfigOrDefault, update])

  const advancedExecutor = deriveExecutor()
  const ai = getAiConfigOrDefault(advancedExecutor)

  const allAgents = studioData.agents ?? []
  const { decisionTaskExperts } = useDecisionTaskExperts(allAgents, ai.promptId)
  const {
    selectedTaskExpert,
    selectedTaskExpertMeta,
    promptParams,
    promptParamsLoading,
    promptParamsResolved,
    taskExpertVersions,
    taskExpertVersionsLoading
  } = useDecisionTaskExpertPromptMetadata({
    promptId: ai.promptId,
    promptVersion: ai.promptVersion,
    decisionTaskExperts,
    studioData
  })
  const decisionResultEnumOptions = useMemo(
    () => extractDecisionResultEnumFromSchema(selectedTaskExpertMeta?.response_schema),
    [selectedTaskExpertMeta]
  )
  const { schemaPaths: taskExpertSchemaPaths, suggestions: taskExpertMappingExpressionSuggestions } =
    useTaskExpertMappingSuggestions(selectedTaskExpertMeta)

  const mappingWrapperConfig = useMemo(() => {
    const mappingConditions = ai.mapping?.conditions ?? []
    return { ...config, logicConfig: { conditions: mappingConditions } } as DecisionNodeConfig
  }, [ai.mapping?.conditions, config])

  const mappingWrapperUpdate = useCallback(
    (partial: Partial<DecisionNodeConfig>) => {
      if (!partial.logicConfig) return update(partial)
      const nextConditions = partial.logicConfig.conditions ?? []
      update({
        aiConfig: {
          ...getAiConfigOrDefault('TASK_EXPERT'),
          executor: 'TASK_EXPERT',
          mapping: { conditions: nextConditions }
        }
      })
    },
    [getAiConfigOrDefault, update]
  )

  useEffect(() => {
    if (ai.executor !== 'TASK_EXPERT') return
    const conds = ai.mapping?.conditions
    if (Array.isArray(conds) && conds.length > 0) return
    update({
      aiConfig: {
        ...ai,
        executor: 'TASK_EXPERT',
        mapping: buildDefaultTaskExpertMapping(config.branches, decisionResultEnumOptions)
      }
    })
  }, [ai, config.branches, decisionResultEnumOptions, update])

  useEffect(() => {
    if (ai.executor !== 'TASK_EXPERT') return
    if (!String(ai.promptId || '').trim()) return
    if (!promptParamsResolved) return

    const { map: systemParamsMap, changed: systemChanged } = syncPromptParamMap(ai.systemParamsMap, promptParams.system)
    const { map: userParamsMap, changed: userChanged } = syncPromptParamMap(ai.userParamsMap, promptParams.user)
    if (!systemChanged && !userChanged) return

    update({
      aiConfig: {
        ...getAiConfigOrDefault('TASK_EXPERT'),
        executor: 'TASK_EXPERT',
        systemParamsMap,
        userParamsMap
      }
    })
  }, [
    ai.executor,
    ai.promptId,
    ai.systemParamsMap,
    ai.userParamsMap,
    getAiConfigOrDefault,
    promptParams,
    promptParamsResolved,
    update
  ])

  useEffect(() => {
    if (ai.executor !== 'TASK_EXPERT') return
    const promptId = String(ai.promptId || '').trim()
    if (!promptId) return

    const agent = selectedTaskExpertMeta
    if (!agent) return

    const nextPromptName = agent.name ?? undefined
    const nextPromptVersion = typeof agent.version === 'number' ? agent.version : undefined
    const nextPromptUserContent = agent.user_content?.template ?? undefined

    const same =
      ai.promptName === nextPromptName &&
      ai.promptVersion === nextPromptVersion &&
      ai.promptUserContent === nextPromptUserContent
    if (same) return

    const base = getAiConfigOrDefault('TASK_EXPERT')
    update({
      aiConfig: {
        ...base,
        executor: 'TASK_EXPERT',
        promptName: nextPromptName,
        promptVersion: nextPromptVersion,
        promptUserContent: nextPromptUserContent
      }
    })
  }, [
    ai.executor,
    ai.promptId,
    ai.promptName,
    ai.promptUserContent,
    ai.promptVersion,
    getAiConfigOrDefault,
    selectedTaskExpertMeta,
    update
  ])

  const onSelectPolicy = useCallback(
    (policy: Pick<ContentEntry, 'id' | 'title' | 'entryVersion'>) => {
      update({
        aiConfig: {
          ...getAiConfigOrDefault('EVERYAI'),
          promptId: undefined,
          promptName: undefined,
          promptVersion: undefined,
          promptUserContent: undefined,
          policyDocumentId: policy.id ?? undefined,
          policyDocumentTitle: policy.title ?? undefined,
          policyDocumentVersion: policy.entryVersion ?? undefined
        }
      })
    },
    [getAiConfigOrDefault, update]
  )

  const onSelectTaskExpert = useCallback(
    (promptId: string) => {
      const agent = decisionTaskExperts.find(a => a._id === promptId)
      const schema = agent?.response_schema
      const enumOpts = extractDecisionResultEnumFromSchema(schema)
      update({
        aiConfig: {
          ...getAiConfigOrDefault('TASK_EXPERT'),
          executor: 'TASK_EXPERT',
          instructions: undefined,
          policyDocumentId: undefined,
          policyDocumentTitle: undefined,
          policyDocumentVersion: undefined,
          promptId,
          promptName: agent?.name ?? undefined,
          promptVersion: typeof agent?.version === 'number' ? agent.version : undefined,
          promptUserContent: agent?.user_content?.template ?? undefined,
          systemParamsMap: undefined,
          userParamsMap: undefined,
          mapping: buildDefaultTaskExpertMapping(config.branches, enumOpts)
        }
      })
    },
    [config.branches, decisionTaskExperts, getAiConfigOrDefault, update]
  )

  const onChangeTaskExpertVersion = useCallback(
    (promptVersion: number) => {
      const base = getAiConfigOrDefault('TASK_EXPERT')
      update({
        aiConfig: {
          ...base,
          executor: 'TASK_EXPERT',
          promptVersion
        }
      })
    },
    [getAiConfigOrDefault, update]
  )

  const changeExecutor = useCallback(
    (next: AIExecutor, variant: 'simple' | 'advanced') => {
      if (next === 'EVERYAI') {
        update({
          aiConfig: {
            ...getAiConfigOrDefault('EVERYAI'),
            executor: 'EVERYAI',
            promptId: undefined,
            promptName: undefined,
            promptVersion: undefined,
            promptUserContent: undefined,
            mapping: undefined,
            systemParamsMap: undefined,
            userParamsMap: undefined,
            reasoningPath: undefined
          }
        })
        return
      }

      if (variant === 'advanced') {
        update({
          aiConfig: {
            ...getAiConfigOrDefault('TASK_EXPERT'),
            executor: 'TASK_EXPERT',
            instructions: undefined,
            promptId: String(config.aiConfig?.promptId || '').trim() || undefined,
            policyDocumentId: undefined,
            policyDocumentTitle: undefined,
            policyDocumentVersion: undefined,
            mapping: config.aiConfig?.mapping ?? { conditions: [] }
          }
        })
        return
      }

      update({
        aiConfig: {
          ...getAiConfigOrDefault('TASK_EXPERT'),
          executor: 'TASK_EXPERT',
          instructions: undefined,
          policyDocumentId: undefined,
          policyDocumentTitle: undefined,
          policyDocumentVersion: undefined,
          promptId: undefined,
          promptName: undefined,
          promptVersion: undefined,
          promptUserContent: undefined,
          mapping: buildDefaultTaskExpertMapping(config.branches, undefined),
          systemParamsMap: undefined,
          userParamsMap: undefined
        }
      })
    },
    [config.aiConfig?.mapping, config.aiConfig?.promptId, config.branches, getAiConfigOrDefault, update]
  )

  const onChangeReasoningPath = useCallback(
    (path: string | undefined) => {
      const base = getAiConfigOrDefault('TASK_EXPERT')
      update({ aiConfig: { ...base, executor: 'TASK_EXPERT', reasoningPath: path } })
    },
    [getAiConfigOrDefault, update]
  )

  const executorForSimple = (getAiConfigOrDefault().executor as AIExecutor) || 'EVERYAI'

  return {
    advancedExecutor,
    executorForSimple,
    getAiConfigOrDefault,
    decisionTaskExperts,
    selectedTaskExpert,
    promptParams,
    promptParamsLoading,
    taskExpertVersions,
    taskExpertVersionsLoading,
    decisionResultEnumOptions,
    taskExpertSchemaPaths,
    taskExpertMappingExpressionSuggestions,
    mappingWrapperConfig,
    mappingWrapperUpdate,
    onSelectPolicy,
    onSelectTaskExpert,
    onChangeTaskExpertVersion,
    changeExecutor,
    onChangeReasoningPath
  }
}
