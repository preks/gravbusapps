import { useEffect, useMemo, useState } from 'react'
import type { Customer360Subject, CustomerSatisfaction, DomainHookResult } from '../../types'
import { listCrmCustomFeedbackSurveyResults, type CrmCustomFeedbackSurveyResult } from '../crmCustomFeedbackClient'

// TODO(customer-feedback): Re-enable account satisfaction once custom survey results are confirmed and the tab is restored.
function numericResponseValue(responses: Record<string, unknown>, keys: string[]): number | undefined {
  const entry = Object.entries(responses).find(([key]) => keys.some(candidate => key.toLowerCase().includes(candidate)))
  if (!entry) return undefined
  const value = Array.isArray(entry[1]) ? entry[1][0] : entry[1]
  const numberValue = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

function average(values: number[]): number | undefined {
  if (values.length === 0) return undefined
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
}

function deriveSatisfaction(results: CrmCustomFeedbackSurveyResult[]): CustomerSatisfaction {
  const csatValues = results
    .map(result => numericResponseValue(result.responses, ['csat', 'satisfaction', 'rating']))
    .filter((value): value is number => typeof value === 'number')
  const npsValues = results
    .map(result => numericResponseValue(result.responses, ['nps', 'recommend']))
    .filter((value): value is number => typeof value === 'number')
  const lastSurveyDate = results
    .map(result => result.submittedAt)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => right.localeCompare(left))[0]

  return {
    csat: average(csatValues),
    nps: average(npsValues),
    lastSurveyDate,
    surveyResults: results
  }
}

export function useCustomerSatisfaction(
  accessToken: string,
  subject: Customer360Subject | null
): DomainHookResult<CustomerSatisfaction | undefined> {
  const [results, setResults] = useState<CrmCustomFeedbackSurveyResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const subjectId = subject?.id

  useEffect(() => {
    if (!accessToken || !subjectId) {
      setResults([])
      return
    }

    let cancelled = false
    const loadResults = async () => {
      setLoading(true)
      setError(null)
      try {
        const nextResults = await listCrmCustomFeedbackSurveyResults(accessToken, subjectId)
        if (!cancelled) setResults(nextResults)
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load survey results')
          setResults([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadResults()
    return () => {
      cancelled = true
    }
  }, [accessToken, subjectId])

  const data = useMemo(() => {
    if (results.length === 0) return undefined
    return deriveSatisfaction(results)
  }, [results])

  return { data, loading, error }
}
