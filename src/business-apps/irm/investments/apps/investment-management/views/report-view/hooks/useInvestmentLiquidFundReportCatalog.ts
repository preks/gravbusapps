// Investment Liquid Fund Report Catalog Hook
// Reuses existing catalog integration from investment forms for reports

import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  useGetInvestmentCatalogData,
  InvestmentCatalogData,
  InvestmentLiquidFundTypeEntry
} from '@/common/data/investment/hooks/useInvestmentCatalogs'
import { DynamicTableColumn, transformFormFieldsToTableColumns } from '../utils/liquidFundReportColumnTransformer'

/**
 * Report type definition for liquid fund analytics
 */
export interface LiquidFundReportType {
  code: string
  value: string
  dynamicColumns: DynamicTableColumn[]
  investmentTypes: string[] // Investment types that belong to this liquid fund type
}

interface UseInvestmentLiquidFundReportCatalogParams extends BusinessAppContextProps {
  catalogData?: InvestmentCatalogData | null
}

/**
 * Hook for fetching and processing liquid fund catalog data for reports
 * Follows the same pattern as useInvestmentLiquidFundTypeCatalog but optimized for reports
 */
export const useInvestmentLiquidFundReportCatalog = (params: UseInvestmentLiquidFundReportCatalogParams) => {
  const { catalogData: providedCatalogData, ...context } = params
  const [reportTypes, setReportTypes] = useState<LiquidFundReportType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [catalogData, setCatalogData] = useState<InvestmentCatalogData | null>(providedCatalogData || null)

  const { fetchInvestmentCatalogData } = useGetInvestmentCatalogData(context)

  const loadCatalogData = useCallback(async () => {
    if (!context.accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Use provided catalogData if available, otherwise fetch it
      const data = providedCatalogData || (await fetchInvestmentCatalogData())
      if (!providedCatalogData) {
        setCatalogData(data)
      }

      // Transform liquid fund types into report types with dynamic columns
      const transformedReportTypes: LiquidFundReportType[] = data.investmentLiquidFundTypes.map(
        (liquidFundType: InvestmentLiquidFundTypeEntry) => {
          // Generate dynamic columns from the form field definition
          const dynamicColumns = liquidFundType.objectValue
            ? transformFormFieldsToTableColumns(liquidFundType.objectValue)
            : []

          // Dynamic columns generated from form field definitions

          // Find investment types that belong to this liquid fund type
          const relatedInvestmentTypes = data.investmentTypes
            .filter(invType => invType.parentEntryId === liquidFundType.parentEntryId)
            .map(invType => invType.code)

          return {
            code: liquidFundType.code,
            value: liquidFundType.value,
            dynamicColumns,
            investmentTypes: relatedInvestmentTypes
          }
        }
      )

      setReportTypes(transformedReportTypes)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load catalog data'
      setError(errorMessage)
      console.error('Error fetching liquid fund report catalog:', err)
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, providedCatalogData, fetchInvestmentCatalogData])

  useEffect(() => {
    loadCatalogData()
  }, [loadCatalogData])

  // Update local catalogData when providedCatalogData changes
  useEffect(() => {
    if (providedCatalogData) {
      setCatalogData(providedCatalogData)
    }
  }, [providedCatalogData])

  /**
   * Get dynamic columns for a specific liquid fund type
   * Reuses the same logic as the investment record header configuration
   */
  const getDynamicColumnsForType = useCallback(
    (liquidFundTypeCode: string): DynamicTableColumn[] => {
      if (!catalogData) return []

      const liquidFundType = catalogData.investmentLiquidFundTypes.find(type => type.code === liquidFundTypeCode)

      if (liquidFundType?.objectValue) {
        return transformFormFieldsToTableColumns(liquidFundType.objectValue)
      }

      return []
    },
    [catalogData]
  )

  /**
   * Get all available liquid fund types for filtering
   */
  const getAvailableLiquidFundTypes = useCallback((): InvestmentLiquidFundTypeEntry[] => {
    return catalogData?.investmentLiquidFundTypes || []
  }, [catalogData])

  /**
   * Get report type by investment type codes
   * Useful for determining which dynamic columns to show based on the data
   */
  const getReportTypeByInvestmentTypes = useCallback(
    (investmentTypeCodes: string[]): LiquidFundReportType | null => {
      return (
        reportTypes.find(reportType =>
          reportType.investmentTypes.some(invType => investmentTypeCodes.includes(invType))
        ) || null
      )
    },
    [reportTypes]
  )

  return {
    reportTypes,
    isLoading,
    error,
    catalogData,
    refetch: loadCatalogData,
    getDynamicColumnsForType,
    getAvailableLiquidFundTypes,
    getReportTypeByInvestmentTypes
  }
}
