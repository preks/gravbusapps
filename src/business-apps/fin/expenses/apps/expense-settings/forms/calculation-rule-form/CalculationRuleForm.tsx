import React, { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { expenseSettingsClient } from '../../utils/ExpenseSettingsClient'
import { formatDateForInput, normalizeDateInputValue, toISOEndOfDay, toISOStartOfDay } from '../../utils'
import { useGetExpenseRuleById } from '../../queries/ExpenseRuleQueries'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Checkbox,
  Alert,
  AlertDescription,
  Spinner,
  Textarea,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  DateInput
} from '@newwork/nw-design-system'
import { PiWarning } from 'react-icons/pi'
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'
import { calculationRuleFormSchema } from '../../schemas'

dayjs.extend(weekday)
dayjs.extend(localeData)

export interface CalculationRuleFormData {
  id?: string
  code: string
  name?: string
  description?: string
  standard: boolean
  activeFrom: string
  activeTo?: string
  deductionLimit: boolean
  useLastCountry: boolean
  useSingleCurrency: boolean
  taxesCode?: string
  nonpayableCode?: string
  advancePaymentCode?: string
  calculationTypeRef?: string
  countryRef?: string
  currencyRef?: string
  version?: number
}

interface CalculationRuleFormProps extends BusinessAppContextProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: CalculationRuleFormData
  isEditing?: boolean
  onSave: (data: CalculationRuleFormData) => Promise<void>
  loading?: boolean
}

interface CatalogOption {
  id: string
  value: string
  code?: string
}

const CalculationRuleForm: React.FC<CalculationRuleFormProps> = ({
  open,
  onOpenChange,
  initialData,
  isEditing = false,
  onSave,
  loading = false,
  accessToken,
  ...context
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { fetchExpenseRuleById } = useGetExpenseRuleById({ accessToken, ...context } as BusinessAppContextProps)

  // Catalog data
  const [calculationTypes, setCalculationTypes] = useState<CatalogOption[]>([])
  const [countries, setCountries] = useState<CatalogOption[]>([])
  const [currencies, setCurrencies] = useState<CatalogOption[]>([])
  const [catalogsLoading, setCatalogsLoading] = useState(true)

  const catalogClient = useCatalogManagerClient(accessToken)

  // React Hook Form setup with Zod validation
  const form = useForm<CalculationRuleFormData>({
    resolver: zodResolver(calculationRuleFormSchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      standard: false,
      activeFrom: '',
      activeTo: '',
      deductionLimit: false,
      useLastCountry: false,
      useSingleCurrency: false,
      taxesCode: '',
      nonpayableCode: '',
      advancePaymentCode: '',
      calculationTypeRef: '',
      countryRef: '',
      currencyRef: ''
    }
  })

  useEffect(() => {
    if (accessToken) {
      expenseSettingsClient.setAccessToken(accessToken)
    }
  }, [accessToken])

  const loadCatalogData = useCallback(async () => {
    setCatalogsLoading(true)
    try {
      const [calculationTypesRes, countriesRes, currenciesRes] = await Promise.all([
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'ExpenseCalculationType', version: 'v1' },
          { limit: 100, offset: 0, returnTotalRecords: true }
        ),
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'Country', version: 'v1' },
          { limit: 500, offset: 0, returnTotalRecords: true, includeChildCatalogEntries: true }
        ),
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'Currency', version: 'v1' },
          { limit: 100, offset: 0, returnTotalRecords: true }
        )
      ])

      setCalculationTypes(
        calculationTypesRes.data.map((item: any) => ({
          id: item.id,
          value: item.value,
          code: item.code
        }))
      )
      setCountries(
        countriesRes.data.map((item: any) => ({
          id: item.id,
          value: item.value,
          code: item.code
        }))
      )
      setCurrencies(
        currenciesRes.data.map((item: any) => ({
          id: item.id,
          value: item.value,
          code: item.code
        }))
      )
    } catch (err) {
      console.error('Error loading catalog data:', err)
      setError('Failed to load catalog data')
    } finally {
      setCatalogsLoading(false)
    }
  }, [catalogClient])

  useEffect(() => {
    if (accessToken && open) {
      loadCatalogData()
    }
  }, [accessToken, open, loadCatalogData])

  useEffect(() => {
    const loadData = async () => {
      if (!open) return

      if (isEditing && initialData?.id) {
        try {
          const freshData = await fetchExpenseRuleById(initialData.id)
          if (freshData) {
            form.reset({
              code: freshData.code || '',
              name: freshData.name || '',
              description: freshData.name || '',
              standard: freshData.standard || false,
              activeFrom: formatDateForInput(freshData.activeFrom) || '',
              activeTo: formatDateForInput(freshData.activeTo) || '',
              deductionLimit: freshData.deductionLimit || false,
              useLastCountry: freshData.useLastCountry || false,
              useSingleCurrency: freshData.useSingleCurrency || false,
              taxesCode: freshData.taxesCode || '',
              nonpayableCode: freshData.nonpayableCode || '',
              advancePaymentCode: freshData.advancePaymentCode || '',
              calculationTypeRef: freshData.calculationType?.id || '',
              countryRef: freshData.country?.id || '',
              currencyRef: freshData.currency?.id || '',
              id: freshData.id,
              version: freshData.version
            })
            return
          }
        } catch (err) {
          console.error('Failed to load fresh calculation rule data:', err)
        }
      }

      if (initialData) {
        form.reset({
          ...initialData,
          activeFrom: formatDateForInput(initialData.activeFrom) || '',
          activeTo: formatDateForInput(initialData.activeTo) || ''
        })
      } else {
        form.reset({
          code: '',
          name: '',
          description: '',
          standard: false,
          activeFrom: dayjs().format('YYYY-MM-DD'),
          activeTo: '',
          deductionLimit: false,
          useLastCountry: false,
          useSingleCurrency: false,
          taxesCode: '',
          nonpayableCode: '',
          advancePaymentCode: '',
          calculationTypeRef: '',
          countryRef: '',
          currencyRef: ''
        })
      }
    }

    loadData()
  }, [initialData?.id, isEditing, open, fetchExpenseRuleById, form])

  const handleSubmit = async (data: CalculationRuleFormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const expenseRuleData = {
        code: data.code,
        name: data.name,
        standard: data.standard || false,
        activeFrom: data.activeFrom ? toISOStartOfDay(data.activeFrom) : undefined,
        activeTo: data.activeTo ? toISOEndOfDay(data.activeTo) : undefined,
        deductionLimit: data.deductionLimit || false,
        useLastCountry: data.useLastCountry || false,
        useSingleCurrency: data.useSingleCurrency || false,
        taxesCode: data.taxesCode,
        nonpayableCode: data.nonpayableCode,
        advancePaymentCode: data.advancePaymentCode,
        calculationTypeRef: data.calculationTypeRef,
        countryRef: data.countryRef,
        currencyRef: data.currencyRef,
        ...(initialData?.id && { id: initialData.id }),
        ...(initialData?.version !== undefined && { version: initialData.version })
      }

      const result = await expenseSettingsClient.saveCalculationRule(expenseRuleData)

      const saveData: CalculationRuleFormData = {
        ...data,
        activeFrom: data.activeFrom ? toISOStartOfDay(data.activeFrom) || '' : '',
        activeTo: data.activeTo ? toISOEndOfDay(data.activeTo) || '' : '',
        id: result.expenseRule?.id || initialData?.id,
        version: result.expenseRule?.version ?? (initialData?.version !== undefined ? initialData.version + 1 : 1)
      }

      await onSave(saveData)
      onOpenChange(false)
    } catch (err) {
      console.error('Error saving calculation rule:', err)
      setError(err instanceof Error ? err.message : 'Failed to save calculation rule')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    form.reset()
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gba:max-w-3xl gba:max-h-[90vh] gba:overflow-y-auto"
        data-testid="calculation-rule-form-dialog"
      >
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Calculation Rule' : 'Create New Calculation Rule'}</DialogTitle>
        </DialogHeader>

        {catalogsLoading ? (
          <div
            className="gba:flex gba:justify-center gba:items-center gba:min-h-[200px]"
            data-testid="calculation-rule-form-loading"
          >
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {error && (
              <Alert variant="destructive" data-testid="calculation-rule-form-error">
                <PiWarning className="gba:h-4 gba:w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} data-testid="calculation-rule-form">
                <div className="gba:space-y-4">
                  {/* Basic Info */}
                  <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
                    <FormField
                      control={form.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Rule Code <span className="gba:text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Enter rule code (e.g., CR_001)"
                              data-testid="calculation-rule-form-code-input"
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
                          <FormLabel>Rule Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value || ''}
                              placeholder="Enter rule name"
                              data-testid="calculation-rule-form-name-input"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            value={field.value || ''}
                            rows={2}
                            placeholder="Enter rule description"
                            data-testid="calculation-rule-form-description-input"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Catalog Selects */}
                  <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4">
                    <FormField
                      control={form.control}
                      name="calculationTypeRef"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Calculation Type <span className="gba:text-destructive">*</span>
                          </FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger data-testid="calculation-rule-form-calculation-type-select">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {calculationTypes.map(type => (
                                <SelectItem key={type.id} value={type.id}>
                                  {type.value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="countryRef"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger data-testid="calculation-rule-form-country-select">
                                <SelectValue placeholder="Select country" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="gba:max-h-[200px]">
                              {countries.map(country => (
                                <SelectItem key={country.id} value={country.id}>
                                  {country.value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="currencyRef"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Currency</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger data-testid="calculation-rule-form-currency-select">
                                <SelectValue placeholder="Select currency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {currencies.map(currency => (
                                <SelectItem key={currency.id} value={currency.id}>
                                  {currency.value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Dates */}
                  <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
                    <FormField
                      control={form.control}
                      name="activeFrom"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Active From <span className="gba:text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <DateInput
                              value={field.value || ''}
                              onChange={date => field.onChange(normalizeDateInputValue(date) ?? '')}
                              outputFormat="iso"
                              data-testid="calculation-rule-form-active-from"
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
                          <FormLabel>Active To</FormLabel>
                          <FormControl>
                            <DateInput
                              value={field.value || ''}
                              onChange={date => field.onChange(normalizeDateInputValue(date))}
                              outputFormat="iso"
                              data-testid="calculation-rule-form-active-to"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Codes */}
                  <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4">
                    <FormField
                      control={form.control}
                      name="advancePaymentCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Advance Payment Code</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value || ''}
                              placeholder="Enter code"
                              data-testid="calculation-rule-form-advance-payment-input"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="taxesCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Taxes Code</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value || ''}
                              placeholder="Enter code"
                              data-testid="calculation-rule-form-taxes-code-input"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="nonpayableCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Non-payable Code</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value || ''}
                              placeholder="Enter code"
                              data-testid="calculation-rule-form-nonpayable-code-input"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Checkboxes */}
                  <div className="gba:grid gba:grid-cols-2 gba:md:grid-cols-4 gba:gap-4">
                    <FormField
                      control={form.control}
                      name="standard"
                      render={({ field }) => (
                        <FormItem className="gba:flex gba:flex-row gba:items-center gba:gap-3 gba:space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="calculation-rule-form-standard-checkbox"
                            />
                          </FormControl>
                          <FormLabel className="gba:font-normal">Standard Rule</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deductionLimit"
                      render={({ field }) => (
                        <FormItem className="gba:flex gba:flex-row gba:items-center gba:gap-3 gba:space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="calculation-rule-form-deduction-limit-checkbox"
                            />
                          </FormControl>
                          <FormLabel className="gba:font-normal">Deduction Limit</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="useLastCountry"
                      render={({ field }) => (
                        <FormItem className="gba:flex gba:flex-row gba:items-center gba:gap-3 gba:space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="calculation-rule-form-use-last-country-checkbox"
                            />
                          </FormControl>
                          <FormLabel className="gba:font-normal">Use Last Country</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="useSingleCurrency"
                      render={({ field }) => (
                        <FormItem className="gba:flex gba:flex-row gba:items-center gba:gap-3 gba:space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="calculation-rule-form-use-single-currency-checkbox"
                            />
                          </FormControl>
                          <FormLabel className="gba:font-normal">Single Currency</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <DialogFooter className="gba:mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    data-testid="calculation-rule-form-cancel-button"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || loading}
                    data-testid="calculation-rule-form-save-button"
                  >
                    {isSubmitting ? <Spinner size="sm" className="gba:mr-2" /> : null}
                    {isEditing ? 'Update' : 'Create'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default CalculationRuleForm
