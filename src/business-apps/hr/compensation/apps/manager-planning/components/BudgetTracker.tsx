import React from 'react'
import { Card, CardContent, Progress } from '@newwork/nw-design-system'
import { formatCurrency } from '@/common/utils/numberFormatter'

interface BudgetTrackerProps {
  label: string
  budget: number
  allocated: number
  currency: string
}

const BudgetItem: React.FC<BudgetTrackerProps> = ({ label, budget, allocated, currency }) => {
  const remaining = budget - allocated
  const percentage = budget > 0 ? Math.min((allocated / budget) * 100, 100) : 0
  const isOverBudget = allocated > budget

  return (
    <div className="gba:flex-1 gba:min-w-[200px]">
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-1">
        <span className="gba:text-sm gba:font-medium">{label}</span>
        <span className={`gba:text-sm gba:font-semibold ${isOverBudget ? 'gba:text-destructive' : ''}`}>
          {formatCurrency(remaining, currency)} remaining
        </span>
      </div>
      <Progress value={percentage} className="gba:h-2.5" />
      <div className="gba:flex gba:justify-between gba:mt-1">
        <span className="gba:text-xs gba:text-muted-foreground">{formatCurrency(allocated, currency)} allocated</span>
        <span className="gba:text-xs gba:text-muted-foreground">{formatCurrency(budget, currency)} budget</span>
      </div>
    </div>
  )
}

interface BudgetTrackerPanelProps {
  salaryBudget: number
  salaryAllocated: number
  bonusBudget: number
  bonusAllocated: number
  benefitsBudget: number
  benefitsAllocated: number
  currency: string
  showBonus?: boolean
  showBenefits?: boolean
}

export const BudgetTrackerPanel: React.FC<BudgetTrackerPanelProps> = ({
  salaryBudget,
  salaryAllocated,
  bonusBudget,
  bonusAllocated,
  benefitsBudget,
  benefitsAllocated,
  currency,
  showBonus = true,
  showBenefits = true
}) => {
  return (
    <Card className="gba:mb-4">
      <CardContent className="gba:p-4">
        <h3 className="gba:text-sm gba:font-semibold gba:mb-3">Budget Tracker</h3>
        <div className="gba:flex gba:gap-6 gba:flex-wrap">
          <BudgetItem label="Salary Increases" budget={salaryBudget} allocated={salaryAllocated} currency={currency} />
          {showBonus && (
            <BudgetItem label="Bonuses" budget={bonusBudget} allocated={bonusAllocated} currency={currency} />
          )}
          {showBenefits && (
            <BudgetItem label="Benefits" budget={benefitsBudget} allocated={benefitsAllocated} currency={currency} />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
