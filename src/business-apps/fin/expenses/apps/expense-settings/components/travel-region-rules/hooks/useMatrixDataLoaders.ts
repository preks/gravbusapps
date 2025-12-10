import { useCallback } from 'react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { useGetAllowanceRegionRules, useGetTravelRegions } from '../../../queries'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface TravelRegion {
  id: string
  code: string
  value: string
  objectValue?: {
    destination_country_ref?: string
  }
}

interface ValidityPeriod {
  id: string
  activeFrom: string
  activeTo: string | null
  currencyCode: string
  hasConflict: boolean
  ruleId: string
}

export interface EditableAllowanceRegionRule {
  id: string
  code: string
  name: string
  activeFrom: string
  activeTo: string | null
  ruleOrder: number
  version: number
  details: any[]
  validityPeriods: ValidityPeriod[]
}

interface CurrencyOption {
  id: string
  code: string
  value: string
}

interface UseMatrixDataLoadersProps {
  accessToken: string
  travelRegionSetId: string
}

export const useMatrixDataLoaders = ({ accessToken, travelRegionSetId }: UseMatrixDataLoadersProps) => {
  const catalogClient = useCatalogManagerClient(accessToken)

  const { fetchAllowanceRegionRules: fetchRulesQuery } = useGetAllowanceRegionRules({
    accessToken
  } as BusinessAppContextProps)

  const { fetchTravelRegionCount, fetchTravelRegions: fetchRegionsQuery } = useGetTravelRegions({
    accessToken
  } as BusinessAppContextProps)

  // Load currencies from catalog
  const loadCurrencies = useCallback(async (): Promise<CurrencyOption[]> => {
    try {
      const response = await catalogClient.getCatalogEntriesList(
        { catalogIdentifier: 'Currency', version: 'v1' },
        { limit: 100, offset: 0, returnTotalRecords: true }
      )
      return response.data.map((item: any) => ({
        id: item.id,
        code: item.code,
        value: item.value
      }))
    } catch (err) {
      console.error('Error loading currencies:', err)
      return []
    }
  }, [catalogClient])

  // Load travel regions with pagination and search
  const loadTravelRegions = useCallback(
    async (page: number, limit: number, search: string = ''): Promise<TravelRegion[]> => {
      const offset = (page - 1) * limit
      const regions = await fetchRegionsQuery({
        parentEntryId: travelRegionSetId,
        limit,
        offset,
        search
      })
      return regions
    },
    [fetchRegionsQuery, travelRegionSetId]
  )

  // Load allowance region rules
  const loadAllowanceRegionRules = useCallback(async (): Promise<{
    rules: EditableAllowanceRegionRule[]
    regionsWithDetails: TravelRegion[]
  }> => {
    try {
      const result = await fetchRulesQuery({ travelRegionSetId })

      // Extract all unique travel regions that have details
      const regionsWithDetailsMap = new Map<string, TravelRegion>()
      result.AllowanceRegionRule.forEach((rule: any) => {
        rule.allowanceRegionRuleDetail?.forEach((detail: any) => {
          if (detail.travelRegion && detail.travelRegion.id) {
            const regionId = detail.travelRegion.id
            if (!regionsWithDetailsMap.has(regionId)) {
              regionsWithDetailsMap.set(regionId, {
                id: detail.travelRegion.id,
                code: detail.travelRegion.code,
                value: detail.travelRegion.value,
                objectValue: detail.travelRegion.objectValue
              })
            }
          }
        })
      })
      const regionsWithDetails = Array.from(regionsWithDetailsMap.values())

      const rules: EditableAllowanceRegionRule[] = result.AllowanceRegionRule.map((rule: any) => {
        const details = rule.allowanceRegionRuleDetail.map((detail: any) => {
          return {
            ...detail,
            travelRegion: detail.travelRegion
          }
        })

        // Extract validity periods from details
        const periodMap = new Map<string, ValidityPeriod>()

        details.forEach((detail: any) => {
          const periodKey = `${detail.activeFrom}-${detail.activeTo || 'null'}`
          if (!periodMap.has(periodKey)) {
            periodMap.set(periodKey, {
              id: periodKey,
              activeFrom: detail.activeFrom,
              activeTo: detail.activeTo,
              currencyCode: detail.currency?.code || 'EUR',
              hasConflict: false,
              ruleId: rule.id
            })
          } else {
            const existing = periodMap.get(periodKey)!
            if (existing.currencyCode !== (detail.currency?.code || 'EUR')) {
              existing.hasConflict = true
            }
          }
        })

        return {
          id: rule.id,
          code: rule.code,
          name: rule.name,
          activeFrom: rule.activeFrom,
          activeTo: rule.activeTo,
          ruleOrder: rule.ruleOrder,
          version: rule.version,
          details,
          validityPeriods: Array.from(periodMap.values())
        }
      })

      return { rules, regionsWithDetails }
    } catch (err) {
      console.error('Error loading allowance region rules:', err)
      return { rules: [], regionsWithDetails: [] }
    }
  }, [fetchRulesQuery, travelRegionSetId])

  return {
    loadCurrencies,
    loadTravelRegions,
    loadAllowanceRegionRules,
    fetchTravelRegionCount
  }
}
