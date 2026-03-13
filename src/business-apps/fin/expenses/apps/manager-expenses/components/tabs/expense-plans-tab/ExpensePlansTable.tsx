import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import {
  Button,
  Spinner,
  Sheet,
  SheetContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@newwork/nw-design-system'
import type { SortingState } from '@tanstack/react-table'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import ExpenseDetailsShell from '../../../../../common/components/details-panel/ExpenseDetailsShell'
import { ExpensePlan, SortField } from '../../../hooks/useMainViewExpensePlans'
import { ExpenseStatus } from '../../../utils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { AppAction } from '@/components/app-action'
import { RowActionsWrapper, RowActionsIcon } from '../../../common/components/RowActionComponents'
import { useExpensePlanFileService } from '../../../../../common/files/useExpensePlanFileService'
import ExpensePlanDetails from './ExpensePlanDetails'
import { ExpenseDataTable } from '../../../common/components/ExpenseDataTable'
import { createExpensePlanColumns } from './expensePlanColumns'

interface ExpensePlansTableProps extends BusinessAppContextProps {
  search?: string
  onSearchChange?: (search: string) => void
  employeeId?: string
  activeFilter?: ExpenseStatus[] | null
  onFilterChange?: (filter: ExpenseStatus[] | null) => void
  onClearFilters?: () => void
  onViewDetails?: (plan: ExpensePlan) => void
  currencyFilter?: string | null
  expensePlans: ExpensePlan[]
  loading: boolean
  error: Error | null
  totalCount: number
  currentPage: number
  setCurrentPage: (page: number) => void
  sorting: { field: SortField | null; order: 'ASC' | 'DESC' | null; lastField: SortField | null }
  onSortingChange: (sorting: SortingState) => void
  pageSize: number
  setPageSize: (size: number) => void
  effectiveDateRange?: [Date | null, Date | null] | null
  planDateRange?: [Date | null, Date | null] | null
  startDateRange?: [Date | null, Date | null] | null
  endDateRange?: [Date | null, Date | null] | null
  planTypeFilter?: string[]
}

const DATA_TEST_ID_PREFIX = 'ExpensePlansTable'

const ExpensePlansTable: React.FC<ExpensePlansTableProps> = props => {
  const contextProps = useMemo(
    () => ({
      accessToken: props.accessToken,
      userInfo: props.userInfo
    }),
    [props.accessToken, props.userInfo]
  )

  const currentCurrencyFilter = props.currencyFilter ?? null

  const [printModalOpen, setPrintModalOpen] = useState<boolean>(false)
  const [printPdfUrl, setPrintPdfUrl] = useState<string>('')
  const [printLoading, setPrintLoading] = useState<boolean>(false)
  const [selectedItem, setSelectedItem] = useState<ExpensePlan | null>(null)

  const { printExpensePlan, isMounted } = useExpensePlanFileService(contextProps)

  const {
    expensePlans,
    loading,
    error,
    totalCount,
    currentPage,
    setCurrentPage,
    sorting,
    onSortingChange,
    pageSize,
    setPageSize
  } = props

  const hasActiveFilters = useMemo(() => {
    const hasSearch = (props.search || '').trim() !== ''
    const hasStatusFilters = Array.isArray(props.activeFilter) && props.activeFilter.length > 0
    const hasPlanTypeFilters = Array.isArray(props.planTypeFilter) && props.planTypeFilter.length > 0
    const hasDateRangeFilters =
      (props.effectiveDateRange && (props.effectiveDateRange[0] || props.effectiveDateRange[1])) ||
      (props.planDateRange && (props.planDateRange[0] || props.planDateRange[1])) ||
      (props.startDateRange && (props.startDateRange[0] || props.startDateRange[1])) ||
      (props.endDateRange && (props.endDateRange[0] || props.endDateRange[1]))
    return hasSearch || hasStatusFilters || hasPlanTypeFilters || hasDateRangeFilters
  }, [
    props.search,
    props.activeFilter,
    props.planTypeFilter,
    props.effectiveDateRange,
    props.planDateRange,
    props.startDateRange,
    props.endDateRange
  ])

  const currentStatusFilter = props.activeFilter || []
  const prevFilterRef = useRef<ExpenseStatus[] | null>(null)

  useEffect(() => {
    const currentFilterStr = JSON.stringify(currentStatusFilter)
    const prevFilterStr = JSON.stringify(prevFilterRef.current)
    if (prevFilterRef.current !== null && currentFilterStr !== prevFilterStr) {
      setCurrentPage(1)
    }
    prevFilterRef.current = currentStatusFilter
  }, [currentStatusFilter, setCurrentPage])

  const handleCloseDetails = useCallback(() => setSelectedItem(null), [])

  const handleViewDetails = useCallback((plan: ExpensePlan) => {
    const url = buildPlatformUrl('/platform/fin/expenses/expense-plan-record', {
      expensePlanId: plan.id,
      referrer: '/platform/fin/expenses/manager-expenses?tab=expense-plans'
    })
    navigateTo(url)
  }, [])

  const handlePrintPlan = useCallback(
    async (plan: ExpensePlan) => {
      setPrintLoading(true)
      setPrintModalOpen(true)
      try {
        const result = await printExpensePlan(plan as never)
        if (result.success && result.pdfUrl && isMounted.current) {
          setPrintPdfUrl(result.pdfUrl)
        } else if (!result.success) {
          console.error('[Print Error]', result.error)
        }
      } catch (err) {
        console.error('[Print Exception]', err instanceof Error ? err.message : 'Unknown error')
      } finally {
        if (isMounted.current) {
          setPrintLoading(false)
        }
      }
    },
    [printExpensePlan, isMounted]
  )

  const columns = useMemo(() => createExpensePlanColumns(currentCurrencyFilter), [currentCurrencyFilter])

  const sortingState: SortingState = useMemo(() => {
    if (!sorting.field || !sorting.order) return []
    return [{ id: sorting.field, desc: sorting.order === 'DESC' }]
  }, [sorting.field, sorting.order])

  const pagination = useMemo(() => ({ pageIndex: currentPage - 1, pageSize }), [currentPage, pageSize])

  const handlePaginationChange = useCallback(
    (p: { pageIndex: number; pageSize: number }) => {
      setCurrentPage(p.pageIndex + 1)
      setPageSize(p.pageSize)
    },
    [setCurrentPage, setPageSize]
  )

  const errorMessage = error?.message ?? null

  const emptyMessage = hasActiveFilters
    ? getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.no_data_found', 'No data available')
    : getTranslationFromI18nKeyAndLabel(
        'lowcoder:manager_expense_landing_page.no_plans_created_by_team',
        'No expense plan created by your team yet.'
      )

  const actions = useCallback(
    (row: { original: ExpensePlan }) => {
      const record = row.original
      return (
        <RowActionsWrapper>
          <AppAction
            variant="table-row"
            customActions={[
              ...((record.status === 'APPROVED' ||
                record.status === 'VERIFIED' ||
                record.status === 'BOOKED' ||
                record.status === 'TRANSFERRED' ||
                record.status === 'PAID') &&
              record.employeeDocument?.file?.trim()
                ? [
                    {
                      category: getTranslationFromI18nKeyAndLabel(
                        'lowcoder:employee_list.flows_button.actions',
                        'Actions'
                      ),
                      key: 'print',
                      label: getTranslationFromI18nKeyAndLabel(
                        'lowcoder:expense_plan_list.expense_plan_flows.print',
                        'Print'
                      ),
                      onClick: (e?: React.MouseEvent) => {
                        e?.stopPropagation()
                        handlePrintPlan(record)
                      }
                    }
                  ]
                : []),
              {
                category: getTranslationFromI18nKeyAndLabel(
                  'lowcoder:employee_list.flows_button.navigations',
                  'Navigations'
                ),
                key: 'view-plan-details',
                label: getTranslationFromI18nKeyAndLabel(
                  'lowcoder:expense_plan_list.expense_plan_flows.view_plan_details',
                  'View Plan Details'
                ),
                onClick: (e?: React.MouseEvent) => {
                  e?.stopPropagation()
                  handleViewDetails(record)
                }
              }
            ]}
            prefixDataTestId={`${DATA_TEST_ID_PREFIX}-update-expense-plan`}
            accessToken={contextProps.accessToken}
            data-testid={`${DATA_TEST_ID_PREFIX}-update-expense-plan-button-${record.id}`}
          >
            <RowActionsIcon />
          </AppAction>
        </RowActionsWrapper>
      )
    },
    [handlePrintPlan, handleViewDetails, contextProps.accessToken]
  )

  const onRowClick = useCallback((plan: ExpensePlan) => setSelectedItem(plan), [])

  if (error) {
    return (
      <div
        className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:text-center"
        data-testid={`${DATA_TEST_ID_PREFIX}-error-state`}
      >
        <div className="gba:text-muted-foreground gba:mb-4">{errorMessage}</div>
        <Button
          variant="default"
          onClick={() => globalThis.location.reload()}
          data-testid={`${DATA_TEST_ID_PREFIX}-retry-button`}
        >
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      <ExpenseDataTable<ExpensePlan>
        data={expensePlans}
        columns={columns}
        loading={loading}
        error={errorMessage}
        totalCount={totalCount}
        sorting={sortingState}
        onSortingChange={onSortingChange}
        pagination={pagination}
        onPaginationChange={handlePaginationChange}
        onRowClick={onRowClick}
        actions={actions}
        emptyMessage={emptyMessage}
        dataTestId={DATA_TEST_ID_PREFIX}
      />

      <Dialog
        open={printModalOpen}
        onOpenChange={open => {
          if (!open) {
            setPrintModalOpen(false)
            setPrintPdfUrl('')
          }
        }}
      >
        <DialogContent
          className="gba:!w-[90vw] gba:!max-w-[90vw] gba:!p-0 gba:!rounded-md gba:max-h-[90vh]"
          data-testid="print-plan-modal"
        >
          <DialogHeader className="gba:p-4">
            <DialogTitle>{getTranslationFromI18nKeyAndLabel('lowcoder:print.title', 'Print Expense Plan')}</DialogTitle>
          </DialogHeader>
          {printLoading ? (
            <div className="gba:flex gba:justify-center gba:items-center gba:py-8">
              <Spinner />
            </div>
          ) : printPdfUrl ? (
            <iframe
              src={printPdfUrl}
              className="gba:w-full gba:border-0 gba:min-h-[calc(90vh-55px)]"
              title={getTranslationFromI18nKeyAndLabel('lowcoder:print.preview_title', 'Print Preview')}
              data-testid="print-plan-iframe"
            />
          ) : (
            <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8 gba:text-center">
              <div className="gba:text-muted-foreground gba:mb-4">
                {getTranslationFromI18nKeyAndLabel('lowcoder:print.no_document', 'No document available for printing')}
              </div>
              <div className="gba:text-sm gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:print.no_document_details',
                  'This expense plan does not have an associated document to print.'
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Sheet
        open={!!selectedItem}
        onOpenChange={open => !open && handleCloseDetails()}
        data-testid="expense-plan-details-sheet"
      >
        <SheetContent side="right" className="gba:w-[600px] gba:sm:w-[600px] gba:max-w-none">
          <ExpenseDetailsShell
            title={
              selectedItem?.title ||
              getTranslationFromI18nKeyAndLabel(
                'lowcoder:approve_expense_plan.expense_subtitle_details',
                'Expense Plan Details'
              )
            }
            onClose={handleCloseDetails}
            dataTestIdPrefix="expense-plan-details"
          >
            {selectedItem && (
              <ExpensePlanDetails
                selectedItem={selectedItem}
                onClose={handleCloseDetails}
                accessToken={contextProps.accessToken}
                userInfo={contextProps.userInfo}
              />
            )}
          </ExpenseDetailsShell>
        </SheetContent>
      </Sheet>
    </div>
  )
}

export default React.memo(ExpensePlansTable)
