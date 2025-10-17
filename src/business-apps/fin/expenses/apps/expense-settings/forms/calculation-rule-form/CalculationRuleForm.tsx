import React, { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { expenseSettingsClient } from '../../utils/ExpenseSettingsClient'
import { useGetExpenseRuleById } from '../../queries/ExpenseRuleQueries'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Switch,
  Alert,
  AlertDescription,
  Spinner,
  Calendar,
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@newwork/nw-design-system'
import { PiFloppyDisk, PiX, PiWarning } from 'react-icons/pi'
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'

// Register dayjs plugins
dayjs.extend(weekday)
dayjs.extend(localeData)

// Using nw-design-system components - no destructuring needed

export interface CalculationRuleFormData {
  id?: string
  code: string
  name?: string
  description?: string
  standard?: boolean
  activeFrom: string
  activeTo?: string
  deductionLimit: boolean
  useLastCountry?: boolean
  useSingleCurrency?: boolean
  taxesCode?: string
  nonpayableCode?: string
  advancePaymentCode?: string
  calculationTypeRef?: string
  countryRef?: string
  currencyRef?: string
  version?: number
}

interface CalculationRuleFormProps extends BusinessAppContextProps {
  initialData?: CalculationRuleFormData
  isEditing?: boolean
  onSave: (data: CalculationRuleFormData) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

interface CatalogOption {
  id: string
  value: string
  code?: string
}

const CalculationRuleForm: React.FC<CalculationRuleFormProps> = ({
  initialData,
  isEditing = false,
  onSave,
  onCancel,
  loading = false, // eslint-disable-line @typescript-eslint/no-unused-vars
  accessToken,
  ...context
}) => {
  const [formData, setFormData] = useState<CalculationRuleFormData>({
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
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ✅ NEW: Hook for fetching fresh calculation rule data
  const { fetchExpenseRuleById } = useGetExpenseRuleById({ accessToken, ...context } as BusinessAppContextProps)

  // Catalog data
  const [calculationTypes, setCalculationTypes] = useState<CatalogOption[]>([])
  const [countries, setCountries] = useState<CatalogOption[]>([])
  const [currencies, setCurrencies] = useState<CatalogOption[]>([])
  const [catalogsLoading, setCatalogsLoading] = useState(true)

  const catalogClient = useCatalogManagerClient(accessToken)

  // Set access token on the expense settings client
  useEffect(() => {
    if (accessToken) {
      expenseSettingsClient.setAccessToken(accessToken)
    }
  }, [accessToken])

  // Load catalog data
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

      const calculationTypesData = calculationTypesRes.data.map((item: any) => ({
        id: item.id,
        value: item.value,
        code: item.code
      }))

      const countriesData = countriesRes.data.map((item: any) => ({
        id: item.id,
        value: item.value,
        code: item.code
      }))

      const currenciesData = currenciesRes.data.map((item: any) => ({
        id: item.id,
        value: item.value,
        code: item.code
      }))

      console.log('🔍 Catalog data loaded:', {
        calculationTypes: calculationTypesData.length,
        countries: countriesData.length,
        currencies: currenciesData.length
      })

      setCalculationTypes(calculationTypesData)
      setCountries(countriesData)
      setCurrencies(currenciesData)
    } catch (err) {
      console.error('Error loading catalog data:', err)
      setError('Failed to load catalog data')
    } finally {
      setCatalogsLoading(false)
    }
  }, [catalogClient])

  useEffect(() => {
    if (accessToken) {
      loadCatalogData()
    }
  }, [accessToken, loadCatalogData])

  // ✅ FIXED: Load fresh data when editing, use initial data when creating
  useEffect(() => {
    const loadData = async () => {
      if (isEditing && initialData?.id) {
        // ✅ NEW: For editing, fetch fresh data from the server
        console.log('🔄 CalculationRuleForm: Fetching FRESH data for ID:', initialData.id)
        try {
          const freshData = await fetchExpenseRuleById(initialData.id)
          if (freshData) {
            console.log('✅ CalculationRuleForm: Using FRESH data from API:', freshData)
            setFormData({
              code: freshData.code || '',
              name: freshData.name || '',
              description: freshData.name || '', // Use name as description fallback
              standard: freshData.standard || false,
              activeFrom: freshData.activeFrom || '',
              activeTo: freshData.activeTo || '',
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
          }
        } catch (error) {
          console.error('❌ CalculationRuleForm: Failed to load fresh calculation rule data:', error)
          console.log('⚠️ CalculationRuleForm: Falling back to STALE list data')
          // Fallback to initial data if fresh fetch fails
          if (initialData) {
            setFormData({
              ...initialData,
              code: initialData.code || '',
              name: initialData.name || '',
              description: initialData.description || '',
              standard: initialData.standard || false,
              deductionLimit: initialData.deductionLimit || false,
              useLastCountry: initialData.useLastCountry || false,
              useSingleCurrency: initialData.useSingleCurrency || false,
              taxesCode: initialData.taxesCode || '',
              nonpayableCode: initialData.nonpayableCode || '',
              advancePaymentCode: initialData.advancePaymentCode || '',
              calculationTypeRef: initialData.calculationTypeRef || '',
              countryRef: initialData.countryRef || '',
              currencyRef: initialData.currencyRef || ''
            })
          }
        }
      } else if (initialData) {
        // ✅ For creating new items, use the provided initial data
        console.log('📝 CalculationRuleForm: Using initial data for NEW item:', initialData)
        setFormData({
          ...initialData,
          code: initialData.code || '',
          name: initialData.name || '',
          description: initialData.description || '',
          standard: initialData.standard || false,
          deductionLimit: initialData.deductionLimit || false,
          useLastCountry: initialData.useLastCountry || false,
          useSingleCurrency: initialData.useSingleCurrency || false,
          taxesCode: initialData.taxesCode || '',
          nonpayableCode: initialData.nonpayableCode || '',
          advancePaymentCode: initialData.advancePaymentCode || '',
          calculationTypeRef: initialData.calculationTypeRef || '',
          countryRef: initialData.countryRef || '',
          currencyRef: initialData.currencyRef || ''
        })
      } else {
        // Set default values for new rule
        setFormData(prev => ({
          ...prev,
          deductionLimit: false,
          activeFrom: dayjs().toISOString()
        }))
      }
    }

    loadData()
  }, [initialData?.id, isEditing, fetchExpenseRuleById])

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      // Prepare data for the expense settings service
      console.log('CalculationRuleForm.handleSubmit - Initial data:', {
        id: initialData?.id,
        version: initialData?.version,
        versionType: typeof initialData?.version,
        hasVersion: initialData?.version !== undefined
      })

      const expenseRuleData = {
        code: formData.code,
        name: formData.name,
        standard: formData.standard || false,
        activeFrom: formData.activeFrom ? dayjs(formData.activeFrom).toISOString() : undefined,
        activeTo: formData.activeTo ? dayjs(formData.activeTo).toISOString() : undefined,
        deductionLimit: formData.deductionLimit || false,
        useLastCountry: formData.useLastCountry || false,
        useSingleCurrency: formData.useSingleCurrency || false,
        taxesCode: formData.taxesCode,
        nonpayableCode: formData.nonpayableCode,
        advancePaymentCode: formData.advancePaymentCode,
        calculationTypeRef: formData.calculationTypeRef,
        countryRef: formData.countryRef,
        currencyRef: formData.currencyRef,
        ...(initialData?.id && { id: initialData.id }),
        ...(initialData?.version !== undefined && { version: initialData.version })
      }

      console.log('CalculationRuleForm.handleSubmit - Expense rule data:', expenseRuleData)

      // Save using the existing expense settings client
      const result = await expenseSettingsClient.saveCalculationRule(expenseRuleData)

      // Prepare form data for the onSave callback (for compatibility)
      const saveData: CalculationRuleFormData = {
        ...formData,
        activeFrom: formData.activeFrom ? dayjs(formData.activeFrom).toISOString() : '',
        activeTo: formData.activeTo ? dayjs(formData.activeTo).toISOString() : '',
        id: result.expenseRule?.id || initialData?.id,
        version: result.expenseRule?.version || (initialData?.version ? initialData.version + 1 : 1)
      }

      await onSave(saveData)
    } catch (err) {
      console.error('Error saving calculation rule:', err)
      setError(err instanceof Error ? err.message : 'Failed to save calculation rule')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setFormData({
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
    })
    onCancel()
  }

  if (catalogsLoading) {
    return (
      <div
        data-testid="calculation-rule-form-loading"
        className="gba:flex gba:justify-center gba:items-center gba:min-h-96"
      >
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div data-testid="calculation-rule-form-container">
      <Card data-testid="calculation-rule-form-card">
        <CardHeader>
          <CardTitle>{isEditing ? 'Edit Calculation Rule' : 'Create New Calculation Rule'}</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert data-testid="calculation-rule-form-error" className="gba:mb-4">
              <PiWarning className="gba:h-4 gba:w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form
            onSubmit={e => {
              e.preventDefault()
              handleSubmit()
            }}
            data-testid="calculation-rule-form"
            className="gba:space-y-6"
          >
            <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
              <div>
                <label htmlFor="code" className="gba:block gba:text-sm gba:font-medium gba:mb-2">
                  Rule Code *
                </label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={e => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="Enter rule code (e.g., CR_001)"
                  data-testid="calculation-rule-form-code-input"
                  required
                />
              </div>

              <div>
                <label htmlFor="name" className="gba:block gba:text-sm gba:font-medium gba:mb-2">
                  Rule Name
                </label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter rule name"
                  data-testid="calculation-rule-form-name-input"
                />
              </div>
            </div>

            <div>
              <label htmlFor="description" className="gba:block gba:text-sm gba:font-medium gba:mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description || ''}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                placeholder="Enter rule description"
                data-testid="calculation-rule-form-description-input"
                className="gba:w-full gba:min-h-[80px] gba:px-3 gba:py-2 gba:border gba:border-gray-300 gba:rounded-md gba:shadow-sm focus:gba:ring-2 focus:gba:ring-blue-500 focus:gba:border-blue-500 gba:resize-y"
              />
            </div>

            <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-3 gba:gap-4">
              <div>
                <label htmlFor="calculationType" className="gba:block gba:text-sm gba:font-medium gba:mb-2">
                  Calculation Type * ({calculationTypes.length} options)
                </label>
                <Select
                  value={formData.calculationTypeRef}
                  onValueChange={value => {
                    console.log('🔍 Calculation Type selected:', value)
                    setFormData(prev => ({ ...prev, calculationTypeRef: value }))
                  }}
                >
                  <SelectTrigger data-testid="calculation-rule-form-calculation-type-select">
                    <SelectValue placeholder="Select calculation type" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={5} className="gba:z-[9999]">
                    {calculationTypes.length === 0 ? (
                      <div className="gba:p-2 gba:text-sm gba:text-muted-foreground">No options available</div>
                    ) : (
                      calculationTypes.map(type => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.value}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor="country" className="gba:block gba:text-sm gba:font-medium gba:mb-2">
                  Country ({countries.length} options)
                </label>
                <Select
                  value={formData.countryRef}
                  onValueChange={value => {
                    console.log('🔍 Country selected:', value)
                    setFormData(prev => ({ ...prev, countryRef: value }))
                  }}
                >
                  <SelectTrigger data-testid="calculation-rule-form-country-select">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={5} className="gba:z-[9999] gba:max-h-[300px]">
                    {countries.length === 0 ? (
                      <div className="gba:p-2 gba:text-sm gba:text-muted-foreground">No options available</div>
                    ) : (
                      countries.map(country => (
                        <SelectItem key={country.id} value={country.id}>
                          {country.value} {country.code && `(${country.code})`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor="currency" className="gba:block gba:text-sm gba:font-medium gba:mb-2">
                  Currency ({currencies.length} options)
                </label>
                <Select
                  value={formData.currencyRef}
                  onValueChange={value => {
                    console.log('🔍 Currency selected:', value)
                    setFormData(prev => ({ ...prev, currencyRef: value }))
                  }}
                >
                  <SelectTrigger data-testid="calculation-rule-form-currency-select">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={5} className="gba:z-[9999]">
                    {currencies.length === 0 ? (
                      <div className="gba:p-2 gba:text-sm gba:text-muted-foreground">No options available</div>
                    ) : (
                      currencies.map(currency => (
                        <SelectItem key={currency.id} value={currency.id}>
                          {currency.value} {currency.code && `(${currency.code})`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
              <div>
                <label className="gba:block gba:text-sm gba:font-medium gba:mb-2">Active From *</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="gba:w-full gba:justify-start gba:text-left gba:font-normal"
                      data-testid="calculation-rule-form-active-from-trigger"
                    >
                      {formData.activeFrom ? dayjs(formData.activeFrom).format('YYYY-MM-DD') : 'Select start date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="gba:w-auto gba:p-0">
                    <Calendar
                      mode="single"
                      selected={formData.activeFrom ? new Date(formData.activeFrom) : undefined}
                      onSelect={(date: Date | undefined) =>
                        setFormData(prev => ({ ...prev, activeFrom: date ? dayjs(date).toISOString() : '' }))
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="gba:block gba:text-sm gba:font-medium gba:mb-2">Active To</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="gba:w-full gba:justify-start gba:text-left gba:font-normal"
                      data-testid="calculation-rule-form-active-to-trigger"
                    >
                      {formData.activeTo ? dayjs(formData.activeTo).format('YYYY-MM-DD') : 'Select end date (optional)'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="gba:w-auto gba:p-0">
                    <Calendar
                      mode="single"
                      selected={formData.activeTo ? new Date(formData.activeTo) : undefined}
                      onSelect={(date: Date | undefined) =>
                        setFormData(prev => ({ ...prev, activeTo: date ? dayjs(date).toISOString() : '' }))
                      }
                      disabled={date => {
                        if (!formData.activeFrom) return false
                        return date < new Date(formData.activeFrom)
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
              <div>
                <label htmlFor="advancePaymentCode" className="gba:block gba:text-sm gba:font-medium gba:mb-2">
                  Advance Payment Code
                </label>
                <Input
                  id="advancePaymentCode"
                  value={formData.advancePaymentCode || ''}
                  onChange={e => setFormData(prev => ({ ...prev, advancePaymentCode: e.target.value }))}
                  placeholder="Enter advance payment code"
                  data-testid="calculation-rule-form-advance-payment-input"
                />
              </div>

              <div className="gba:flex gba:items-center gba:space-x-2">
                <Switch
                  id="deductionLimit"
                  checked={formData.deductionLimit}
                  onCheckedChange={checked => setFormData(prev => ({ ...prev, deductionLimit: checked }))}
                  data-testid="calculation-rule-form-deduction-limit-switch"
                />
                <label htmlFor="deductionLimit" className="gba:text-sm gba:font-medium">
                  Deduction Limit
                </label>
              </div>
            </div>

            <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-3 gba:gap-4">
              <div className="gba:flex gba:items-center gba:space-x-2">
                <Switch
                  id="standard"
                  checked={formData.standard}
                  onCheckedChange={checked => setFormData(prev => ({ ...prev, standard: checked }))}
                  data-testid="calculation-rule-form-standard-switch"
                />
                <label htmlFor="standard" className="gba:text-sm gba:font-medium">
                  Standard Rule
                </label>
              </div>

              <div className="gba:flex gba:items-center gba:space-x-2">
                <Switch
                  id="useLastCountry"
                  checked={formData.useLastCountry}
                  onCheckedChange={checked => setFormData(prev => ({ ...prev, useLastCountry: checked }))}
                  data-testid="calculation-rule-form-use-last-country-switch"
                />
                <label htmlFor="useLastCountry" className="gba:text-sm gba:font-medium">
                  Use Last Country
                </label>
              </div>

              <div className="gba:flex gba:items-center gba:space-x-2">
                <Switch
                  id="useSingleCurrency"
                  checked={formData.useSingleCurrency}
                  onCheckedChange={checked => setFormData(prev => ({ ...prev, useSingleCurrency: checked }))}
                  data-testid="calculation-rule-form-use-single-currency-switch"
                />
                <label htmlFor="useSingleCurrency" className="gba:text-sm gba:font-medium">
                  Use Single Currency
                </label>
              </div>
            </div>

            <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
              <div>
                <label htmlFor="taxesCode" className="gba:block gba:text-sm gba:font-medium gba:mb-2">
                  Taxes Code
                </label>
                <Input
                  id="taxesCode"
                  value={formData.taxesCode || ''}
                  onChange={e => setFormData(prev => ({ ...prev, taxesCode: e.target.value }))}
                  placeholder="Enter taxes code"
                  data-testid="calculation-rule-form-taxes-code-input"
                />
              </div>

              <div>
                <label htmlFor="nonpayableCode" className="gba:block gba:text-sm gba:font-medium gba:mb-2">
                  Non-payable Code
                </label>
                <Input
                  id="nonpayableCode"
                  value={formData.nonpayableCode || ''}
                  onChange={e => setFormData(prev => ({ ...prev, nonpayableCode: e.target.value }))}
                  placeholder="Enter non-payable code"
                  data-testid="calculation-rule-form-nonpayable-code-input"
                />
              </div>
            </div>

            <div className="gba:flex gba:gap-4 gba:mt-6">
              <Button
                type="submit"
                disabled={isSubmitting}
                data-testid="calculation-rule-form-save-button"
                className="gba:flex gba:items-center gba:gap-2"
              >
                {isSubmitting ? <Spinner size="sm" /> : <PiFloppyDisk className="gba:h-4 gba:w-4" />}
                {isEditing ? 'Update Rule' : 'Create Rule'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                data-testid="calculation-rule-form-cancel-button"
                className="gba:flex gba:items-center gba:gap-2"
              >
                <PiX className="gba:h-4 gba:w-4" />
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default CalculationRuleForm
