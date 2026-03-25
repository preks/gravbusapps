import { useCallback, type MouseEvent, type MutableRefObject } from 'react'
import {
  Alert,
  Badge,
  Card,
  CardContent,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@newwork/nw-design-system'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { formatNumberFunction } from '@/common/utils/windowUtils'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { TablePagination } from '../../../../../../components'
import withStoppedPropagation from '../../common/withStoppedPropagation'
import { getAdvancePaymentStatusDisplay, type StatusDisplayConfig, type TranslateFn } from '../../../../utils/utils'
import type { AdvancePaymentItem } from '../../../../types'

type AdvancePaymentRecord = AdvancePaymentItem & {
  expensePlan?: AdvancePaymentItem['expensePlan'] & {
    expenseRequest?: Array<{ id?: string }>
  }
}

interface AdvancePaymentsDataBodyProps {
  accessToken: string
  t: TranslateFn
  payments: AdvancePaymentItem[]
  isLoading: boolean
  error: unknown
  totalCount: number
  currentPage: number
  pageSize: number
  onPageChange: (pagination: { current: number; pageSize: number }) => void
  tableTopRef: MutableRefObject<HTMLDivElement | null>
  hasActiveFilters: boolean
  onSelectItem: (item: AdvancePaymentItem) => void
}

const ACTIONS_TEST_ID_SELECTOR = '[data-testid*="actions"]'

function hasExpenseRequest(record: AdvancePaymentRecord): boolean {
  const expenseRequests = record.expensePlan?.expenseRequest
  return Array.isArray(expenseRequests) && expenseRequests.length > 0 && Boolean(expenseRequests[0]?.id)
}

function getEmptyStateMessage(hasActiveFilters: boolean, t: TranslateFn): string {
  return hasActiveFilters ? t('empty-no-data') : t('advance-payment-no-payments-yet')
}

function getPaymentMethodLabel(paymentMethod: string | undefined, t: TranslateFn): string {
  if (paymentMethod === 'DIRECT_DEPOSIT') {
    return t('advance-payment-direct-deposit')
  }
  if (paymentMethod) {
    return t('advance-payment-cash')
  }
  return t('common-not-available')
}

export default function AdvancePaymentsDataBody({
  accessToken,
  t,
  payments,
  isLoading,
  error,
  totalCount,
  currentPage,
  pageSize,
  onPageChange,
  tableTopRef,
  hasActiveFilters,
  onSelectItem
}: Readonly<AdvancePaymentsDataBodyProps>) {
  const handleNavigateToPlanDetails = useCallback((record: AdvancePaymentRecord) => {
    if (!record.expensePlan?.id) {
      return
    }
    const url = buildPlatformUrl('/platform/fin/expenses/expense-plan-record', {
      expensePlanId: record.expensePlan.id,
      referrer: '/platform/fin/expenses/backoffice-expenses?tab=advance-payments'
    })
    navigateTo(url)
  }, [])

  const handleNavigateToRequestDetails = useCallback((record: AdvancePaymentRecord) => {
    const expenseRequest = Array.isArray(record.expensePlan?.expenseRequest)
      ? record.expensePlan.expenseRequest[0]
      : undefined
    if (!expenseRequest?.id) {
      return
    }
    const url = buildPlatformUrl('/platform/fin/expenses/expense-request-record', {
      expenseRequestId: expenseRequest.id,
      referrer: '/platform/fin/expenses/backoffice-expenses?tab=advance-payments'
    })
    navigateTo(url)
  }, [])

  const handleRowClick = useCallback(
    (event: MouseEvent<HTMLTableRowElement>, record: AdvancePaymentRecord) => {
      const target = event.target as HTMLElement
      const isActionButton = target.closest(ACTIONS_TEST_ID_SELECTOR)
      if (!isActionButton) {
        onSelectItem(record)
      }
    },
    [onSelectItem]
  )

  const buildActionButtonFlowData = useCallback(
    (record: AdvancePaymentRecord) => {
      const flows = [
        {
          category: t('action-navigations'),
          key: 'view-advance-payment-details',
          label: t('advance-payment-view-details'),
          onClick: withStoppedPropagation(() => onSelectItem(record))
        },
        {
          category: t('action-navigations'),
          key: 'view-plan-details',
          label: t('action-view-plan-details'),
          onClick: withStoppedPropagation(() => handleNavigateToPlanDetails(record))
        }
      ]

      if (hasExpenseRequest(record)) {
        flows.push({
          category: t('action-navigations'),
          key: 'view-request-details',
          label: t('action-view-request-details'),
          onClick: withStoppedPropagation(() => handleNavigateToRequestDetails(record))
        })
      }

      return flows
    },
    [handleNavigateToPlanDetails, handleNavigateToRequestDetails, onSelectItem, t]
  )

  const isShowingEmptyState = !isLoading && totalCount === 0 && payments.length === 0

  if (isLoading && payments.length === 0) {
    return (
      <div className="gba:flex gba:justify-center gba:p-8">
        <Spinner />
      </div>
    )
  }

  if (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return <Alert variant="destructive">{errorMessage}</Alert>
  }

  return (
    <div ref={tableTopRef} data-testid="advance-payments-scroll-anchor">
      <Card data-testid="advance-payments-container">
        <CardContent className="gba:p-0">
          {isLoading ? (
            <div className="gba:flex gba:justify-center gba:p-4">
              <Spinner />
            </div>
          ) : null}

          <div className="gba:overflow-x-auto gba:max-w-full gba:px-6">
            <Table data-testid="advance-payments-data-table" className="gba:w-max gba:min-w-full gba:table-fixed">
              <TableHeader>
                <TableRow className="gba:border-b gba:bg-muted">
                  <TableHead className="gba:w-16 gba:min-w-16 gba:max-w-16 gba:box-border">
                    {t('header-actions')}
                  </TableHead>
                  <TableHead className="gba:w-64">{t('header-title')}</TableHead>
                  <TableHead className="gba:w-56">{t('header-employee')}</TableHead>
                  <TableHead className="gba:w-56">{t('header-org-unit')}</TableHead>
                  <TableHead className="gba:w-44">{t('header-cost-center')}</TableHead>
                  <TableHead className="gba:w-36">{t('header-plan-id')}</TableHead>
                  <TableHead className="gba:w-36">{t('header-status')}</TableHead>
                  <TableHead className="gba:w-40 gba:text-right">{t('header-amount')}</TableHead>
                  <TableHead className="gba:w-40 gba:text-right">{t('header-advance')}</TableHead>
                  <TableHead className="gba:w-44">{t('header-payment-method')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isShowingEmptyState ? (
                  <TableRow>
                    <TableCell colSpan={10} className="gba:py-8 gba:text-center">
                      <div className="gba:text-muted-foreground">{getEmptyStateMessage(hasActiveFilters, t)}</div>
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map(payment => {
                    const record = payment as AdvancePaymentRecord
                    const status = getAdvancePaymentStatusDisplay(record.status || t('common-not-available'), t)
                    const currencyCode = record.currency?.code || record.expensePlan?.currency?.code || ''

                    return (
                      <TableRow
                        key={record.id}
                        onClick={event => handleRowClick(event, record)}
                        className="gba:cursor-pointer gba:hover:bg-muted"
                      >
                        <TableCell className="gba:w-16">
                          <div
                            className="gba:flex gba:justify-center gba:items-center"
                            onClick={event => event.stopPropagation()}
                          >
                            <AppActionButton
                              data-testid={`advance-payments-update-button-${record.id}`}
                              size="icon"
                              staticFlowData={buildActionButtonFlowData(record)}
                              prefixDataTestId="advance-payments-update"
                              accessToken={accessToken}
                              emptyStateBehavior="enable"
                              deferMainContextRequestsUntilClick
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div data-testid="advance-payment-title-cell">
                            {record.title || record.description || t('common-not-available')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div data-testid="advance-payment-reporter-cell">
                            {record.employeeFullName || t('common-not-available')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div data-testid="advance-payment-org-unit-cell">
                            {record.expensePlan?.employee?.employeePosition?.organizationalUnit?.name ||
                              t('common-not-available')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div data-testid="advance-payment-cost-center-cell">
                            {record.costCenter?.name || t('common-not-available')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div data-testid="advance-payment-plan-id-cell">
                            {record.expensePlan?.code || t('common-not-available')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div data-testid="advance-payment-status-cell">
                            <Badge variant={(status as StatusDisplayConfig).badgeVariant || 'outline'}>
                              {status.label}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="gba:text-right">
                          <span data-testid="advance-payment-amount-cell">
                            {formatNumberFunction(String(record.expensePlan?.totalAmount ?? '0'))} {currencyCode}
                          </span>
                        </TableCell>
                        <TableCell className="gba:text-right">
                          <span data-testid="advance-payment-advance-cell">
                            {formatNumberFunction(String(record.amount ?? '0'))} {currencyCode}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div data-testid="advance-payment-method-cell">
                            {getPaymentMethodLabel(record.paymentMethod, t)}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <TablePagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={totalCount}
            onPageChange={onPageChange}
            scrollTargetRef={tableTopRef}
            entityNamePlural={t('tab-advance-payments')}
            dataTestIdPrefix="advance-payments"
            showBorder={false}
          />
        </CardContent>
      </Card>
    </div>
  )
}
