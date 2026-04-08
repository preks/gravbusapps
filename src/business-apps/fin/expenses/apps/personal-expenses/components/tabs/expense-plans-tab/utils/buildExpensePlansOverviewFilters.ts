import dayjs from 'dayjs'
import { extractCurrencyCode } from '../../../../../../common/utils/currencyUtils'

/** Hasura-style where clause shape produced by useExpensePlanFilters.getFilters and extended here. */
export type ExpensePlansOverviewWhere = {
  _and?: unknown[]
}

function pushAndCondition(filtersObj: ExpensePlansOverviewWhere, condition: unknown): void {
  if (filtersObj._and) {
    filtersObj._and.push(condition)
  } else {
    filtersObj._and = [condition]
  }
}

/**
 * Applies card-widget-specific conditions (total-estimated month, top destination trip region).
 * Mutates `filtersObj` in place to match previous ExpensePlansTab behavior.
 */
export function applyPlanOverviewWidgetFilters(
  filtersObj: ExpensePlansOverviewWhere,
  activeWidget: string | null,
  destinationFilter: string | null
): ExpensePlansOverviewWhere {
  if (activeWidget === 'total-estimated') {
    const today = dayjs()
    const currentMonthStart = today.startOf('month').format('YYYY-MM-DD HH:mm:ss')
    const currentMonthEnd = today.endOf('month').format('YYYY-MM-DD HH:mm:ss')
    const planDateCondition = {
      _and: [{ planDate: { _gte: currentMonthStart } }, { planDate: { _lte: currentMonthEnd } }]
    }
    pushAndCondition(filtersObj, planDateCondition)
  }

  if (activeWidget === 'top-destinations' && destinationFilter && destinationFilter !== 'N/A') {
    const travelRegionConditions: unknown[] = [
      { value: { _eq: destinationFilter } },
      { code: { _eq: destinationFilter } }
    ]
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (uuidRegex.test(destinationFilter)) {
      travelRegionConditions.push({ id: { _eq: destinationFilter } })
    }
    travelRegionConditions.push({ translations: { value: { _eq: destinationFilter } } })
    const destinationCondition = {
      expenseRequestTrip: {
        _and: [
          { pointType: { _eq: 'DESTINATION_POINT' } },
          { isDeleted: { _eq: false } },
          {
            travelRegion: {
              _or: travelRegionConditions
            }
          }
        ]
      }
    }
    pushAndCondition(filtersObj, destinationCondition)
  }

  return filtersObj
}

/**
 * Merges explicit toolbar currency into overview where clause, then widget filters.
 * Mutates the object returned by `getFilters()` in place (same as legacy tab).
 */
export function composeExpensePlansOverviewFilters(
  getFilters: () => ExpensePlansOverviewWhere,
  explicitSelectedCurrencyRef: string | undefined,
  activeWidget: string | null,
  destinationFilter: string | null
): ExpensePlansOverviewWhere {
  const baseFilters = getFilters()
  if (explicitSelectedCurrencyRef) {
    baseFilters._and = baseFilters._and || []
    const selectedCode = extractCurrencyCode(explicitSelectedCurrencyRef)
    baseFilters._and.push({
      _or: [
        { currencyRef: { _eq: explicitSelectedCurrencyRef } },
        { expenseRequest: { currencyRef: { _eq: explicitSelectedCurrencyRef } } },
        ...(selectedCode
          ? [
              { currency: { code: { _eq: selectedCode } } },
              { expenseRequest: { currency: { code: { _eq: selectedCode } } } }
            ]
          : [])
      ]
    })
  }
  return applyPlanOverviewWidgetFilters(baseFilters, activeWidget, destinationFilter)
}
