import { useEntityDataForStatusChange } from '@/common/hooks/useEntityDataForStatusChange'

/**
 * Hook for fetching IRM investment lead data in status change popup
 * Wrapper around generic useEntityDataForStatusChange hook
 */
export const useLeadDataForStatusChange = (leadId: string, accessToken: string) => {
  const { entity, loading, error } = useEntityDataForStatusChange(leadId, accessToken, {
    entityType: 'InvestmentLead',
    includeDeletedFilter: false
  })

  return {
    lead: entity,
    loading,
    error
  }
}
