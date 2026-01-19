import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Calendar, Spin, message, Alert, ConfigProvider } from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetExpenseItems, ExpenseItem } from '../../../hooks/useGetExpenseItems'
import { useGetExpensePlans, ExpensePlan } from '../../../hooks/useGetExpensePlans'
import { useGetExpenseRequests, ExpenseRequest } from '../../../hooks/useGetExpenseRequests'
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { useDebounce } from '@/common/hooks/useDebounce'
//
import CalendarHeader from './components/CalendarHeader'
import DetailsSheet from './components/DetailsSheet'
import FiltersBar from './components/FiltersBar'
import DayCellEvents from './components/DayCellEvents'
import { useCalendarLocale } from './hooks/useCalendarLocale'
import { useStripRcPickerTitle } from './hooks/useStripRcPickerTitle'
import type { CalendarExpenseItem } from './types'
import { toCalendarItemFromExpense, toCalendarItemFromPlan, toCalendarItemFromRequest } from './utils/transform'

// Import dayjs locales and plugins
import 'dayjs/locale/en'
import 'dayjs/locale/de'
import 'dayjs/locale/ro'
import localeData from 'dayjs/plugin/localeData'
import updateLocale from 'dayjs/plugin/updateLocale'
dayjs.extend(localeData)
dayjs.extend(updateLocale)

//

// Types moved to ./types

// Locale moved to hooks/useCalendarLocale

// Status color is handled via nw-design-system Badge variants using existing mapping helpers

const ExpenseCalendarTab: React.FC<BusinessAppContextProps> = props => {
  // Get user locale and configure dayjs + Ant Design locales
  const userLocale = getCurrentActiveUserLocale() || 'en-US'
  const { dayjsLocale, antdLocale } = useCalendarLocale(userLocale)
  useEffect(() => {
    setCalendarValue(prev => prev.locale(dayjsLocale))
  }, [dayjsLocale])

  // Track calendar value to trigger updates when month changes
  const [calendarValue, setCalendarValue] = useState<Dayjs>(dayjs().locale(dayjsLocale))

  // Debounce calendar value to reduce API calls when rapidly changing months
  const debouncedCalendarValue = useDebounce(calendarValue, 300)

  // Helper to get month range for filtering
  const getMonthRange = useCallback((value: Dayjs) => {
    const start = value.startOf('month')
    const end = value.endOf('month')
    return {
      start: start.format('YYYY-MM-DD'),
      end: end.format('YYYY-MM-DD')
    }
  }, [])

  // Month-level cache to store calendar items per month
  const monthCacheRef = useRef<
    Map<
      string,
      {
        items: CalendarExpenseItem[]
        plans: CalendarExpenseItem[]
        requests: CalendarExpenseItem[]
      }
    >
  >(new Map())

  // Helper to get cache key for a month
  const getMonthCacheKey = useCallback((value: Dayjs) => {
    return value.format('YYYY-MM')
  }, [])

  // Check if current month data is cached (computed on each render)
  const monthKey = getMonthCacheKey(debouncedCalendarValue)
  const cachedMonthData = monthCacheRef.current.get(monthKey)
  const isAllCached = !!(cachedMonthData?.items && cachedMonthData?.plans && cachedMonthData?.requests)
  const {
    items: rawExpenseItems,
    isLoading: isLoadingExpenses,
    error: fetchExpensesErrorHook,
    fetchItems: fetchExpenseHookItems
  } = useGetExpenseItems(props, { autoFetch: false })
  const [calendarItems, setCalendarItems] = useState<CalendarExpenseItem[]>([])
  const [expensesError, setExpensesError] = useState<string | null>(null)

  const {
    items: rawExpensePlans,
    isLoading: isLoadingPlans,
    error: fetchPlansErrorHook,
    fetchItems: fetchPlansHookItems
  } = useGetExpensePlans(props)
  const [calendarPlanItems, setCalendarPlanItems] = useState<CalendarExpenseItem[]>([])
  const [plansError, setPlansError] = useState<string | null>(null)

  const {
    items: rawExpenseRequests,
    isLoading: isLoadingRequests,
    error: fetchRequestsErrorHook,
    fetchItems: fetchRequestsHookItems
  } = useGetExpenseRequests(props)
  const [calendarRequestItems, setCalendarRequestItems] = useState<CalendarExpenseItem[]>([])
  const [requestsError, setRequestsError] = useState<string | null>(null)

  const [activeFilters, setActiveFilters] = useState<{
    expense: boolean
    plan: boolean
    request: boolean
  }>({
    expense: true,
    plan: true,
    request: true
  })

  const [selectedItemForDetails, setSelectedItemForDetails] = useState<ExpenseItem | null>(null)
  const [selectedPlanForDetails, setSelectedPlanForDetails] = useState<ExpensePlan | null>(null)
  const [selectedRequestForDetails, setSelectedRequestForDetails] = useState<ExpenseRequest | null>(null)
  const [isDetailsDrawerVisible, setIsDetailsDrawerVisible] = useState<boolean>(false)

  const handleCalendarItemClick = (item: CalendarExpenseItem) => {
    if (item.type === 'expense') {
      const fullExpenseItem = rawExpenseItems?.find(ei => ei.id === item.id)
      if (fullExpenseItem) {
        setSelectedItemForDetails(fullExpenseItem)
        setSelectedPlanForDetails(null)
        setSelectedRequestForDetails(null)
        setIsDetailsDrawerVisible(true)
      }
    } else if (item.type === 'plan') {
      const fullExpensePlan = rawExpensePlans?.find(ep => ep.id === item.id)
      if (fullExpensePlan) {
        setSelectedPlanForDetails(fullExpensePlan)
        setSelectedItemForDetails(null)
        setSelectedRequestForDetails(null)
        setIsDetailsDrawerVisible(true)
      }
    } else if (item.type === 'request') {
      const fullExpenseRequest = rawExpenseRequests?.find(er => er.id === item.id)
      if (fullExpenseRequest) {
        setSelectedRequestForDetails(fullExpenseRequest)
        setSelectedItemForDetails(null)
        setSelectedPlanForDetails(null)
        setIsDetailsDrawerVisible(true)
      }
    }
  }

  const handleCloseDrawer = () => {
    setIsDetailsDrawerVisible(false)
    setSelectedItemForDetails(null)
    setSelectedPlanForDetails(null)
  }

  const toggleFilter = (filterType: 'expense' | 'plan' | 'request') => {
    setActiveFilters(prevFilters => ({
      ...prevFilters,
      [filterType]: !prevFilters[filterType]
    }))
  }

  useEffect(() => {
    // Check cache first - if cached, use it and skip fetch
    if (cachedMonthData?.items) {
      setCalendarItems(cachedMonthData.items)
      return
    }

    const { start, end } = getMonthRange(debouncedCalendarValue)
    fetchExpenseHookItems(
      '', // search
      1, // page
      10000, // pageSize - fetch all items for the month (calendar needs complete data)
      {
        expenseDateStart: start,
        expenseDateEnd: end
      },
      null, // sortField
      null // sortOrder
    ).catch(err => {
      console.error('Failed to fetch expense items:', err)
      setExpensesError(err.message || 'Failed to fetch expense items')
    })
  }, [fetchExpenseHookItems, debouncedCalendarValue, getMonthRange, cachedMonthData])

  useEffect(() => {
    if (fetchExpensesErrorHook) {
      setExpensesError(fetchExpensesErrorHook)
      message.error(`Error fetching expense items: ${fetchExpensesErrorHook}`)
    } else {
      setExpensesError(null)
    }
  }, [fetchExpensesErrorHook])

  useEffect(() => {
    // Check cache first - if cached, use it and skip fetch
    if (cachedMonthData?.plans) {
      setCalendarPlanItems(cachedMonthData.plans)
      return
    }

    const { start, end } = getMonthRange(debouncedCalendarValue)
    const filters = {
      _and: [
        {
          _or: [
            {
              _and: [
                { requestTypeRef: { _eq: 'ExpenseRequestType:v1:EXPENSES' } },
                { expensePlanItem: { expenseDate: { _gte: start, _lte: end } } }
              ]
            },
            {
              _and: [
                { requestTypeRef: { _eq: 'ExpenseRequestType:v1:TRIP' } },
                { startDate: { _gte: start, _lte: end } }
              ]
            }
          ]
        }
      ]
    }
    fetchPlansHookItems(filters, 1, 10000).catch(err => {
      console.error('Failed to fetch expense plans:', err)
      setPlansError(err.message || 'Failed to fetch expense plans')
    })
  }, [fetchPlansHookItems, debouncedCalendarValue, getMonthRange, cachedMonthData])

  useEffect(() => {
    if (fetchPlansErrorHook) {
      setPlansError(fetchPlansErrorHook)
      message.error(`Error fetching expense plans: ${fetchPlansErrorHook}`)
    } else {
      setPlansError(null)
    }
  }, [fetchPlansErrorHook])

  useEffect(() => {
    if (rawExpenseItems && Array.isArray(rawExpenseItems)) {
      const items = rawExpenseItems.map(toCalendarItemFromExpense)
      setCalendarItems(items)

      // Update cache
      const cached = monthCacheRef.current.get(monthKey) || { items: [], plans: [], requests: [] }
      monthCacheRef.current.set(monthKey, { ...cached, items })
    }
  }, [rawExpenseItems, monthKey])

  useEffect(() => {
    if (rawExpensePlans && Array.isArray(rawExpensePlans)) {
      const transformedPlans = rawExpensePlans
        .map(toCalendarItemFromPlan)
        .filter((i): i is CalendarExpenseItem => i !== null)
      setCalendarPlanItems(transformedPlans)

      // Update cache
      const cached = monthCacheRef.current.get(monthKey) || { items: [], plans: [], requests: [] }
      monthCacheRef.current.set(monthKey, { ...cached, plans: transformedPlans })
    }
  }, [rawExpensePlans, monthKey])

  useEffect(() => {
    // Check cache first - if cached, use it and skip fetch
    if (cachedMonthData?.requests) {
      setCalendarRequestItems(cachedMonthData.requests)
      return
    }

    const { start, end } = getMonthRange(debouncedCalendarValue)
    const filters = {
      _and: [
        {
          _or: [
            {
              _and: [
                { requestDate: { _gte: start, _lte: end } },
                { requestTypeRef: { _eq: 'ExpenseRequestType:v1:EXPENSES' } }
              ]
            },
            {
              _and: [
                { requestTypeRef: { _eq: 'ExpenseRequestType:v1:TRIP' } },
                {
                  _or: [{ startDate: { _gte: start, _lte: end } }, { endDate: { _gte: start, _lte: end } }]
                }
              ]
            }
          ]
        }
      ]
    }
    fetchRequestsHookItems(filters, 1, 10000).catch(err => {
      console.error('Failed to fetch expense requests:', err)
      setRequestsError(err.message || 'Failed to fetch expense requests')
    })
  }, [fetchRequestsHookItems, debouncedCalendarValue, getMonthRange, cachedMonthData])

  useEffect(() => {
    if (fetchRequestsErrorHook) {
      setRequestsError(fetchRequestsErrorHook)
      message.error(`Error fetching expense requests: ${fetchRequestsErrorHook}`)
    } else {
      setRequestsError(null)
    }
  }, [fetchRequestsErrorHook])

  useEffect(() => {
    if (rawExpenseRequests && Array.isArray(rawExpenseRequests)) {
      const transformedRequests = rawExpenseRequests
        .map(toCalendarItemFromRequest)
        .filter((i): i is CalendarExpenseItem => i !== null)
      setCalendarRequestItems(transformedRequests)

      // Update cache
      const cached = monthCacheRef.current.get(monthKey) || { items: [], plans: [], requests: [] }
      monthCacheRef.current.set(monthKey, { ...cached, requests: transformedRequests })
    }
  }, [rawExpenseRequests, monthKey])

  const dateCellRender = (value: Dayjs) => (
    <DayCellEvents
      value={value}
      items={calendarItems}
      planItems={calendarPlanItems}
      requestItems={calendarRequestItems}
      active={activeFilters}
      onClick={handleCalendarItemClick}
    />
  )

  // Wrapper for antd v5: use cellRender instead of deprecated dateCellRender
  const cellRender = useStripRcPickerTitle(dateCellRender)

  return (
    <div
      style={{ padding: '20px', border: '1px solid #f0f0f0', borderRadius: '4px' }}
      className="gba-expense-calendar-tab"
    >
      <FiltersBar active={activeFilters} toggle={toggleFilter} />
      {(isLoadingExpenses || isLoadingPlans || isLoadingRequests) && !isAllCached && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin
            tip={getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.loading_data', 'Loading data...')}
            size="large"
          />
        </div>
      )}
      {(expensesError || plansError || requestsError) && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Alert
            message={`Error: ${(expensesError || '') + (plansError || '') + (requestsError || '')}`}
            type="error"
          />
        </div>
      )}
      {!(expensesError || plansError || requestsError) && (
        <ConfigProvider locale={antdLocale}>
          <Calendar
            data-testid="expense-calendar"
            value={calendarValue}
            onPanelChange={value => {
              setCalendarValue(value)
            }}
            onChange={value => {
              setCalendarValue(value)
            }}
            cellRender={cellRender}
            headerRender={({ value, onChange }) => (
              <CalendarHeader
                value={value}
                onChange={onChange}
                currentCalendarValue={calendarValue}
                setCalendarValue={setCalendarValue}
                {...props}
              />
            )}
          />
        </ConfigProvider>
      )}
      <DetailsSheet
        open={isDetailsDrawerVisible}
        onOpenChange={setIsDetailsDrawerVisible}
        onClose={handleCloseDrawer}
        selectedItemForDetails={selectedItemForDetails}
        selectedPlanForDetails={selectedPlanForDetails}
        selectedRequestForDetails={selectedRequestForDetails}
        {...props}
      />
    </div>
  )
}

export default ExpenseCalendarTab
