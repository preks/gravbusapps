import { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestmentOpportunities } from '@/common/data/investment/hooks/useInvestmentOpportunities'
import { useGetInvestmentAccounts } from '@/common/data/investment/hooks/useInvestmentAccounts'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

interface FilterOptions {
  owners: Array<{ id: string; label: string }>
  pipelines: Array<{ id: string; label: string }>
  stages: Array<{ id: string; label: string }>
  statuses: Array<{ id: string; label: string }>
  accounts: Array<{ id: string; label: string }>
  isLoading: boolean
}

export const useOpportunityFilterOptions = (context: BusinessAppContextProps): FilterOptions => {
  const { accessToken } = context
  const { fetchInvestmentOpportunities } = useGetInvestmentOpportunities(context)
  const { fetchInvestmentAccounts } = useGetInvestmentAccounts(context)
  const catalogClient = useCatalogManagerClient(accessToken)

  const [owners, setOwners] = useState<Array<{ id: string; label: string }>>([])
  const [pipelines, setPipelines] = useState<Array<{ id: string; label: string }>>([])
  const [stages, setStages] = useState<Array<{ id: string; label: string }>>([])
  const [statuses, setStatuses] = useState<Array<{ id: string; label: string }>>([])
  const [accounts, setAccounts] = useState<Array<{ id: string; label: string }>>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadFilterOptions = async () => {
      if (!accessToken) return

      try {
        setIsLoading(true)

        // Fetch opportunities for unique owners
        const opportunitiesData = await fetchInvestmentOpportunities({
          limit: 1000,
          offset: 0
        })

        // Extract unique owners
        const uniqueOwners = new Map<string, string>()
        opportunitiesData.InvestmentOpportunity?.forEach(opportunity => {
          if (opportunity.ownerEmployee?.id) {
            const name =
              opportunity.ownerEmployee.displayName ||
              `${opportunity.ownerEmployee.firstName || ''} ${opportunity.ownerEmployee.lastName || ''}`.trim()
            if (name) {
              uniqueOwners.set(opportunity.ownerEmployee.id, name)
            }
          }
        })

        setOwners(
          Array.from(uniqueOwners.entries())
            .map(([id, label]) => ({ id, label }))
            .sort((a, b) => a.label.localeCompare(b.label))
        )

        // Fetch catalog entries for Pipelines
        try {
          const pipelineResponse = await catalogClient.getCatalogEntriesList(
            { catalogIdentifier: 'OpportunityPipeline', version: 'v1' },
            { limit: 1000, offset: 0, returnTotalRecords: false, includeChildCatalogEntries: false }
          )
          const items = (pipelineResponse?.data || []).map((entry: any) => ({
            id: entry.id,
            label: entry.value || entry.code || ''
          }))
          setPipelines(items.filter((opt: any) => opt.label).sort((a: any, b: any) => a.label.localeCompare(b.label)))
        } catch (err) {
          console.error('Error fetching pipeline catalog:', err)
          setPipelines([])
        }

        // Fetch catalog entries for Stages
        try {
          const stageResponse = await catalogClient.getCatalogEntriesList(
            { catalogIdentifier: 'OpportunityPipelineStage', version: 'v1' },
            { limit: 1000, offset: 0, returnTotalRecords: false, includeChildCatalogEntries: false }
          )
          const items = (stageResponse?.data || []).map((entry: any) => ({
            id: entry.id,
            label: entry.value || entry.code || ''
          }))
          setStages(items.filter((opt: any) => opt.label).sort((a: any, b: any) => a.label.localeCompare(b.label)))
        } catch (err) {
          console.error('Error fetching stage catalog:', err)
          setStages([])
        }

        // Fetch catalog entries for Statuses
        try {
          const statusResponse = await catalogClient.getCatalogEntriesList(
            { catalogIdentifier: 'OpportunityStatus', version: 'v1' },
            { limit: 1000, offset: 0, returnTotalRecords: false, includeChildCatalogEntries: false }
          )
          const items = (statusResponse?.data || []).map((entry: any) => ({
            id: entry.id,
            label: entry.value || entry.code || ''
          }))
          setStatuses(items.filter((opt: any) => opt.label).sort((a: any, b: any) => a.label.localeCompare(b.label)))
        } catch (err) {
          console.error('Error fetching status catalog:', err)
          setStatuses([])
        }

        // Fetch accounts
        const accountsData = await fetchInvestmentAccounts({
          limit: 1000,
          offset: 0
        })

        const uniqueAccounts = new Map<string, string>()
        accountsData.InvestmentAccount?.forEach(account => {
          if (account.id && account.name) {
            uniqueAccounts.set(account.id, account.name)
          }
        })

        setAccounts(
          Array.from(uniqueAccounts.entries())
            .map(([id, label]) => ({ id, label }))
            .sort((a, b) => a.label.localeCompare(b.label))
        )
      } catch (error) {
        console.error('Error loading filter options:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadFilterOptions()
  }, [accessToken, fetchInvestmentOpportunities, fetchInvestmentAccounts, catalogClient])

  return {
    owners,
    pipelines,
    stages,
    statuses,
    accounts,
    isLoading
  }
}
