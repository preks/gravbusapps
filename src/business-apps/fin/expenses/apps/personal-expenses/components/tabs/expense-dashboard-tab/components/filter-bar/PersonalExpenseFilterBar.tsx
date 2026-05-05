import React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  useTranslation
} from '@newwork/nw-design-system'
import { XIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { usePersonalFilterData } from '@/business-apps/fin/expenses/apps/personal-expenses/hooks/usePersonalFilterData'
import personalTranslations from '../../../../../_i18n'

type DashboardExpensePeriod = 'monthly' | 'quarterly' | 'yearly'

interface PersonalExpenseFilterBarProps extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  onFiltersChange: (filters: { currency?: string; period: DashboardExpensePeriod }) => void
  currentFilters: { currency?: string; period: DashboardExpensePeriod }
  'data-testid'?: string
}

const PersonalExpenseFilterBar: React.FC<PersonalExpenseFilterBarProps> = ({
  accessToken,
  userInfo,
  onFiltersChange,
  currentFilters,
  'data-testid': dataTestId = 'personal-expense-filter-bar'
}) => {
  const { t } = useTranslation(personalTranslations)
  const { currencies, loading, mostUsedCurrency } = usePersonalFilterData({
    accessToken,
    userInfo
  } as BusinessAppContextProps)

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
    const cleared = { ...currentFilters } as { currency?: string; period: 'monthly' | 'quarterly' | 'yearly' }
    if (key === 'currency') cleared.currency = undefined
    if (key === 'period') cleared.period = 'monthly'
    onFiltersChange(cleared)
  }

  return (
    <div
      className="gba:flex gba:items-center gba:gap-4 gba:py-4 gba:px-6 gba:bg-gray-50 gba:border-b gba:border-gray-200"
      data-testid={dataTestId}
    >
      <div className="gba:relative gba:flex gba:items-center">
        <Select
          value={currentFilters.currency || ''}
          onValueChange={value => handleChange('currency', value)}
          disabled={loading}
          data-testid="currency-filter-select"
        >
          <SelectTrigger className="gba:w-[140px] gba:border-gray-300">
            <SelectValue
              placeholder={loading ? t('dashboard-filter-loading') : t('dashboard-filter-currency-placeholder')}
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
            <XIcon className="gba:h-3 gba:w-3" />
          </Button>
        )}
      </div>

      <div className="gba:relative gba:flex gba:items-center">
        <Select
          value={currentFilters.period}
          onValueChange={value => handleChange('period', value)}
          disabled={loading}
          data-testid="period-filter-select"
        >
          <SelectTrigger className="gba:w-[140px] gba:border-gray-300">
            <SelectValue placeholder={t('dashboard-filter-period-placeholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">{t('dashboard-filter-period-monthly')}</SelectItem>
            <SelectItem value="quarterly">{t('dashboard-filter-period-quarterly')}</SelectItem>
            <SelectItem value="yearly">{t('dashboard-filter-period-yearly')}</SelectItem>
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
            <XIcon className="gba:h-3 gba:w-3" />
          </Button>
        )}
      </div>
    </div>
  )
}

export default PersonalExpenseFilterBar
