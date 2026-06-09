import { useMemo } from 'react'
import type { Customer360Subject, CustomerScores, DomainHookResult } from '../types'

/**
 * Derives a customer-level AI score from the subject's related opportunities
 * (reusing the existing `aiOpportunityScore` / `aiOpportunityGrade` signals).
 * Returns `undefined` when no scored related records are available, so the KPI
 * header and Scoring tab render an explicit awaiting-data state.
 *
 * Account-level ICP scoring is not yet exposed by the backend; when it lands it
 * can populate `icpScore` here without changing the hook signature.
 */
export function useCustomerScores(
  accessToken: string,
  subject: Customer360Subject | null
): DomainHookResult<CustomerScores | undefined> {
  void accessToken

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
