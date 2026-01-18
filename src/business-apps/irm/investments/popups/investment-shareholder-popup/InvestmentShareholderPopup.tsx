import React, { useState, useEffect, useCallback } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Button,
  Spinner,
  Alert,
  AlertDescription
} from '@newwork/nw-design-system'
import { PlusIcon } from '@phosphor-icons/react'
import { AppActionForm } from '@/components/app-action-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestmentShareholdersByInvestmentId } from '@/common/data/investment/hooks/useInvestmentShareholders'
import { useGetInvestmentById } from '@/common/data/investment/hooks/useInvestments'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  extractInvestmentId,
  INVESTMENT_ERRORS
} from '@/business-apps/irm/investments/popups/investment-popup/utils/investmentPopupUtils'

const prefixDataTestId = 'InvestmentShareholderPopup'

// Shareholder schema
const shareholderItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Shareholder name is required'),
  stakePercentage: z
    .string()
    .min(1, 'Stake percentage is required')
    .refine(val => !Number.isNaN(Number.parseFloat(val)) && Number.parseFloat(val) >= 0, {
      message: 'Must be a positive number'
    }),
  version: z.number().optional()
})

// Form validation schema with total percentage check
const investmentShareholderSchema = z
  .object({
    shareholders: z.array(shareholderItemSchema)
  })
  .refine(
    data => {
      const total = data.shareholders.reduce((sum, s) => sum + Number.parseFloat(s.stakePercentage || '0'), 0)
      return total <= 100
    },
    {
      message: 'Total stake percentage cannot exceed 100%',
      path: ['shareholders']
    }
  )

type InvestmentShareholderFormValues = z.infer<typeof investmentShareholderSchema>

export interface InvestmentShareholderPopupProps extends BusinessAppContextProps {
  onSuccess?: (data: any) => void
}

const InvestmentShareholderPopup: React.FC<InvestmentShareholderPopupProps> = ({
  accessToken,
  additionalData,
  onSuccess,
  ...businessAppContext
}) => {
  const [isLoadingShareholders, setIsLoadingShareholders] = useState(true)
  const [isLoadingInvestment, setIsLoadingInvestment] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [hasExistingShareholders, setHasExistingShareholders] = useState(false)
  const [investmentVersion, setInvestmentVersion] = useState<number | undefined>(undefined)

  // Extract investment ID from multiple sources
  const investmentId = extractInvestmentId(additionalData)

  const { fetchInvestmentShareholders } = useGetInvestmentShareholdersByInvestmentId({
    accessToken,
    additionalData,
    ...businessAppContext
  })

  const { fetchInvestmentById } = useGetInvestmentById({
    accessToken,
    additionalData,
    ...businessAppContext
  })

  // Initialize form
  const form = useForm<InvestmentShareholderFormValues>({
    resolver: zodResolver(investmentShareholderSchema),
    defaultValues: {
      shareholders: [{ name: '', stakePercentage: '' }]
    }
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'shareholders'
  })

  // Load existing investment and shareholders
  const loadExistingShareholders = useCallback(async () => {
    if (!investmentId) {
      setIsLoadingShareholders(false)
      setIsLoadingInvestment(false)
      return
    }

    try {
      setIsLoadingShareholders(true)
      setIsLoadingInvestment(true)
      setLoadError(null)

      // Fetch both investment and shareholders in parallel
      const [investmentResult, shareholdersResult] = await Promise.all([
        fetchInvestmentById(investmentId),
        fetchInvestmentShareholders(investmentId)
      ])

      // Store investment version (required for API)
      if (investmentResult.investment?.version != null) {
        setInvestmentVersion(investmentResult.investment.version)
      } else {
        throw new Error('Investment version not found')
      }

      const existingShareholders = shareholdersResult.shareholders || []

      if (existingShareholders.length > 0) {
        setHasExistingShareholders(true)
        const shareholdersData = existingShareholders.map(s => ({
          id: s.id,
          name: s.name || '',
          stakePercentage: s.stakePercentage?.toString() || '',
          version: s.version
        }))

        form.reset({ shareholders: shareholdersData })
      } else {
        setHasExistingShareholders(false)
      }
    } catch (err) {
      console.error('Error loading investment data:', err)
      setLoadError(err instanceof Error ? err.message : 'Failed to load investment data')
    } finally {
      setIsLoadingShareholders(false)
      setIsLoadingInvestment(false)
    }
  }, [investmentId, fetchInvestmentById, fetchInvestmentShareholders, form])

  useEffect(() => {
    loadExistingShareholders()
  }, [loadExistingShareholders])

  // Calculate total percentage
  const totalPercentage = form.watch('shareholders')?.reduce((sum, s) => {
    const value = Number.parseFloat(s.stakePercentage || '0')
    return sum + (Number.isNaN(value) ? 0 : value)
  }, 0)

  const isOverLimit = totalPercentage > 100
  const remainingPercentage = 100 - totalPercentage

  // Get color class for total percentage display
  const getTotalPercentageColorClass = () => {
    if (isOverLimit) return 'gba:text-destructive'
    if (totalPercentage === 100) return 'gba:text-success'
    return 'gba:text-warning'
  }

  // Handle form submission
  const handleSubmit = async (data: InvestmentShareholderFormValues) => {
    if (!investmentId || investmentVersion === undefined) {
      return null
    }

    // Send only shareholders that exist in the form
    // Backend will detect deletions by comparing sent items vs DB
    const shareholdersPayload = data.shareholders.map(s => ({
      ...(s.id && { id: s.id }), // Include ID if updating existing shareholder
      ...(s.version !== undefined && { version: s.version }), // Include version if updating
      name: s.name,
      stakePercentage: Number.parseFloat(s.stakePercentage)
    }))

    // Build payload matching SaveInvestmentShareholdersModelInput API specification
    const payload = {
      changeMode: hasExistingShareholders ? 'REPLACE' : 'UPSERT',
      investment: {
        id: investmentId,
        version: investmentVersion,
        investmentShareholders: shareholdersPayload
      }
    }

    return payload
  }

  // Form validation
  const validateForm = (): string[] | null => {
    const errors: string[] = []

    if (!investmentId) {
      errors.push(INVESTMENT_ERRORS.MISSING_ID())
    }

    if (investmentVersion === undefined) {
      errors.push(
        getTranslationFromI18nKeyAndLabel(
          'investment.shareholders.validation.missingVersion',
          'Investment version is required'
        )
      )
    }

    const shareholders = form.getValues().shareholders
    if (shareholders && shareholders.length > 0) {
      const total = shareholders.reduce((sum, s) => sum + Number.parseFloat(s.stakePercentage || '0'), 0)
      if (total > 100) {
        errors.push(
          getTranslationFromI18nKeyAndLabel(
            'investment.shareholders.validation.exceedsLimit',
            'Total stake percentage cannot exceed 100%'
          )
        )
      }
    }

    return errors.length > 0 ? errors : null
  }

  // Success handler
  const handleSuccess = () => {
    if (onSuccess) {
      onSuccess(form.getValues())
    }
  }

  // Combined loading state
  const isLoading = isLoadingShareholders || isLoadingInvestment

  if (!investmentId) {
    return (
      <Alert variant="destructive" data-testid={`${prefixDataTestId}-error-alert`}>
        <AlertDescription>{INVESTMENT_ERRORS.MISSING_ID()}</AlertDescription>
      </Alert>
    )
  }

  return (
    <AppActionForm
      form={form}
      formData={form.getValues()}
      processType="update"
      submitButtonText={getTranslationFromI18nKeyAndLabel('investment.shareholders.save', 'Save Shareholders')}
      onSubmit={handleSubmit}
      onSuccess={handleSuccess}
      validateForm={validateForm}
      businessAppContext={{ accessToken, additionalData, ...businessAppContext }}
      disableFormSubmission={isLoading || isOverLimit}
      data-testid={prefixDataTestId}
    >
      <div data-testid={`${prefixDataTestId}-content`} className="gba:space-y-6">
        {/* Form Title */}
        <div>
          <h2
            className="gba:text-xl gba:font-semibold gba:text-gray-900 gba:mb-2"
            data-testid={formatDataTestId(prefixDataTestId, 'Title')}
          >
            {getTranslationFromI18nKeyAndLabel('investment.shareholders.title', 'Manage Shareholders')}
          </h2>
          <p className="gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'investment.shareholders.description',
              'Add or update shareholders and their stake percentages'
            )}
          </p>

          {isLoading && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-gray-600 gba:mt-2">
              <Spinner size="sm" />
              {getTranslationFromI18nKeyAndLabel('investment.shareholders.loading', 'Loading investment data...')}
            </div>
          )}

          {loadError && (
            <Alert variant="destructive" className="gba:mt-2">
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          )}
        </div>

        <Form {...form}>
          <div className="gba:space-y-4">
            {/* Total Percentage Indicator */}
            <div className="gba:bg-muted gba:p-4 gba:rounded-lg">
              <div className="gba:flex gba:justify-between gba:items-center">
                <span className="gba:text-sm gba:font-medium">
                  {getTranslationFromI18nKeyAndLabel('investment.shareholders.totalStake', 'Total Stake Percentage')}:
                </span>
                <span
                  className={`gba:text-lg gba:font-bold ${getTotalPercentageColorClass()}`}
                  data-testid={formatDataTestId(prefixDataTestId, 'TotalPercentage')}
                >
                  {totalPercentage.toFixed(2)}%
                </span>
              </div>
              <div className="gba:mt-2 gba:text-sm">
                {isOverLimit ? (
                  <span className="gba:text-destructive gba:font-medium">
                    {getTranslationFromI18nKeyAndLabel(
                      'investment.shareholders.overLimit',
                      `Exceeds 100% by ${(totalPercentage - 100).toFixed(2)}%`
                    )}
                  </span>
                ) : (
                  <span className="gba:text-muted-foreground">
                    {getTranslationFromI18nKeyAndLabel('investment.shareholders.remaining', 'Remaining')}:{' '}
                    {remainingPercentage.toFixed(2)}%
                  </span>
                )}
              </div>
            </div>

            {/* Shareholders List */}
            <div className="gba:space-y-3">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="gba:flex gba:gap-3 gba:items-start gba:p-4 gba:border gba:border-border gba:rounded-lg"
                  data-testid={formatDataTestId(prefixDataTestId, `ShareholderRow-${index}`)}
                >
                  {/* Name Field */}
                  <div className="gba:flex-1">
                    <FormField
                      control={form.control}
                      name={`shareholders.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {getTranslationFromI18nKeyAndLabel('investment.shareholders.name', 'Shareholder Name')}{' '}
                            <span className="gba:text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder={getTranslationFromI18nKeyAndLabel(
                                'investment.shareholders.namePlaceholder',
                                'Enter shareholder name'
                              )}
                              data-testid={formatDataTestId(prefixDataTestId, `NameInput-${index}`)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Stake Percentage Field */}
                  <div className="gba:w-32">
                    <FormField
                      control={form.control}
                      name={`shareholders.${index}.stakePercentage`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {getTranslationFromI18nKeyAndLabel('investment.shareholders.stake', 'Stake %')}{' '}
                            <span className="gba:text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              placeholder="0.00"
                              data-testid={formatDataTestId(prefixDataTestId, `StakeInput-${index}`)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Remove Button */}
                  <div className="gba:pt-5">
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      data-testid={formatDataTestId(prefixDataTestId, `RemoveButton-${index}`)}
                      className="gba:text-destructive gba:hover:text-destructive gba:text-xl gba:font-bold gba:cursor-pointer gba:bg-transparent gba:border-none gba:p-1"
                      aria-label="Remove shareholder"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Shareholder Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ name: '', stakePercentage: '' })}
              data-testid={formatDataTestId(prefixDataTestId, 'AddShareholderButton')}
              className="gba:w-full"
            >
              <PlusIcon className="gba:h-4 gba:w-4 gba:mr-2" />
              {getTranslationFromI18nKeyAndLabel('investment.shareholders.addShareholder', 'Add Shareholder')}
            </Button>
          </div>
        </Form>
      </div>
    </AppActionForm>
  )
}

export default InvestmentShareholderPopup
export { InvestmentShareholderPopup }
