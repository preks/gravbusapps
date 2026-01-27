import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, Separator } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel, getCatalogValue } from '@/common/utils/windowUtils'
import { formatCurrencyDisplay } from '../../expense-plan-record/utils/currency'
import { ExpensePosition } from '../types/expenseRequestRecord.types'

interface ExpensePositionsSectionProps {
  positions: ExpensePosition[]
  currencyCode?: string
}

/**
 * Component to display expense positions with their amounts
 * Used in the expense item details sidebar for multi-position items
 */
const ExpensePositionsSection: React.FC<ExpensePositionsSectionProps> = ({ positions, currencyCode }) => {
  if (!positions || positions.length <= 1) {
    return null
  }

  const formatAmount = (amount: number) => formatCurrencyDisplay(amount, currencyCode)

  return (
    <Card className="gba:mt-4" data-testid="expense-positions-section">
      <CardHeader className="gba:pb-2">
        <CardTitle className="gba:text-base gba:font-semibold">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:create_expense_type_item.multi_position_item',
            'Expense Positions'
          )}
          <span className="gba:ml-2 gba:text-sm gba:font-normal gba:text-muted-foreground">({positions.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:pt-0">
        <div className="gba:space-y-3">
          {positions.map((position, index) => {
            const expenseGroupLabel = getCatalogValue(position.expenseGroup) || position.expenseGroup?.value || '-'
            const positionKey = position.positionOrder ?? index

            return (
              <div key={positionKey} data-testid={`expense-position-${index}`}>
                {index > 0 && <Separator className="gba:my-3" />}
                <div className="gba:space-y-2">
                  {/* Position header with expense group */}
                  <div className="gba:flex gba:justify-between gba:items-center">
                    <span className="gba:font-medium gba:text-sm" data-testid={`expense-position-group-${index}`}>
                      {expenseGroupLabel}
                    </span>
                    {position.costCenter?.name && (
                      <span
                        className="gba:text-xs gba:text-muted-foreground"
                        data-testid={`expense-position-cost-center-${index}`}
                      >
                        {position.costCenter.name}
                      </span>
                    )}
                  </div>

                  {/* Amount details */}
                  <div className="gba:grid gba:grid-cols-2 gba:gap-2 gba:text-sm">
                    <div className="gba:flex gba:justify-between">
                      <span className="gba:text-muted-foreground">
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:expense_request_list.expense_plan_table.total_amount',
                          'Total'
                        )}
                      </span>
                      <span className="gba:font-medium" data-testid={`expense-position-total-${index}`}>
                        {formatAmount(position.totalAmount)}
                      </span>
                    </div>
                    <div className="gba:flex gba:justify-between">
                      <span className="gba:text-muted-foreground">
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:expense_item_request_card.reimbursable',
                          'Reimbursable'
                        )}
                      </span>
                      <span data-testid={`expense-position-reimbursable-${index}`}>
                        {formatAmount(position.reimbursableAmount)}
                      </span>
                    </div>
                    {position.deductibleAmount > 0 && (
                      <div className="gba:flex gba:justify-between">
                        <span className="gba:text-muted-foreground">
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:expense_calculation_rule_details.calculation_rule_tab_other_calculation.deductible',
                            'Deductible'
                          )}
                        </span>
                        <span data-testid={`expense-position-deductible-${index}`}>
                          {formatAmount(position.deductibleAmount)}
                        </span>
                      </div>
                    )}
                    {position.nonDeductibleAmount > 0 && (
                      <div className="gba:flex gba:justify-between">
                        <span className="gba:text-muted-foreground">
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:expense_records.plan.non_deductible',
                            'Non-Deductible'
                          )}
                        </span>
                        <span data-testid={`expense-position-non-deductible-${index}`}>
                          {formatAmount(position.nonDeductibleAmount)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export default ExpensePositionsSection
