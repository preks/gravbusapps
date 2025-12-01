import React, { useState, useEffect } from 'react'
import { Calendar, Spin, message, Alert, ConfigProvider } from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetExpenseItems, ExpenseItem } from '../../../hooks/useGetExpenseItems'
import { useGetExpensePlans, ExpensePlan } from '../../../hooks/useGetExpensePlans'
import { useGetExpenseRequests, ExpenseRequest } from '../../../hooks/useGetExpenseRequests'
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
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
    fetchExpenseHookItems().catch(err => {
      console.error('Failed to fetch expense items:', err)
      setExpensesError(err.message || 'Failed to fetch expense items')
    })
  }, [fetchExpenseHookItems])

  useEffect(() => {
    if (fetchExpensesErrorHook) {
      setExpensesError(fetchExpensesErrorHook)
      message.error(`Error fetching expense items: ${fetchExpensesErrorHook}`)
    } else {
      setExpensesError(null)
    }
  }, [fetchExpensesErrorHook])

  useEffect(() => {
    fetchPlansHookItems({}, 1, 20).catch(err => {
      console.error('Failed to fetch expense plans:', err)
      setPlansError(err.message || 'Failed to fetch expense plans')
    })
  }, [fetchPlansHookItems])

  useEffect(() => {
    if (fetchPlansErrorHook) {
      setPlansError(fetchPlansErrorHook)
      message.error(`Error fetching expense plans: ${fetchPlansErrorHook}`)
    } else {
      setPlansError(null)
    }
  }, [fetchPlansErrorHook])

  useEffect(() => {
    if (rawExpenseItems) {
      setCalendarItems(rawExpenseItems.map(toCalendarItemFromExpense))
    }
  }, [rawExpenseItems])

  useEffect(() => {
    if (rawExpensePlans) {
      const transformedPlans = rawExpensePlans
        .map(toCalendarItemFromPlan)
        .filter((i): i is CalendarExpenseItem => i !== null)
      setCalendarPlanItems(transformedPlans)
    }
  }, [rawExpensePlans])

  useEffect(() => {
    fetchRequestsHookItems({}, 1, 20).catch(err => {
      console.error('Failed to fetch expense requests:', err)
      setRequestsError(err.message || 'Failed to fetch expense requests')
    })
  }, [fetchRequestsHookItems])

  useEffect(() => {
    if (fetchRequestsErrorHook) {
      setRequestsError(fetchRequestsErrorHook)
      message.error(`Error fetching expense requests: ${fetchRequestsErrorHook}`)
    } else {
      setRequestsError(null)
    }
  }, [fetchRequestsErrorHook])

  useEffect(() => {
    if (rawExpenseRequests) {
      const transformedRequests = rawExpenseRequests
        .map(toCalendarItemFromRequest)
        .filter((i): i is CalendarExpenseItem => i !== null)
      setCalendarRequestItems(transformedRequests)
    }
  }, [rawExpenseRequests])

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
      {(isLoadingExpenses || isLoadingPlans || isLoadingRequests) && (
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
      {!(isLoadingExpenses || isLoadingPlans || isLoadingRequests) &&
        !(expensesError || plansError || requestsError) && (
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
