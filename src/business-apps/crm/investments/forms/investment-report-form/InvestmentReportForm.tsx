import React, { useState, useEffect } from 'react'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Textarea,
  Separator
} from '@newwork/nw-design-system'
import { FileText, FloppyDisk, X, CurrencyDollar, Percent, Calendar } from '@phosphor-icons/react'
import { useForm } from 'react-hook-form'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestments, useGetInvestmentAccounts } from '@/common/data/investment'
import type { InvestmentReport, Investment, InvestmentAccount, ReportScope } from '@/common/data/investment'
import dayjs from 'dayjs'

interface InvestmentReportFormProps extends BusinessAppContextProps {
  initialValues?: Partial<InvestmentReport>
  onSubmit?: (values: any) => Promise<void>
  onCancel?: () => Promise<void>
  onDelete?: (id: string) => Promise<void>
  prefixDataTestId?: string
}

interface FormValues {
  investmentId: string
  date: string
  scope: ReportScope
  investmentMarketValue: number
  totalInvestmentAmount: number
  forecastedRevenueAmount: number
  forecastedProfitAmount: number
  notes: string
  file?: File
}

export const InvestmentReportForm: React.FC<InvestmentReportFormProps> = ({
  initialValues,
  onSubmit,
  onCancel,
  onDelete,
  accessToken,
  userInfo,
  additionalData,
  prefixDataTestId = 'InvestmentReportForm'
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Initialize hooks
  const { fetchInvestments } = useGetInvestments({ accessToken, userInfo, additionalData })
  const { fetchInvestmentAccounts } = useGetInvestmentAccounts({ accessToken, userInfo, additionalData })

  const [investments, setInvestments] = useState<Investment[]>([])
  const [accounts, setAccounts] = useState<InvestmentAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const isEditing = !!initialValues?.id

  const form = useForm<FormValues>({
    defaultValues: {
      investmentId: '',
      date: dayjs().format('YYYY-MM-DD'),
      scope: 'MONTHLY' as ReportScope,
      investmentMarketValue: 0,
      totalInvestmentAmount: 0,
      forecastedRevenueAmount: 0,
      forecastedProfitAmount: 0,
      notes: ''
    }
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        const [investmentsResult, accountsResult] = await Promise.all([fetchInvestments(), fetchInvestmentAccounts()])

        setInvestments(investmentsResult?.Investment || [])
        setAccounts(accountsResult?.InvestmentAccount || [])
      } catch (error) {
        console.error('Error loading form data:', error)
        // TODO: Replace with proper toast notification
        console.error('Failed to load form data')
      } finally {
        setIsLoading(false)
      }
    }

    if (accessToken) {
      loadData()
    }
  }, [accessToken, fetchInvestments, fetchInvestmentAccounts])

  const handleSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true)

      // TODO: Implement form submission logic
      console.log('Form submitted:', values)

      if (onSubmit) {
        await onSubmit(values)
      }

      // TODO: Replace with proper toast notification
      console.log(isEditing ? 'Report updated successfully' : 'Report created successfully')

      if (onCancel) {
        onCancel()
      }
    } catch (error) {
      console.error('Form submission error:', error)
      // TODO: Replace with proper toast notification
      console.error(isEditing ? 'Failed to update report' : 'Failed to create report')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!initialValues?.id) return

    try {
      setIsDeleting(true)
      if (onDelete) {
        await onDelete(initialValues.id)
      }
      // TODO: Replace with proper toast notification
      console.log('Report deleted successfully')
      if (onCancel) {
        onCancel()
      }
    } catch (error) {
      console.error('Delete error:', error)
      // TODO: Replace with proper toast notification
      console.error('Failed to delete report')
    } finally {
      setIsDeleting(false)
    }
  }

  const reportScopeOptions = [
    { label: getTranslationFromI18nKeyAndLabel('filter.scope.daily', 'Daily'), value: 'DAILY' },
    { label: getTranslationFromI18nKeyAndLabel('filter.scope.weekly', 'Weekly'), value: 'WEEKLY' },
    { label: getTranslationFromI18nKeyAndLabel('filter.scope.monthly', 'Monthly'), value: 'MONTHLY' },
    { label: getTranslationFromI18nKeyAndLabel('filter.scope.quarterly', 'Quarterly'), value: 'QUARTERLY' },
    { label: getTranslationFromI18nKeyAndLabel('filter.scope.yearly', 'Yearly'), value: 'YEARLY' }
  ]

  if (!accessToken) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <div style={{ color: '#ef4444' }}>
          {getTranslationFromI18nKeyAndLabel(
            'error.noAccessToken',
            'Error: No access token found. Please ensure you are properly authenticated.'
          )}
        </div>
      </div>
    )
  }

  return (
    <div data-testid={formatDataTestId(prefixDataTestId, 'FormContainer')}>
      <div style={{ marginBottom: '24px' }}>
        <h2
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            margin: '0 0 8px 0',
            fontSize: '20px',
            fontWeight: '600'
          }}
        >
          <FileText size={20} />
          {isEditing
            ? getTranslationFromI18nKeyAndLabel('report.form.editTitle', 'Edit Investment Report')
            : getTranslationFromI18nKeyAndLabel('report.form.createTitle', 'Submit Investment Report')}
        </h2>
        <p style={{ margin: 0, color: '#6b7280' }}>
          {isEditing ? 'Update your investment report details' : 'Submit a new report for your investment'}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Basic Information */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <FormField
              control={form.control}
              name="investmentId"
              rules={{ required: 'Please select an investment' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{getTranslationFromI18nKeyAndLabel('report.form.investment', 'Investment')}</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={getTranslationFromI18nKeyAndLabel(
                            'report.form.investment.placeholder',
                            'Select investment'
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {investments.map(investment => (
                          <SelectItem key={investment.id} value={investment.id}>
                            {investment.name} {investment.code && `(${investment.code})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              rules={{ required: 'Please select a report date' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{getTranslationFromI18nKeyAndLabel('report.form.date', 'Report Date')}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <FormField
              control={form.control}
              name="scope"
              rules={{ required: 'Please select a report scope' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{getTranslationFromI18nKeyAndLabel('report.form.scope', 'Report Scope')}</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={getTranslationFromI18nKeyAndLabel(
                            'report.form.scope.placeholder',
                            'Select scope'
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {reportScopeOptions.map(option => (
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

          <Separator style={{ margin: '24px 0' }}>
            {getTranslationFromI18nKeyAndLabel('report.form.financialSection', 'Financial Information')}
          </Separator>

          {/* Financial Information */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <FormField
              control={form.control}
              name="totalInvestmentAmount"
              rules={{ required: 'Please enter the total investment amount' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {getTranslationFromI18nKeyAndLabel('report.form.totalInvestmentAmount', 'Total Investment Amount')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="0.00"
                      type="number"
                      step="0.01"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      data-testid={formatDataTestId(prefixDataTestId, 'TotalInvestmentAmountInput')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="investmentMarketValue"
              rules={{ required: 'Please enter the current market value' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {getTranslationFromI18nKeyAndLabel('form.field.investmentMarketValue', 'Current Market Value')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      data-testid={formatDataTestId(prefixDataTestId, 'InvestmentMarketValueInput')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <FormField
              control={form.control}
              name="forecastedRevenueAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {getTranslationFromI18nKeyAndLabel('report.form.forecastedRevenueAmount', 'Forecasted Revenue')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="0.00"
                      type="number"
                      step="0.01"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      data-testid={formatDataTestId(prefixDataTestId, 'ForecastedRevenueInput')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="forecastedProfitAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {getTranslationFromI18nKeyAndLabel('report.form.forecastedProfitAmount', 'Forecasted Profit')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="0.00"
                      type="number"
                      step="0.01"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      data-testid={formatDataTestId(prefixDataTestId, 'ForecastedProfitInput')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator style={{ margin: '24px 0' }}>
            {getTranslationFromI18nKeyAndLabel('report.form.additionalSection', 'Additional Information')}
          </Separator>

          {/* Additional Information */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{getTranslationFromI18nKeyAndLabel('form.field.notes', 'Notes')}</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder={getTranslationFromI18nKeyAndLabel(
                      'form.field.notes.placeholder',
                      'Additional notes about this report, key achievements, challenges, or important updates...'
                    )}
                    rows={4}
                    data-testid={formatDataTestId(prefixDataTestId, 'NotesTextarea')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Form Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '32px',
              paddingTop: '24px',
              borderTop: '1px solid #e5e7eb'
            }}
          >
            <Button variant="outline" onClick={onCancel}>
              {getTranslationFromI18nKeyAndLabel('button.cancel', 'Cancel')}
            </Button>
            {isEditing && (
              <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : getTranslationFromI18nKeyAndLabel('button.delete', 'Delete')}
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Saving...'
                : isEditing
                  ? getTranslationFromI18nKeyAndLabel('button.update', 'Update')
                  : getTranslationFromI18nKeyAndLabel('button.create', 'Submit Report')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

export default InvestmentReportForm
