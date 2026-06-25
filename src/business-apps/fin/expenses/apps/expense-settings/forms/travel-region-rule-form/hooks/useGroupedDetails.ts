import { useCallback } from 'react'
import { TravelRegionRuleFormData, SmartColumnGroup, CatalogOption } from '../types'

interface UseGroupedDetailsProps {
  formData: TravelRegionRuleFormData
  countries: CatalogOption[]
  currencies: CatalogOption[]
}

export const useGroupedDetails = ({ formData, countries, currencies }: UseGroupedDetailsProps) => {
  const groupedDetails = useCallback((): SmartColumnGroup[] => {
    const groups: { [key: string]: SmartColumnGroup } = {}

    formData.details.forEach((detail, index) => {
      // Use unique identifier (id or index) to ensure each detail has a unique group key
      const uniqueId = detail.id || `temp-${index}`
      const groupKey = `${uniqueId}-${detail.countryRef}-${detail.travelRegion}-${detail.currencyRef}-${detail.home}-${detail.activeFrom}-${detail.activeTo || 'ongoing'}`

      if (!groups[groupKey]) {
        const country = countries.find(c => c.id === detail.countryRef)
        const currency = currencies.find(c => c.id === detail.currencyRef)

        groups[groupKey] = {
          key: groupKey,
          stableKey: uniqueId,
          countryRef: detail.countryRef,
          countryName: country?.value || 'Unknown',
          travelRegion: detail.travelRegion,
          currencyRef: detail.currencyRef,
          currencyCode: currency?.code || 'USD',
          homeFlag: detail.home,
          activeFrom: detail.activeFrom,
          activeTo: detail.activeTo,
          amounts: [],
          detailIds: []
        }
      }

      // Add amounts to the group
      if (detail.amounts && Array.isArray(detail.amounts) && detail.amounts.length > 0) {
        detail.amounts.forEach((amount, amountIndex) => {
          groups[groupKey].amounts[amountIndex] ??= amount
        })
      } else if (detail.amounts && !Array.isArray(detail.amounts)) {
        if (groups[groupKey].amounts.length === 0) {
          groups[groupKey].amounts.push(detail.amounts)
        }
      } else {
        if (groups[groupKey].amounts.length === 0) {
          groups[groupKey].amounts.push(0)
        }
      }

      groups[groupKey].detailIds.push(uniqueId)
    })

    // Ensure each group has at least one amount
    Object.values(groups).forEach(group => {
      if (group.amounts.length === 0) {
        group.amounts.push(0)
      }
    })

    return Object.values(groups)
  }, [formData.details, countries, currencies])

  return { groupedDetails }
}
