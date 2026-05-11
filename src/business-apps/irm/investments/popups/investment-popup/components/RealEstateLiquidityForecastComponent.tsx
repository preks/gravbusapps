import React, { useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  DateInput,
  Input,
  Button,
  Alert
} from '@newwork/nw-design-system'
import { PlusIcon, XIcon } from '@phosphor-icons/react'
import { useInvestmentPopupForm } from '../hooks/useInvestmentPopupForm'
import { InvestmentPopupFormWrapper } from './InvestmentPopupFormWrapper'
import { InvestmentLiquidityForecastComponentProps, LiquidityForecastFormData, LiquidityForecastData } from '../types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import {
  validateInvestmentData,
  INVESTMENT_ERRORS,
  getInvestmentGroupType,
  generateBusinessKey
} from '../utils/investmentPopupUtils'
import { buildInvestmentPayload } from '@/common/data/investment/payloads/investmentPayloads'

const prefixDataTestId = 'investment-liquidity-forecast-component'

// Validation schema
const yearAmountSchema = z.object({
  id: z.string().optional(),
  year: z.union([z.number().min(1900), z.string().min(1, 'Year is required')]),
  amount: z.union([z.number(), z.string().min(1, 'Amount is required')])
})

const liquidityForecastSchema = z.object({
  yearAmounts: z.array(yearAmountSchema).min(1, 'At least one year/amount pair is required'),
  balancedCashflowDate: z.string().min(1, 'Balanced cashflow date is required'),
  balancedAmount: z.union([z.number(), z.string().min(1, 'Balanced amount is required')])
})

export const RealEstateLiquidityForecastComponent: React.FC<InvestmentLiquidityForecastComponentProps> = ({
  onClose,
  onSave,
  accessToken,
  userInfo,
  additionalData
}) => {
  // Use common setup hook
  const { businessAppContext, investmentId, investment, loading, error } = useInvestmentPopupForm({
    accessToken,
    userInfo,
    additionalData,
    scope: 'liquidityForecast'
  })

  // Initialize form
  const form = useForm<LiquidityForecastFormData>({
    resolver: zodResolver(liquidityForecastSchema),
    defaultValues: {
      yearAmounts: [],
      balancedCashflowDate: '',
      balancedAmount: ''
    }
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'yearAmounts'
  })

  // Auto-calculate balanced amount as sum of all yearly amounts
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      // Only recalculate if yearAmounts changed
      if (name?.startsWith('yearAmounts')) {
        const yearAmounts = value.yearAmounts || []
        const sum = yearAmounts.reduce((total, item) => {
          const amount = Number(item?.amount) || 0
          return total + amount
        }, 0)

        // Update balanced amount with the calculated sum
        form.setValue('balancedAmount', sum.toString(), { shouldValidate: false })
      }
    })

    return () => subscription.unsubscribe()
  }, [form])

  // Helper: Parse and transform forecast data to form format
  const transformForecastToForm = (forecastData: any) => {
    try {
      const parsedData = typeof forecastData === 'string' ? JSON.parse(forecastData) : forecastData

      if (parsedData?.years && parsedData?.amounts) {
        const yearAmounts = parsedData.years.map((year: number, index: number) => ({
          id: `existing-${index}`,
          year: year.toString(),
          amount: parsedData.amounts[index]?.toString() || ''
        }))

        return {
          yearAmounts,
          balancedCashflowDate: parsedData.balancedCashflowDate || '',
          balancedAmount: parsedData.balancedAmount?.toString() || ''
        }
      }
    } catch {
      // Return null on parse error
    }
    return null
  }

  // Load existing liquidity forecast from realEstateInvestment
  useEffect(() => {
    const emptyDefaults = {
      yearAmounts: [{ year: '', amount: '' }],
      balancedCashflowDate: '',
      balancedAmount: ''
    }

    if (!investment) return

    const groupType = getInvestmentGroupType(investment)
    if (groupType !== 'REAL_ESTATE') return

    const realEstateInvestment = Array.isArray((investment as any).realEstateInvestment)
      ? (investment as any).realEstateInvestment[0]
      : (investment as any).realEstateInvestment

    const forecastData = realEstateInvestment?.liquidityForecast
    const formData = forecastData ? transformForecastToForm(forecastData) : null

    form.reset(formData || emptyDefaults)
  }, [investment, form])

  // Validation
  if (!investmentId) {
    return (
      <Alert variant="destructive" data-testid={`${prefixDataTestId}-missing-investment-id`}>
        {INVESTMENT_ERRORS.MISSING_ID()}
      </Alert>
    )
  }

  // Handle submission
  const handleSubmit = async (formData: LiquidityForecastFormData) => {
    validateInvestmentData(investment)

    if (!investment) {
      throw new Error('Investment data not loaded')
    }

    // Verify this is a real estate investment
    const groupType = getInvestmentGroupType(investment)
    if (groupType !== 'REAL_ESTATE') {
      throw new Error('Liquidity forecast is only available for real estate investments')
    }

    // Transform form data to storage format
    const liquidityForecastData: LiquidityForecastData = {
      years: formData.yearAmounts.map(ya => Number(ya.year)),
      amounts: formData.yearAmounts.map(ya => Number(ya.amount)),
      balancedCashflowDate: formData.balancedCashflowDate,
      balancedAmount: Number(formData.balancedAmount)
    }

    // Get existing realEstateInvestment
    const existingRealEstate = Array.isArray((investment as any).realEstateInvestment)
      ? (investment as any).realEstateInvestment[0]
      : (investment as any).realEstateInvestment

    // Build form data with updated liquidityForecast
    const investmentFormData: any = {
      investment: {
        ...investment
      },
      realEstateInvestment: {
        ...existingRealEstate,
        liquidityForecast: liquidityForecastData
      }
    }

    // Build the payload
    const payload = buildInvestmentPayload(investmentFormData, businessAppContext, {
      isUpdate: true,
      rawInvestmentData: investment
    })

    // Add required metadata for Kogito workflow
    ;(payload as any).changeMode = 'UPDATE'
    ;(payload as any).businessKey = generateBusinessKey('liquidity-forecast', investmentId)

    return payload
  }

  // Success handler
  const handleSubmitWrapper = async (formData: LiquidityForecastFormData) => {
    const payload = await handleSubmit(formData)

    // Transform to stored format for onSave callback
    const savedData: LiquidityForecastData = {
      years: formData.yearAmounts.map(ya => Number(ya.year)),
      amounts: formData.yearAmounts.map(ya => Number(ya.amount)),
      balancedCashflowDate: formData.balancedCashflowDate,
      balancedAmount: Number(formData.balancedAmount)
    }

    onSave?.(savedData)
    return payload
  }

  return (
    <InvestmentPopupFormWrapper
      loading={loading}
      error={error}
      investment={investment}
      onSubmit={handleSubmitWrapper}
      onClose={onClose}
      form={form}
      businessAppContext={businessAppContext}
      prefixDataTestId={prefixDataTestId}
      submitButtonText={getTranslationFromI18nKeyAndLabel(
        'investment.liquidityForecast.save',
        'Save Liquidity Forecast'
      )}
    >
      <Form {...form}>
        <div className="gba:space-y-6" data-testid={`${prefixDataTestId}-content`}>
          {/* Header */}
          <div>
            <h2 className="gba:text-lg gba:font-semibold gba:mb-2">
              {getTranslationFromI18nKeyAndLabel('investment.liquidityForecast.title', 'Liquidity Forecast')}
            </h2>
            <p className="gba:text-sm gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'investment.liquidityForecast.description',
                'Define cashflow forecasts by year and balanced cashflow target'
              )}
            </p>
          </div>

          {/* Years and Amounts Section */}
          <div className="gba:space-y-4">
            <div className="gba:flex gba:items-center gba:justify-between">
              <h3 className="gba:text-md gba:font-medium">
                {getTranslationFromI18nKeyAndLabel('investment.liquidityForecast.yearAmountsTitle', 'Forecast by Year')}
              </h3>
            </div>

            {fields.map((field, index) => (
              <div
                key={field.id}
                className="gba:border gba:border-border gba:rounded-lg gba:p-4 gba:relative"
                data-testid={formatDataTestId(prefixDataTestId, `year-amount-row-${index}`)}
              >
                {/* Delete Button - Positioned at top-right */}
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    data-testid={formatDataTestId(prefixDataTestId, `remove-button-${index}`)}
                    className="gba:absolute gba:top-2 gba:right-2 gba:text-destructive gba:hover:text-destructive gba:h-8 gba:w-8"
                  >
                    <XIcon className="gba:h-4 gba:w-4" />
                  </Button>
                )}

                <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                  <FormField
                    control={form.control}
                    name={`yearAmounts.${index}.year`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {getTranslationFromI18nKeyAndLabel('investment.liquidityForecast.year', 'Year')}{' '}
                          <span className="gba:text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            placeholder="2025"
                            data-testid={formatDataTestId(prefixDataTestId, `year-input-${index}`)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`yearAmounts.${index}.amount`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {getTranslationFromI18nKeyAndLabel('investment.liquidityForecast.amount', 'Amount')}{' '}
                          <span className="gba:text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            placeholder="1000000"
                            data-testid={formatDataTestId(prefixDataTestId, `amount-input-${index}`)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            ))}

            {/* Add Year/Amount Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ year: '', amount: '' })}
              data-testid={formatDataTestId(prefixDataTestId, 'add-year-amount-button')}
              className="gba:w-full"
            >
              <PlusIcon className="gba:h-4 gba:w-4 gba:mr-2" />
              {getTranslationFromI18nKeyAndLabel('investment.liquidityForecast.addYearAmount', 'Add Year/Amount')}
            </Button>
          </div>

          {/* Balanced Cashflow Section */}
          <div className="gba:border-t gba:pt-6 gba:space-y-4">
            <h3 className="gba:text-md gba:font-medium">
              {getTranslationFromI18nKeyAndLabel(
                'investment.liquidityForecast.balancedCashflowTitle',
                'Balanced Cashflow Target'
              )}
            </h3>

            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <FormField
                control={form.control}
                name="balancedCashflowDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {getTranslationFromI18nKeyAndLabel('investment.liquidityForecast.balancedDate', 'Balanced Date')}{' '}
                      <span className="gba:text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <DateInput
                        type="date"
                        value={field.value || ''}
                        onChange={value => field.onChange(typeof value === 'string' ? value : '')}
                        data-testid={formatDataTestId(prefixDataTestId, 'balanced-date-input')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="balancedAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {getTranslationFromI18nKeyAndLabel(
                        'investment.liquidityForecast.balancedAmount',
                        'Balanced Amount (Sum)'
                      )}{' '}
                      <span className="gba:text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        readOnly
                        className="gba:bg-muted gba:cursor-not-allowed"
                        placeholder="Auto-calculated"
                        data-testid={formatDataTestId(prefixDataTestId, 'balanced-amount-input')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>
      </Form>
    </InvestmentPopupFormWrapper>
  )
}
