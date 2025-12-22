import React, { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Alert,
  AlertDescription,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Card,
  CardContent,
  Switch as NWSwitch,
  DateInput
} from '@newwork/nw-design-system'
import { toast, Toaster } from 'sonner'
import { useGetExpenseRuleById } from '../../queries/ExpenseRuleQueries'
import { PiArrowLeft, PiWarning, PiCheckCircle, PiCalendar } from 'react-icons/pi'
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'

// Register dayjs plugins
dayjs.extend(weekday)
dayjs.extend(localeData)

// Tab components (these would be separate modules in a full implementation)
import GeneralExpensesTab from './tabs/GeneralExpensesTab'
import MileageRulesTab from './tabs/MileageRulesTab'
import AllowancePeriodTab from './tabs/AllowancePeriodTab'
import AllowanceCodeTab from './tabs/AllowanceCodeTab'
import AllowanceSetupTab from './tabs/AllowanceSetupTab'
import CustomFieldsTab from './tabs/CustomFieldsTab'
import OtherCalculationTab from './tabs/OtherCalculationTab'

interface CatalogOption {
  id: string
  value: string
  code: string
}

interface CalculationRuleRecordProps extends BusinessAppContextProps {
  ruleId: string
  page?: string
  onNavigateBack: () => void
}

interface CalculationRuleDetails {
  id: string
  code: string
  name: string
  calculationTypeRef?: string
  calculationType?: {
    id: string
    value: string
  }
  standard: boolean
  activeFrom: string
  activeTo?: string
  currency?: {
    id: string
    value: string
    code: string
  }
  currencyRef?: string
  country?: {
    id: string
    value: string
    code: string
  }
  countryRef?: string
  deductionLimit: boolean
  taxesCode?: string
  useLastCountry: boolean
  nonpayableCode?: string
  advancePaymentCode?: string
  useSingleCurrency: boolean
  version: number
  createdAt: string
  updatedAt: string
  isDeleted: boolean
}

interface ExpenseRuleFlag {
  id?: string
  expenseRuleId: string
  code: string
  name: string
  value: string
  version?: number
}

interface FormData {
  code: string
  name: string
  standard: boolean
  activeFrom: string
  activeTo: string
  calculationTypeRef: string
  currencyRef: string
  advancePaymentCode: string
  taxesCode: string
  nonpayableCode: string
  countryRef: string
  useLastCountry: boolean
  deductionLimit: boolean
  useSingleCurrency: boolean
  romanianCalculation: boolean
  austrianAbroad: boolean
}

const CalculationRuleRecord: React.FC<CalculationRuleRecordProps> = ({
  ruleId,
  page,
  onNavigateBack,
  accessToken,
  ...context
}) => {
  const [ruleDetails, setRuleDetails] = useState<CalculationRuleDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Controlled form state
  const [formData, setFormData] = useState<FormData>({
    code: '',
    name: '',
    standard: false,
    activeFrom: '',
    activeTo: '',
    calculationTypeRef: '',
    currencyRef: '',
    advancePaymentCode: '',
    taxesCode: '',
    nonpayableCode: '',
    countryRef: '',
    useLastCountry: false,
    deductionLimit: false,
    useSingleCurrency: false,
    romanianCalculation: false,
    austrianAbroad: false
  })
  // Tab and sub-tab management with query parameters
  const getInitialTab = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const tabFromUrl = urlParams.get('tab')
    const validTabs = ['general', 'expenses', 'mileage', 'allowance', 'other-calculation', 'custom-fields']
    return tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : 'general'
  }

  const getInitialSubTab = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const subTabFromUrl = urlParams.get('subTab')
    const validSubTabs = ['allowance-period', 'allowance-code', 'allowance-setup', 'allowance-deduction']
    return subTabFromUrl && validSubTabs.includes(subTabFromUrl) ? subTabFromUrl : 'allowance-period'
  }

  const [activeTab, setActiveTab] = useState(getInitialTab())
  const [activeSubTab, setActiveSubTab] = useState(getInitialSubTab())
  const [hasChanges, setHasChanges] = useState(false)
  const [initialFormData, setInitialFormData] = useState<FormData | null>(null)

  // Catalog data
  const [calculationTypes, setCalculationTypes] = useState<CatalogOption[]>([])
  const [currencies, setCurrencies] = useState<CatalogOption[]>([])
  const [countries, setCountries] = useState<CatalogOption[]>([])
  const [catalogsLoading, setCatalogsLoading] = useState(true)

  // URL update functions for tab navigation
  const updateUrl = (newTab?: string, newSubTab?: string) => {
    const urlParams = new URLSearchParams(window.location.search)

    if (newTab !== undefined) {
      urlParams.set('tab', newTab)
    }

    if (newSubTab !== undefined) {
      if (newTab === 'allowance' || activeTab === 'allowance') {
        urlParams.set('subTab', newSubTab)
      } else {
        // Clear subTab if not on allowance tab
        urlParams.delete('subTab')
      }
    }

    const newUrl = `${window.location.pathname}?${urlParams.toString()}`
    window.history.replaceState({}, '', newUrl)
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    updateUrl(tab, tab === 'allowance' ? activeSubTab : undefined)
  }

  const handleSubTabChange = (subTab: string) => {
    setActiveSubTab(subTab)
    updateUrl(undefined, subTab)
  }

  // Use the GraphQL hook for fetching expense rule data
  const { fetchExpenseRuleById } = useGetExpenseRuleById({ accessToken, ...context })

  // Catalog client for loading calculation types and currencies
  const catalogClient = useCatalogManagerClient(accessToken)

  // REST client for saving expense rules
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  const loadRuleDetails = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch actual data from GraphQL
      const ruleData = await fetchExpenseRuleById(ruleId)

      if (!ruleData) {
        throw new Error(`Expense rule with ID ${ruleId} not found`)
      }

      // Transform GraphQL data to component format
      const ruleDetails: CalculationRuleDetails = {
        id: ruleData.id,
        code: ruleData.code,
        name: ruleData.name,
        calculationTypeRef: ruleData.calculationType?.id,
        calculationType: ruleData.calculationType
          ? {
              id: ruleData.calculationType.id,
              value: ruleData.calculationType.value
            }
          : undefined,
        standard: ruleData.standard || false,
        activeFrom: ruleData.activeFrom,
        activeTo: ruleData.activeTo,
        currency: ruleData.currency
          ? {
              id: ruleData.currency.id,
              value: ruleData.currency.value,
              code: ruleData.currency.code
            }
          : undefined,
        currencyRef: ruleData.currency?.id,
        country: ruleData.country
          ? {
              id: ruleData.country.id,
              value: ruleData.country.value,
              code: ruleData.country.code
            }
          : undefined,
        countryRef: ruleData.country?.id,
        deductionLimit: ruleData.deductionLimit || false,
        taxesCode: ruleData.taxesCode || '',
        useLastCountry: ruleData.useLastCountry || false,
        nonpayableCode: ruleData.nonpayableCode || '',
        advancePaymentCode: ruleData.advancePaymentCode || '',
        useSingleCurrency: ruleData.useSingleCurrency || false,
        version: ruleData.version,
        createdAt: ruleData.createdAt || new Date().toISOString(),
        updatedAt: ruleData.updatedAt || new Date().toISOString(),
        isDeleted: false
      }

      // For now, use mock flags until we have proper flag data structure from GraphQL
      const mockFlags: ExpenseRuleFlag[] = [
        {
          id: 'flag-1',
          expenseRuleId: ruleId,
          code: 'romanianCalculation',
          name: 'Romanian Calculation',
          value: 'true',
          version: 1
        }
      ]

      setRuleDetails(ruleDetails)
      // Note: mockFlags prepared for future rule validation feature

      // Initialize form values
      const initialValues: FormData = {
        // Basic Information
        code: ruleDetails.code || '',
        name: ruleDetails.name || '',
        standard: ruleDetails.standard || false,

        // Validity & Configuration
        activeFrom: ruleDetails.activeFrom ? dayjs(ruleDetails.activeFrom).format('YYYY-MM-DD') : '',
        activeTo: ruleDetails.activeTo ? dayjs(ruleDetails.activeTo).format('YYYY-MM-DD') : '',
        calculationTypeRef: ruleDetails.calculationTypeRef || '',
        currencyRef: ruleDetails.currencyRef || '',

        // Wage Codes
        advancePaymentCode: ruleDetails.advancePaymentCode || '',
        taxesCode: ruleDetails.taxesCode || '',
        nonpayableCode: ruleDetails.nonpayableCode || '',
        countryRef: ruleDetails.countryRef || '',

        // Special Settings
        useLastCountry: ruleDetails.useLastCountry || false,
        deductionLimit: ruleDetails.deductionLimit || false,
        useSingleCurrency: ruleDetails.useSingleCurrency || false,
        romanianCalculation: mockFlags.some(f => f.code === 'romanianCalculation' && f.value === 'true'),
        austrianAbroad: mockFlags.some(f => f.code === 'austrianAbroad' && f.value === 'true')
      }

      setFormData(initialValues)
      setInitialFormData(initialValues)
    } catch (err) {
      console.error('❌ Error loading expense rule details:', err)
      setError(err instanceof Error ? err.message : 'Failed to load rule details')
    } finally {
      setIsLoading(false)
    }
  }, [ruleId, fetchExpenseRuleById])

  // Load catalog data for calculation types, currencies, and countries
  const loadCatalogData = useCallback(async () => {
    setCatalogsLoading(true)
    try {
      const [calculationTypesRes, currenciesRes, countriesRes] = await Promise.all([
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'ExpenseCalculationType', version: 'v1' },
          { limit: 100, offset: 0, returnTotalRecords: true }
        ),
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'Currency', version: 'v1' },
          { limit: 100, offset: 0, returnTotalRecords: true }
        ),
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'Country', version: 'v1' },
          { limit: 500, offset: 0, returnTotalRecords: true, includeChildCatalogEntries: true }
        )
      ])

      setCalculationTypes(
        calculationTypesRes.data.map((item: any) => ({
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

      setCountries(
        countriesRes.data.map((item: any) => ({
          id: item.id,
          value: item.value,
          code: item.code
        }))
      )
    } catch (error) {
      console.error('Error loading catalog data:', error)
    } finally {
      setCatalogsLoading(false)
    }
  }, [catalogClient])

  useEffect(() => {
    if (ruleId && accessToken) {
      loadRuleDetails()
    }
  }, [ruleId, accessToken, loadRuleDetails])

  useEffect(() => {
    if (accessToken) {
      loadCatalogData()
    }
  }, [accessToken, loadCatalogData])

  // Ensure URL always has tab parameter and handle browser navigation
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (!urlParams.has('tab')) {
      updateUrl(activeTab, activeTab === 'allowance' ? activeSubTab : undefined)
    }

    const handlePopState = () => {
      const newTab = getInitialTab()
      const newSubTab = getInitialSubTab()
      setActiveTab(newTab)
      setActiveSubTab(newSubTab)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [activeTab, activeSubTab])

  // Track form changes
  useEffect(() => {
    if (!initialFormData) return

    const hasModifications = Object.keys(formData).some(
      key => formData[key as keyof FormData] !== initialFormData[key as keyof FormData]
    )

    setHasChanges(hasModifications)
  }, [formData, initialFormData])

  const handleSave = async () => {
    try {
      setIsSaving(true)

      // Build the expense rule payload
      const expenseRulePayload = {
        expenseRule: {
          id: ruleDetails?.id,
          version: ruleDetails?.version,
          code: formData.code,
          name: formData.name,
          standard: formData.standard,
          activeFrom: formData.activeFrom ? dayjs(formData.activeFrom).startOf('day').toISOString() : null,
          activeTo: formData.activeTo ? dayjs(formData.activeTo).endOf('day').toISOString() : null,
          calculationTypeRef: formData.calculationTypeRef || null,
          currencyRef: formData.currencyRef || null,
          countryRef: formData.countryRef || null,
          advancePaymentCode: formData.advancePaymentCode || null,
          taxesCode: formData.taxesCode || null,
          nonpayableCode: formData.nonpayableCode || null,
          useLastCountry: formData.useLastCountry,
          deductionLimit: formData.deductionLimit,
          useSingleCurrency: formData.useSingleCurrency
        },
        changeMode: 'UPDATE'
      }

      // Save expense rule
      await restClient.post('/employee-expense/saveExpenseRule', expenseRulePayload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      })

      // Handle Austrian/Romanian flags if changed
      const isAustrianAbroad = !!formData.austrianAbroad
      const isRomanianCalculation = !!formData.romanianCalculation

      if (isAustrianAbroad || isRomanianCalculation) {
        const flagCode = isRomanianCalculation ? 'romanianCalculation' : 'austrianAbroad'
        const flagName = isRomanianCalculation ? 'Romanian Calculation' : 'Austrian Abroad'

        const flagPayload = {
          expenseRuleFlag: {
            expenseRuleId: ruleDetails?.id,
            code: flagCode,
            name: flagName,
            value: 'true'
          },
          changeMode: 'INSERT'
        }

        await restClient.post('/employee-expense/saveExpenseRuleFlag', flagPayload, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
            'Content-Type': 'application/json'
          }
        })
      }

      toast.success('Rule saved successfully')
      setHasChanges(false)

      // Reload data to get updated version
      await loadRuleDetails()
    } catch (err) {
      toast.error('Failed to save rule')
      console.error('Save error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDiscard = () => {
    if (initialFormData) {
      setFormData(initialFormData)
      setHasChanges(false)
    }
  }

  if (isLoading) {
    return (
      <div
        data-testid="calculation-rule-record-loading"
        className="gba:flex gba:justify-center gba:items-center gba:min-h-96"
      >
        <Spinner className="gba:w-12 gba:h-12" />
      </div>
    )
  }

  if (error || !ruleDetails) {
    return (
      <div data-testid="calculation-rule-record-error" className="gba:p-6">
        <Alert variant="destructive">
          <PiWarning className="gba:h-4 gba:w-4" />
          <AlertDescription>
            <div className="gba:flex gba:flex-col gba:gap-4">
              <div>
                <strong>Error Loading Rule Details</strong>
                <p className="gba:text-sm gba:mt-1">{error || 'Rule not found'}</p>
              </div>
              <div className="gba:flex gba:gap-2">
                <Button size="sm" onClick={loadRuleDetails} data-testid="retry-button">
                  Retry
                </Button>
                <Button size="sm" variant="outline" onClick={onNavigateBack} data-testid="go-back-button">
                  Go Back
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div data-testid="calculation-rule-record-container" className="gba:h-full gba:flex gba:flex-col gba:p-6">
      <Toaster />

      {/* Simple Header */}
      <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
        <div className="gba:flex gba:items-center gba:gap-4">
          <Button variant="outline" onClick={onNavigateBack} data-testid="calculation-rule-record-back-button">
            <PiArrowLeft className="gba:mr-2 gba:h-4 gba:w-4" />
            Back{page && ` to ${page}`}
          </Button>
          <h2 className="gba:text-2xl gba:font-semibold gba:text-foreground">
            {formData.name || ruleDetails.name || 'Calculation Rule'}
          </h2>
        </div>
      </div>

      {/* Tabs */}
      <div className="gba:flex-1">
        <Tabs value={activeTab} onValueChange={handleTabChange} data-testid="calculation-rule-record-tabs">
          <TabsList className="gba:mb-4">
            <TabsTrigger value="general" data-testid="tab-general">
              General
            </TabsTrigger>
            <TabsTrigger value="expenses" data-testid="tab-expenses">
              Expenses
            </TabsTrigger>
            <TabsTrigger value="mileage" data-testid="tab-mileage">
              Mileage
            </TabsTrigger>
            <TabsTrigger value="allowance" data-testid="tab-allowance">
              Allowance
            </TabsTrigger>
            <TabsTrigger value="other-calculation" data-testid="tab-other-calculation">
              Other Calculation
            </TabsTrigger>
            <TabsTrigger value="custom-fields" data-testid="tab-custom-fields">
              Custom Fields
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" data-testid="general-tab-content">
            <Card>
              <CardContent className="gba:pt-6">
                {/* Basic Information Section */}
                <div className="gba:mb-8">
                  <h4 className="gba:text-lg gba:font-semibold gba:mb-6 gba:pb-2 gba:border-b gba:border-border">
                    Basic Information
                  </h4>
                  <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-12 gba:gap-6">
                    <div className="md:gba:col-span-4">
                      <Label htmlFor="code">Code *</Label>
                      <Input
                        id="code"
                        data-testid="rule-code-input"
                        placeholder="Enter rule code"
                        value={formData.code}
                        onChange={e => setFormData({ ...formData, code: e.target.value })}
                        required
                      />
                    </div>
                    <div className="md:gba:col-span-6">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        data-testid="rule-name-input"
                        placeholder="Enter rule name"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="md:gba:col-span-2 gba:flex gba:items-end">
                      <div className="gba:flex gba:items-center gba:space-x-2">
                        <NWSwitch
                          id="standard"
                          data-testid="rule-standard-checkbox"
                          checked={formData.standard}
                          onCheckedChange={checked => setFormData({ ...formData, standard: checked })}
                        />
                        <Label htmlFor="standard">Standard</Label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Validity & Configuration Section */}
                <div className="gba:mb-8">
                  <h4 className="gba:text-lg gba:font-semibold gba:mb-6 gba:pb-2 gba:border-b gba:border-border">
                    Validity & Configuration
                  </h4>
                  <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-3 gba:gap-6 gba:mb-6">
                    <div>
                      <Label htmlFor="activeFrom" className="gba:flex gba:items-center gba:gap-2">
                        <PiCalendar className="gba:h-4 gba:w-4" />
                        Valid From *
                      </Label>
                      <DateInput
                        data-testid="rule-active-from-picker"
                        value={formData.activeFrom}
                        onChange={date => setFormData({ ...formData, activeFrom: date || '' })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="activeTo" className="gba:flex gba:items-center gba:gap-2">
                        <PiCalendar className="gba:h-4 gba:w-4" />
                        Valid To
                      </Label>
                      <DateInput
                        data-testid="rule-active-to-picker"
                        value={formData.activeTo}
                        onChange={date => setFormData({ ...formData, activeTo: date || '' })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="calculationTypeRef">Calculation Type</Label>
                      <Select
                        value={formData.calculationTypeRef}
                        onValueChange={value => setFormData({ ...formData, calculationTypeRef: value })}
                        disabled={catalogsLoading}
                      >
                        <SelectTrigger id="calculationTypeRef" data-testid="rule-calculation-type-select">
                          <SelectValue placeholder="Select calculation type" />
                        </SelectTrigger>
                        <SelectContent>
                          {calculationTypes.map(type => (
                            <SelectItem
                              key={type.id}
                              value={type.id}
                              data-testid={`calculation-type-option-${type.code}`}
                            >
                              {type.value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-3 gba:gap-6">
                    <div>
                      <Label htmlFor="currencyRef">Currency</Label>
                      <Select
                        value={formData.currencyRef}
                        onValueChange={value => setFormData({ ...formData, currencyRef: value })}
                        disabled={catalogsLoading}
                      >
                        <SelectTrigger id="currencyRef" data-testid="rule-currency-select">
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.map(currency => (
                            <SelectItem
                              key={currency.id}
                              value={currency.id}
                              data-testid={`currency-option-${currency.code}`}
                            >
                              {currency.code} - {currency.value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Two Column Layout for Wage Codes and Special Settings */}
                <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-12">
                  {/* Left Column - Wage Codes */}
                  <div className="gba:mb-6">
                    <h4 className="gba:text-lg gba:font-semibold gba:mb-6 gba:pb-2 gba:border-b gba:border-border">
                      Wage Codes
                    </h4>

                    <div className="gba:space-y-4">
                      <div>
                        <Label htmlFor="advancePaymentCode">Advance Payment</Label>
                        <Input
                          id="advancePaymentCode"
                          data-testid="advance-payment-input"
                          placeholder=""
                          value={formData.advancePaymentCode}
                          onChange={e => setFormData({ ...formData, advancePaymentCode: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label htmlFor="taxesCode">Taxes</Label>
                        <Input
                          id="taxesCode"
                          data-testid="taxes-input"
                          placeholder=""
                          value={formData.taxesCode}
                          onChange={e => setFormData({ ...formData, taxesCode: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label htmlFor="nonpayableCode">Non Payable</Label>
                        <Input
                          id="nonpayableCode"
                          data-testid="non-payable-input"
                          placeholder=""
                          value={formData.nonpayableCode}
                          onChange={e => setFormData({ ...formData, nonpayableCode: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label htmlFor="countryRef">Home Country</Label>
                        <Select
                          value={formData.countryRef}
                          onValueChange={value => setFormData({ ...formData, countryRef: value })}
                          disabled={catalogsLoading}
                        >
                          <SelectTrigger id="countryRef" data-testid="home-country-select">
                            <SelectValue placeholder="Select home country" />
                          </SelectTrigger>
                          <SelectContent>
                            {countries.map(country => (
                              <SelectItem
                                key={country.id}
                                value={country.id}
                                data-testid={`country-option-${country.code}`}
                              >
                                {country.value} ({country.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Special Settings */}
                  <div className="gba:mb-6">
                    <h4 className="gba:text-lg gba:font-semibold gba:mb-6 gba:pb-2 gba:border-b gba:border-border">
                      Special Setting
                    </h4>

                    <div className="gba:space-y-4">
                      <div className="gba:flex gba:items-center gba:space-x-2">
                        <NWSwitch
                          id="austrianAbroad"
                          data-testid="austrian-abroad-checkbox"
                          checked={formData.austrianAbroad}
                          onCheckedChange={checked => {
                            // When turning ON, turn OFF the other one (mutually exclusive)
                            // When turning OFF, just turn OFF (both can be OFF)
                            setFormData({
                              ...formData,
                              austrianAbroad: checked,
                              romanianCalculation: checked ? false : formData.romanianCalculation
                            })
                          }}
                        />
                        <Label htmlFor="austrianAbroad">Austrian Calculation</Label>
                      </div>

                      <div className="gba:flex gba:items-center gba:space-x-2">
                        <NWSwitch
                          id="romanianCalculation"
                          data-testid="romanian-calculation-checkbox"
                          checked={formData.romanianCalculation}
                          onCheckedChange={checked => {
                            // When turning ON, turn OFF the other one (mutually exclusive)
                            // When turning OFF, just turn OFF (both can be OFF)
                            setFormData({
                              ...formData,
                              romanianCalculation: checked,
                              austrianAbroad: checked ? false : formData.austrianAbroad
                            })
                          }}
                        />
                        <Label htmlFor="romanianCalculation">Romanian Calculation</Label>
                      </div>

                      <div className="gba:flex gba:items-center gba:space-x-2">
                        <NWSwitch
                          id="useLastCountry"
                          data-testid="use-last-country-checkbox"
                          checked={formData.useLastCountry}
                          onCheckedChange={checked => setFormData({ ...formData, useLastCountry: checked })}
                        />
                        <Label htmlFor="useLastCountry">Use Last Country</Label>
                      </div>

                      <div className="gba:flex gba:items-center gba:space-x-2">
                        <NWSwitch
                          id="deductionLimit"
                          data-testid="deduction-limit-checkbox"
                          checked={formData.deductionLimit}
                          onCheckedChange={checked => setFormData({ ...formData, deductionLimit: checked })}
                        />
                        <Label htmlFor="deductionLimit">Deduction Limit</Label>
                      </div>

                      <div className="gba:flex gba:items-center gba:space-x-2">
                        <NWSwitch
                          id="useSingleCurrency"
                          data-testid="use-single-currency-checkbox"
                          checked={formData.useSingleCurrency}
                          onCheckedChange={checked => setFormData({ ...formData, useSingleCurrency: checked })}
                        />
                        <Label htmlFor="useSingleCurrency">Use single currency in expense</Label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="gba:flex gba:gap-3 gba:border-t gba:border-border gba:mt-6 gba:pt-6">
                  <Button onClick={handleSave} disabled={isSaving || !hasChanges} data-testid="save-button">
                    {isSaving ? (
                      <>
                        <Spinner className="gba:mr-2 gba:h-4 gba:w-4" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <PiCheckCircle className="gba:mr-2 gba:h-4 gba:w-4" />
                        Save
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={handleDiscard} disabled={!hasChanges} data-testid="discard-button">
                    Discard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses" data-testid="expenses-tab-content">
            <GeneralExpensesTab
              ruleId={ruleId}
              accessToken={accessToken}
              activeFrom={ruleDetails.activeFrom}
              activeTo={ruleDetails.activeTo}
            />
          </TabsContent>

          <TabsContent value="mileage" data-testid="mileage-tab-content">
            <MileageRulesTab
              ruleId={ruleId}
              accessToken={accessToken}
              activeFrom={ruleDetails.activeFrom}
              activeTo={ruleDetails.activeTo}
            />
          </TabsContent>

          <TabsContent value="allowance" data-testid="allowance-tab-content">
            <div data-testid="allowance-tab-container" className="gba:p-2">
              <Tabs value={activeSubTab} onValueChange={handleSubTabChange} data-testid="allowance-subtabs">
                <TabsList className="gba:mb-4">
                  <TabsTrigger value="allowance-period" data-testid="subtab-allowance-period">
                    Allowance Period
                  </TabsTrigger>
                  <TabsTrigger value="allowance-code" data-testid="subtab-allowance-code">
                    Allowance Code
                  </TabsTrigger>
                  <TabsTrigger value="allowance-setup" data-testid="subtab-allowance-setup">
                    Allowance Setup
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="allowance-period">
                  <AllowancePeriodTab
                    ruleId={ruleId}
                    accessToken={accessToken}
                    activeFrom={ruleDetails.activeFrom}
                    activeTo={ruleDetails.activeTo}
                  />
                </TabsContent>

                <TabsContent value="allowance-code">
                  <AllowanceCodeTab
                    ruleId={ruleId}
                    accessToken={accessToken}
                    activeFrom={ruleDetails.activeFrom}
                    activeTo={ruleDetails.activeTo}
                  />
                </TabsContent>

                <TabsContent value="allowance-setup">
                  <AllowanceSetupTab
                    ruleId={ruleId}
                    accessToken={accessToken}
                    activeFrom={ruleDetails.activeFrom}
                    activeTo={ruleDetails.activeTo}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>

          <TabsContent value="other-calculation" data-testid="other-calculation-tab-content">
            <OtherCalculationTab
              ruleId={ruleId}
              accessToken={accessToken}
              activeFrom={ruleDetails.activeFrom}
              activeTo={ruleDetails.activeTo}
            />
          </TabsContent>

          <TabsContent value="custom-fields" data-testid="custom-fields-tab-content">
            <CustomFieldsTab
              ruleId={ruleId}
              accessToken={accessToken}
              activeFrom={ruleDetails.activeFrom}
              activeTo={ruleDetails.activeTo}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default CalculationRuleRecord
