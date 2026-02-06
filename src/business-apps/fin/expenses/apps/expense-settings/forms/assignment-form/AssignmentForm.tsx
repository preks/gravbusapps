import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useFeature } from '@/common/hooks/useFeature'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { useEmployeeSelection } from '../../hooks/useEmployeeSelection'
import { useCompanySelection } from '../../hooks/useCompanySelection'
import { useOrganizationalUnitSelection } from '../../hooks/useOrganizationalUnitSelection'
import { useSiteLocationSelection } from '../../hooks/useSiteLocationSelection'
import SearchableSelect from '../../components/SearchableSelect'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Checkbox,
  Alert,
  AlertDescription,
  Spinner,
  DateInput,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage
} from '@newwork/nw-design-system'
import { PiFloppyDisk, PiX, PiWarning } from 'react-icons/pi'
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'

// Register dayjs plugins
dayjs.extend(weekday)
dayjs.extend(localeData)
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { SaveExpenseRuleAssignmentInput, ExpenseRule, ExpenseRuleAssignment } from '../../types/ExpenseRuleTypes'
import { useGetExpenseRuleAssignmentById } from '../../queries/ExpenseRuleQueries'
import { formatDateForInput, normalizeDateInputValue, toISOEndOfDay, toISOStartOfDay } from '../../utils'
import { assignmentFormSchema } from '../../schemas'

export interface AssignmentFormData {
  id?: string
  assignmentOrder: number
  cascading: boolean
  applicants: boolean
  activeFrom?: string // Optional - null means eternity
  activeTo?: string // Optional - null means eternity
  expenseRuleId: string
  employeeId?: string
  companyId?: string
  organizationalUnitId?: string
  siteLocationId?: string
  employmentTypeRef?: string
  contractTypeRef?: string
}

interface AssignmentFormProps extends BusinessAppContextProps {
  initialData?: ExpenseRuleAssignment
  availableRules: ExpenseRule[]
  usedOrderNumbers?: number[]
  isEditing?: boolean
  onSave: (data: SaveExpenseRuleAssignmentInput) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

interface CatalogOption {
  id: string
  value: string
}

const AssignmentForm: React.FC<AssignmentFormProps> = ({
  accessToken,
  initialData,
  availableRules,
  usedOrderNumbers = [],
  isEditing = false,
  onSave,
  onCancel,
  loading = false
}) => {
  // Feature flag check
  const isDevEnabled = useFeature('dev.enabled')

  // React Hook Form setup with Zod validation
  const form = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues: {
      assignmentOrder: 1,
      cascading: false,
      applicants: false,
      activeFrom: dayjs().format('YYYY-MM-DD'),
      activeTo: '9999-12-31',
      expenseRuleId: '',
      employeeId: '',
      companyId: '',
      organizationalUnitId: '',
      siteLocationId: '',
      employmentTypeRef: '',
      contractTypeRef: ''
    }
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentVersion, setCurrentVersion] = useState<number | undefined>(initialData?.version)
  const [catalogs, setCatalogs] = useState<{
    employmentTypes: CatalogOption[]
    contractTypes: CatalogOption[]
  }>({
    employmentTypes: [],
    contractTypes: []
  })
  const [catalogsLoading, setCatalogsLoading] = useState(true)
  const [catalogError, setCatalogError] = useState<string | null>(null)

  const catalogClient = useCatalogManagerClient(accessToken)

  // ✅ Hook for fetching fresh assignment data
  const { fetchExpenseRuleAssignmentById } = useGetExpenseRuleAssignmentById({ accessToken } as BusinessAppContextProps)

  // Selection hooks - pass the full context
  const context = { accessToken }
  const employeeSelection = useEmployeeSelection(context)
  const companySelection = useCompanySelection(context)
  const orgUnitSelection = useOrganizationalUnitSelection(context)
  const siteLocationSelection = useSiteLocationSelection(context)

  // Compute available order numbers (1-100, excluding used ones, but include current if editing)
  const availableOrderNumbers = useMemo(() => {
    const MAX_ORDER = 100
    const currentOrder = initialData?.assignmentOrder
    const usedSet = new Set(usedOrderNumbers)

    // If editing, exclude the current order from the "used" set so it remains available
    if (isEditing && currentOrder !== undefined) {
      usedSet.delete(currentOrder)
    }

    // Generate available numbers
    const available: { value: string; label: string }[] = []
    for (let i = 1; i <= MAX_ORDER; i++) {
      if (!usedSet.has(i)) {
        available.push({ value: String(i), label: String(i) })
      }
    }
    return available
  }, [usedOrderNumbers, initialData?.assignmentOrder, isEditing])

  // Get the first available order number for default
  const firstAvailableOrder = useMemo(() => {
    return availableOrderNumbers.length > 0 ? Number.parseInt(availableOrderNumbers[0].value, 10) : 1
  }, [availableOrderNumbers])

  // Load catalog data
  const loadCatalogs = useCallback(async () => {
    if (!accessToken) return

    setCatalogsLoading(true)
    setCatalogError(null)

    try {
      const [employmentTypesResponse, contractTypesResponse] = await Promise.all([
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'EmploymentType', version: 'v1' },
          { limit: 100, offset: 0, returnTotalRecords: true, includeChildCatalogEntries: true }
        ),
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'ContractType', version: 'v1' },
          { limit: 100, offset: 0, returnTotalRecords: true, includeChildCatalogEntries: true }
        )
      ])

      setCatalogs({
        employmentTypes:
          employmentTypesResponse.data?.map(item => ({
            id: item.id,
            value: item.value || item.id
          })) || [],
        contractTypes:
          contractTypesResponse.data?.map(item => ({
            id: item.id,
            value: item.value || item.id
          })) || []
      })
    } catch (error) {
      console.error('Error loading catalogs:', error)
      setCatalogError('Failed to load reference data. Please try again.')
    } finally {
      setCatalogsLoading(false)
    }
  }, [accessToken, catalogClient])

  useEffect(() => {
    loadCatalogs()
  }, [loadCatalogs])

  // ✅ Load fresh data when editing, use initial data when creating
  useEffect(() => {
    const loadData = async () => {
      if (isEditing && initialData?.id) {
        // For editing, fetch fresh data from the server
        try {
          const freshData = await fetchExpenseRuleAssignmentById(initialData.id)
          if (freshData) {
            // Store the version for update operations
            if (freshData.version !== undefined) {
              setCurrentVersion(freshData.version)
            }

            const formValues = {
              assignmentOrder: freshData.assignmentOrder || 1,
              cascading: freshData.cascading || false,
              applicants: freshData.applicants || false,
              activeFrom: formatDateForInput(freshData.activeFrom) || dayjs().format('YYYY-MM-DD'),
              activeTo: formatDateForInput(freshData.activeTo) || '9999-12-31',
              expenseRuleId: freshData.expenseRuleId || '',
              employeeId: freshData.employeeId || '',
              companyId: freshData.companyId || '',
              organizationalUnitId: freshData.organizationalUnitId || '',
              siteLocationId: freshData.siteLocationId || '',
              employmentTypeRef: freshData.employmentTypeRef || '',
              contractTypeRef: freshData.contractTypeRef || '',
              id: freshData.id
            }
            form.reset(formValues)
            return
          }
        } catch (error) {
          console.error('❌ AssignmentForm: Failed to load fresh assignment data:', error)
          // Continue with fallback to initial data
        }
      }

      // Fallback: Use initial data (for creating or if fresh fetch failed)
      if (initialData) {
        const fallbackValues = {
          assignmentOrder: initialData.assignmentOrder || 1,
          cascading: initialData.cascading || false,
          applicants: initialData.applicants || false,
          activeFrom: formatDateForInput(initialData.activeFrom) || dayjs().format('YYYY-MM-DD'),
          activeTo: formatDateForInput(initialData.activeTo) || '9999-12-31',
          expenseRuleId: initialData.expenseRuleId || '',
          employeeId: initialData.employeeId || '',
          companyId: initialData.companyId || '',
          organizationalUnitId: initialData.organizationalUnitId || '',
          siteLocationId: initialData.siteLocationId || '',
          employmentTypeRef: initialData.employmentTypeRef || '',
          contractTypeRef: initialData.contractTypeRef || '',
          id: initialData.id
        }
        form.reset(fallbackValues)
      } else {
        // Set defaults for new assignment
        form.reset({
          assignmentOrder: 1,
          cascading: false,
          applicants: false,
          activeFrom: dayjs().format('YYYY-MM-DD'),
          activeTo: '9999-12-31',
          expenseRuleId: '',
          employeeId: '',
          companyId: '',
          organizationalUnitId: '',
          siteLocationId: '',
          employmentTypeRef: '',
          contractTypeRef: ''
        })
      }
    }

    loadData()
  }, [initialData?.id, isEditing, fetchExpenseRuleAssignmentById, form])

  // Update order to first available when creating new assignment
  useEffect(() => {
    if (!isEditing && !initialData && availableOrderNumbers.length > 0) {
      const currentOrder = form.getValues('assignmentOrder')
      const isCurrentOrderAvailable = availableOrderNumbers.some(opt => Number.parseInt(opt.value, 10) === currentOrder)
      if (!isCurrentOrderAvailable) {
        form.setValue('assignmentOrder', firstAvailableOrder)
      }
    }
  }, [isEditing, initialData, availableOrderNumbers, firstAvailableOrder, form])

  // Log form errors for debugging
  const onFormError = (errors: any) => {
    console.error('❌ Form validation errors:', errors)
    console.log('📋 Current form values:', form.getValues())
  }

  const handleSubmit = async (data: AssignmentFormData) => {
    console.log('✅ Form submitted with data:', data)
    try {
      setIsSubmitting(true)

      const assignmentData: any = {
        ...(isEditing && initialData?.id ? { id: initialData.id } : {}),
        ...(typeof currentVersion === 'number' ? { version: currentVersion } : {}),
        assignmentOrder: data.assignmentOrder,
        cascading: data.cascading || false,
        applicants: data.applicants || false,
        expenseRule: data.expenseRuleId
      }
      console.log('📤 Submitting assignment data:', assignmentData)

      // Handle optional dates - use null for eternity
      if (data.activeFrom) {
        assignmentData.activeFrom = toISOStartOfDay(data.activeFrom)
      }
      if (data.activeTo) {
        assignmentData.activeTo = toISOEndOfDay(data.activeTo)
      }

      // Handle optional relationships
      if (data.employeeId) assignmentData.employee = data.employeeId
      if (data.companyId) assignmentData.company = data.companyId
      if (data.organizationalUnitId) assignmentData.organizationalUnit = data.organizationalUnitId
      if (data.siteLocationId) assignmentData.siteLocation = data.siteLocationId
      if (data.employmentTypeRef) assignmentData.employmentTypeRef = data.employmentTypeRef
      if (data.contractTypeRef) assignmentData.contractTypeRef = data.contractTypeRef

      const saveData: SaveExpenseRuleAssignmentInput = {
        expenseRuleAssignment: assignmentData,
        changeMode: isEditing ? 'UPDATE' : 'INSERT'
      }

      await onSave(saveData)
    } catch (error) {
      console.error('Form submission failed:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Feature flag guard - must be after all hooks
  if (isDevEnabled === false) {
    return null
  }

  if (catalogsLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:min-h-96" data-testid="assignment-form-loading">
        <Spinner size="lg" />
      </div>
    )
  }

  if (catalogError) {
    return (
      <Alert data-testid="assignment-form-catalog-error" className="gba:mb-4">
        <PiWarning className="gba:h-4 gba:w-4" />
        <AlertDescription>{catalogError}</AlertDescription>
        <div className="gba:mt-2">
          <Button variant="outline" onClick={loadCatalogs}>
            Retry
          </Button>
        </div>
      </Alert>
    )
  }

  return (
    <div data-testid="assignment-form-container">
      <Card>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit, onFormError)}
              data-testid="assignment-form"
              className="gba:space-y-6"
            >
              {/* Rule Selection */}
              <Card className="gba:mb-4">
                <CardHeader>
                  <CardTitle>
                    {getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.ruleSelection', 'Rule Selection')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
                    <FormField
                      control={form.control}
                      name="expenseRuleId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {getTranslationFromI18nKeyAndLabel(
                              'expenseSettings.assignment.expenseRule',
                              'Expense Rule'
                            )}{' '}
                            *
                          </FormLabel>
                          <FormControl>
                            <SearchableSelect
                              placeholder={getTranslationFromI18nKeyAndLabel(
                                'expenseSettings.assignment.selectRule',
                                'Select expense rule'
                              )}
                              value={field.value}
                              onChange={field.onChange}
                              options={availableRules.map(rule => ({
                                id: rule.id,
                                value: rule.id,
                                label: rule.name ? `${rule.code} - ${rule.name}` : rule.code,
                                name: rule.name || rule.code,
                                code: rule.code
                              }))}
                              data-testid="assignment-form-rule-select"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Assignment Targets */}
              <Card className="gba:mb-4">
                <CardHeader>
                  <CardTitle>
                    {getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.targets', 'Assignment Targets')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
                    <FormField
                      control={form.control}
                      name="employeeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.employee', 'Employee')}
                          </FormLabel>
                          <FormControl>
                            <SearchableSelect
                              placeholder={getTranslationFromI18nKeyAndLabel(
                                'expenseSettings.assignment.selectEmployee',
                                'Select employee'
                              )}
                              value={field.value}
                              onChange={field.onChange}
                              options={employeeSelection.employees}
                              loading={employeeSelection.isLoading}
                              hasMore={employeeSelection.hasMore}
                              onSearch={employeeSelection.search}
                              onLoadMore={employeeSelection.loadMore}
                              data-testid="assignment-form-employee-select"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="companyId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.company', 'Company')}
                          </FormLabel>
                          <FormControl>
                            <SearchableSelect
                              placeholder={getTranslationFromI18nKeyAndLabel(
                                'expenseSettings.assignment.selectCompany',
                                'Select company'
                              )}
                              value={field.value}
                              onChange={field.onChange}
                              options={companySelection.companies}
                              loading={companySelection.isLoading}
                              hasMore={companySelection.hasMore}
                              onSearch={companySelection.search}
                              onLoadMore={companySelection.loadMore}
                              data-testid="assignment-form-company-select"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4 gba:mt-4">
                    <FormField
                      control={form.control}
                      name="organizationalUnitId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {getTranslationFromI18nKeyAndLabel(
                              'expenseSettings.assignment.organizationalUnit',
                              'Organizational Unit'
                            )}
                          </FormLabel>
                          <FormControl>
                            <SearchableSelect
                              placeholder={getTranslationFromI18nKeyAndLabel(
                                'expenseSettings.assignment.selectOrgUnit',
                                'Select organizational unit'
                              )}
                              value={field.value}
                              onChange={field.onChange}
                              options={orgUnitSelection.organizationalUnits}
                              loading={orgUnitSelection.isLoading}
                              hasMore={orgUnitSelection.hasMore}
                              onSearch={orgUnitSelection.search}
                              onLoadMore={orgUnitSelection.loadMore}
                              data-testid="assignment-form-org-unit-select"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="siteLocationId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {getTranslationFromI18nKeyAndLabel(
                              'expenseSettings.assignment.siteLocation',
                              'Site Location'
                            )}
                          </FormLabel>
                          <FormControl>
                            <SearchableSelect
                              placeholder={getTranslationFromI18nKeyAndLabel(
                                'expenseSettings.assignment.selectLocation',
                                'Select site location'
                              )}
                              value={field.value}
                              onChange={field.onChange}
                              options={siteLocationSelection.siteLocations}
                              loading={siteLocationSelection.isLoading}
                              hasMore={siteLocationSelection.hasMore}
                              onSearch={siteLocationSelection.search}
                              onLoadMore={siteLocationSelection.loadMore}
                              data-testid="assignment-form-location-select"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Employment Details */}
              <Card className="gba:mb-4">
                <CardHeader>
                  <CardTitle>
                    {getTranslationFromI18nKeyAndLabel(
                      'expenseSettings.assignment.employmentDetails',
                      'Employment Details'
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
                    <FormField
                      control={form.control}
                      name="employmentTypeRef"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {getTranslationFromI18nKeyAndLabel(
                              'expenseSettings.assignment.employmentType',
                              'Employment Type'
                            )}
                          </FormLabel>
                          <FormControl>
                            <SearchableSelect
                              placeholder={getTranslationFromI18nKeyAndLabel(
                                'expenseSettings.assignment.selectEmploymentType',
                                'Select employment type'
                              )}
                              value={field.value}
                              onChange={field.onChange}
                              options={catalogs.employmentTypes.map(type => ({
                                id: type.id,
                                value: type.id,
                                label: type.value,
                                name: type.value
                              }))}
                              loading={catalogsLoading}
                              data-testid="assignment-form-employment-type-select"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contractTypeRef"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {getTranslationFromI18nKeyAndLabel(
                              'expenseSettings.assignment.contractType',
                              'Contract Type'
                            )}
                          </FormLabel>
                          <FormControl>
                            <SearchableSelect
                              placeholder={getTranslationFromI18nKeyAndLabel(
                                'expenseSettings.assignment.selectContractType',
                                'Select contract type'
                              )}
                              value={field.value}
                              onChange={field.onChange}
                              options={catalogs.contractTypes.map(type => ({
                                id: type.id,
                                value: type.id,
                                label: type.value,
                                name: type.value
                              }))}
                              loading={catalogsLoading}
                              data-testid="assignment-form-contract-type-select"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Settings and Period */}
              <Card className="gba:mb-4">
                <CardHeader>
                  <CardTitle>
                    {getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.settings', 'Assignment Settings')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Order Field */}
                  <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4 gba:mb-4">
                    <FormField
                      control={form.control}
                      name="assignmentOrder"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.order', 'Order')} *
                          </FormLabel>
                          <FormControl>
                            <SearchableSelect
                              placeholder={getTranslationFromI18nKeyAndLabel(
                                'expenseSettings.assignment.selectOrder',
                                'Select order'
                              )}
                              value={field.value ? String(field.value) : ''}
                              onChange={val => field.onChange(val ? Number.parseInt(val, 10) : firstAvailableOrder)}
                              options={availableOrderNumbers.map(opt => ({
                                id: opt.value,
                                value: opt.value,
                                label: opt.label,
                                name: opt.label
                              }))}
                              data-testid="assignment-form-order-select"
                            />
                          </FormControl>
                          <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                            {getTranslationFromI18nKeyAndLabel(
                              'expense-settings:assignment_order_hint',
                              'Lower numbers have higher priority. Each order must be unique.'
                            )}
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cascading"
                      render={({ field }) => (
                        <FormItem className="gba:flex gba:flex-row gba:items-center gba:gap-3 gba:space-y-0 gba:pt-8">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="assignment-form-cascading-checkbox"
                            />
                          </FormControl>
                          <FormLabel className="gba:font-normal">
                            {getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.cascading', 'Cascading')}
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="applicants"
                      render={({ field }) => (
                        <FormItem className="gba:flex gba:flex-row gba:items-center gba:gap-3 gba:space-y-0 gba:pt-8">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="assignment-form-applicants-checkbox"
                            />
                          </FormControl>
                          <FormLabel className="gba:font-normal">
                            {getTranslationFromI18nKeyAndLabel(
                              'expenseSettings.assignment.applicants',
                              'For Applicants'
                            )}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
                    <FormField
                      control={form.control}
                      name="activeFrom"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.activeFrom', 'Active From')}
                          </FormLabel>
                          <FormControl>
                            <DateInput
                              value={field.value || ''}
                              onChange={date => field.onChange(normalizeDateInputValue(date) ?? '')}
                              outputFormat="iso"
                              data-testid="assignment-form-active-from"
                            />
                          </FormControl>
                          <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                            Leave empty for 'always active from the beginning'
                          </p>
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
                            {getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.activeTo', 'Active To')}
                          </FormLabel>
                          <FormControl>
                            <DateInput
                              value={field.value || ''}
                              onChange={date => field.onChange(normalizeDateInputValue(date))}
                              outputFormat="iso"
                              data-testid="assignment-form-active-to"
                            />
                          </FormControl>
                          <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                            Leave empty for 'ongoing/never expires'
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Form Actions */}
              <div className="gba:flex gba:gap-4 gba:mt-6">
                <Button
                  type="submit"
                  disabled={isSubmitting || loading}
                  data-testid="assignment-form-save-button"
                  className="gba:flex gba:items-center gba:gap-2"
                >
                  {isSubmitting || loading ? <Spinner size="sm" /> : <PiFloppyDisk className="gba:h-4 gba:w-4" />}
                  {isEditing
                    ? getTranslationFromI18nKeyAndLabel(
                        'expenseSettings.assignment.updateAssignment',
                        'Update Assignment'
                      )
                    : getTranslationFromI18nKeyAndLabel(
                        'expenseSettings.assignment.createAssignment',
                        'Create Assignment'
                      )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  data-testid="assignment-form-cancel-button"
                  className="gba:flex gba:items-center gba:gap-2"
                >
                  <PiX className="gba:h-4 gba:w-4" />
                  {getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.cancel', 'Cancel')}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

export default AssignmentForm
