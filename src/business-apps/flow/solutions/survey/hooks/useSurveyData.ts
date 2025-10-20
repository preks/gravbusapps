import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { SurveyDataService, SurveyFlow } from '../services/SurveyDataService'

export interface SurveyDataHookResult {
  // Basic data
  surveys: SurveyFlow[]
  isLoading: boolean
  error: string | null

  // Statistics
  totalSurveys: number
  activeSurveys: number
  completedSurveys: number
  totalResponses: number
  averageResponseRate: number

  // Survey type breakdown
  surveyTypeBreakdown: Array<{ type: string; count: number; responseRate: number }>

  // Participation metrics
  totalParticipants: number
  participationTrend: Array<{ date: string; participants: number; responses: number }>

  // Actions
  refetch: () => Promise<void>
  loadMore: () => Promise<void>

  // Pagination
  hasMore: boolean
  offset: number
}

export const useSurveyData = (
  context: BusinessAppContextProps,
  options: {
    limit?: number
    autoRefresh?: boolean
    refreshInterval?: number
  } = {}
): SurveyDataHookResult => {
  const { limit = 20, autoRefresh = false, refreshInterval = 30000 } = options

  // State management
  const [surveys, setSurveys] = useState<SurveyFlow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  // Analytics state
  const [totalSurveys, setTotalSurveys] = useState(0)
  const [activeSurveys, setActiveSurveys] = useState(0)
  const [completedSurveys, setCompletedSurveys] = useState(0)
  const [totalResponses, setTotalResponses] = useState(0)
  const [averageResponseRate, setAverageResponseRate] = useState(0)
  const [surveyTypeBreakdown, setSurveyTypeBreakdown] = useState<
    Array<{ type: string; count: number; responseRate: number }>
  >([])

  // Participation metrics
  const [totalParticipants, setTotalParticipants] = useState(0)
  const [participationTrend, setParticipationTrend] = useState<
    Array<{ date: string; participants: number; responses: number }>
  >([])

  const loadSurveyData = useCallback(
    async (reset: boolean = false) => {
      if (!context.accessToken) return

      try {
        setIsLoading(true)
        setError(null)

        const currentOffset = reset ? 0 : offset

        // Load survey flows
        const flowsResponse = await SurveyDataService.getSurveyFlows(context.accessToken, limit, currentOffset)

        if (reset) {
          setSurveys(flowsResponse.flows)
          setOffset(limit)
        } else {
          setSurveys(prev => [...prev, ...flowsResponse.flows])
          setOffset(prev => prev + limit)
        }

        setHasMore(flowsResponse.flows.length === limit)

        // Load analytics data in parallel
        const [analyticsData, participationData] = await Promise.all([
          SurveyDataService.getSurveyAnalytics(context.accessToken),
          SurveyDataService.getParticipationMetrics(context.accessToken)
        ])

        // Update analytics state
        setTotalSurveys(analyticsData.totalSurveys)
        setActiveSurveys(analyticsData.activeSurveys)
        setCompletedSurveys(analyticsData.completedSurveys)
        setTotalResponses(analyticsData.totalResponses)
        setAverageResponseRate(analyticsData.averageResponseRate)
        setSurveyTypeBreakdown(analyticsData.surveyTypeBreakdown)

        // Update participation metrics
        setTotalParticipants(participationData.totalParticipants)
        setParticipationTrend(participationData.participationTrend)
      } catch (err) {
        console.error('Error loading survey data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load survey data')
      } finally {
        setIsLoading(false)
      }
    },
    [context.accessToken, limit, offset]
  )

  const refetch = useCallback(async () => {
    await loadSurveyData(true)
  }, [loadSurveyData])

  const loadMore = useCallback(async () => {
    if (!isLoading && hasMore) {
      await loadSurveyData(false)
    }
  }, [loadSurveyData, isLoading, hasMore])

  // Initial load
  useEffect(() => {
    if (context.accessToken) {
      loadSurveyData(true)
    }
  }, [context.accessToken])

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh && context.accessToken) {
      const interval = setInterval(() => {
        refetch()
      }, refreshInterval)

      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval, context.accessToken, refetch])

  // Listen for survey flow creation events
  useEffect(() => {
    const handleSurveyCreated = () => {
      refetch()
    }

    window.addEventListener('survey-flow-created', handleSurveyCreated)
    return () => window.removeEventListener('survey-flow-created', handleSurveyCreated)
  }, [refetch])

  return {
    // Basic data
    surveys,
    isLoading,
    error,

    // Statistics
    totalSurveys,
    activeSurveys,
    completedSurveys,
    totalResponses,
    averageResponseRate,

    // Survey type breakdown
    surveyTypeBreakdown,

    // Participation metrics
    totalParticipants,
    participationTrend,

    // Actions
    refetch,
    loadMore,

    // Pagination
    hasMore,
    offset
  }
}

export default useSurveyData
