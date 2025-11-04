import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Calendar, Button, Typography, Space, Spin, message, Alert, Drawer, ConfigProvider, Tooltip } from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetExpenseItems, ExpenseItem } from '../../../hooks/useGetExpenseItems'
import { useGetExpensePlans, ExpensePlan } from '../../../hooks/useGetExpensePlans'
import { useGetExpenseRequests, ExpenseRequest } from '../../../hooks/useGetExpenseRequests'
import ExpenseItemDetails from '../expense-items-tab/ExpenseItemDetails'
import ExpensePlanDetails from '../expense-plans-tab/ExpensePlanDetails'
import ExpenseRequestDetails from '../expense-requests-tab/ExpenseRequestDetails'
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale, formatDate } from '@/common/utils/windowUtils'
import { formatCurrencyDisplay } from '../../../utils'
import { Badge } from '@newwork/nw-design-system'
import {
  getExpenseItemStatusDisplay,
  getExpensePlanStatusDisplay,
  getExpenseRequestStatusDisplay
} from '../../../utils'
import { getTranslatedMonthName } from '../../../utils/monthTranslationUtils'

// Import dayjs locales and plugins
import 'dayjs/locale/en'
import 'dayjs/locale/de'
import 'dayjs/locale/ro'
import localeData from 'dayjs/plugin/localeData'
import updateLocale from 'dayjs/plugin/updateLocale'
dayjs.extend(localeData)
dayjs.extend(updateLocale)

// Import Ant Design locales
import enUS from 'antd/locale/en_US'
import deDE from 'antd/locale/de_DE'
// Import Romanian locale
import roRO from 'antd/locale/ro_RO'

interface CalendarExpenseItem {
  id: string
  title: string
  expenseDate: Dayjs // For single day items, or start date for multi-day
  endDate?: Dayjs // For multi-day items, optional
  totalAmount: number
  currencyCode: string
  status: string
  type: 'expense' | 'plan' | 'request'
}

// Create fully patched Romanian locale for Ant Design Calendar
const createRomanianLocale = () => {
  // Romanian weekday names (short)
  const weekdaysShort = ['Du', 'Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ']

  // Romanian month names (short)
  const monthsShort = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Noi', 'Dec']

  // Patch rc-picker locale fields that Calendar uses
  const patchedLang = {
    ...roRO.DatePicker?.lang,
    locale: 'ro_RO',
    weekdaysShort,
    weekdaysMin: weekdaysShort,
    weekdays: weekdaysShort,
    monthsShort,
    months: monthsShort,
    // Additional rc-picker fields that might be needed
    shortWeekDays: weekdaysShort,
    shortMonths: monthsShort
  }

  return {
    ...roRO,
    DatePicker: {
      ...(roRO.DatePicker || {}),
      lang: patchedLang
    },
    Calendar: {
      ...(roRO.Calendar || {}),
      lang: patchedLang
    }
  }
}

// Map user locale to dayjs locale and Ant Design locale
const getLocaleConfig = (userLocale: string) => {
  const baseLocale = userLocale.split('-')[0].toLowerCase()

  // Map to dayjs locale
  const dayjsLocaleMap: Record<string, string> = {
    en: 'en',
    de: 'de',
    ro: 'ro'
  }

  // Map to Ant Design locale object
  const antdLocaleMap: Record<string, any> = {
    en: enUS,
    de: deDE,
    ro: createRomanianLocale()
  }

  const dayjsLocale = dayjsLocaleMap[baseLocale] || 'en'
  const antdLocale = antdLocaleMap[baseLocale] || enUS

  return { dayjsLocale, antdLocale }
}

// Status color is handled via nw-design-system Badge variants using existing mapping helpers

const ExpenseCalendarTab: React.FC<BusinessAppContextProps> = props => {
  // Remove any native title tooltips on ancestors when hovering an event card
  const stripNativeTitle = useCallback((e: React.MouseEvent<HTMLElement>) => {
    let el: HTMLElement | null = e.currentTarget as HTMLElement
    // Traverse up a few levels to catch rc-picker cell wrappers
    for (let i = 0; i < 8 && el; i++) {
      if (el.hasAttribute('title')) {
        el.removeAttribute('title')
      }
      el = el.parentElement
    }
  }, [])
  // Get user locale and configure dayjs + Ant Design locales
  const userLocale = getCurrentActiveUserLocale() || 'en-US'

  const { dayjsLocale, antdLocale } = useMemo(() => {
    return getLocaleConfig(userLocale)
  }, [userLocale])

  // Set dayjs locale globally and ensure it's applied
  useEffect(() => {
    if (dayjsLocale) {
      // If Romanian, update dayjs locale with proper weekday and month names
      if (dayjsLocale === 'ro') {
        dayjs.updateLocale('ro', {
          weekdaysShort: ['Du', 'Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ'],
          weekdaysMin: ['Du', 'Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ'],
          monthsShort: ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Noi', 'Dec']
        })
      }

      dayjs.locale(dayjsLocale)
      // Also ensure the calendar value uses the correct locale
      setCalendarValue(prev => prev.locale(dayjsLocale))
    }
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
        setSelectedPlanForDetails(null) // Clear plan details if any
        setSelectedRequestForDetails(null) // Clear request details if any
        setIsDetailsDrawerVisible(true)
      }
    } else if (item.type === 'plan') {
      const fullExpensePlan = rawExpensePlans?.find(ep => ep.id === item.id)
      if (fullExpensePlan) {
        setSelectedPlanForDetails(fullExpensePlan)
        setSelectedItemForDetails(null) // Clear item details if any
        setSelectedRequestForDetails(null) // Clear request details if any
        setIsDetailsDrawerVisible(true)
      }
    } else if (item.type === 'request') {
      const fullExpenseRequest = rawExpenseRequests?.find(er => er.id === item.id)
      if (fullExpenseRequest) {
        setSelectedRequestForDetails(fullExpenseRequest)
        setSelectedItemForDetails(null) // Clear item details if any
        setSelectedPlanForDetails(null) // Clear plan details if any
        setIsDetailsDrawerVisible(true)
      }
    }
  }

  const handleCloseDrawer = () => {
    setIsDetailsDrawerVisible(false)
    setSelectedItemForDetails(null) // Clear selected item when closing
    setSelectedPlanForDetails(null) // Clear selected plan when closing
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
      const transformedItems: CalendarExpenseItem[] = rawExpenseItems.map((item: ExpenseItem) => ({
        id: item.id,
        title: item.title,
        expenseDate: dayjs(item.expenseDate),
        totalAmount: item.totalAmount,
        currencyCode: item.currency?.code ? item.currency.code.split(':').pop() || 'N/A' : 'N/A',
        status: item.status || 'UNKNOWN',
        type: 'expense'
      }))
      setCalendarItems(transformedItems)
    }
  }, [rawExpenseItems])

  useEffect(() => {
    if (rawExpensePlans) {
      const transformedPlans: CalendarExpenseItem[] = rawExpensePlans
        .map((plan: ExpensePlan) => {
          if (plan.startDate && plan.endDate) {
            return {
              id: plan.id,
              title: plan.title,
              expenseDate: dayjs(plan.startDate),
              endDate: dayjs(plan.endDate),
              totalAmount: plan.totalAmount,
              currencyCode: plan.currency?.code ? plan.currency.code.split(':').pop() || 'N/A' : 'N/A',
              status: plan.status || 'UNKNOWN',
              type: 'plan'
            } as CalendarExpenseItem
          } else if (plan.planDate) {
            return {
              id: plan.id,
              title: plan.title,
              expenseDate: dayjs(plan.planDate),
              totalAmount: plan.totalAmount,
              currencyCode: plan.currency?.code ? plan.currency.code.split(':').pop() || 'N/A' : 'N/A',
              status: plan.status || 'UNKNOWN',
              type: 'plan'
            } as CalendarExpenseItem
          }
          return null
        })
        .filter((item): item is CalendarExpenseItem => item !== null)

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
      const transformedRequests: CalendarExpenseItem[] = rawExpenseRequests
        .map((request: ExpenseRequest) => {
          let calendarItem: CalendarExpenseItem | null = null
          if (request.startDate && request.endDate) {
            // Multi-day request
            calendarItem = {
              id: request.id,
              title: request.title,
              expenseDate: dayjs(request.startDate),
              endDate: dayjs(request.endDate),
              totalAmount: request.totalAmount,
              currencyCode: request.currency?.code ? request.currency.code.split(':').pop() || 'N/A' : 'N/A',
              status: request.status || 'UNKNOWN',
              type: 'request'
            }
          } else if (request.requestDate) {
            // Single-day request using requestDate
            calendarItem = {
              id: request.id,
              title: request.title,
              expenseDate: dayjs(request.requestDate),
              totalAmount: request.totalAmount,
              currencyCode: request.currency?.code ? request.currency.code.split(':').pop() || 'N/A' : 'N/A',
              status: request.status || 'UNKNOWN',
              type: 'request'
            }
          }
          // If not multi-day and no requestDate, it will return null and be filtered out by the subsequent .filter().
          return calendarItem
        })
        .filter((item): item is CalendarExpenseItem => item !== null)
      setCalendarRequestItems(transformedRequests)
    }
  }, [rawExpenseRequests])

  const dateCellRender = (value: Dayjs) => {
    const allAvailableItems = [
      ...(activeFilters.expense ? calendarItems : []),
      ...(activeFilters.plan ? calendarPlanItems : []),
      ...(activeFilters.request ? calendarRequestItems : [])
    ]

    const itemsForDate = allAvailableItems.filter((item: CalendarExpenseItem) => {
      if (item.endDate && (item.type === 'plan' || item.type === 'request')) {
        // Multi-day plan or request
        // Ensure value is between or equal to expenseDate and endDate
        return (
          (value.isSame(item.expenseDate, 'day') || value.isAfter(item.expenseDate, 'day')) &&
          (value.isSame(item.endDate, 'day') || value.isBefore(item.endDate, 'day'))
        )
      } else {
        // Single-day expense or plan
        return item.expenseDate.isSame(value, 'day')
      }
    })

    if (itemsForDate.length === 0) {
      return null
    }

    return (
      <ul className="gba-events-list" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {itemsForDate.map((item: CalendarExpenseItem) => (
          <li
            key={item.id}
            className="gba-event-item-card"
            style={{
              marginBottom: '4px',
              padding: '4px',
              border: '1px solid #f0f0f0',
              borderRadius: '4px',
              backgroundColor: item.type === 'plan' ? '#e6f7ff' : item.type === 'request' ? '#e6fffb' : '#fafafa',
              cursor: item.type === 'expense' || item.type === 'plan' || item.type === 'request' ? 'pointer' : 'default'
            }}
            onClick={() => handleCalendarItemClick(item)}
            onMouseEnter={stripNativeTitle}
            onMouseMove={stripNativeTitle}
          >
            <div
              style={{
                fontSize: '0.8em',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {item.title}
            </div>
            {(item.type === 'expense' || !item.endDate || value.isSame(item.expenseDate, 'day')) && (
              <div
                style={{ fontSize: '0.75em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span>{formatCurrencyDisplay(item.totalAmount, item.currencyCode)}</span>
                {(() => {
                  const statusConfig =
                    item.type === 'plan'
                      ? getExpensePlanStatusDisplay(item.status)
                      : item.type === 'request'
                        ? getExpenseRequestStatusDisplay(item.status)
                        : getExpenseItemStatusDisplay(item.status)

                  const label = statusConfig.label
                  const dateText = (() => {
                    try {
                      return formatDate(value.toDate(), 'date.short')
                    } catch {
                      return value.format('L')
                    }
                  })()
                  const tooltipContent = (
                    <div>
                      <div>{label}</div>
                      <div>{dateText}</div>
                    </div>
                  )
                  return (
                    <Tooltip title={tooltipContent} placement="topRight">
                      <span>
                        <Badge
                          variant={(statusConfig as any).badgeVariant || 'outline'}
                          style={{
                            display: 'inline-block',
                            maxWidth: '90px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {label}
                        </Badge>
                      </span>
                    </Tooltip>
                  )
                })()}
              </div>
            )}
          </li>
        ))}
      </ul>
    )
  }

  // Wrapper for antd v5: use cellRender instead of deprecated dateCellRender
  const cellRender = (value: Dayjs, info: any) => {
    if (info?.type === 'date') {
      const rendered = dateCellRender(value)
      return rendered ?? info.originNode
    }
    return info?.originNode
  }

  return (
    <div
      style={{ padding: '20px', border: '1px solid #f0f0f0', borderRadius: '4px' }}
      className="gba-expense-calendar-tab"
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          marginTop: '8px',
          padding: '0 8px'
        }}
      >
        <Typography.Title level={3} style={{ margin: 0 }}>
          {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.expense_calendar', 'Expense Calendar')}
        </Typography.Title>
        <Space direction="horizontal" wrap>
          <Space
            align="center"
            onClick={() => toggleFilter('expense')}
            style={{
              cursor: 'pointer',
              opacity: activeFilters.expense ? 1 : 0.5,
              padding: '4px 8px',
              borderRadius: '4px'
            }}
          >
            <div className="gba:w-[14px] gba:h-[14px] gba:bg-muted gba:border gba:border-border gba:rounded-sm" />
            <Typography.Text>
              {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.items', 'Items')}
            </Typography.Text>
          </Space>
          <Space
            align="center"
            onClick={() => toggleFilter('plan')}
            style={{
              cursor: 'pointer',
              opacity: activeFilters.plan ? 1 : 0.5,
              padding: '4px 8px',
              borderRadius: '4px'
            }}
          >
            <div className="gba:w-[14px] gba:h-[14px] gba:bg-info-secondary gba:border gba:border-border gba:rounded-sm" />
            <Typography.Text>
              {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.plans', 'Plans')}
            </Typography.Text>
          </Space>
          <Space
            align="center"
            onClick={() => toggleFilter('request')}
            style={{
              cursor: 'pointer',
              opacity: activeFilters.request ? 1 : 0.5,
              padding: '4px 8px',
              borderRadius: '4px'
            }}
          >
            <div className="gba:w-[14px] gba:h-[14px] gba:bg-success-secondary gba:border gba:border-border gba:rounded-sm" />
            <Typography.Text>
              {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.requests', 'Requests')}
            </Typography.Text>
          </Space>
        </Space>
      </div>
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
              value={calendarValue}
              onPanelChange={value => {
                setCalendarValue(value)
              }}
              onChange={value => {
                setCalendarValue(value)
              }}
              cellRender={cellRender}
              headerRender={({ value, onChange }) => {
                // Update calendar value state when month changes
                if (!value.isSame(calendarValue, 'month')) {
                  setCalendarValue(value)
                }
                const currentMonth = getTranslatedMonthName(value.toDate())
                const currentYear = value.format('YYYY')
                return (
                  <div
                    style={{
                      padding: '8px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid #f0f0f0'
                    }}
                  >
                    <Typography.Title
                      level={4}
                      style={{ margin: 0 }}
                    >{`${currentMonth} ${currentYear}`}</Typography.Title>
                    <Space>
                      <Button
                        shape="circle"
                        icon={<LeftOutlined />}
                        onClick={() => {
                          const newValue = value.subtract(1, 'month')
                          setCalendarValue(newValue)
                          onChange(newValue)
                        }}
                        aria-label="Previous month"
                      />
                      <Button
                        shape="circle"
                        icon={<RightOutlined />}
                        onClick={() => {
                          const newValue = value.add(1, 'month')
                          setCalendarValue(newValue)
                          onChange(newValue)
                        }}
                        aria-label="Next month"
                      />
                    </Space>
                  </div>
                )
              }}
            />
          </ConfigProvider>
        )}
      <Drawer
        title={
          selectedItemForDetails
            ? getTranslationFromI18nKeyAndLabel(
                'lowcoder:approve_expense_plan.expense_item_details',
                'Expense Item Details'
              )
            : selectedPlanForDetails
              ? getTranslationFromI18nKeyAndLabel(
                  'lowcoder:approve_expense_plan.expense_subtitle_details',
                  'Expense Plan Details'
                )
              : selectedRequestForDetails
                ? getTranslationFromI18nKeyAndLabel(
                    'lowcoder:expense_request_list.modal_list_or_flow_button.expense_request_details',
                    'Expense Request Details'
                  )
                : getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.employee_tabs.details', 'Details')
        }
        placement="right"
        width={500}
        onClose={handleCloseDrawer}
        open={isDetailsDrawerVisible}
        destroyOnHidden
      >
        {selectedItemForDetails && (
          <ExpenseItemDetails selectedItem={selectedItemForDetails} onClose={handleCloseDrawer} {...props} />
        )}
        {selectedPlanForDetails && (
          <ExpensePlanDetails selectedItem={selectedPlanForDetails} onClose={handleCloseDrawer} {...props} />
        )}
        {selectedRequestForDetails && (
          <ExpenseRequestDetails
            selectedItem={selectedRequestForDetails}
            onClose={handleCloseDrawer}
            {...props} // Pass other context props if needed by ExpenseRequestDetails
          />
        )}
      </Drawer>
    </div>
  )
}

export default ExpenseCalendarTab
