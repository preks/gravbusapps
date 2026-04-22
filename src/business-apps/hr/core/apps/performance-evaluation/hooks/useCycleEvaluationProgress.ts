import { useState, useEffect, useCallback } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'

const GET_CYCLE_EVALUATION_PROGRESS = /* GraphQL */ `
  query GetCycleEvaluationProgress($cycleId: uuid!) {
    EmployeePerformanceEvaluation(where: { performanceCycleId: { _eq: $cycleId }, isDeleted: { _eq: false } }) {
      id
      actualCompletionDate
    }
  }
`

interface EvaluationProgressApi {
  id: string
  actualCompletionDate: string | null
}

interface GetCycleEvaluationProgressResponse {
  EmployeePerformanceEvaluation: EvaluationProgressApi[]
}

export interface CycleEvaluationProgress {
  total: number
  completed: number
  percent: number
}

export function useCycleEvaluationProgress(accessToken: string | undefined, cycleId: string | null) {
  const graphqlClient = useGraphqlClient(accessToken)
  const [progress, setProgress] = useState<CycleEvaluationProgress | null>(null)
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!accessToken || !cycleId) {
      setProgress(null)
      return
    }
    try {
      setLoading(true)
      const result = await graphqlClient.request<GetCycleEvaluationProgressResponse>(GET_CYCLE_EVALUATION_PROGRESS, {
        cycleId
      })
      const evaluations = result?.EmployeePerformanceEvaluation ?? []
      const total = evaluations.length
      const completed = evaluations.filter(e => e.actualCompletionDate).length
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0
      setProgress({ total, completed, percent })
    } catch {
      setProgress(null)
    } finally {
      setLoading(false)
    }
  }, [accessToken, cycleId, graphqlClient])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { progress, loading }
}
