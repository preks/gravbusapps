import { useState, useCallback } from 'react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type { SkillDirectoryRecord } from '../types'

export interface MergeProposal {
  targetSkill: SkillDirectoryRecord
  duplicates: SkillDirectoryRecord[]
  confidence: 'high' | 'medium'
  status: 'pending' | 'approved' | 'rejected' | 'merged' | 'error'
  error?: string
}

interface LlmCluster {
  skillIds: string[]
  confidence: 'high' | 'medium'
}

const AGENT_NAME = 'SkillDeduplicationAgent'
const DEDUP_ERROR_MIN_SKILLS = 'dedup-error-need-min-skills'
const DEDUP_ERROR_AGENT_NOT_FOUND = 'dedup-error-agent-not-found'
const DEDUP_ERROR_EMPTY_RESPONSE = 'dedup-error-empty-response'
const DEDUP_ERROR_PARSE = 'dedup-error-parse-failed'
const DEDUP_ERROR_ANALYZE = 'dedup-error-analyze-failed'

type ParsedJsonResult = { value: unknown }

function extractMarkdownJsonFence(text: string): string {
  const openingFenceIndex = text.indexOf('```')
  if (openingFenceIndex === -1) return text

  let contentStartIndex = openingFenceIndex + 3
  if (text.slice(contentStartIndex, contentStartIndex + 4).toLowerCase() === 'json') {
    contentStartIndex += 4
  }

  while (contentStartIndex < text.length) {
    const charCode = text.codePointAt(contentStartIndex)
    const isWhitespace = charCode === 9 || charCode === 10 || charCode === 13 || charCode === 32
    if (!isWhitespace) break
    contentStartIndex += 1
  }

  const closingFenceIndex = text.indexOf('```', contentStartIndex)
  if (closingFenceIndex === -1) return text

  return text.slice(contentStartIndex, closingFenceIndex).trim()
}

function extractFirstJsonArray(text: string): string {
  const openingBracketIndex = text.indexOf('[')
  if (openingBracketIndex === -1) return text

  const closingBracketIndex = text.lastIndexOf(']')
  if (closingBracketIndex <= openingBracketIndex) return text

  return text.slice(openingBracketIndex, closingBracketIndex + 1)
}

function tryParseJson(text: string): ParsedJsonResult | null {
  try {
    return { value: JSON.parse(text) }
  } catch {
    return null
  }
}

function repairTruncatedJson(text: string): ParsedJsonResult | null {
  let attempt = text.trim()
  if (!attempt.startsWith('[')) return null

  const lastCompleteObject = attempt.lastIndexOf('}')
  if (lastCompleteObject === -1) return null

  attempt = attempt.substring(0, lastCompleteObject + 1)

  if (!attempt.endsWith(']')) {
    attempt = attempt.replace(/,\s*$/, '') + ']'
  }

  console.warn('[useSkillDeduplication] Attempting to repair truncated JSON')
  return tryParseJson(attempt)
}

function extractClusters(response: any): LlmCluster[] {
  if (!response) throw new Error(DEDUP_ERROR_EMPTY_RESPONSE)

  let data: any = response.content ?? response.result ?? response.output ?? response

  if (typeof data === 'string') {
    data = data.trim()
    data = extractMarkdownJsonFence(data)
    data = extractFirstJsonArray(data)

    const parseResult = tryParseJson(data) ?? repairTruncatedJson(data)
    if (parseResult === null) {
      console.error(
        '[useSkillDeduplication] Cannot parse JSON. Length:',
        data.length,
        'Last 100 chars:',
        data.slice(-100)
      )
      throw new Error(DEDUP_ERROR_PARSE)
    }
    data = parseResult.value
  }

  if (Array.isArray(data)) return data

  if (data && typeof data === 'object') {
    const arr = data.groups ?? data.clusters ?? data.duplicates ?? data.data ?? data.results
    if (Array.isArray(arr)) return arr
  }

  console.error('[useSkillDeduplication] Unexpected data shape:', JSON.stringify(data)?.substring(0, 500))
  throw new Error(DEDUP_ERROR_PARSE)
}

export function useSkillDeduplication(accessToken: string) {
  const promptManagerClient = usePromptManagerClient(accessToken)
  const [proposals, setProposals] = useState<MergeProposal[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const analyze = useCallback(
    async (skills: SkillDirectoryRecord[]) => {
      if (skills.length < 2) {
        setError(DEDUP_ERROR_MIN_SKILLS)
        return
      }

      setIsAnalyzing(true)
      setError(null)
      setProposals([])

      const skillListForLlm = skills.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description ?? '',
        employeeCount: s.employeeSkillsAggregate?.aggregate?.count ?? 0
      }))

      try {
        const promptsPage = await promptManagerClient.getPrompts({ promptName: AGENT_NAME, limit: 1 })
        const agentId = promptsPage?.data?.[0]?._id
        if (!agentId) {
          throw new Error(DEDUP_ERROR_AGENT_NOT_FOUND)
        }

        const formData = new FormData()
        formData.append('user_params', JSON.stringify({ skills: JSON.stringify(skillListForLlm, null, 2) }))

        const response = await promptManagerClient.executePromptById(agentId, formData)
        const clusters = extractClusters(response)

        const skillMap = new Map(skills.map(s => [s.id, s]))

        const mergeProposals = clusters.reduce<MergeProposal[]>((accumulator, cluster) => {
          if (!Array.isArray(cluster.skillIds) || cluster.skillIds.length < 2) {
            return accumulator
          }

          const clusterSkills = cluster.skillIds
            .map(id => skillMap.get(id))
            .filter((s): s is SkillDirectoryRecord => s != null)

          if (clusterSkills.length < 2) {
            return accumulator
          }

          clusterSkills.sort(
            (a, b) =>
              (b.employeeSkillsAggregate?.aggregate?.count ?? 0) - (a.employeeSkillsAggregate?.aggregate?.count ?? 0)
          )

          const [target, ...duplicates] = clusterSkills
          accumulator.push({
            targetSkill: target,
            duplicates,
            confidence: cluster.confidence === 'medium' ? 'medium' : 'high',
            status: 'pending'
          })

          return accumulator
        }, [])

        setProposals(mergeProposals)

        if (mergeProposals.length === 0) {
          setError('no-duplicates-found')
        }
      } catch (err) {
        if (err instanceof Error && err.message.startsWith('dedup-error-')) {
          setError(err.message)
        } else {
          setError(DEDUP_ERROR_ANALYZE)
        }
      } finally {
        setIsAnalyzing(false)
      }
    },
    [promptManagerClient]
  )

  const updateProposalStatus = useCallback((index: number, status: MergeProposal['status'], errorMsg?: string) => {
    setProposals(prev => prev.map((p, i) => (i === index ? { ...p, status, error: errorMsg } : p)))
  }, [])

  const approveAll = useCallback((confidence?: 'high' | 'medium') => {
    setProposals(prev =>
      prev.map(p => {
        if (p.status !== 'pending') return p
        if (confidence && p.confidence !== confidence) return p
        return { ...p, status: 'approved' }
      })
    )
  }, [])

  const rejectAll = useCallback(() => {
    setProposals(prev => prev.map(p => (p.status === 'pending' ? { ...p, status: 'rejected' } : p)))
  }, [])

  const reset = useCallback(() => {
    setProposals([])
    setError(null)
    setIsAnalyzing(false)
  }, [])

  return {
    proposals,
    isAnalyzing,
    error,
    analyze,
    updateProposalStatus,
    approveAll,
    rejectAll,
    reset
  }
}
