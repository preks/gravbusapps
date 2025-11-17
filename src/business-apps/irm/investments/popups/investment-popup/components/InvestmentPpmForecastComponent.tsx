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
  Input,
  Button
} from '@newwork/nw-design-system'
import { Plus } from 'lucide-react'
import { useInvestmentPopupData } from '../hooks/useInvestmentPopupData'
import { InvestmentPopupFormWrapper } from './InvestmentPopupFormWrapper'
import { InvestmentPpmForecastComponentProps, PpmForecastFormData } from '../types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import {
  extractInvestmentId,
  parseAdditionalProperties,
  validateInvestmentData,
  INVESTMENT_ERRORS
} from '../utils/investmentPopupUtils'
import { buildInvestmentSubtypePayload } from '../utils/investmentPopupPayloadHelper'

const prefixDataTestId = 'investment-ppm-forecast-component'

/**
 * Helper: Convert forecast array to object structure for storage
 */
const convertForecastsToObject = (
  forecasts: Array<{ year: string; turnover: string; ebitda: string }>
): Record<string, { turnover?: number; ebitda?: number }> => {
  const forecastsObject: Record<string, { turnover?: number; ebitda?: number }> = {}

  for (const forecast of forecasts) {
    if (!forecast.year) continue

    forecastsObject[forecast.year] = {}

    if (forecast.turnover) {
      forecastsObject[forecast.year].turnover = Number.parseFloat(forecast.turnover)
    }

    if (forecast.ebitda) {
      forecastsObject[forecast.year].ebitda = Number.parseFloat(forecast.ebitda)
    }
  }

  return forecastsObject
}

/**
 * Helper: Get equity investment from polymorphic structure
 */
const getEquityInvestment = (investment: any) => {
  return Array.isArray(investment.equityInvestment) ? investment.equityInvestment[0] : investment.equityInvestment
}

// Validation: At least one of turnover or EBITDA must be provided
const forecastItemSchema = z
  .object({
    year: z
      .string()
      .min(4, 'Year is required (e.g., 2026)')
      .regex(/^\d{4}$/, 'Year must be 4 digits'),
    turnover: z.string().optional(),
    ebitda: z.string().optional()
  })
  .refine(data => data.turnover || data.ebitda, {
    message: 'At least one of Turnover or EBITDA must be provided',
    path: ['turnover']
  })

const ppmForecastFormSchema = z.object({
  forecasts: z.array(forecastItemSchema)
})

export const InvestmentPpmForecastComponent: React.FC<InvestmentPpmForecastComponentProps> = ({
  onClose,
  onSave,
  accessToken,
  userInfo,
  additionalData
}) => {
  const businessAppContext = { accessToken, userInfo, additionalData }

  // Extract investmentId
  const investmentId = extractInvestmentId(additionalData)

  // Fetch investment data
  const { investment, loading, error } = useInvestmentPopupData({
    context: businessAppContext,
    investmentId,
    scope: 'ppmforecast'
  })

  // Initialize form
  const form = useForm<PpmForecastFormData>({
    resolver: zodResolver(ppmForecastFormSchema),
    defaultValues: {
      forecasts: [{ year: '', turnover: '', ebitda: '' }]
    }
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'forecasts'
  })

  // Load existing forecast data from additionalProperties
  useEffect(() => {
    if (investment) {
      const equityInvestment = Array.isArray(investment.equityInvestment)
        ? investment.equityInvestment[0]
        : investment.equityInvestment

      const additionalProps = parseAdditionalProperties(equityInvestment?.additionalProperties)
      const existingForecasts = additionalProps?.forecasts || {}

      if (Object.keys(existingForecasts).length > 0) {
        // Convert object to array for form
        const forecastsArray = Object.entries(existingForecasts)
          .map(([year, values]: [string, any]) => ({
            year,
            turnover: values.turnover?.toString() || '',
            ebitda: values.ebitda?.toString() || ''
          }))
          .sort((a, b) => Number.parseInt(a.year) - Number.parseInt(b.year)) // Sort by year
        form.reset({ forecasts: forecastsArray })
      }
    }
  }, [investment, form])

  // Handle form submission
  const handleSubmit = async (data: PpmForecastFormData) => {
    validateInvestmentData(investment)

    if (!investmentId) {
      throw new Error(INVESTMENT_ERRORS.MISSING_ID())
    }

    // After validation, investment is guaranteed to exist
    if (!investment) {
      throw new Error(INVESTMENT_ERRORS.DATA_NOT_LOADED())
    }

    // Convert array to object structure for storage using helper
    const forecastsObject = convertForecastsToObject(
      data.forecasts.map(f => ({
        year: f.year,
        turnover: f.turnover || '',
        ebitda: f.ebitda || ''
      }))
    )

    // Get current additionalProperties using helper
    const equityInvestment = getEquityInvestment(investment)
    const currentAdditionalProps = parseAdditionalProperties(equityInvestment?.additionalProperties)

    // Update forecasts in additionalProperties
    const updatedAdditionalProps = {
      ...currentAdditionalProps,
      forecasts: forecastsObject
    }

    // Build the payload using the centralized helper for subtype updates
    const payload = buildInvestmentSubtypePayload({
      investment,
      updatedSubtypeAdditionalProperties: updatedAdditionalProps,
      businessAppContext,
      businessKeyPrefix: 'investment-ppm-forecast',
      businessKeySuffix: undefined
    })

    return payload
  }

  const handleSubmitWrapper = async (formData: PpmForecastFormData) => {
    const payload = await handleSubmit(formData)
    onSave?.(formData.forecasts)
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
      submitButtonText={getTranslationFromI18nKeyAndLabel('investment.ppmForecast.save', 'Save Forecasts')}
    >
      <Form {...form}>
        <div className="gba:space-y-6" data-testid={`${prefixDataTestId}-content`}>
          {/* Title */}
          <div>
            <h2 className="gba:text-xl gba:font-semibold gba:mb-2">
              {getTranslationFromI18nKeyAndLabel('investment.ppmForecast.title', 'Manage PPM Forecasts')}
            </h2>
            <p className="gba:text-sm gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'investment.ppmForecast.description',
                'Add forecasted turnover and EBITDA values for future years'
              )}
            </p>
          </div>

          {/* Forecasts List */}
          <div className="gba:space-y-4">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="gba:border gba:border-border gba:rounded-lg gba:p-4 gba:space-y-4"
                data-testid={formatDataTestId(prefixDataTestId, `Row-${index}`)}
              >
                {/* Year - Full Width with Delete Button */}
                <FormField
                  control={form.control}
                  name={`forecasts.${index}.year`}
                  render={({ field }) => (
                    <FormItem>
                      <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
                        <FormLabel>
                          {getTranslationFromI18nKeyAndLabel('investment.ppmForecast.field.year', 'Year')}{' '}
                          <span className="gba:text-destructive">*</span>
                        </FormLabel>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          data-testid={formatDataTestId(prefixDataTestId, `RemoveButton-${index}`)}
                          className="gba:text-destructive gba:hover:text-destructive gba:text-xl gba:font-bold gba:cursor-pointer gba:bg-transparent gba:border-none gba:p-0"
                          aria-label="Remove forecast"
                        >
                          ×
                        </button>
                      </div>

                      <FormControl>
                        <Input
                          {...field}
                          placeholder="2026"
                          data-testid={formatDataTestId(prefixDataTestId, `YearInput-${index}`)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Turnover and EBITDA - Side by Side */}
                <div className="gba:grid gba:grid-cols-2 gba:gap-3">
                  <FormField
                    control={form.control}
                    name={`forecasts.${index}.turnover`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {getTranslationFromI18nKeyAndLabel('investment.ppmForecast.field.turnover', 'Turnover')}
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            placeholder="110000"
                            data-testid={formatDataTestId(prefixDataTestId, `TurnoverInput-${index}`)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`forecasts.${index}.ebitda`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {getTranslationFromI18nKeyAndLabel('investment.ppmForecast.field.ebitda', 'EBITDA')}
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            placeholder="11000"
                            data-testid={formatDataTestId(prefixDataTestId, `EbitdaInput-${index}`)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Add Row Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ year: '', turnover: '', ebitda: '' })}
            data-testid={formatDataTestId(prefixDataTestId, 'AddButton')}
            className="gba:w-full"
          >
            <Plus className="gba:h-4 gba:w-4 gba:mr-2" />
            {getTranslationFromI18nKeyAndLabel('investment.ppmForecast.addRow', 'Add Forecast Year')}
          </Button>
        </div>
      </Form>
    </InvestmentPopupFormWrapper>
  )
}
