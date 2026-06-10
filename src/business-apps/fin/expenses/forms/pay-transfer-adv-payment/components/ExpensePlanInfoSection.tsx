import React from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Separator,
  Label,
  Avatar,
  useTranslation
} from '@newwork/nw-design-system'
import { ReceiptIcon } from '@phosphor-icons/react'
import { ExpensePlan } from '../types'
import { formatCurrency } from '../utils/formatters'
import translations from '../_i18n'

interface ExpensePlanInfoSectionProps {
  expensePlan: ExpensePlan
  prefixDataTestId?: string
}

const ExpensePlanInfoSection: React.FC<ExpensePlanInfoSectionProps> = ({
  expensePlan,
  prefixDataTestId = 'pay-transfer-adv-payment-v2'
}) => {
  const { t } = useTranslation(translations)

  const formatRequestType = (requestTypeCode?: string) => {
    if (!requestTypeCode) {
      return '-'
    }

    const typeLower = requestTypeCode.toLowerCase()
    if (typeLower.includes('trip')) {
      return t('request-type-trip')
    }
    if (typeLower.includes('expense')) {
      return t('request-type-expenses')
    }

    return requestTypeCode
  }

  const displayName =
    `${expensePlan.employee?.firstName || ''} ${expensePlan.employee?.lastName || ''}`.trim() || 'Employee'

  return (
    <Card data-testid={`${prefixDataTestId}-expense-plan-info-section`}>
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <ReceiptIcon className="gba:h-5 gba:w-5" />
          {t('section-expense-plan')}
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-3">
        <div className="gba:flex gba:items-center gba:gap-4">
          {expensePlan.employee?.pictureThumbnail ? (
            <img
              src={`data:image/jpeg;base64,${expensePlan.employee.pictureThumbnail}`}
              alt={displayName}
              className="gba:w-12 gba:h-12 gba:rounded-full gba:object-cover gba:flex-shrink-0"
              data-testid="employee-avatar"
            />
          ) : (
            <Avatar className="gba:w-12 gba:h-12 gba:bg-blue-500 gba:flex-shrink-0" data-testid="employee-avatar">
              <span className="gba:text-lg gba:text-background">
                {expensePlan.employee?.firstName?.charAt(0) || 'A'}
              </span>
            </Avatar>
          )}
          <div className="gba:flex-1 gba:min-w-0">
            <div className="gba:font-semibold gba:text-foreground gba:break-words gba:leading-relaxed">
              {displayName}
            </div>
            {expensePlan.employee?.employeePosition?.jobPosition?.name && (
              <div className="gba:text-sm gba:text-muted-foreground gba:mt-1">
                {expensePlan.employee.employeePosition.jobPosition.name}
              </div>
            )}
          </div>
        </div>

        <Separator />

        {expensePlan.requestType ? (
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <div>
              <Label className="gba:text-sm gba:text-muted-foreground">{t('label-id')}</Label>
              <p className="gba:text-sm gba:font-medium gba:mt-1">{expensePlan.code || '-'}</p>
            </div>

            <div>
              <Label className="gba:text-sm gba:text-muted-foreground">{t('label-type')}</Label>
              <div className="gba:mt-1">
                <Badge variant="info">{formatRequestType(expensePlan.requestType.code)}</Badge>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <Label className="gba:text-sm gba:text-muted-foreground">{t('label-id')}</Label>
            <p className="gba:text-sm gba:font-medium gba:mt-1">{expensePlan.code || '-'}</p>
          </div>
        )}

        {Boolean(expensePlan.title || expensePlan.description) && <Separator />}

        {expensePlan.title && (
          <div>
            <Label className="gba:text-sm gba:text-muted-foreground">{t('label-title')}</Label>
            <p className="gba:text-sm gba:font-medium gba:mt-1">{expensePlan.title}</p>
          </div>
        )}

        {expensePlan.description && (
          <>
            {expensePlan.title && <Separator />}
            <div>
              <Label className="gba:text-sm gba:text-muted-foreground">{t('label-comment')}</Label>
              <p className="gba:text-sm gba:text-muted-foreground gba:mt-1 gba:whitespace-pre-wrap">
                {expensePlan.description}
              </p>
            </div>
          </>
        )}

        {Boolean(expensePlan.totalAmount) && <Separator />}

        {Boolean(expensePlan.totalAmount) && (
          <div>
            <Label className="gba:text-sm gba:text-muted-foreground">{t('label-amount')}</Label>
            <p className="gba:text-sm gba:font-semibold gba:mt-1">
              {formatCurrency(expensePlan.totalAmount, expensePlan.currency.code)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ExpensePlanInfoSection
