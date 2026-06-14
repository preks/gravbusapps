import { useMemo } from 'react'
import type { Customer360Subject, CustomerScores, DomainHookResult } from '../../types'

export function useCustomerScores(
  _accessToken: string,
  subject: Customer360Subject | null
): DomainHookResult<CustomerScores | undefined> {
  const data = useMemo<CustomerScores | undefined>(() => {
    if (!subject) return undefined

    const opportunities = subject.account?.opportunities ?? []
    const scores = opportunities
      .map(opportunity => opportunity.aiOpportunityScore)
      .filter((score): score is number => typeof score === 'number' && !Number.isNaN(score))

    if (scores.length === 0) return undefined

    const aiScore = scores.reduce((sum, score) => sum + score, 0) / scores.length
    const grade = opportunities.find(opportunity => opportunity.aiOpportunityGrade)?.aiOpportunityGrade ?? undefined

    return { aiScore, scoreLabel: grade ?? undefined }
  }, [subject])

  return { data, loading: false, error: null }
}
