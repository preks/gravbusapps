import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge, Label } from '@newwork/nw-design-system'
import { PiCurrencyCircleDollar, PiCalendarDuotone, PiMapPin } from 'react-icons/pi'
import { formatDate } from '@/common/utils/windowUtils'
import { ExpenseAllowance } from '../types/expensePlanV2Types'

interface DetailedAllowancesSectionProps {
  allowances: ExpenseAllowance[]
  currencyCode: string
  formatCurrency: (amount: number, currencyCode: string) => string
  getCatalogValue: (catalogEntry: any) => string
  prefixDataTestId?: string
}

const DetailedAllowancesSection: React.FC<DetailedAllowancesSectionProps> = ({
  allowances,
  currencyCode,
  formatCurrency,
  getCatalogValue,
  prefixDataTestId = 'approve-expense-plan-v2'
}) => {
  if (!allowances || allowances.length === 0) {
    return null
  }

  return (
    <Card data-testid={`${prefixDataTestId}-allowances`}>
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <PiCurrencyCircleDollar className="gba:h-5 gba:w-5" />
          Daily Allowances ({allowances.length} days)
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-3">
        {allowances.map((allowance, index) => (
          <div
            key={allowance.id || `allowance-${allowance.allowanceDate}-${index}`}
            className="gba:border gba:border-border gba:rounded-lg gba:p-3 gba:space-y-2"
          >
            {/* Date and Day Rate */}
            <div className="gba:flex gba:justify-between gba:items-center">
              <div className="gba:flex gba:items-center gba:gap-2">
                <PiCalendarDuotone className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                <span className="gba:text-sm gba:font-medium">{formatDate(allowance.allowanceDate)}</span>
              </div>
              <div className="gba:text-right">
                <Label className="gba:text-xs gba:text-muted-foreground">Day Rate</Label>
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
                  <Label className="gba:text-xs gba:text-muted-foreground">Region</Label>
                  <p className="gba:text-sm">
                    {getCatalogValue(allowance.travelRegion) ||
                      allowance.travelRegion.value.split(':').pop() ||
                      allowance.travelRegion.value}
                  </p>
                </div>
              </div>
            )}

            {/* Meal & Accommodation Info */}
            <div className="gba:flex gba:flex-wrap gba:gap-2 gba:pt-2">
              {allowance.breakfast && (
                <Badge variant="outline" className="gba:text-xs">
                  🍳 Breakfast
                </Badge>
              )}
              {allowance.lunch && (
                <Badge variant="outline" className="gba:text-xs">
                  🍽️ Lunch
                </Badge>
              )}
              {allowance.dinner && (
                <Badge variant="outline" className="gba:text-xs">
                  🍷 Dinner
                </Badge>
              )}
              {allowance.overnight && (
                <Badge variant="info" className="gba:text-xs">
                  🌙 Overnight
                </Badge>
              )}
              {allowance.overnightAccommodation && (
                <Badge variant="info" className="gba:text-xs">
                  🏨 Hotel
                </Badge>
              )}
            </div>

            {/* Deduction Limit */}
            {allowance.deductionLimit > 0 && (
              <div className="gba:flex gba:justify-between gba:items-center gba:pt-2 gba:border-t gba:border-border">
                <Label className="gba:text-xs gba:text-muted-foreground">Deduction Limit</Label>
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
