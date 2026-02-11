import { useState, useEffect, useCallback } from 'react'
import { useGetInvestmentCatalogData } from '@/common/data/investment/hooks/useInvestmentCatalogs'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface RealEstateInvestmentType {
  code: string
  value: string
  id: string
}

interface UseRealEstateInvestmentTypesReturn {
  investmentTypes: RealEstateInvestmentType[]
  loading: boolean
  error: string | null
  catalogData: any
  refetch: () => Promise<void>
}

interface UseRealEstateInvestmentTypesParams {
  accessToken: string
  catalogData?: any
}

export const useRealEstateInvestmentTypes = ({
  accessToken,
  catalogData: providedCatalogData
}: UseRealEstateInvestmentTypesParams): UseRealEstateInvestmentTypesReturn => {
  const [investmentTypes, setInvestmentTypes] = useState<RealEstateInvestmentType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [catalogData, setCatalogData] = useState<any>(providedCatalogData || null)

  const { fetchInvestmentCatalogData } = useGetInvestmentCatalogData({
    accessToken,
    userInfo: {} // Minimal userInfo for catalog access
  } as BusinessAppContextProps)

  const loadRealEstateTypes = useCallback(async () => {
    if (!accessToken) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Use provided catalogData if available, otherwise fetch it
      const data = providedCatalogData || (await fetchInvestmentCatalogData())
      if (!providedCatalogData) {
        setCatalogData(data)
      }

      // Find real estate investment group and get its types
      const realEstateGroup = data.investmentGroups?.find((group: any) => group.code === 'REAL_ESTATE')

      let realEstateTypes: RealEstateInvestmentType[] = []

      if (realEstateGroup) {
        // First try child entries from the group
        if (realEstateGroup.childEntries && realEstateGroup.childEntries.length > 0) {
          realEstateTypes = realEstateGroup.childEntries.map((type: any) => ({
            code: type.code,
            value: type.value,
            id: type.id
          }))
        } else {
          // Fallback: Find types by parent relationship
          const typesFromParent =
            data.investmentTypes?.filter(
              (type: any) => type.parentEntryId === realEstateGroup.id || type.parentEntry?.code === 'REAL_ESTATE'
            ) || []

          realEstateTypes = typesFromParent.map((type: any) => ({
            code: type.code,
            value: type.value,
            id: type.id
          }))
        }
      }

      setInvestmentTypes(realEstateTypes)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load real estate investment types'
      setError(errorMessage)
      console.error('Error fetching real estate investment types:', err)
      setInvestmentTypes([])
    } finally {
      setLoading(false)
    }
  }, [accessToken, providedCatalogData, fetchInvestmentCatalogData])

  useEffect(() => {
    loadRealEstateTypes()
  }, [loadRealEstateTypes])

  // Update local catalogData when providedCatalogData changes
  useEffect(() => {
    if (providedCatalogData) {
      setCatalogData(providedCatalogData)
    }
  }, [providedCatalogData])

  return {
    investmentTypes,
    loading,
    error,
    catalogData,
    refetch: loadRealEstateTypes
  }
}
