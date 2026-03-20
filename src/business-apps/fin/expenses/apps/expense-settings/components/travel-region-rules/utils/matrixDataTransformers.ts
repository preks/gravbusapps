import { EditableCell, EditableAllowanceRegionRule } from '../types'

interface TravelRegion {
  id: string
  code: string
  value: string
}

/**
 * Convert rule details to editable cells
 */
export const convertToEditableCells = (
  rules: EditableAllowanceRegionRule[],
  regions: TravelRegion[]
): EditableCell[] => {
  const cells: EditableCell[] = []

  rules.forEach(rule => {
    regions.forEach(region => {
      // Find existing details for this rule-region combination
      // Match strictly by travel region ID only
      const existingDetails =
        rule.details?.filter(detail => {
          return detail.travelRegion?.id === region.id
        }) || []

      if (existingDetails.length > 0) {
        // Create cells for existing details
        existingDetails.forEach(detail => {
          // Find the matching validity period for this detail
          const periodKey = `${detail.activeFrom}-${detail.activeTo || 'null'}`
          const matchingPeriod = rule.validityPeriods.find(p => p.id === periodKey)

          cells.push({
            id: detail.id,
            travelRegionId: region.id,
            allowanceRegionRuleId: rule.id,
            amount: detail.amount,
            home: detail.home || false,
            currencyCode: detail.currency?.code || 'EUR',
            currencyRef: detail.currency?.id || detail.currencyRef,
            countryRef: detail.country?.id || detail.countryRef,
            activeFrom: detail.activeFrom,
            activeTo: detail.activeTo,
            version: detail.version,
            isNew: false,
            isModified: false,
            validityPeriodId: matchingPeriod?.id
          })
        })
      }
    })
  })

  return cells
}

/**
 * Validate currency consistency for each region
 */
export const validateCurrencies = (cells: EditableCell[]): EditableCell[] => {
  const regionCurrencies: { [regionId: string]: Set<string> } = {}

  // Group currencies by region
  cells.forEach(cell => {
    if (cell.amount > 0) {
      if (!regionCurrencies[cell.travelRegionId]) {
        regionCurrencies[cell.travelRegionId] = new Set()
      }
      regionCurrencies[cell.travelRegionId].add(cell.currencyCode)
    }
  })

  // Mark cells with currency conflicts
  const finalCells = cells.map(cell => {
    const regionCurrenciesSet = regionCurrencies[cell.travelRegionId]
    const hasConflict = regionCurrenciesSet && regionCurrenciesSet.size > 1

    return {
      ...cell,
      hasError: hasConflict,
      errorMessage: hasConflict ? 'Currency mismatch in this region' : undefined
    }
  })

  return finalCells
}
