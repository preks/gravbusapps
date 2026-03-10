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
  CardTitle
} from '@newwork/nw-design-system'
import { CalendarIcon, GlobeIcon, CurrencyDollarIcon, UserIcon, ChatCircleIcon } from '@phosphor-icons/react'
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
      <DescriptionsSection title="Advance Payment Information">
        <DescriptionItem label="Payment Code">{apData.code || 'N/A'}</DescriptionItem>
        <DescriptionItem label="Description">{apData.description || 'N/A'}</DescriptionItem>
        <DescriptionItem label="Amount">{apData.amount ? `€${apData.amount}` : 'N/A'}</DescriptionItem>
      </DescriptionsSection>

      {apData.expensePlan && (
        <DescriptionsSection title="Expense Plan Information">
          <DescriptionItem label="Plan Code">{apData.expensePlan.code || 'N/A'}</DescriptionItem>
          <DescriptionItem label="Plan Title">{apData.expensePlan.title || 'N/A'}</DescriptionItem>
          <DescriptionItem label="Start Date">
            {apData.expensePlan.startDate ? formatDateTimeLocalized(apData.expensePlan.startDate) : 'N/A'}
          </DescriptionItem>
        </DescriptionsSection>
      )}

      {apData.expensePlan?.employee && (
        <DescriptionsSection title="Employee Information">
          <DescriptionItem label="Name">
            {buildEmployeeDisplayName(apData.expensePlan.employee) || 'N/A'}
          </DescriptionItem>
          <DescriptionItem label="Employee Code">{apData.expensePlan.employee.code || 'N/A'}</DescriptionItem>
        </DescriptionsSection>
      )}
    </div>
  )

  const renderContent = () => {
    if (type === 'expense-request' && loading) {
      return (
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-12">
          <Spinner />
          <p className="gba:text-gray-600 gba:text-sm gba:mt-4">Loading expense details...</p>
        </div>
      )
    }

    if (type === 'expense-request' && error) {
      return (
        <Alert variant="destructive" className="gba:m-4">
          <div>
            <h4 className="gba:font-semibold">Error Loading Details</h4>
            <p className="gba:text-sm gba:mt-1">Failed to load expense details: {error.message}</p>
          </div>
        </Alert>
      )
    }

    if (!data) {
      const label = type === 'advance-payment' ? 'advance payment' : 'expense'
      return <EmptyState description={`No ${label} details available`} />
    }

    if (type === 'advance-payment') {
      return renderAdvancePaymentContent(data)
    }

    // Default content for expense requests
    return (
      <div className="gba:space-y-6">
        {/* Basic Information */}
        <DescriptionsSection title="Basic Information">
          <DescriptionItem label="Request Code">{data.code}</DescriptionItem>
          <DescriptionItem label="Title">{data.title}</DescriptionItem>
          <DescriptionItem label="Description">{data.description}</DescriptionItem>
          <DescriptionItem label="Total Amount">
            {formatDrawerCurrency(data.reimbursableAmount, data.currency)}
          </DescriptionItem>
          <DescriptionItem label="Created At">{formatDateTimeLocalized(data.createdAt)}</DescriptionItem>
          <DescriptionItem label="Last Updated">{formatDateTimeLocalized(data.updatedAt)}</DescriptionItem>
        </DescriptionsSection>

        {/* Employee Information */}
        <DescriptionsSection title="Employee Information">
          <DescriptionItem label="Name">{buildEmployeeDisplayName(data.employee) || 'N/A'}</DescriptionItem>
          <DescriptionItem label="Employee Code">{data.employee?.businessKey || 'N/A'}</DescriptionItem>
          <DescriptionItem label="Email">{data.employee?.email || 'N/A'}</DescriptionItem>
          <DescriptionItem label="Cost Center">
            {data.costCenter ? `${data.costCenter.name} (${data.costCenter.code})` : 'N/A'}
          </DescriptionItem>
        </DescriptionsSection>

        {renderCollectionCard({
          title: 'Trip Details',
          icon: <GlobeIcon className="gba:h-5 gba:w-5" />,
          hasItems: Boolean(data.trips && data.trips.length > 0),
          emptyDescription: 'No trip details available',
          content: (
            <div className="gba:space-y-4">
              {data.trips?.map((trip: any, index: number) => (
                <ListItem
                  key={index}
                  title={trip.description || 'Trip Details'}
                  description={`Direction: ${trip.tripDirection || 'N/A'}`}
                >
                  <div className="gba:space-y-2 gba:mt-2">
                    <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-gray-600">
                      <CalendarIcon className="gba:h-4 gba:w-4" />
                      {formatDateTimeLocalized(trip.tripDateTime)}
                    </div>
                    <div className="gba:text-sm gba:text-gray-600">
                      <strong>Destination:</strong> {trip.address}
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
          title: 'Expense Items',
          icon: <CurrencyDollarIcon className="gba:h-5 gba:w-5" />,
          hasItems: Boolean(data.expenseItems && data.expenseItems.length > 0),
          emptyDescription: 'No expense items available',
          content: (
            <div className="gba:space-y-3">
              {data.expenseItems?.map((item: any, index: number) => (
                <ListItem
                  key={index}
                  title={item.description || 'Expense Item'}
                  description={`Category: ${item.category || 'N/A'} | Type: ${item.itemType || 'N/A'}`}
                  amount={formatDrawerCurrency(item.reimbursableAmount, item.currency?.code)}
                />
              ))}
            </div>
          )
        })}

        {/* Approval Metadata */}
        {renderCollectionCard({
          title: 'Approval Information',
          icon: <UserIcon className="gba:h-5 gba:w-5" />,
          hasItems: Boolean(data.approvalMetadata && data.approvalMetadata.length > 0),
          emptyDescription: 'No approval information available',
          content: (
            <div className="gba:space-y-4">
              {data.approvalMetadata?.map((metadata: any, index: number) => (
                <ListItem
                  key={index}
                  title={metadata.author || 'Unknown Approver'}
                  description={metadata.position || 'N/A'}
                >
                  <div className="gba:space-y-2 gba:mt-2">
                    <div className="gba:text-sm gba:text-gray-600">
                      <strong>Date:</strong> {formatDateTimeLocalized(metadata.date)}
                    </div>
                    <div className="gba:flex gba:items-start gba:gap-2 gba:text-sm gba:text-gray-600">
                      <ChatCircleIcon className="gba:h-4 gba:w-4 gba:mt-0.5 gba:flex-shrink-0" />
                      <span>{metadata.comment || 'No comment provided'}</span>
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
      title={type === 'advance-payment' ? 'Advance Payment Details' : 'Expense Request Details'}
    >
      <SheetContent className="gba:w-[600px] gba:sm:w-[600px] gba:max-w-none !gba:z-[99999]" style={{ zIndex: 99999 }}>
        <SheetHeader>
          <SheetTitle className="gba:text-xl gba:font-semibold gba:text-foreground">
            {type === 'advance-payment' ? 'Advance Payment Details' : 'Expense Request Details'}
          </SheetTitle>
        </SheetHeader>
        <div className="gba:mt-6 gba:px-6 gba:overflow-y-auto gba:max-h-[calc(100vh-120px)]">{renderContent()}</div>
      </SheetContent>
    </Sheet>
  )
}

export default ExpenseDetailDrawer
