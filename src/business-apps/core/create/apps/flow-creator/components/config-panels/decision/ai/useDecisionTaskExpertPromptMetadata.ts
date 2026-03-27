import { useEffect, useMemo, useState } from 'react'
import type { PromptODM } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import type { FlowStudioData } from '../../../../hooks/useFlowStudioData'
import {
  extractPromptParameters,
  hasPromptParameterMetadata,
  type PromptParameterGroups
} from '../../../../utils/promptParameterUtils'

const EMPTY_PARAMS: PromptParameterGroups = { system: [], user: [] }

interface Params {
  promptId?: string
  promptVersion?: number
  decisionTaskExperts: PromptODM[]
  studioData: FlowStudioData
}

export function useDecisionTaskExpertPromptMetadata({
  promptId,
  promptVersion,
  decisionTaskExperts,
  studioData
}: Params): {
  selectedTaskExpert: PromptODM | undefined
  selectedTaskExpertMeta: PromptODM | undefined
  promptParams: PromptParameterGroups
  promptParamsLoading: boolean
  promptParamsResolved: boolean
  taskExpertVersions: number[]
  taskExpertVersionsLoading: boolean
} {
  const normalizedPromptId = String(promptId || '').trim()
  const normalizedPromptVersion = Number(promptVersion)
  const hasPinnedVersion = Number.isFinite(normalizedPromptVersion)
  const requestKey = normalizedPromptId
    ? `${normalizedPromptId}:${hasPinnedVersion ? normalizedPromptVersion : 'latest'}`
    : ''

  const selectedTaskExpert = useMemo(() => {
    if (!normalizedPromptId) return undefined
    return decisionTaskExperts.find(agent => agent._id === normalizedPromptId)
  }, [decisionTaskExperts, normalizedPromptId])

  const [versions, setVersions] = useState<PromptODM[]>([])
  const [versionsLoading, setVersionsLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!normalizedPromptId) {
        setVersions([])
        setVersionsLoading(false)
        return
      }

      setVersionsLoading(true)
      try {
        const next = await studioData.loadAgentVersions(normalizedPromptId)
        if (!cancelled) setVersions(next)
      } finally {
        if (!cancelled) setVersionsLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [hasPinnedVersion, normalizedPromptId, studioData])

  const selectedTaskExpertMeta = useMemo(() => {
    if (!normalizedPromptId) return undefined

    if (hasPinnedVersion) {
      const matched = versions.find(version => Number(version.version) === normalizedPromptVersion)
      if (matched) return matched

      if (
        Number(selectedTaskExpert?.version) === normalizedPromptVersion &&
        hasPromptParameterMetadata(selectedTaskExpert)
      ) {
        return selectedTaskExpert
      }

      if (versionsLoading) return undefined
      return undefined
    }

    return hasPromptParameterMetadata(selectedTaskExpert) ? selectedTaskExpert : undefined
  }, [hasPinnedVersion, normalizedPromptId, normalizedPromptVersion, selectedTaskExpert, versions, versionsLoading])

  const derivedParams = useMemo(
    () => (selectedTaskExpertMeta ? extractPromptParameters(selectedTaskExpertMeta) : EMPTY_PARAMS),
    [selectedTaskExpertMeta]
  )

  const [fallbackParams, setFallbackParams] = useState<PromptParameterGroups>(EMPTY_PARAMS)
  const [fallbackLoading, setFallbackLoading] = useState(false)
  const [resolvedPromptKey, setResolvedPromptKey] = useState('')

  useEffect(() => {
    if (!requestKey) {
      setResolvedPromptKey('')
      return
    }
    setResolvedPromptKey(prev => (prev === requestKey ? prev : ''))
  }, [requestKey])

  useEffect(() => {
    if (!requestKey || !selectedTaskExpertMeta) return
    setResolvedPromptKey(requestKey)
  }, [requestKey, selectedTaskExpertMeta])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!normalizedPromptId || selectedTaskExpertMeta) {
        setFallbackParams(EMPTY_PARAMS)
        setFallbackLoading(false)
        return
      }

      setFallbackLoading(true)
      try {
        const next = await studioData.loadAgentParameters(
          normalizedPromptId,
          hasPinnedVersion ? normalizedPromptVersion : undefined
        )
        if (!cancelled) {
          setFallbackParams(next)
          setResolvedPromptKey(requestKey)
        }
      } finally {
        if (!cancelled) setFallbackLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [hasPinnedVersion, normalizedPromptId, normalizedPromptVersion, requestKey, selectedTaskExpertMeta, studioData])

  return {
    selectedTaskExpert,
    selectedTaskExpertMeta,
    promptParams: selectedTaskExpertMeta ? derivedParams : fallbackParams,
    promptParamsLoading: versionsLoading || fallbackLoading,
    promptParamsResolved: !requestKey || resolvedPromptKey === requestKey,
    taskExpertVersions: Array.from(
      new Set([
        ...versions.map(version => Number(version.version)).filter(version => Number.isFinite(version)),
        ...(() => {
          const latestVersion = Number(selectedTaskExpert?.version)
          return Number.isFinite(latestVersion) ? [latestVersion] : []
        })()
      ])
    ).sort((a, b) => b - a),
    taskExpertVersionsLoading: versionsLoading
  }
}
