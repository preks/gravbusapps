import React, { useState, useMemo, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Alert,
  AlertDescription,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  DateInput
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { ExpenseSettingsClient } from '../../utils/ExpenseSettingsClient'
import dayjs from 'dayjs'
import { allowanceRegionRuleFormSchema } from '../../schemas'

// Custom toast function
const toast = (message: string, type: 'success' | 'error' = 'success') => {
  console.log(`[${type.toUpperCase()}] ${message}`)
}

export interface AllowanceRegionRuleFormData {
  code: string
  name: string
  description?: string
  activeFrom: string
  activeTo?: string
  travelRegionSetRef?: string
}

interface AllowanceRegionRuleFormProps extends BusinessAppContextProps {
  open: boolean
  onClose: () => void
  onSave: (data: AllowanceRegionRuleFormData) => void
  travelRegionSetId?: string
  travelRegionSetName?: string
  prefixDataTestId?: string
}

const AllowanceRegionRuleForm: React.FC<AllowanceRegionRuleFormProps> = ({
  accessToken,
  open,
  onClose,
  onSave,
  travelRegionSetId,
  travelRegionSetName,
  prefixDataTestId = ''
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // React Hook Form setup with Zod validation
  const form = useForm<AllowanceRegionRuleFormData>({
    resolver: zodResolver(allowanceRegionRuleFormSchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      activeFrom: dayjs().format('YYYY-MM-DD'),
      activeTo: '',
      travelRegionSetRef: travelRegionSetId
    }
  })

  const expenseSettingsClient = useMemo(() => new ExpenseSettingsClient(), [])

  useEffect(() => {
    if (accessToken) {
      expenseSettingsClient.setAccessToken(accessToken)
    }
  }, [accessToken, expenseSettingsClient])

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        code: '',
        name: '',
        description: '',
        activeFrom: dayjs().format('YYYY-MM-DD'),
        activeTo: '',
        travelRegionSetRef: travelRegionSetId
      })
      setError(null)
    }
  }, [open, travelRegionSetId, form])

  const handleSubmit = async (data: AllowanceRegionRuleFormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      // Create the allowance region rule
      const ruleData = {
        code: data.code.trim(),
        name: data.name.trim(),
        description: data.description?.trim() || '',
        activeFrom: data.activeFrom ? `${data.activeFrom}T00:00:00+00:00` : null,
        activeTo: data.activeTo ? `${data.activeTo}T00:00:00+00:00` : null,
        travelRegionSetRef: travelRegionSetId,
        additionalProperties: {},
        businessKey: data.code.trim()
      }

      await expenseSettingsClient.saveAllowanceRegionRule(ruleData)

      toast('Allowance region rule created successfully', 'success')
      onSave(data)
      handleClose()
    } catch (err) {
      console.error('❌ Error creating Allowance Region Rule:', err)
      setError(err instanceof Error ? err.message : 'Failed to create Allowance Region Rule')
      toast('Failed to create Allowance Region Rule', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    form.reset({
      code: '',
      name: '',
      description: '',
      activeFrom: dayjs().format('YYYY-MM-DD'),
      activeTo: '',
      travelRegionSetRef: travelRegionSetId
    })
    setError(null)
    onClose()
  }

  // Watch form values for submit button disabled state
  const codeValue = form.watch('code')
  const nameValue = form.watch('name')

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        data-testid={`${prefixDataTestId}-allowance-region-rule-form`}
        className="gba:max-w-2xl gba:max-h-[85vh]"
      >
        <DialogHeader>
          <DialogTitle>
            {getTranslationFromI18nKeyAndLabel(
              'expense-settings:create_allowance_rule',
              'Create Allowance Region Rule'
            )}
          </DialogTitle>
          {travelRegionSetName && (
            <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
              Adding to: <span className="gba:font-medium">{travelRegionSetName}</span>
            </p>
          )}
        </DialogHeader>

        <div className="gba:overflow-y-auto gba:max-h-[calc(85vh-120px)]">
          {error && (
            <Alert className="gba:mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="gba:space-y-3 gba:px-1">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {getTranslationFromI18nKeyAndLabel('expense-settings:code', 'Code')}
                      <span className="gba:text-destructive gba:ml-1">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter unique code (e.g., HOTEL_EU)"
                        data-testid={`${prefixDataTestId}-code-input`}
                        disabled={isSubmitting}
                        className="gba:h-9 gba:text-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {getTranslationFromI18nKeyAndLabel('expense-settings:name', 'Name')}
                      <span className="gba:text-destructive gba:ml-1">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter display name (e.g., Hotel Allowance Europe)"
                        data-testid={`${prefixDataTestId}-name-input`}
                        disabled={isSubmitting}
                        className="gba:h-9 gba:text-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {getTranslationFromI18nKeyAndLabel('expense-settings:description', 'Description')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ''}
                        placeholder="Enter optional description"
                        data-testid={`${prefixDataTestId}-description-input`}
                        disabled={isSubmitting}
                        className="gba:h-9 gba:text-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="gba:grid gba:grid-cols-2 gba:gap-3">
                <FormField
                  control={form.control}
                  name="activeFrom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {getTranslationFromI18nKeyAndLabel('expense-settings:active_from', 'Active From')}
                        <span className="gba:text-destructive gba:ml-1">*</span>
                      </FormLabel>
                      <FormControl>
                        <DateInput
                          value={field.value || ''}
                          onChange={date => field.onChange(date)}
                          data-testid={`${prefixDataTestId}-active-from-input`}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="activeTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {getTranslationFromI18nKeyAndLabel('expense-settings:active_to', 'Active To')}
                      </FormLabel>
                      <FormControl>
                        <DateInput
                          value={field.value || ''}
                          onChange={date => field.onChange(date)}
                          data-testid={`${prefixDataTestId}-active-to-input`}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="gba:flex gba:justify-end gba:gap-2 gba:pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  size="sm"
                  className="gba:h-9 gba:text-sm"
                  data-testid={`${prefixDataTestId}-cancel-button`}
                >
                  {getTranslationFromI18nKeyAndLabel('expense-settings:cancel', 'Cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !codeValue?.trim() || !nameValue?.trim()}
                  size="sm"
                  className="gba:h-9 gba:text-sm"
                  data-testid={`${prefixDataTestId}-save-button`}
                >
                  {isSubmitting
                    ? getTranslationFromI18nKeyAndLabel('expense-settings:creating', 'Creating...')
                    : getTranslationFromI18nKeyAndLabel('expense-settings:create', 'Create')}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AllowanceRegionRuleForm
