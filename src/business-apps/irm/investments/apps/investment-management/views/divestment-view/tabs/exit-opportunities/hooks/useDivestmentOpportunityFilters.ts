import { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useFilterGroups } from '@/common/data/common/hooks/useFilterGroups'
import {
  DIVESTMENT_OPPORTUNITY_DESCRIPTORS,
  DIVESTMENT_BASE_WHERE_PARTS
} from '../../../config/divestmentOpportunityDescriptors'

/**
 * Descriptor-driven filter hook for divestment opportunity views.
 * Uses useFilterGroups internally and adapts the result to the
 * format expected by OpportunityLayout's filterDataHook.
 */
export const useDivestmentOpportunityFilters = (context: BusinessAppContextProps) => {
  const filterGroups = useFilterGroups(context, 'InvestmentOpportunity', DIVESTMENT_OPPORTUNITY_DESCRIPTORS, {
    limit: 100,
    baseWhereParts: DIVESTMENT_BASE_WHERE_PARTS
  })

  return useMemo(() => {
    const { filterData } = filterGroups

    const owners = filterData['ownerEmployeeIds']?.options || []
    const stages = filterData['opportunityPipelineStageIds']?.options || []
    const pipelines = filterData['opportunityPipelineIds']?.options || []
    const accounts = filterData['accountIds']?.options || []
    const statuses = filterData['opportunityStatusIds']?.options || []
    const forecasts = filterData['opportunityForecastIds']?.options || []

    const amountRange = { min: 0, max: 1000000 }

    return { owners, stages, pipelines, accounts, statuses, forecasts, amountRange }
  }, [filterGroups])
}
