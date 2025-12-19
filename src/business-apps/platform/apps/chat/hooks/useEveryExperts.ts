/**
 * Hook to load and manage available Every Experts for chat
 */

import { useState, useEffect, useCallback } from 'react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type { PromptODM } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import { getExpertColor } from '../utils/expertColorUtils'

export interface AvailableExpert {
  id: string
  name: string
  specialty: string
  description?: string
  avatar?: string
  color?: string
  knowledgeSourceCount: number
  tags?: string[]
  isPublic?: boolean
}

export const useEveryExperts = (accessToken: string) => {
  const client = usePromptManagerClient(accessToken)
  const [experts, setExperts] = useState<AvailableExpert[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadExperts = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Get all EveryAI experts
      const response = await client.getEveryAIExperts({
        limit: 100,
        returnTotalRecords: false
      })

      // Transform to AvailableExpert format
      const transformedExperts: AvailableExpert[] = response.data.map((prompt: PromptODM) => ({
        id: prompt._id || '',
        name: prompt.name,
        specialty: prompt.specialty || 'General AI Assistant',
        description: prompt.description,
        avatar: prompt.avatar,
        color: getExpertColor(prompt.color),
        knowledgeSourceCount: prompt.knowledge_sources?.length || 0,
        tags: prompt.tags || [],
        isPublic: prompt.is_public || false
      }))

      setExperts(transformedExperts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load experts')
    } finally {
      setIsLoading(false)
    }
  }, [client])

  useEffect(() => {
    if (accessToken) {
      loadExperts()
    }
  }, [accessToken, loadExperts])

  return {
    experts,
    isLoading,
    error,
    reload: loadExperts
  }
}
