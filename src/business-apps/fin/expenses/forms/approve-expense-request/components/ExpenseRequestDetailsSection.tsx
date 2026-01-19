import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge, Separator, Label, Spinner } from '@newwork/nw-design-system'
import { PiReceipt } from 'react-icons/pi'
import { formatDateTime } from '@/common/utils/dateFormatter'

interface ExpenseRequestDetailsSectionProps {
  expenseRequest: {
    code?: string
    title?: string
    description?: string
    costCenter?: { name?: string }
    project?: { name?: string }
    currency?: { code?: string }
    requestType?: { code?: string }
  }
  requestCreatedAt?: string | null
  isLoadingRequestDate?: boolean
  prefixDataTestId?: string
  t: (key: string) => string
}

const ExpenseRequestDetailsSection: React.FC<ExpenseRequestDetailsSectionProps> = ({
  expenseRequest,
  requestCreatedAt,
  isLoadingRequestDate = false,
  prefixDataTestId = 'approve-expense-request-v2',
  t
}) => {
  // Format request type for display
  const formatRequestType = (requestTypeCode?: string) => {
    if (!requestTypeCode) return '-'
    const typeLower = requestTypeCode.toLowerCase()
    if (typeLower.includes('trip')) {
      return t('request-type-trip')
    }
    if (typeLower.includes('expense')) {
      return t('request-type-expenses')
    }
    return requestTypeCode
  }

  return (
    <Card data-testid={`${prefixDataTestId}-request-details-section`}>
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <PiReceipt className="gba:h-5 gba:w-5" />
          {t('section-expense-request-details')}
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-3">
        {/* Request ID and Type */}
        {expenseRequest.requestType ? (
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            {/* Request ID */}
            <div>
              <Label className="gba:text-sm gba:text-muted-foreground">{t('label-request-id')}</Label>
              <p className="gba:text-sm gba:font-medium">{expenseRequest.code || '-'}</p>
            </div>

            {/* Request Type */}
            <div>
              <Label className="gba:text-sm gba:text-muted-foreground">{t('label-type')}</Label>
              <div className="gba:mt-1">
                <Badge variant="info">{formatRequestType(expenseRequest.requestType.code)}</Badge>
              </div>
            </div>
          </div>
        ) : (
          <div className="gba:flex gba:justify-between gba:items-center">
            <Label className="gba:text-sm gba:text-muted-foreground">{t('label-request-id')}</Label>
            <p className="gba:text-sm gba:font-medium">{expenseRequest.code || '-'}</p>
          </div>
        )}

        {(expenseRequest.title || expenseRequest.description) && <Separator />}

        {/* Title */}
        {expenseRequest.title && (
          <div>
            <Label className="gba:text-sm gba:text-muted-foreground">{t('label-title')}</Label>
            <p className="gba:text-sm gba:font-medium">{expenseRequest.title}</p>
          </div>
        )}

        {/* Comment/Description */}
        {expenseRequest.description && (
          <>
            {expenseRequest.title && <Separator />}
            <div>
              <Label className="gba:text-sm gba:text-muted-foreground">{t('label-comment')}</Label>
              <p className="gba:text-sm gba:text-muted-foreground gba:whitespace-pre-wrap">
                {expenseRequest.description}
              </p>
            </div>
          </>
        )}

        {(expenseRequest.costCenter?.name || expenseRequest.project?.name) && <Separator />}

        {/* Cost Center and Project */}
        <div className="gba:grid gba:grid-cols-2 gba:gap-4">
          {/* Cost Center */}
          {expenseRequest.costCenter?.name && (
            <div>
              <Label className="gba:text-sm gba:text-muted-foreground">{t('label-cost-center')}</Label>
              <p className="gba:text-sm gba:font-medium">{expenseRequest.costCenter.name}</p>
            </div>
          )}

          {/* Project */}
          {expenseRequest.project?.name && (
            <div>
              <Label className="gba:text-sm gba:text-muted-foreground">{t('label-project')}</Label>
              <p className="gba:text-sm gba:font-medium">{expenseRequest.project.name}</p>
            </div>
          )}
        </div>

        {expenseRequest.currency?.code && <Separator />}

        {/* Currency */}
        {expenseRequest.currency?.code && (
          <div>
            <Label className="gba:text-sm gba:text-muted-foreground">{t('label-currency')}</Label>
            <p className="gba:text-sm gba:font-medium">{expenseRequest.currency.code}</p>
          </div>
        )}

        {requestCreatedAt && <Separator />}

        {/* Request Created - Show when available */}
        {requestCreatedAt && (
          <div>
            <Label className="gba:text-sm gba:text-muted-foreground">{t('label-request-created')}</Label>
            <p className="gba:text-sm gba:font-medium">
              {isLoadingRequestDate ? <Spinner size="sm" /> : formatDateTime(requestCreatedAt)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ExpenseRequestDetailsSection
