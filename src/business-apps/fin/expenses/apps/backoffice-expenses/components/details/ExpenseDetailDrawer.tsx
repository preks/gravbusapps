/**
 * Expense Detail Drawer Component
 *
 * Displays detailed information about a selected expense request in a side drawer.
 * Includes trip details, expense items, allowances, and approval metadata.
 *
 * ✅ MIGRATED: Now uses @newwork/nw-design-system Sheet components
 */

import React from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Spinner,
  Alert,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  useTranslation
} from '@newwork/nw-design-system'
import { CalendarIcon, GlobeIcon, CurrencyDollarIcon, UserIcon, ChatCircleIcon } from '@phosphor-icons/react'
import translations from '../../_i18n'
import useExpenseRequestDetails from '../../hooks/useExpenseRequestDetails'
import { formatCurrency, extractCurrencyCode } from '../../utils/currencyUtils'
import { formatDateTimeLocalized } from '../../utils/dateUtils'
import { buildEmployeeDisplayName } from '../../hooks/backofficeReportUtils'

interface ExpenseDetailDrawerProps {
  visible: boolean
  expenseId: string | null
  onClose: () => void
  accessToken?: string
  type?: 'expense-request' | 'advance-payment'
  advancePaymentData?: any // For advance payments, we already have the data from the table
}

const ExpenseDetailDrawer: React.FC<ExpenseDetailDrawerProps> = ({
  visible,
  expenseId,
  onClose,
  accessToken,
  type = 'expense-request',
  advancePaymentData
}) => {
  const { t } = useTranslation(translations)

  // Use the custom hook to fetch expense request details only for expense requests
  const shouldFetchExpenseRequest = type === 'expense-request' && expenseId
  const {
    data: expenseRequestData,
    loading,
    error
  } = useExpenseRequestDetails({
    requestId: shouldFetchExpenseRequest ? expenseId : null,
    accessToken
  })

  // Use appropriate data based on type
  const data = type === 'advance-payment' ? advancePaymentData : expenseRequestData

  const formatDrawerCurrency = (amount: number, currencyIdentifier: string = 'EUR') =>
    formatCurrency(amount, extractCurrencyCode(currencyIdentifier) || 'EUR', 0)

  // ✅ MIGRATED: Custom Description components using nw-design-system
  const DescriptionsSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <Card className="gba:mb-6 gba:bg-card">
      <CardHeader>
        <CardTitle className="gba:text-lg gba:font-semibold gba:text-gray-900">{title}</CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-3">{children}</CardContent>
    </Card>
  )

  const DescriptionItem: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="gba:flex gba:justify-between gba:items-start gba:py-2 gba:border-b gba:border-gray-100 last:gba:border-b-0">
      <span className="gba:text-sm gba:font-medium gba:text-gray-700 gba:w-1/3">{label}</span>
      <span className="gba:text-sm gba:text-gray-900 gba:w-2/3 gba:text-right">{children}</span>
    </div>
  )

  const ListItem: React.FC<{ title: string; description?: string; amount?: string; children?: React.ReactNode }> = ({
    title,
    description,
    amount,
    children
  }) => (
    <div className="gba:p-4 gba:border gba:border-gray-200 gba:rounded-lg gba:mb-3">
      <div className="gba:flex gba:justify-between gba:items-start">
        <div className="gba:flex-1">
          <h4 className="gba:font-medium gba:text-gray-900">{title}</h4>
          {description && <p className="gba:text-sm gba:text-gray-600 gba:mt-1">{description}</p>}
          {children}
        </div>
        {amount && <span className="gba:text-sm gba:font-medium gba:text-gray-900 gba:ml-4">{amount}</span>}
      </div>
    </div>
  )

  const EmptyState: React.FC<{ description: string }> = ({ description }) => (
    <div className="gba:text-center gba:py-8">
      <p className="gba:text-gray-500 gba:text-sm">{description}</p>
    </div>
  )

  const renderCollectionCard = (config: {
    title: string
    icon: React.ReactNode
    hasItems: boolean
    emptyDescription: string
    content: React.ReactNode
  }) => (
    <Card className="gba:mb-6">
      <CardHeader>
        <CardTitle className="gba:text-lg gba:font-semibold gba:text-gray-900">
          <span className="gba:flex gba:items-center gba:gap-2">
            {config.icon}
            {config.title}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {config.hasItems ? config.content : <EmptyState description={config.emptyDescription} />}
      </CardContent>
    </Card>
  )

  const renderAdvancePaymentContent = (apData: any) => (
    <div className="gba:space-y-6">
      <DescriptionsSection title={t('drawer-advance-payment-info')}>
        <DescriptionItem label={t('drawer-payment-code')}>{apData.code || t('common-not-available')}</DescriptionItem>
        <DescriptionItem label={t('detail-description')}>
          {apData.description || t('common-not-available')}
        </DescriptionItem>
        <DescriptionItem label={t('header-amount')}>
          {apData.amount ? `€${apData.amount}` : t('common-not-available')}
        </DescriptionItem>
      </DescriptionsSection>

      {apData.expensePlan && (
        <DescriptionsSection title={t('drawer-expense-plan-info')}>
          <DescriptionItem label={t('drawer-plan-code')}>
            {apData.expensePlan.code || t('common-not-available')}
          </DescriptionItem>
          <DescriptionItem label={t('drawer-plan-title')}>
            {apData.expensePlan.title || t('common-not-available')}
          </DescriptionItem>
          <DescriptionItem label={t('header-start-date')}>
            {apData.expensePlan.startDate
              ? formatDateTimeLocalized(apData.expensePlan.startDate, t)
              : t('common-not-available')}
          </DescriptionItem>
        </DescriptionsSection>
      )}

      {apData.expensePlan?.employee && (
        <DescriptionsSection title={t('drawer-employee-info')}>
          <DescriptionItem label={t('drawer-name')}>
            {buildEmployeeDisplayName(apData.expensePlan.employee) || t('common-not-available')}
          </DescriptionItem>
          <DescriptionItem label={t('header-employee-code')}>
            {apData.expensePlan.employee.code || t('common-not-available')}
          </DescriptionItem>
        </DescriptionsSection>
      )}
    </div>
  )

  const renderContent = () => {
    if (type === 'expense-request' && loading) {
      return (
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-12">
          <Spinner />
          <p className="gba:text-gray-600 gba:text-sm gba:mt-4">{t('drawer-loading')}</p>
        </div>
      )
    }

    if (type === 'expense-request' && error) {
      return (
        <Alert variant="destructive" className="gba:m-4">
          <div>
            <h4 className="gba:font-semibold">{t('drawer-error-title')}</h4>
            <p className="gba:text-sm gba:mt-1">{t('drawer-error-message', { error: error.message })}</p>
          </div>
        </Alert>
      )
    }

    if (!data) {
      return (
        <EmptyState
          description={type === 'advance-payment' ? t('drawer-no-advance-details') : t('drawer-no-expense-details')}
        />
      )
    }

    if (type === 'advance-payment') {
      return renderAdvancePaymentContent(data)
    }

    // Default content for expense requests
    return (
      <div className="gba:space-y-6">
        {/* Basic Information */}
        <DescriptionsSection title={t('drawer-basic-info')}>
          <DescriptionItem label={t('drawer-request-code')}>{data.code}</DescriptionItem>
          <DescriptionItem label={t('header-title')}>{data.title}</DescriptionItem>
          <DescriptionItem label={t('detail-description')}>{data.description}</DescriptionItem>
          <DescriptionItem label={t('header-total-amount')}>
            {formatDrawerCurrency(data.reimbursableAmount, data.currency)}
          </DescriptionItem>
          <DescriptionItem label={t('header-creation-date')}>
            {formatDateTimeLocalized(data.createdAt, t)}
          </DescriptionItem>
          <DescriptionItem label={t('pvr-last-updated')}>{formatDateTimeLocalized(data.updatedAt, t)}</DescriptionItem>
        </DescriptionsSection>

        {/* Employee Information */}
        <DescriptionsSection title={t('drawer-employee-info')}>
          <DescriptionItem label={t('drawer-name')}>
            {buildEmployeeDisplayName(data.employee) || t('common-not-available')}
          </DescriptionItem>
          <DescriptionItem label={t('header-employee-code')}>
            {data.employee?.businessKey || t('common-not-available')}
          </DescriptionItem>
          <DescriptionItem label={t('drawer-email')}>
            {data.employee?.email || t('common-not-available')}
          </DescriptionItem>
          <DescriptionItem label={t('detail-cost-center')}>
            {data.costCenter ? `${data.costCenter.name} (${data.costCenter.code})` : t('common-not-available')}
          </DescriptionItem>
        </DescriptionsSection>

        {renderCollectionCard({
          title: t('drawer-trip-details'),
          icon: <GlobeIcon className="gba:h-5 gba:w-5" />,
          hasItems: Boolean(data.trips && data.trips.length > 0),
          emptyDescription: t('drawer-no-trip-details'),
          content: (
            <div className="gba:space-y-4">
              {data.trips?.map((trip: any, index: number) => (
                <ListItem
                  key={index}
                  title={trip.description || t('drawer-trip-details')}
                  description={t('drawer-direction', { direction: trip.tripDirection || t('common-not-available') })}
                >
                  <div className="gba:space-y-2 gba:mt-2">
                    <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-gray-600">
                      <CalendarIcon className="gba:h-4 gba:w-4" />
                      {formatDateTimeLocalized(trip.tripDateTime, t)}
                    </div>
                    <div className="gba:text-sm gba:text-gray-600">
                      <strong>{t('drawer-destination')}</strong> {trip.address}
                      {trip.country && ` (${trip.country.name})`}
                    </div>
                  </div>
                </ListItem>
              ))}
            </div>
          )
        })}

        {/* Expense Items */}
        {renderCollectionCard({
          title: t('detail-expense-items'),
          icon: <CurrencyDollarIcon className="gba:h-5 gba:w-5" />,
          hasItems: Boolean(data.expenseItems && data.expenseItems.length > 0),
          emptyDescription: t('drawer-no-expense-items'),
          content: (
            <div className="gba:space-y-3">
              {data.expenseItems?.map((item: any, index: number) => (
                <ListItem
                  key={index}
                  title={item.description || t('detail-expense-items')}
                  description={t('drawer-category-type', {
                    category: item.category || t('common-not-available'),
                    type: item.itemType || t('common-not-available')
                  })}
                  amount={formatDrawerCurrency(item.reimbursableAmount, item.currency?.code)}
                />
              ))}
            </div>
          )
        })}

        {/* Approval Metadata */}
        {renderCollectionCard({
          title: t('drawer-approval-info'),
          icon: <UserIcon className="gba:h-5 gba:w-5" />,
          hasItems: Boolean(data.approvalMetadata && data.approvalMetadata.length > 0),
          emptyDescription: t('drawer-no-approval-info'),
          content: (
            <div className="gba:space-y-4">
              {data.approvalMetadata?.map((metadata: any, index: number) => (
                <ListItem
                  key={index}
                  title={metadata.author || t('drawer-unknown-approver')}
                  description={metadata.position || t('common-not-available')}
                >
                  <div className="gba:space-y-2 gba:mt-2">
                    <div className="gba:text-sm gba:text-gray-600">
                      <strong>{t('drawer-date-label')}</strong> {formatDateTimeLocalized(metadata.date, t)}
                    </div>
                    <div className="gba:flex gba:items-start gba:gap-2 gba:text-sm gba:text-gray-600">
                      <ChatCircleIcon className="gba:h-4 gba:w-4 gba:mt-0.5 gba:flex-shrink-0" />
                      <span>{metadata.comment || t('drawer-no-comment')}</span>
                    </div>
                  </div>
                </ListItem>
              ))}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <Sheet
      open={visible}
      onOpenChange={onClose}
      title={type === 'advance-payment' ? t('advance-payment-details-title') : t('detail-expense-request-details')}
    >
      <SheetContent className="gba:w-[600px] gba:sm:w-[600px] gba:max-w-none !gba:z-[99999]" style={{ zIndex: 99999 }}>
        <SheetHeader>
          <SheetTitle className="gba:text-xl gba:font-semibold gba:text-foreground">
            {type === 'advance-payment' ? t('advance-payment-details-title') : t('detail-expense-request-details')}
          </SheetTitle>
        </SheetHeader>
        <div className="gba:mt-6 gba:px-6 gba:overflow-y-auto gba:max-h-[calc(100vh-120px)]">{renderContent()}</div>
      </SheetContent>
    </Sheet>
  )
}

export default ExpenseDetailDrawer
