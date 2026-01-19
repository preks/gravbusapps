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
import { PiCalendar, PiGlobe, PiCurrencyDollar, PiUser, PiChatCircle } from 'react-icons/pi'
import useExpenseRequestDetails from '../../hooks/useExpenseRequestDetails'

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

  // Format currency amount
  const formatCurrency = (amount: number, currencyIdentifier: string = 'USD') => {
    // Extract currency code from API format (e.g., "Currency:v1:EUR" -> "EUR")
    const currencyCode = currencyIdentifier.includes(':')
      ? currencyIdentifier.split(':').pop() || 'EUR'
      : currencyIdentifier

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      currencyDisplay: 'code',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // ✅ MIGRATED: Custom Description components using nw-design-system
  const DescriptionsSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <Card className="gba:mb-6">
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

  // ✅ MIGRATED: Helper function to render the main content using nw-design-system
  const renderContent = () => {
    // Only show loading for expense requests (advance payments don't need to fetch data)
    if (type === 'expense-request' && loading) {
      return (
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-12">
          <Spinner />
          <p className="gba:text-gray-600 gba:text-sm gba:mt-4">Loading expense details...</p>
        </div>
      )
    }

    // Only show errors for expense requests (advance payments don't use the hook)
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
      return (
        <EmptyState
          description={`No ${type === 'advance-payment' ? 'advance payment' : 'expense'} details available`}
        />
      )
    }

    // Render content based on type
    if (type === 'advance-payment') {
      return (
        <div className="gba:space-y-6">
          {/* Basic Information for Advance Payment */}
          <DescriptionsSection title="Advance Payment Information">
            <DescriptionItem label="Payment Code">{data.code || 'N/A'}</DescriptionItem>
            <DescriptionItem label="Description">{data.description || 'N/A'}</DescriptionItem>
            <DescriptionItem label="Amount">{data.amount ? `€${data.amount}` : 'N/A'}</DescriptionItem>
          </DescriptionsSection>

          {/* Expense Plan Information */}
          {data.expensePlan && (
            <DescriptionsSection title="Expense Plan Information">
              <DescriptionItem label="Plan Code">{data.expensePlan.code || 'N/A'}</DescriptionItem>
              <DescriptionItem label="Plan Title">{data.expensePlan.title || 'N/A'}</DescriptionItem>
              <DescriptionItem label="Start Date">
                {data.expensePlan.startDate ? formatDate(data.expensePlan.startDate) : 'N/A'}
              </DescriptionItem>
            </DescriptionsSection>
          )}

          {/* Employee Information */}
          {data.expensePlan?.employee && (
            <DescriptionsSection title="Employee Information">
              <DescriptionItem label="Name">
                {`${data.expensePlan.employee.firstName || ''} ${data.expensePlan.employee.lastName || ''}`.trim() ||
                  'N/A'}
              </DescriptionItem>
              <DescriptionItem label="Employee Code">{data.expensePlan.employee.code || 'N/A'}</DescriptionItem>
            </DescriptionsSection>
          )}
        </div>
      )
    }

    // Default content for expense requests
    return (
      <div className="gba:space-y-6">
        {/* Basic Information */}
        <DescriptionsSection title="Basic Information">
          <DescriptionItem label="Request Code">{data.code}</DescriptionItem>
          <DescriptionItem label="Title">{data.title}</DescriptionItem>
          <DescriptionItem label="Description">{data.description}</DescriptionItem>
          <DescriptionItem label="Total Amount">{formatCurrency(data.totalAmount, data.currency)}</DescriptionItem>
          <DescriptionItem label="Created At">{formatDate(data.createdAt)}</DescriptionItem>
          <DescriptionItem label="Last Updated">{formatDate(data.updatedAt)}</DescriptionItem>
        </DescriptionsSection>

        {/* Employee Information */}
        <DescriptionsSection title="Employee Information">
          <DescriptionItem label="Name">
            {`${data.employee?.firstName || ''} ${data.employee?.lastName || ''}`.trim() || 'N/A'}
          </DescriptionItem>
          <DescriptionItem label="Employee Code">{data.employee?.businessKey || 'N/A'}</DescriptionItem>
          <DescriptionItem label="Email">{data.employee?.email || 'N/A'}</DescriptionItem>
          <DescriptionItem label="Cost Center">
            {data.costCenter ? `${data.costCenter.name} (${data.costCenter.code})` : 'N/A'}
          </DescriptionItem>
        </DescriptionsSection>

        {/* Trip Details */}
        <Card className="gba:mb-6">
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-lg gba:font-semibold gba:text-gray-900">
              <PiGlobe className="gba:h-5 gba:w-5" />
              Trip Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.trips && data.trips.length > 0 ? (
              <div className="gba:space-y-4">
                {data.trips.map((trip: any, index: number) => (
                  <ListItem
                    key={index}
                    title={trip.description || 'Trip Details'}
                    description={`Direction: ${trip.tripDirection || 'N/A'}`}
                  >
                    <div className="gba:space-y-2 gba:mt-2">
                      <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-gray-600">
                        <PiCalendar className="gba:h-4 gba:w-4" />
                        {formatDate(trip.tripDateTime)}
                      </div>
                      <div className="gba:text-sm gba:text-gray-600">
                        <strong>Destination:</strong> {trip.address}
                        {trip.country && ` (${trip.country.name})`}
                      </div>
                    </div>
                  </ListItem>
                ))}
              </div>
            ) : (
              <EmptyState description="No trip details available" />
            )}
          </CardContent>
        </Card>

        {/* Expense Items */}
        <Card className="gba:mb-6">
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-lg gba:font-semibold gba:text-gray-900">
              <PiCurrencyDollar className="gba:h-5 gba:w-5" />
              Expense Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.expenseItems && data.expenseItems.length > 0 ? (
              <div className="gba:space-y-3">
                {data.expenseItems.map((item: any, index: number) => (
                  <ListItem
                    key={index}
                    title={item.description || 'Expense Item'}
                    description={`Category: ${item.category || 'N/A'} | Type: ${item.itemType || 'N/A'}`}
                    amount={formatCurrency(item.totalAmount, item.currency?.code)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState description="No expense items available" />
            )}
          </CardContent>
        </Card>

        {/* Approval Metadata */}
        <Card className="gba:mb-6">
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-lg gba:font-semibold gba:text-gray-900">
              <PiUser className="gba:h-5 gba:w-5" />
              Approval Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.approvalMetadata && data.approvalMetadata.length > 0 ? (
              <div className="gba:space-y-4">
                {data.approvalMetadata.map((metadata: any, index: number) => (
                  <ListItem
                    key={index}
                    title={metadata.author || 'Unknown Approver'}
                    description={metadata.position || 'N/A'}
                  >
                    <div className="gba:space-y-2 gba:mt-2">
                      <div className="gba:text-sm gba:text-gray-600">
                        <strong>Date:</strong> {formatDate(metadata.date)}
                      </div>
                      <div className="gba:flex gba:items-start gba:gap-2 gba:text-sm gba:text-gray-600">
                        <PiChatCircle className="gba:h-4 gba:w-4 gba:mt-0.5 gba:flex-shrink-0" />
                        <span>{metadata.comment || 'No comment provided'}</span>
                      </div>
                    </div>
                  </ListItem>
                ))}
              </div>
            ) : (
              <EmptyState description="No approval information available" />
            )}
          </CardContent>
        </Card>
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
