import { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestmentAccounts } from '@/common/data/investment/hooks/useInvestmentAccounts'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

interface FilterOptions {
  owners: Array<{ id: string; label: string }>
  industries: Array<{ id: string; label: string }>
  legalForms: Array<{ id: string; label: string }>
  companySizes: Array<{ id: string; label: string }>
  revenueBands: Array<{ id: string; label: string }>
  isLoading: boolean
}

export const useAccountFilterOptions = (context: BusinessAppContextProps): FilterOptions => {
  const { accessToken } = context
  const { fetchInvestmentAccounts } = useGetInvestmentAccounts(context)
  const catalogClient = useCatalogManagerClient(accessToken)

  const [owners, setOwners] = useState<Array<{ id: string; label: string }>>([])
  const [industries, setIndustries] = useState<Array<{ id: string; label: string }>>([])
  const [legalForms, setLegalForms] = useState<Array<{ id: string; label: string }>>([])
  const [companySizes, setCompanySizes] = useState<Array<{ id: string; label: string }>>([])
  const [revenueBands, setRevenueBands] = useState<Array<{ id: string; label: string }>>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadFilterOptions = async () => {
      if (!accessToken) return

      try {
        setIsLoading(true)

        // Fetch unique owners from accounts
        const accountsData = await fetchInvestmentAccounts({
          limit: 1000,
          offset: 0
        })

        // Extract unique owners
        const uniqueOwners = new Map<string, string>()
        accountsData.InvestmentAccount?.forEach(account => {
          if (account.ownerEmployee?.id) {
            const name =
              account.ownerEmployee.displayName ||
              `${account.ownerEmployee.firstName || ''} ${account.ownerEmployee.lastName || ''}`.trim()
            if (name) {
              uniqueOwners.set(account.ownerEmployee.id, name)
            }
          }
        })

        setOwners(
          Array.from(uniqueOwners.entries())
            .map(([id, label]) => ({ id, label }))
            .sort((a, b) => a.label.localeCompare(b.label))
        )

        // Fetch catalog entries for Industry Class
        try {
          const industryResponse = await catalogClient.getCatalogEntriesList(
            { catalogIdentifier: 'IndustryClass', version: 'v1' },
            { limit: 1000, offset: 0, returnTotalRecords: false, includeChildCatalogEntries: false }
          )
          const items = (industryResponse?.data || []).map((entry: any) => ({
            id: entry.id,
            label: entry.value || entry.code || ''
          }))
          setIndustries(items.filter((opt: any) => opt.label).sort((a: any, b: any) => a.label.localeCompare(b.label)))
        } catch (err) {
          console.error('Error fetching industry catalog:', err)
          setIndustries([])
        }

        // Fetch catalog entries for Legal Form
        try {
          const legalFormResponse = await catalogClient.getCatalogEntriesList(
            { catalogIdentifier: 'LegalForm', version: 'v1' },
            { limit: 1000, offset: 0, returnTotalRecords: false, includeChildCatalogEntries: false }
          )
          const items = (legalFormResponse?.data || []).map((entry: any) => ({
            id: entry.id,
            label: entry.value || entry.code || ''
          }))
          setLegalForms(items.filter((opt: any) => opt.label).sort((a: any, b: any) => a.label.localeCompare(b.label)))
        } catch (err) {
          console.error('Error fetching legal form catalog:', err)
          setLegalForms([])
        }

        // Fetch catalog entries for Company Size
        try {
          const companySizeResponse = await catalogClient.getCatalogEntriesList(
            { catalogIdentifier: 'CompanySize', version: 'v1' },
            { limit: 1000, offset: 0, returnTotalRecords: false, includeChildCatalogEntries: false }
          )
          const items = (companySizeResponse?.data || []).map((entry: any) => ({
            id: entry.id,
            label: entry.value || entry.code || ''
          }))
          setCompanySizes(
            items.filter((opt: any) => opt.label).sort((a: any, b: any) => a.label.localeCompare(b.label))
          )
        } catch (err) {
          console.error('Error fetching company size catalog:', err)
          setCompanySizes([])
        }

        // Fetch catalog entries for Revenue Band
        try {
          const revenueBandResponse = await catalogClient.getCatalogEntriesList(
            { catalogIdentifier: 'AccountAnnualRevenueBand', version: 'v1' },
            { limit: 1000, offset: 0, returnTotalRecords: false, includeChildCatalogEntries: false }
          )
          const items = (revenueBandResponse?.data || []).map((entry: any) => ({
            id: entry.id,
            label: entry.value || entry.code || ''
          }))
          setRevenueBands(
            items.filter((opt: any) => opt.label).sort((a: any, b: any) => a.label.localeCompare(b.label))
          )
        } catch (err) {
          console.error('Error fetching revenue band catalog:', err)
          setRevenueBands([])
        }
      } catch (error) {
        console.error('Error loading filter options:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadFilterOptions()
  }, [accessToken, fetchInvestmentAccounts, catalogClient])

  return {
    owners,
    industries,
    legalForms,
    companySizes,
    revenueBands,
    isLoading
  }
}
