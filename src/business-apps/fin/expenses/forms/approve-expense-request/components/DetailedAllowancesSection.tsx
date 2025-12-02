import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge, Label } from '@newwork/nw-design-system'
import { PiCurrencyCircleDollar, PiCalendarDuotone, PiMapPin } from 'react-icons/pi'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDateTime } from '@/business-apps/core/every/apps/every-box/utils/taskFormatters'
import { ExpenseRequestAllowance } from '../types/expenseRequestV2Types'
import { getCatalogValue } from '../utils/formatters'

interface DetailedAllowancesSectionProps {
  allowances: ExpenseRequestAllowance[]
  currencyCode: string
  formatCurrency: (amount: number, currencyCode: string) => string
  prefixDataTestId?: string
}

const DetailedAllowancesSection: React.FC<DetailedAllowancesSectionProps> = ({
  allowances,
  currencyCode,
  formatCurrency,
  prefixDataTestId = 'approve-expense-request-v2'
}) => {
  if (!allowances || allowances.length === 0) {
    return null
  }

  return (
    <Card data-testid={`${prefixDataTestId}-allowances`}>
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <PiCurrencyCircleDollar className="gba:h-5 gba:w-5" />
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:approve_expense_request.allowances_header',
            'Daily Allowances'
          )}{' '}
          ({allowances.length} {getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_request.days', 'days')})
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-3">
        {allowances.map((allowance, index) => (
          <div
            key={allowance.id || `allowance-${allowance.allowanceDate}-${index}`}
            className="gba:border gba:border-border gba:rounded-lg gba:p-3 gba:space-y-2"
            data-testid={`${prefixDataTestId}-allowance-${index}`}
          >
            {/* Date and Day Rate */}
            <div className="gba:flex gba:justify-between gba:items-center">
              <div className="gba:flex gba:items-center gba:gap-2">
                <PiCalendarDuotone className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                <span className="gba:text-sm gba:font-medium">{formatDateTime(allowance.allowanceDate)}</span>
              </div>
              <div className="gba:text-right">
                <Label className="gba:text-xs gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_request.day_rate', 'Day Rate')}
                </Label>
                <p className="gba:text-sm gba:font-bold gba:text-primary">
                  {formatCurrency(allowance.dayRate, currencyCode)}
                </p>
              </div>
            </div>

            {/* Travel Region */}
            {allowance.travelRegion?.value && (
              <div className="gba:flex gba:items-start gba:gap-2">
                <PiMapPin className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:mt-0.5" />
                <div>
                  <Label className="gba:text-xs gba:text-muted-foreground">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:create_expense_request.add_request_trip_details.select_start_region_rule_label',
                      'Region'
                    )}
                  </Label>
                  <p className="gba:text-sm">
                    {getCatalogValue(allowance.travelRegion) ||
                      allowance.travelRegion.value.split(':').pop() ||
                      allowance.travelRegion.value}
                  </p>
                </div>
              </div>
            )}

            {/* Meal & Accommodation Info */}
            {(allowance.breakfast ||
              allowance.lunch ||
              allowance.dinner ||
              allowance.overnight ||
              allowance.overnightAccommodation) && (
              <div className="gba:flex gba:flex-wrap gba:gap-2 gba:pt-2">
                {allowance.breakfast && (
                  <Badge variant="outline" className="gba:text-xs">
                    🍳 {getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_request.breakfast', 'Breakfast')}
                  </Badge>
                )}
                {allowance.lunch && (
                  <Badge variant="outline" className="gba:text-xs">
                    🍽️ {getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_request.lunch', 'Lunch')}
                  </Badge>
                )}
                {allowance.dinner && (
                  <Badge variant="outline" className="gba:text-xs">
                    🍷 {getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_request.dinner', 'Dinner')}
                  </Badge>
                )}
                {allowance.overnight && (
                  <Badge variant="info" className="gba:text-xs">
                    🌙 {getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_request.overnight', 'Overnight')}
                  </Badge>
                )}
                {allowance.overnightAccommodation && (
                  <Badge variant="info" className="gba:text-xs">
                    🏨 {getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_request.hotel', 'Hotel')}
                  </Badge>
                )}
              </div>
            )}

            {/* Deduction Limit */}
            {allowance.deductionLimit && allowance.deductionLimit > 0 && (
              <div className="gba:flex gba:justify-between gba:items-center gba:pt-2 gba:border-t gba:border-border">
                <Label className="gba:text-xs gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:approve_expense_request.deduction_limit',
                    'Deduction Limit'
                  )}
                </Label>
                <p className="gba:text-xs gba:text-destructive">
                  -{formatCurrency(allowance.deductionLimit, currencyCode)}
                </p>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export default DetailedAllowancesSection
