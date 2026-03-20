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
  Button,
  Alert
} from '@newwork/nw-design-system'
import { PlusIcon } from '@phosphor-icons/react'
import { useInvestmentPopupForm } from '../hooks/useInvestmentPopupForm'
import { InvestmentPopupFormWrapper } from './InvestmentPopupFormWrapper'
import { InvestmentLiquidityComponentProps, LiquidityFormData, LiquidityPreferenceItem } from '../types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { parseAdditionalProperties, validateInvestmentData, INVESTMENT_ERRORS } from '../utils/investmentPopupUtils'
import { buildInvestmentPopupPayload } from '../utils/investmentPopupPayloadHelper'

const prefixDataTestId = 'investment-liquidity-component'

// Validation schema
const liquidityItemSchema = z.object({
  id: z.string().optional(),
  preference: z.string().min(1, 'Liquidity preference is required'),
  interestMultiple: z.string().min(1, 'Interest/Multiple is required'),
  amount: z.string().min(1, 'Amount is required')
})

const liquidityFormSchema = z.object({
  liquidityPreferences: z.array(liquidityItemSchema)
})

export const InvestmentLiquidityComponent: React.FC<InvestmentLiquidityComponentProps> = ({
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
    scope: 'status' // Use status scope as liquidity is not yet in the hook
  })

  // Initialize form
  const form = useForm<LiquidityFormData>({
    resolver: zodResolver(liquidityFormSchema),
    defaultValues: {
      liquidityPreferences: []
    }
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'liquidityPreferences'
  })

  // Load existing liquidity preferences from additionalProperties
  useEffect(() => {
    if (investment) {
      // Parse additionalProperties
      const additionalProps = parseAdditionalProperties(investment.additionalProperties)

      // Get liquidity preferences array from additionalProperties
      const liquidityPreferences = additionalProps.liquidityPreferences || []

      if (liquidityPreferences.length > 0) {
        form.reset({
          liquidityPreferences: liquidityPreferences.map((item: LiquidityPreferenceItem, index: number) => ({
            id: `existing-${index}`, // Generate ID for tracking
            preference: item.preference || '',
            interestMultiple: item.interestMultiple || '',
            amount: item.amount || ''
          }))
        })
      } else {
        // If no data, start with one empty row
        form.reset({
          liquidityPreferences: [
            {
              preference: '',
              interestMultiple: '',
              amount: ''
            }
          ]
        })
      }
    }
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
  const handleSubmit = async (formData: LiquidityFormData) => {
    validateInvestmentData(investment)

    if (!investment) {
      throw new Error('Investment data not loaded')
    }

    // Get current additionalProperties
    const currentAdditionalProps = parseAdditionalProperties(investment.additionalProperties)

    // Update liquidity preferences array (remove the id field as it's only for UI tracking)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const updatedLiquidityPreferences = formData.liquidityPreferences.map(({ id: _id, ...item }) => item)

    // Create updated additionalProperties
    const updatedAdditionalProps = {
      ...currentAdditionalProps,
      liquidityPreferences: updatedLiquidityPreferences
    }

    // Build the payload using the centralized helper
    const payload = buildInvestmentPopupPayload({
      investment,
      updatedAdditionalProperties: updatedAdditionalProps,
      businessAppContext,
      businessKeyPrefix: 'investment-liquidity',
      businessKeySuffix: undefined
    })

    return payload
  }

  // Success handler
  const handleSubmitWrapper = async (formData: LiquidityFormData) => {
    const payload = await handleSubmit(formData)
    onSave?.(formData.liquidityPreferences)
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
      submitButtonText={getTranslationFromI18nKeyAndLabel('investment.liquidity.save', 'Save Liquidity Preferences')}
    >
      <Form {...form}>
        <div className="gba:space-y-4" data-testid={`${prefixDataTestId}-content`}>
          <div>
            <h2 className="gba:text-lg gba:font-semibold gba:mb-2">
              {getTranslationFromI18nKeyAndLabel('investment.liquidity.title', 'Manage Liquidity Preferences')}
            </h2>
            <p className="gba:text-sm gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'investment.liquidity.description',
                'Define priority and terms for investment returns'
              )}
            </p>
          </div>

          {/* Liquidity Preferences List */}
          <div className="gba:space-y-4">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="gba:border gba:border-border gba:rounded-lg gba:p-4 gba:space-y-4"
                data-testid={formatDataTestId(prefixDataTestId, `Row-${index}`)}
              >
                {/* Top Row: Liquidity Preference */}
                <FormField
                  control={form.control}
                  name={`liquidityPreferences.${index}.preference`}
                  render={({ field }) => (
                    <FormItem>
                      {/* Label and Delete Button Row */}
                      <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
                        <FormLabel>
                          {getTranslationFromI18nKeyAndLabel(
                            'investment.liquidity.field.preference',
                            'Liquidity Preference'
                          )}{' '}
                          <span className="gba:text-destructive">*</span>
                        </FormLabel>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          data-testid={formatDataTestId(prefixDataTestId, `RemoveButton-${index}`)}
                          className="gba:text-destructive gba:hover:text-destructive gba:text-xl gba:font-bold gba:cursor-pointer gba:bg-transparent gba:border-none gba:p-0"
                          aria-label="Remove liquidity preference"
                        >
                          ×
                        </button>
                      </div>

                      <FormControl>
                        <Input
                          {...field}
                          placeholder={getTranslationFromI18nKeyAndLabel(
                            'investment.liquidity.placeholder.preference',
                            'e.g., 1. Senior Loan'
                          )}
                          data-testid={formatDataTestId(prefixDataTestId, `PreferenceInput-${index}`)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Bottom Row: Interest/Multiple + Amount side by side */}
                <div className="gba:grid gba:grid-cols-2 gba:gap-3">
                  <FormField
                    control={form.control}
                    name={`liquidityPreferences.${index}.interestMultiple`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {getTranslationFromI18nKeyAndLabel(
                            'investment.liquidity.field.interestMultiple',
                            'Interest/Multiple'
                          )}{' '}
                          <span className="gba:text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder={getTranslationFromI18nKeyAndLabel(
                              'investment.liquidity.placeholder.interestMultiple',
                              'e.g., 8% p.a.'
                            )}
                            data-testid={formatDataTestId(prefixDataTestId, `InterestInput-${index}`)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`liquidityPreferences.${index}.amount`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {getTranslationFromI18nKeyAndLabel('investment.liquidity.field.amount', 'Amount')}{' '}
                          <span className="gba:text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder={getTranslationFromI18nKeyAndLabel(
                              'investment.liquidity.placeholder.amount',
                              'e.g., 100'
                            )}
                            data-testid={formatDataTestId(prefixDataTestId, `AmountInput-${index}`)}
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
            onClick={() =>
              append({
                preference: '',
                interestMultiple: '',
                amount: ''
              })
            }
            data-testid={formatDataTestId(prefixDataTestId, 'AddButton')}
            className="gba:w-full"
          >
            <PlusIcon className="gba:h-4 gba:w-4 gba:mr-2" />
            {getTranslationFromI18nKeyAndLabel('investment.liquidity.addRow', 'Add Liquidity Preference')}
          </Button>
        </div>
      </Form>
    </InvestmentPopupFormWrapper>
  )
}
