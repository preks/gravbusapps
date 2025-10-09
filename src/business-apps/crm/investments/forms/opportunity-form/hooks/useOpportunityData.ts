import { useState, useCallback, useEffect, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  useGetInvestmentOpportunityData,
  InvestmentOpportunityDataResponse,
  InvestmentOpportunityQueryVariables,
  InvestmentOpportunityQueryResult
} from '../queries/OpportunityQueries'
import { InvestmentOpportunityFormValues } from '../types'

interface UseInvestmentOpportunityDataProps {
  businessAppContext: BusinessAppContextProps
}

interface UseInvestmentOpportunityDataReturn {
  opportunityData: InvestmentOpportunityQueryResult | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  mapOpportunityToFormValues: (
    opportunity: InvestmentOpportunityQueryResult
  ) => Partial<InvestmentOpportunityFormValues>
}

export const mapInvestmentOpportunityDataToFormValues = (
  opportunityData: InvestmentOpportunityDataResponse
): Partial<InvestmentOpportunityFormValues> => {
  if (!opportunityData?.InvestmentOpportunity?.[0]) {
    return {}
  }

  const opportunity = opportunityData.InvestmentOpportunity[0]

  const formValues: Partial<InvestmentOpportunityFormValues> = {
    // System fields
    id: opportunity.id,
    version: opportunity.version,

    // Basic Information
    name: opportunity.name || '',
    investmentName: opportunity.investmentName || '',
    dealType: opportunity.dealType || '',
    code: opportunity.code || '',
    businessKey: opportunity.businessKey || '',

    // Pipeline Information
    pipeline: opportunity.opportunityPipelineRef || '',
    pipelineStage: opportunity.opportunityPipelineStageRef || '',

    // Financial Information
    estimatedAmount: opportunity.estimatedAmount?.toString() || '',
    forecastedProfitAmount: opportunity.forecastedProfitAmount?.toString() || '',
    initialInvestmentAmount: opportunity.initialInvestmentAmount?.toString() || '',
    currencyRef: opportunity.currencyRef || '',
    currency: opportunity.currency?.id || opportunity.currencyRef || '',
    closeDate: opportunity.closeDate ? opportunity.closeDate.split('T')[0] : '',

    // Investment-Specific Information
    loanAmount: opportunity.loanAmount?.toString() || '',
    loanInterestRate: opportunity.loanInterestRate?.toString() || '',
    marketValue: opportunity.marketValue?.toString() || '',
    requiredCapitalAmount: opportunity.requiredCapitalAmount?.toString() || '',
    stakePercentage: opportunity.stakePercentage?.toString() || '',
    annualNetColdRent: opportunity.annualNetColdRent?.toString() || '',

    // Relationships
    accountId: opportunity.accountId || '',
    account: opportunity.account?.id || opportunity.accountId || '',

    // Owner Information
    owner: opportunity.ownerEmployee?.id || '',

    // Additional Information
    notesSummary: opportunity.notesSummary || '',

    // Investment Classification
    investmentGroupRef: opportunity.investmentGroupRef || '',
    investmentRoleRef: opportunity.investmentRoleRef || '',
    investmentStakeTypeRef: opportunity.investmentStakeTypeRef || '',
    investmentTypeRef: opportunity.investmentTypeRef || '',

    // Additional Properties
    additionalProperties: opportunity.additionalProperties || {},

    // Process and system fields
    processInstanceId: opportunity.processInstanceId || '',

    // Audit information (readonly)
    activeFrom: opportunity.activeFrom || '',
    activeTo: opportunity.activeTo || '',
    createdAt: opportunity.createdAt || '',
    createdBy: opportunity.createdBy || '',
    updatedAt: opportunity.updatedAt || '',
    updatedBy: opportunity.updatedBy || '',
    synchronizedAt: opportunity.synchronizedAt || ''
  }

  return formValues
}

export const useInvestmentOpportunityData = ({
  businessAppContext
}: UseInvestmentOpportunityDataProps): UseInvestmentOpportunityDataReturn => {
  const [opportunityData, setOpportunityData] = useState<InvestmentOpportunityQueryResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { fetchInvestmentOpportunityData } = useGetInvestmentOpportunityData(businessAppContext)

  // Extract opportunityId from additionalData
  const opportunityId =
    businessAppContext.additionalData?.opportunityId ||
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.opportunityId

  const mapOpportunityToFormValues = useMemo(
    () =>
      (opportunity: InvestmentOpportunityQueryResult): Partial<InvestmentOpportunityFormValues> => {
        // Create a mock response structure for the mapping function
        const mockResponse: InvestmentOpportunityDataResponse = {
          InvestmentOpportunity: [opportunity]
        }
        return mapInvestmentOpportunityDataToFormValues(mockResponse)
      },
    []
  )

  useEffect(() => {
    const loadOpportunityData = async () => {
      if (!opportunityId || !businessAppContext.accessToken) {
        return
      }

      try {
        setLoading(true)
        setError(null)

        const result = await fetchInvestmentOpportunityData({ opportunityId })

        if (result.InvestmentOpportunity?.[0]) {
          setOpportunityData(result.InvestmentOpportunity[0])
        } else {
          setError('Investment Opportunity not found')
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error loading opportunity data'
        console.error('❌ Investment Opportunity Data Hook: Error loading opportunity data:', err)
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    if (opportunityId) {
      loadOpportunityData()
    }
  }, [opportunityId, businessAppContext.accessToken])

  const refetch = useCallback(async () => {
    if (!opportunityId || !businessAppContext.accessToken) {
      return
    }

    try {
      setLoading(true)
      setError(null)
      const result = await fetchInvestmentOpportunityData({ opportunityId })
      if (result.InvestmentOpportunity?.[0]) {
        setOpportunityData(result.InvestmentOpportunity[0])
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error loading opportunity data'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [opportunityId, businessAppContext.accessToken])

  return {
    opportunityData,
    loading,
    error,
    refetch,
    mapOpportunityToFormValues
  }
}
