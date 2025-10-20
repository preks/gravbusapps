import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Button } from '@newwork/nw-design-system'
import { X } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { usePersonalFilterData } from '@/business-apps/fin/expenses/apps/personal-expenses/hooks/usePersonalFilterData'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface PersonalExpenseFilterBarProps extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  onFiltersChange: (filters: { currency?: string; period: 'monthly' | 'quarterly' | 'yearly' }) => void
  currentFilters: { currency?: string; period: 'monthly' | 'quarterly' | 'yearly' }
  'data-testid'?: string
}

const PersonalExpenseFilterBar: React.FC<PersonalExpenseFilterBarProps> = ({
  accessToken,
  userInfo,
  onFiltersChange,
  currentFilters,
  'data-testid': dataTestId = 'personal-expense-filter-bar'
}) => {
  const { currencies, loading, mostUsedCurrency } = usePersonalFilterData({
    accessToken,
    userInfo
  } as BusinessAppContextProps)

  // Initialize defaults: most used currency and monthly period
  React.useEffect(() => {
    if (!loading) {
      const next = { ...currentFilters }
      let changed = false
      if (!next.currency && mostUsedCurrency) {
        next.currency = mostUsedCurrency
        changed = true
      }
      if (!next.period) {
        next.period = 'monthly'
        changed = true
      }
      if (changed) {
        onFiltersChange(next)
      }
    }
  }, [loading, mostUsedCurrency, onFiltersChange, currentFilters])
  const handleChange = (key: 'currency' | 'period', value: string) => {
    onFiltersChange({ ...currentFilters, [key]: value })
  }

  const clear = (key: 'currency' | 'period') => {
    const cleared = { ...currentFilters } as any
    if (key === 'currency') cleared.currency = undefined
    if (key === 'period') cleared.period = 'monthly'
    onFiltersChange(cleared)
  }

  return (
    <div
      className="gba:flex gba:items-center gba:gap-4 gba:py-4 gba:px-6 gba:bg-gray-50 gba:border-b gba:border-gray-200"
      data-testid={dataTestId}
    >
      {/* Currency */}
      <div className="gba:relative gba:flex gba:items-center">
        <Select
          value={currentFilters.currency || ''}
          onValueChange={value => handleChange('currency', value)}
          disabled={loading}
          data-testid="currency-filter-select"
        >
          <SelectTrigger className="gba:w-[140px] gba:border-gray-300">
            <SelectValue
              placeholder={
                loading ? 'Loading...' : getTranslationFromI18nKeyAndLabel('lowcoder:cards.currency_label', 'Currency')
              }
            />
          </SelectTrigger>
          <SelectContent>
            {currencies.map(c => (
              <SelectItem key={c.currencyRef} value={c.currencyRef}>
                {c.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {currentFilters.currency && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => clear('currency')}
            className="gba:ml-1 gba:p-1 gba:h-6 gba:w-6 gba:min-w-0"
            data-testid="clear-currency-filter"
          >
            <X className="gba:h-3 gba:w-3" />
          </Button>
        )}
      </div>

      {/* Period */}
      <div className="gba:relative gba:flex gba:items-center">
        <Select
          value={currentFilters.period}
          onValueChange={value => handleChange('period', value)}
          disabled={loading}
          data-testid="period-filter-select"
        >
          <SelectTrigger className="gba:w-[140px] gba:border-gray-300">
            <SelectValue placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:cards.period', 'Period')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">
              {getTranslationFromI18nKeyAndLabel('lowcoder:cards.monthly', 'Monthly')}
            </SelectItem>
            <SelectItem value="quarterly">
              {getTranslationFromI18nKeyAndLabel('lowcoder:cards.quartely', 'Quarterly')}
            </SelectItem>
            <SelectItem value="yearly">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:expense_calculation_rule_details.mileage_rule_list.mileage_expense_module.rule_period_yearly',
                'Yearly'
              )}
            </SelectItem>
          </SelectContent>
        </Select>
        {currentFilters.period !== 'monthly' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => clear('period')}
            className="gba:ml-1 gba:p-1 gba:h-6 gba:w-6 gba:min-w-0"
            data-testid="clear-period-filter"
          >
            <X className="gba:h-3 gba:w-3" />
          </Button>
        )}
      </div>
    </div>
  )
}

export default PersonalExpenseFilterBar
