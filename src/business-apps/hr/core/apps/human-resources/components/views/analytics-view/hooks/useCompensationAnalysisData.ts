import { useState, useEffect, useCallback } from 'react'
import { useCompensationAnalysisQueries } from '../queries/useCompensationAnalysisQueries.ts'
import {
  transformCompressionAnalysis,
  transformHealthScore,
  transformGapExplanation,
  transformMarketBenchmark
} from '../utils/compensationAnalysisUtils.ts'
import {
  UseCompensationDataResult,
  CompensationDataState,
  CompressionAnalysisData,
  HealthScoreData,
  GapExplanationData,
  MarketBenchmarkData
} from '../types/compensationAnalysis.types.ts'

/**
 * Main hook for managing compensation analysis data
 * Orchestrates queries and transformations for all compensation analysis types
 */
export const useCompensationAnalysisData = (accessToken: string): UseCompensationDataResult => {
  const queries = useCompensationAnalysisQueries(accessToken)

  // State for compression analysis
  const [compressionAnalysis, setCompressionAnalysis] = useState<CompensationDataState<CompressionAnalysisData>>({
    data: null,
    loading: false,
    error: null
  })

  // State for health score
  const [healthScore, setHealthScore] = useState<CompensationDataState<HealthScoreData>>({
    data: null,
    loading: false,
    error: null
  })

  // State for gap explanation
  const [gapExplanation, setGapExplanation] = useState<CompensationDataState<GapExplanationData>>({
    data: null,
    loading: false,
    error: null
  })

  // State for market benchmark
  const [marketBenchmark, setMarketBenchmark] = useState<CompensationDataState<MarketBenchmarkData>>({
    data: null,
    loading: false,
    error: null
  })

  /**
   * Fetch compression analysis data
   */
  const fetchCompressionAnalysis = useCallback(async () => {
    setCompressionAnalysis(prev => ({ ...prev, loading: true, error: null }))

    try {
      const response = await queries.fetchCompressionAnalysis()
      const transformedData = transformCompressionAnalysis(response)

      setCompressionAnalysis({
        data: transformedData,
        loading: false,
        error: null
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('Error fetching compression analysis:', errorMessage)

      setCompressionAnalysis({
        data: null,
        loading: false,
        error: errorMessage
      })
    }
  }, [queries.fetchCompressionAnalysis])

  /**
   * Fetch health score data
   */
  const fetchHealthScore = useCallback(async () => {
    setHealthScore(prev => ({ ...prev, loading: true, error: null }))

    try {
      const response = await queries.fetchHealthScore()
      const transformedData = transformHealthScore(response)

      setHealthScore({
        data: transformedData,
        loading: false,
        error: null
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('Error fetching health score:', errorMessage)

      setHealthScore({
        data: null,
        loading: false,
        error: errorMessage
      })
    }
  }, [queries.fetchHealthScore])

  /**
   * Fetch gap explanation data with scenarios
   */
  const fetchGapExplanation = useCallback(async () => {
    setGapExplanation(prev => ({ ...prev, loading: true, error: null }))

    try {
      const gapResponse = await queries.fetchGapExplanation()

      if (gapResponse.CompensationGapExplanation.length === 0) {
        setGapExplanation({
          data: null,
          loading: false,
          error: null
        })
        return
      }

      const gap = gapResponse.CompensationGapExplanation[0]
      const scenariosResponse = await queries.fetchGapExplanationScenarios(gap.runId)

      const transformedData = await transformGapExplanation(gapResponse, scenariosResponse)

      setGapExplanation({
        data: transformedData,
        loading: false,
        error: null
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('Error fetching gap explanation:', errorMessage)

      setGapExplanation({
        data: null,
        loading: false,
        error: errorMessage
      })
    }
  }, [queries.fetchGapExplanation, queries.fetchGapExplanationScenarios])

  /**
   * Fetch market benchmark data with buckets
   */
  const fetchMarketBenchmark = useCallback(async () => {
    setMarketBenchmark(prev => ({ ...prev, loading: true, error: null }))

    try {
      const benchmarkResponse = await queries.fetchMarketBenchmark()

      if (benchmarkResponse.CompensationMarketBenchmark.length === 0) {
        setMarketBenchmark({
          data: null,
          loading: false,
          error: null
        })
        return
      }

      const benchmark = benchmarkResponse.CompensationMarketBenchmark[0]
      const bucketsResponse = await queries.fetchBenchmarkBuckets(benchmark.runId)

      const transformedData = await transformMarketBenchmark(benchmarkResponse, bucketsResponse)

      setMarketBenchmark({
        data: transformedData,
        loading: false,
        error: null
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('Error fetching market benchmark:', errorMessage)

      setMarketBenchmark({
        data: null,
        loading: false,
        error: errorMessage
      })
    }
  }, [queries.fetchMarketBenchmark, queries.fetchBenchmarkBuckets])

  /**
   * Refetch all compensation data
   */
  const refetch = useCallback(async () => {
    await Promise.all([fetchCompressionAnalysis(), fetchHealthScore(), fetchGapExplanation(), fetchMarketBenchmark()])
  }, [fetchCompressionAnalysis, fetchHealthScore, fetchGapExplanation, fetchMarketBenchmark])

  // Initial data loading
  useEffect(() => {
    refetch()
  }, [refetch])

  return {
    compressionAnalysis,
    healthScore,
    gapExplanation,
    marketBenchmark,
    refetch
  }
}

/**
 * Simplified hook for components that only need compression analysis data
 */
export const useCompressionAnalysis = (accessToken: string) => {
  const { compressionAnalysis, refetch } = useCompensationAnalysisData(accessToken)

  return {
    ...compressionAnalysis,
    refetch: useCallback(async () => {
      await refetch()
    }, [refetch])
  }
}

/**
 * Simplified hook for components that only need health score data
 */
export const useHealthScore = (accessToken: string) => {
  const { healthScore, refetch } = useCompensationAnalysisData(accessToken)

  return {
    ...healthScore,
    refetch: useCallback(async () => {
      await refetch()
    }, [refetch])
  }
}

/**
 * Simplified hook for components that only need gap explanation data
 */
export const useGapExplanation = (accessToken: string) => {
  const { gapExplanation, refetch } = useCompensationAnalysisData(accessToken)

  return {
    ...gapExplanation,
    refetch: useCallback(async () => {
      await refetch()
    }, [refetch])
  }
}

/**
 * Simplified hook for components that only need market benchmark data
 */
export const useMarketBenchmark = (accessToken: string) => {
  const { marketBenchmark, refetch } = useCompensationAnalysisData(accessToken)

  return {
    ...marketBenchmark,
    refetch: useCallback(async () => {
      await refetch()
    }, [refetch])
  }
}
