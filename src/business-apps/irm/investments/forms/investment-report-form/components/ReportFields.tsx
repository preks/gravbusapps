import React from 'react'
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
  DateInput
} from '@newwork/nw-design-system'
import { UseFormReturn } from 'react-hook-form'
import { InvestmentFormValues } from '@/common/components/investment/form-layouts/investment-layout'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import dayjs from 'dayjs'

interface ReportFieldsProps {
  form: UseFormReturn<InvestmentFormValues & { investmentReportDate?: string; investmentReportScope?: string }>
  prefixDataTestId: string
}

const REPORT_SCOPE_OPTIONS = [
  { label: getTranslationFromI18nKeyAndLabel('filter.scope.daily', 'Daily'), value: 'DAILY' },
  { label: getTranslationFromI18nKeyAndLabel('filter.scope.weekly', 'Weekly'), value: 'WEEKLY' },
  { label: getTranslationFromI18nKeyAndLabel('filter.scope.monthly', 'Monthly'), value: 'MONTHLY' },
  { label: getTranslationFromI18nKeyAndLabel('filter.scope.quarterly', 'Quarterly'), value: 'QUARTERLY' },
  { label: getTranslationFromI18nKeyAndLabel('filter.scope.yearly', 'Yearly'), value: 'YEARLY' }
]

export const ReportFields: React.FC<ReportFieldsProps> = ({ form, prefixDataTestId }) => {
  return (
    <div className="gba:grid gba:grid-cols-2 gba:gap-4">
      <FormField
        control={form.control}
        name="investmentReportDate"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {getTranslationFromI18nKeyAndLabel('report.form.date', 'Report Date')}{' '}
              <span className="gba:text-destructive">*</span>
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
              {getTranslationFromI18nKeyAndLabel('report.form.scope', 'Report Scope')}{' '}
              <span className="gba:text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <Select onValueChange={field.onChange} value={field.value || 'MONTHLY'}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={getTranslationFromI18nKeyAndLabel('report.form.scope.placeholder', 'Select scope')}
                  />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_SCOPE_OPTIONS.map(option => (
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
  )
}
