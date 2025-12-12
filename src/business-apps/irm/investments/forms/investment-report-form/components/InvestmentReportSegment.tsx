import React, { useMemo } from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  DateInput,
  Combobox,
  useTranslation
} from '@newwork/nw-design-system'
import { UseFormReturn } from 'react-hook-form'
import { InvestmentFormValues } from '@/common/components/investment/form-layouts/investment-layout'
import { Investment } from '@/common/data/investment/types/investmentTypes.new'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import dayjs from 'dayjs'
import translations from '../_i18n'

interface InvestmentReportSegmentProps {
  form: UseFormReturn<InvestmentFormValues & { investmentReportDate?: string; investmentReportScope?: string }>
  prefixDataTestId: string
  showInvestmentSelect?: boolean
  selectedInvestmentId?: string
  investments?: Investment[]
  isLoadingInvestments?: boolean
  onInvestmentChange?: (investmentId: string) => void
  onInvestmentSearch?: (searchTerm: string) => void
}

export const InvestmentReportSegment: React.FC<InvestmentReportSegmentProps> = ({
  form,
  prefixDataTestId,
  showInvestmentSelect = false,
  selectedInvestmentId,
  investments = [],
  isLoadingInvestments = false,
  onInvestmentChange,
  onInvestmentSearch
}) => {
  const { t } = useTranslation(translations)

  // TO DO: Move to investment constants
  const scopeOptions = [
    { label: t('scope-daily'), value: 'DAILY' },
    { label: t('scope-weekly'), value: 'WEEKLY' },
    { label: t('scope-monthly'), value: 'MONTHLY' },
    { label: t('scope-quarterly'), value: 'QUARTERLY' },
    { label: t('scope-yearly'), value: 'YEARLY' }
  ]

  // Format investment options for Combobox
  const investmentOptions = useMemo(() => {
    return investments.map(investment => ({
      value: investment.id || '',
      label: (
        <div className="gba:flex gba:flex-col gba:min-w-0 gba:w-full">
          <div className="gba:text-sm gba:font-medium gba:truncate gba:text-left">{investment.name}</div>
          {investment.code && (
            <div className="gba:text-xs gba:text-muted-foreground gba:truncate gba:text-left">{investment.code}</div>
          )}
        </div>
      ),
      searchText: `${investment.name} ${investment.code || ''}`
    }))
  }, [investments])

  return (
    <div className="gba:space-y-4 gba:mb-6">
      {/* Investment Selection - only show if no investment provided */}
      {showInvestmentSelect && (
        <div className="gba:space-y-2">
          <label className="gba:text-sm gba:font-medium">
            {t('report-form-investment')} <span className="gba:text-destructive">*</span>
          </label>
          <Combobox
            options={investmentOptions as any}
            value={selectedInvestmentId || ''}
            onValueChange={value => onInvestmentChange?.(value || '')}
            onSearch={onInvestmentSearch}
            placeholder={t('report-form-investment-placeholder')}
            searchPlaceholder={t('report-form-investment-search-placeholder')}
            emptyText={isLoadingInvestments ? 'Loading investments...' : 'No investments found'}
            loading={isLoadingInvestments}
            disabled={isLoadingInvestments}
            searchDebounce={300}
            data-testid={formatDataTestId(prefixDataTestId, 'InvestmentSelect')}
            align="start"
            className="gba:w-full"
          />
        </div>
      )}

      {/* Report Date and Scope Row */}
      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        <FormField
          control={form.control}
          name="investmentReportDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('report-form-date')} <span className="gba:text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <DateInput
                  type="date"
                  outputFormat="iso"
                  value={field.value || dayjs().format('YYYY-MM-DD')}
                  onChange={value => field.onChange(value || '')}
                  data-testid={formatDataTestId(prefixDataTestId, 'DateInput')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="investmentReportScope"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('report-form-scope')} <span className="gba:text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Select onValueChange={field.onChange} value={field.value || 'MONTHLY'}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('report-form-scope-placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {scopeOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}
