import React, { useState, useCallback, useMemo } from 'react'
import { Button } from '@newwork/nw-design-system'
import type { SortingState } from '@tanstack/react-table'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ExpensePlan, SortField } from '../../../hooks/useMainViewExpensePlans'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { AppAction } from '@/components/app-action'
import { RowActionsWrapper, RowActionsIcon } from '../../../common/components/RowActionComponents'
import { PrintPreviewDialog } from '../../../common/components/PrintPreviewDialog'
import { DetailsSheet } from '../../../common/components/DetailsSheet'
import { useExpensePlanFileService } from '../../../../../common/files/useExpensePlanFileService'
import ExpensePlanDetails from './ExpensePlanDetails'
import { ExpenseDataTable } from '../../../common/components/ExpenseDataTable'
import { createExpensePlanColumns } from './expensePlanColumns'

interface ExpensePlansTableProps extends BusinessAppContextProps {
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
  visibleColumnIds: string[]
  emptyMessage: string
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

  const allColumns = useMemo(() => createExpensePlanColumns(currentCurrencyFilter), [currentCurrencyFilter])
  const columns = useMemo(() => {
    const ids = props.visibleColumnIds.length > 0 ? props.visibleColumnIds : allColumns.map(c => c.id as string)
    return allColumns.filter(col => ids.includes((col.id as string) ?? ''))
  }, [allColumns, props.visibleColumnIds])

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
        emptyMessage={props.emptyMessage}
        dataTestId={DATA_TEST_ID_PREFIX}
      />

      <PrintPreviewDialog
        open={printModalOpen}
        onOpenChange={open => {
          if (!open) {
            setPrintModalOpen(false)
            setPrintPdfUrl('')
          }
        }}
        title={getTranslationFromI18nKeyAndLabel('lowcoder:print.title', 'Print Expense Plan')}
        loading={printLoading}
        pdfUrl={printPdfUrl}
        testIdPrefix="print-plan"
      />

      <DetailsSheet
        open={!!selectedItem}
        onOpenChange={open => !open && handleCloseDetails()}
        title={
          selectedItem?.title ||
          getTranslationFromI18nKeyAndLabel(
            'lowcoder:approve_expense_plan.expense_subtitle_details',
            'Expense Plan Details'
          )
        }
        testId="expense-plan-details-sheet"
        onClose={handleCloseDetails}
      >
        {selectedItem && (
          <ExpensePlanDetails
            selectedItem={selectedItem}
            onClose={handleCloseDetails}
            accessToken={contextProps.accessToken}
            userInfo={contextProps.userInfo}
          />
        )}
      </DetailsSheet>
    </div>
  )
}

export default React.memo(ExpensePlansTable)
