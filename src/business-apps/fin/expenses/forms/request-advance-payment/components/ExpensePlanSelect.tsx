import React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import { ExpensePlan } from '../hooks/useRequestAdvancePaymentData'
import { SelectFieldProps } from '../types/FormTypes'
import translations from '../_i18n'

interface ExpensePlanSelectProps extends Omit<SelectFieldProps, 'disabled'> {
  plans: ExpensePlan[]
}

const ExpensePlanSelect: React.FC<ExpensePlanSelectProps> = ({
  plans,
  value,
  onChange,
  'data-testid': dataTestId = 'request-advance-payment-expense-plan-field'
}) => {
  const { t } = useTranslation(translations)

  return (
    <div className="gba:mb-6 gba:bg-gray-100" data-testid={dataTestId}>
      <label className="gba:block gba:text-xs gba:font-medium gba:text-black  gba:px-3 gba:py-1 gba:rounded">
        {t('expense-plan-label')}
        <span className="gba:text-muted-foreground"> *</span>
      </label>
      {plans.length > 0 ? (
        <Select value={value} onValueChange={onChange} data-testid="request-advance-payment-expense-plan-select">
          <SelectTrigger
            className="gba:h-10 gba:bg-gray-100 gba:border-none"
            style={{ width: '100%', justifyContent: 'space-between' }}
          >
            <SelectValue placeholder={t('expense-plan-placeholder')} />
          </SelectTrigger>
          <SelectContent>
            {plans.map(plan => (
              <SelectItem key={plan.id} value={plan.id}>
                {plan.code} - {plan.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="gba:w-full gba:h-10 gba:bg-gray-100 gba:border-none gba:flex gba:items-center gba:justify-between gba:px-3">
          <span className="gba:text-gray-500 gba:text-sm">{t('no-expense-plans')}</span>
          <div className="gba:w-4 gba:h-4 gba:flex gba:items-center gba:justify-center">
            <svg className="gba:w-4 gba:h-4 gba:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      )}
    </div>
  )
}

export default ExpensePlanSelect
