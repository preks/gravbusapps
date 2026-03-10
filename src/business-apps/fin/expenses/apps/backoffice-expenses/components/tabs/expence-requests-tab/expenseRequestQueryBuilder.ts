import { useCallback } from 'react'
import dayjs from 'dayjs'
import {
  buildExpenseRequestSearchOrConditions,
  buildSearchCondition as buildSearchConditionUtil,
  buildNumericRangeCondition
} from '../../../hooks/queryFilterUtils'
import {
  buildDateRangeCondition as buildDateRangeConditionShared,
  buildRequestEffectiveDateFilter,
  buildRequestTypeFilter
} from '../../../hooks/backofficeSharedOverview'

const formatDatePickerRange = (range: any[] | null): { from?: string; to?: string } | null => {
  if (!range?.[0] && !range?.[1]) return null
  return {
    from: range?.[0] ? dayjs(range[0]).format('YYYY-MM-DD') : undefined,
    to: range?.[1] ? dayjs(range[1]).format('YYYY-MM-DD') : undefined
  }
}

const pushIfPresent = (conditions: any[], value: any) => {
  if (value) conditions.push(value)
}

interface QueryFilterState {
  readonly statusFilter: string[]
  readonly employeeFilter: string
  readonly amountMinFilter: string
  readonly amountMaxFilter: string
  readonly departmentId: string
  readonly currencyRef: string
  readonly startFrom?: string
  readonly startTo?: string
  readonly endFrom?: string
  readonly endTo?: string
  readonly effectiveDateRange: any[] | null
  readonly requestDateRange: any[] | null
  readonly requestTypeFilterLocal: string[]
  readonly searchText: string
}

export function useExpenseRequestQueryBuilder(state: QueryFilterState) {
  const {
    statusFilter,
    employeeFilter,
    amountMinFilter,
    amountMaxFilter,
    departmentId,
    currencyRef,
    startFrom,
    startTo,
    endFrom,
    endTo,
    effectiveDateRange,
    requestDateRange,
    requestTypeFilterLocal,
    searchText
  } = state

  const buildAmountCondition = useCallback((): any => {
    const result = buildNumericRangeCondition(amountMinFilter, amountMaxFilter, range => ({
      reimbursableAmount: range
    }))
    return result.length > 0 ? result[0] : null
  }, [amountMinFilter, amountMaxFilter])

  const buildAllFilterConditions = useCallback((): any[] => {
    const conditions: any[] = []

    conditions.push(
      statusFilter?.length > 0 ? { status: { _in: statusFilter } } : { status: { _nin: ['DISCARDED', 'CREATED'] } }
    )

    if (employeeFilter) conditions.push({ employee: { id: { _eq: employeeFilter } } })
    pushIfPresent(conditions, buildAmountCondition())
    if (departmentId)
      conditions.push({ employee: { employeePosition: { organizationalUnitId: { _eq: departmentId } } } })
    if (currencyRef) conditions.push({ currencyRef: { _eq: currencyRef } })

    const startCond = buildDateRangeConditionShared(startFrom, startTo)
    if (startCond) conditions.push({ startDate: startCond })
    const endCond = buildDateRangeConditionShared(endFrom, endTo)
    if (endCond) conditions.push({ endDate: endCond })

    const effRange = formatDatePickerRange(effectiveDateRange)
    if (effRange) pushIfPresent(conditions, buildRequestEffectiveDateFilter(effRange))

    const reqRange = formatDatePickerRange(requestDateRange)
    if (reqRange) {
      const reqCond = buildDateRangeConditionShared(reqRange.from, reqRange.to)
      if (reqCond) conditions.push({ requestDate: reqCond })
    }

    pushIfPresent(conditions, buildRequestTypeFilter(requestTypeFilterLocal))
    conditions.push(...buildSearchConditionUtil(searchText ?? '', buildExpenseRequestSearchOrConditions))

    return conditions
  }, [
    statusFilter,
    employeeFilter,
    buildAmountCondition,
    departmentId,
    currencyRef,
    startFrom,
    startTo,
    endFrom,
    endTo,
    effectiveDateRange,
    requestDateRange,
    requestTypeFilterLocal,
    searchText
  ])

  const buildQueryConditions = useCallback(() => {
    const conditions: any[] = [{ isDeleted: { _eq: false } }, ...buildAllFilterConditions()]
    return conditions.length === 1 ? conditions[0] : { _and: conditions }
  }, [buildAllFilterConditions])

  return { buildQueryConditions }
}
