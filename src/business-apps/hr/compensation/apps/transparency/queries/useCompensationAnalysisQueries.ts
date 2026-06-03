import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient.ts'
import { useCallback, useMemo } from 'react'
import {
  CompensationCompressionResponse,
  CompensationEquityHealthScoreResponse,
  CompensationGapExplanationResponse,
  CompensationGapExplanationScenarioResponse,
  CompensationMarketBenchmarkResponse,
  CompensationBenchmarkBucketResponse,
  CompensationAnalysisRunResponse
} from '../types/compensationAnalysis.types.ts'

// GraphQL query strings
const GET_LATEST_COMPENSATION_ANALYSIS_RUNS = (): string => {
  return `
    query GetLatestCompensationAnalysisRuns {
      CompensationAnalysisRun(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { status: { _eq: "COMPLETED" } }
            { type: { _in: ["COMPANY_WIDE_PAY_EQUITY", "GAP_EXPLANATION", "COMPRESSION", "MARKET_BENCHMARK", "EQUITY_HEALTH_SCORE"] } }
          ]
        }
        orderBy: { requestedAt: DESC }
        limit: 50
      ) {
        id
        type
        status
        params
        requestedAt
        completedAt
        errorMessage
      }
    }
  `
}

const GET_COMPRESSION_ANALYSIS = (): string => {
  return `
    query GetCompressionAnalysis {
      CompensationCompression(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { analysisRun: { status: { _eq: "COMPLETED" } } }
            { analysisRun: { type: { _eq: "COMPRESSION" } } }
          ]
        }
        orderBy: { analysisRun: { requestedAt: DESC } }
        limit: 1
      ) {
        id
        runId
        overallRiskScore
        totalCompressionCases
        totalEmployees
        tenureThresholdYears
        analysisDate
        analysisRun {
          id
          type
          status
          requestedAt
          completedAt
        }
        risks(orderBy: {compressionScore: DESC}) {
          id
          parentId
          department
          jobLevelName
          veteranName
          veteranSalary
          veteranTenure
          newHireName
          newHireSalary
          compressionAmount
          compressionScore
        }
      }
    }
  `
}

const GET_COMPRESSION_RISKS = (parentId: string): string => {
  return `
    query GetCompressionRisks {
      CompensationCompressionRisk(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { parentId: { _eq: "${parentId}" } }
          ]
        }
        orderBy: { compressionScore: DESC }
      ) {
        id
        parentId
        department
        jobLevelName
        veteranName
        veteranSalary
        veteranTenure
        newHireName
        newHireSalary
        compressionAmount
        compressionScore
      }
    }
  `
}

const GET_EQUITY_HEALTH_SCORE = (): string => {
  return `
    query GetEquityHealthScore {
      CompensationEquityHealthScore(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { analysisRun: { status: { _eq: "COMPLETED" } } }
            { analysisRun: { type: { _eq: "EQUITY_HEALTH_SCORE" } } }
          ]
        }
        orderBy: { analysisRun: { requestedAt: DESC } }
        limit: 1
      ) {
        id
        runId
        score
        label
        weightedRisk
        unexplainedRisk
        totalGapRisk
        compressionRisk
        run: analysisRun {
          id
          type
          status
          requestedAt
          completedAt
        }
      }
    }
  `
}

const GET_GAP_EXPLANATION = (): string => {
  return `
    query GetGapExplanation {
      CompensationGapExplanation(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { analysisRun: { status: { _eq: "COMPLETED" } } }
            { analysisRun: { type: { _eq: "GAP_EXPLANATION" } } }
          ]
        }
        orderBy: { analysisRun: { requestedAt: DESC } }
        limit: 1
      ) {
        id
        runId
        analysisDate
        scope
        jobLevelId
        totalEmployees
        totalGapPct
        unexplainedPct
        unexplainedAbs
        tenureExplainedPct
        performanceExplainedPct
        otherPct
        run: analysisRun {
          id
          type
          status
          requestedAt
          completedAt
        }
      }
    }
  `
}

const GET_GAP_EXPLANATION_SCENARIOS = (parentId: string): string => {
  return `
    query GetGapExplanationScenarios {
      CompensationGapExplanationScenario(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { parentId: { _eq: "${parentId}" } }
          ]
        }
        orderBy: { scenario: ASC }
      ) {
        id
        parentId
        scenario
        gender
        employeeCount
        avgTenure
        avgPerformance
        avgSalary
      }
    }
  `
}

const GET_MARKET_BENCHMARK = (): string => {
  return `
    query GetMarketBenchmark {
      CompensationMarketBenchmark(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { analysisRun: { status: { _eq: "COMPLETED" } } }
            { analysisRun: { type: { _eq: "MARKET_BENCHMARK" } } }
          ]
        }
        orderBy: { analysisRun: { requestedAt: DESC } }
        limit: 1
      ) {
        id
        runId
        analysisDate
        companyCompRatioP50
        companyAlignmentLabel
        run: analysisRun {
          id
          type
          status
          requestedAt
          completedAt
        }
      }
    }
  `
}

const GET_BENCHMARK_BUCKETS = (parentId: string): string => {
  return `
    query GetBenchmarkBuckets {
      CompensationBenchmarkBucket(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { parentId: { _eq: "${parentId}" } }
          ]
        }
        orderBy: { jobLevelCode: ASC }
      ) {
        id
        parentId
        jobLevelCode
        jobLevelName
        jobFamilyCode
        jobFamilyName
        geoZoneCode
        internalN
        internalP25
        internalP50
        internalP75
        marketP25
        marketP50
        marketP75
        compRatioP50
        alignmentLabel
      }
    }
  `
}

/**
 * Hook for managing GraphQL queries related to compensation analysis
 */
export function useCompensationAnalysisQueries(accessToken: string) {
  const graphqlClient = useGraphQLClient(accessToken)

  const fetchAnalysisRuns = useCallback(async () => {
    const query = GET_LATEST_COMPENSATION_ANALYSIS_RUNS()
    return await graphqlClient.request<CompensationAnalysisRunResponse>(query)
  }, [graphqlClient])

  const fetchCompressionAnalysis = useCallback(async () => {
    const query = GET_COMPRESSION_ANALYSIS()
    return await graphqlClient.request<CompensationCompressionResponse>(query)
  }, [graphqlClient])

  const fetchCompressionRisks = useCallback(
    async (parentId: string) => {
      const query = GET_COMPRESSION_RISKS(parentId)
      return await graphqlClient.request<{ CompensationCompressionRisk: any[] }>(query)
    },
    [graphqlClient]
  )

  const fetchHealthScore = useCallback(async () => {
    const query = GET_EQUITY_HEALTH_SCORE()
    return await graphqlClient.request<CompensationEquityHealthScoreResponse>(query)
  }, [graphqlClient])

  const fetchGapExplanation = useCallback(async () => {
    const query = GET_GAP_EXPLANATION()
    return await graphqlClient.request<CompensationGapExplanationResponse>(query)
  }, [graphqlClient])

  const fetchGapExplanationScenarios = useCallback(
    async (parentId: string) => {
      const query = GET_GAP_EXPLANATION_SCENARIOS(parentId)
      return await graphqlClient.request<CompensationGapExplanationScenarioResponse>(query)
    },
    [graphqlClient]
  )

  const fetchMarketBenchmark = useCallback(async () => {
    const query = GET_MARKET_BENCHMARK()
    return await graphqlClient.request<CompensationMarketBenchmarkResponse>(query)
  }, [graphqlClient])

  const fetchBenchmarkBuckets = useCallback(
    async (parentId: string) => {
      const query = GET_BENCHMARK_BUCKETS(parentId)
      return await graphqlClient.request<CompensationBenchmarkBucketResponse>(query)
    },
    [graphqlClient]
  )

  return useMemo(
    () => ({
      fetchAnalysisRuns,
      fetchCompressionAnalysis,
      fetchCompressionRisks,
      fetchHealthScore,
      fetchGapExplanation,
      fetchGapExplanationScenarios,
      fetchMarketBenchmark,
      fetchBenchmarkBuckets
    }),
    [
      fetchAnalysisRuns,
      fetchCompressionAnalysis,
      fetchCompressionRisks,
      fetchHealthScore,
      fetchGapExplanation,
      fetchGapExplanationScenarios,
      fetchMarketBenchmark,
      fetchBenchmarkBuckets
    ]
  )
}
