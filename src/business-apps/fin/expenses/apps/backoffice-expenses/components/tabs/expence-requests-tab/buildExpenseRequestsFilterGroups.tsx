import React from 'react'
import dayjs from 'dayjs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@newwork/nw-design-system'
import { InfoIcon } from '@phosphor-icons/react'
import { DataFilterGroup } from '@/components/data-filter/DataFilter'
import type { Currency } from '../../../hooks/useFilterData'
import type { TranslateFn } from '../../../utils/utils'
import type { DepartmentOption } from '../../../utils/departmentOptions'
import CurrencySelectFilter from '../common/CurrencySelectFilter'
import DepartmentSelectFilter from '../common/DepartmentSelectFilter'
import { EmployeeSearchFilter, AmountFilter } from './components'

export interface BuildExpenseRequestsFilterGroupsParams {
  t: TranslateFn
  currencies: Currency[]
  currencyRef: string
  setCurrencyRef: (value: string) => void
  handleCurrencyFilter: (value: string) => void
  departmentId: string
  setDepartmentId: (value: string) => void
  handleDepartmentFilter: (value: string) => void
  departmentOptions: DepartmentOption[]
  effectiveDateRange: [Date | null, Date | null] | null
  requestDateRange: [Date | null, Date | null] | null
  handleEffectiveDateChange: (dates: [Date | null, Date | null] | null) => void
  handleRequestDateChange: (dates: [Date | null, Date | null] | null) => void
  statusCheckboxFilters: Array<{ id: string; label: string; selected: boolean }>
  requestTypeFilterLocal: string[]
  handleRequestTypeFilterChange: (filterId: string, selected: boolean) => void
  employeeSearchText: string
  setEmployeeSearchText: (value: string) => void
  showEmployeeDropdown: boolean
  setShowEmployeeDropdown: (value: boolean) => void
  employeeSearchResults: Array<{ id: string; name: string }>
  employeeSearchLoading: boolean
  selectedEmployees: Array<{ id: string; name: string }>
  setSelectedEmployees: (value: Array<{ id: string; name: string }>) => void
  setEmployeeFilter: (value: string) => void
  handleEmployeeFilter: (value: string) => void
  debouncedSearchEmployees: (searchText: string) => void
  localAmountMin: string
  setLocalAmountMin: (value: string) => void
  localAmountMax: string
  setLocalAmountMax: (value: string) => void
  debouncedAmountFilter: (min: string, max: string) => void
}

export function buildExpenseRequestsFilterGroups(p: BuildExpenseRequestsFilterGroupsParams): DataFilterGroup[] {
  return [
    {
      id: 'currency',
      title: p.t('header-currency'),
      type: 'custom',
      customComponent: (
        <CurrencySelectFilter
          currencyRef={p.currencyRef}
          onCurrencyChange={val => {
            p.setCurrencyRef(val)
            p.handleCurrencyFilter(val)
          }}
          currencies={p.currencies}
          testIdPrefix="expense-requests"
          t={p.t}
        />
      )
    },
    {
      id: 'department',
      title: p.t('header-department'),
      type: 'custom',
      customComponent: (
        <DepartmentSelectFilter
          departmentId={p.departmentId}
          onDepartmentChange={val => {
            p.setDepartmentId(val)
            p.handleDepartmentFilter(val)
          }}
          departmentOptions={p.departmentOptions}
          testIdPrefix="expense-requests"
          t={p.t}
        />
      )
    },
    {
      id: 'effectiveDateRange',
      title: p.t('filter-effective-date'),
      type: 'custom',
      customComponent: (
        <div className="gba:flex gba:flex-col gba:gap-2 gba:p-2">
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-sm gba:text-muted-foreground gba:w-10">{p.t('filter-from')}</span>
            <input
              type="date"
              value={p.effectiveDateRange?.[0] ? dayjs(p.effectiveDateRange[0]).format('YYYY-MM-DD') : ''}
              onChange={e => {
                const from = e.target.value ? new Date(e.target.value) : null
                p.handleEffectiveDateChange(from ? [from, p.effectiveDateRange?.[1] ?? null] : null)
              }}
              className="gba:h-8 gba:w-[140px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
              data-testid="expense-requests-effective-date-from"
            />
          </div>
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-sm gba:text-muted-foreground gba:w-10">{p.t('filter-to')}</span>
            <input
              type="date"
              value={p.effectiveDateRange?.[1] ? dayjs(p.effectiveDateRange[1]).format('YYYY-MM-DD') : ''}
              onChange={e => {
                const to = e.target.value ? new Date(e.target.value) : null
                p.handleEffectiveDateChange(to ? [p.effectiveDateRange?.[0] ?? null, to] : null)
              }}
              className="gba:h-8 gba:w-[140px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
              data-testid="expense-requests-effective-date-to"
            />
          </div>
          <div
            className="gba:mt-1 gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1"
            data-testid="effective-date-hint"
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon size={16} data-testid="effective-date-info" className="gba:cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right">{p.t('filter-effective-date-info')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      )
    },
    {
      id: 'requestDateRange',
      title: p.t('filter-creation-date'),
      type: 'custom',
      customComponent: (
        <div className="gba:flex gba:flex-col gba:gap-2 gba:p-2">
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-sm gba:text-muted-foreground gba:w-10">{p.t('filter-from')}</span>
            <input
              type="date"
              value={p.requestDateRange?.[0] ? dayjs(p.requestDateRange[0]).format('YYYY-MM-DD') : ''}
              onChange={e => {
                const from = e.target.value ? new Date(e.target.value) : null
                p.handleRequestDateChange(from ? [from, p.requestDateRange?.[1] ?? null] : null)
              }}
              className="gba:h-8 gba:w-[140px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
              data-testid="expense-requests-request-date-from"
            />
          </div>
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-sm gba:text-muted-foreground gba:w-10">{p.t('filter-to')}</span>
            <input
              type="date"
              value={p.requestDateRange?.[1] ? dayjs(p.requestDateRange[1]).format('YYYY-MM-DD') : ''}
              onChange={e => {
                const to = e.target.value ? new Date(e.target.value) : null
                p.handleRequestDateChange(to ? [p.requestDateRange?.[0] ?? null, to] : null)
              }}
              className="gba:h-8 gba:w-[140px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
              data-testid="expense-requests-request-date-to"
            />
          </div>
        </div>
      )
    },
    {
      id: 'status',
      title: p.t('filter-status'),
      type: 'checkbox',
      filters: p.statusCheckboxFilters
    },
    {
      id: 'requestType',
      title: p.t('filter-request-type'),
      type: 'radio',
      filters: [
        {
          id: 'ExpenseRequestType:v1:EXPENSES',
          label: p.t('filter-request-type-expense'),
          selected: p.requestTypeFilterLocal.includes('ExpenseRequestType:v1:EXPENSES')
        },
        {
          id: 'ExpenseRequestType:v1:TRIP',
          label: p.t('filter-request-type-trip'),
          selected: p.requestTypeFilterLocal.includes('ExpenseRequestType:v1:TRIP')
        }
      ]
    },
    {
      id: 'employee',
      title: p.t('filter-employee'),
      type: 'custom',
      customComponent: (
        <EmployeeSearchFilter
          employeeSearchText={p.employeeSearchText}
          setEmployeeSearchText={p.setEmployeeSearchText}
          showEmployeeDropdown={p.showEmployeeDropdown}
          setShowEmployeeDropdown={p.setShowEmployeeDropdown}
          employeeSearchResults={p.employeeSearchResults}
          employeeSearchLoading={p.employeeSearchLoading}
          selectedEmployees={p.selectedEmployees}
          setSelectedEmployees={p.setSelectedEmployees}
          setEmployeeFilter={p.setEmployeeFilter}
          handleEmployeeFilter={p.handleEmployeeFilter}
          debouncedSearchEmployees={p.debouncedSearchEmployees}
        />
      )
    },
    {
      id: 'amount',
      title: p.t('filter-amount'),
      type: 'custom',
      customComponent: (
        <AmountFilter
          localAmountMin={p.localAmountMin}
          setLocalAmountMin={p.setLocalAmountMin}
          localAmountMax={p.localAmountMax}
          setLocalAmountMax={p.setLocalAmountMax}
          debouncedAmountFilter={p.debouncedAmountFilter}
        />
      )
    }
  ]
}
