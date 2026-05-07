import { useCallback, useEffect, useState } from 'react'
import type {
  InvestmentGroupMonthlyTimelineDatum,
  InvestmentGroupTimelineDatum,
  InvestmentGroupTypeTimelineResult,
  TimelineDateField
} from '../queries/shared'
import { useInvestmentGroupTimelineQueries } from '../queries/timelineQueries'

interface InvestmentGroupTimelineState {
  timelineData: InvestmentGroupTimelineDatum[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export const useInvestmentGroupTimeline = (
  accessToken: string | undefined,
  groupId: string,
  selectedCurrency: string,
  enabled = true,
  dateField: TimelineDateField = 'createdAt'
): InvestmentGroupTimelineState => {
  const { fetchTimeline } = useInvestmentGroupTimelineQueries(accessToken)
  const [timelineData, setTimelineData] = useState<InvestmentGroupTimelineDatum[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!enabled || !accessToken || !groupId) {
      setTimelineData([])
      setIsLoading(false)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      setTimelineData(await fetchTimeline(groupId, selectedCurrency, 5, dateField))
    } catch (err) {
      setTimelineData([])
      setError(err instanceof Error ? err.message : 'Failed to load investment group timeline')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, dateField, enabled, fetchTimeline, groupId, selectedCurrency])

  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    timelineData,
    isLoading,
    error,
    refetch: loadData
  }
}

interface InvestmentGroupMonthlyTimelineState {
  timelineData: InvestmentGroupMonthlyTimelineDatum[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export const useInvestmentGroupMonthlyTimeline = (
  accessToken: string | undefined,
  groupId: string,
  selectedCurrency: string,
  enabled = true,
  dateField: TimelineDateField = 'createdAt'
): InvestmentGroupMonthlyTimelineState => {
  const { fetchMonthlyTimeline } = useInvestmentGroupTimelineQueries(accessToken)
  const [timelineData, setTimelineData] = useState<InvestmentGroupMonthlyTimelineDatum[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!enabled || !accessToken || !groupId) {
      setTimelineData([])
      setIsLoading(false)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      setTimelineData(await fetchMonthlyTimeline(groupId, selectedCurrency, 5, dateField))
    } catch (err) {
      setTimelineData([])
      setError(err instanceof Error ? err.message : 'Failed to load monthly investment group timeline')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, dateField, enabled, fetchMonthlyTimeline, groupId, selectedCurrency])

  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    timelineData,
    isLoading,
    error,
    refetch: loadData
  }
}

interface InvestmentGroupTypeTimelineState extends InvestmentGroupTypeTimelineResult {
  isLoading: boolean
  error: string | null
  refetch: () => void
}

const EMPTY_TYPE_TIMELINE: InvestmentGroupTypeTimelineResult = {
  timelineData: [],
  investmentTypes: [],
  typeKeyByLabel: {}
}

export const useInvestmentGroupTypeTimeline = (
  accessToken: string | undefined,
  groupId: string,
  selectedCurrency: string,
  enabled = true
): InvestmentGroupTypeTimelineState => {
  const { fetchTimelineByType } = useInvestmentGroupTimelineQueries(accessToken)
  const [data, setData] = useState<InvestmentGroupTypeTimelineResult>(EMPTY_TYPE_TIMELINE)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!enabled || !accessToken || !groupId) {
      setData(EMPTY_TYPE_TIMELINE)
      setIsLoading(false)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      setData(await fetchTimelineByType(groupId, selectedCurrency))
    } catch (err) {
      setData(EMPTY_TYPE_TIMELINE)
      setError(err instanceof Error ? err.message : 'Failed to load investment group type timeline')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, enabled, fetchTimelineByType, groupId, selectedCurrency])

  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    ...data,
    isLoading,
    error,
    refetch: loadData
  }
}
