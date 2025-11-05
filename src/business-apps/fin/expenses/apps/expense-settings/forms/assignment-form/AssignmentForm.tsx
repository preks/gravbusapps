import React, { useState, useEffect, useCallback } from 'react'
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
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { SaveExpenseRuleAssignmentInput, ExpenseRule, ExpenseRuleAssignment } from '../../types/ExpenseRuleTypes'
import { useGetExpenseRuleAssignmentById } from '../../queries/ExpenseRuleQueries'

// Using nw-design-system components - no destructuring needed

export interface AssignmentFormData {
  id?: string
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
  isEditing = false,
  onSave,
  onCancel,
  loading = false
}) => {
  // Feature flag check
  const isDevEnabled = useFeature('dev.enabled')

  const [formData, setFormData] = useState<AssignmentFormData>({
    cascading: false,
    applicants: false,
    expenseRuleId: '',
    employeeId: '',
    companyId: '',
    organizationalUnitId: '',
    siteLocationId: '',
    employmentTypeRef: '',
    contractTypeRef: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
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

  // ✅ NEW: Hook for fetching fresh assignment data
  const { fetchExpenseRuleAssignmentById } = useGetExpenseRuleAssignmentById({ accessToken } as BusinessAppContextProps)

  // Selection hooks - pass the full context
  const context = { accessToken }
  const employeeSelection = useEmployeeSelection(context)
  const companySelection = useCompanySelection(context)
  const orgUnitSelection = useOrganizationalUnitSelection(context)
  const siteLocationSelection = useSiteLocationSelection(context)

  // Feature flag guard
  if (isDevEnabled === false) {
    return null
  }

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

  // ✅ FIXED: Load fresh data when editing, use initial data when creating
  useEffect(() => {
    const loadData = async () => {
      if (isEditing && initialData?.id) {
        // ✅ NEW: For editing, fetch fresh data from the server
        try {
          const freshData = await fetchExpenseRuleAssignmentById(initialData.id)
          if (freshData) {
            setFormData({
              cascading: freshData.cascading || false,
              applicants: freshData.applicants || false,
              activeFrom: freshData.activeFrom || '',
              activeTo: freshData.activeTo || '',
              expenseRuleId: freshData.expenseRuleId || '',
              employeeId: freshData.employeeId || '',
              companyId: freshData.companyId || '',
              organizationalUnitId: freshData.organizationalUnitId || '',
              siteLocationId: freshData.siteLocationId || '',
              employmentTypeRef: freshData.employmentType?.id || '',
              contractTypeRef: freshData.contractType?.id || '',
              id: freshData.id
            })
            return
          }
        } catch (error) {
          console.error('❌ AssignmentForm: Failed to load fresh assignment data:', error)
          // Continue with fallback to initial data
        }
      }

      // ✅ Fallback: Use initial data (for creating or if fresh fetch failed)
      if (initialData) {
        setFormData({
          cascading: initialData.cascading || false,
          applicants: initialData.applicants || false,
          activeFrom: initialData.activeFrom || '',
          activeTo: initialData.activeTo || '',
          expenseRuleId: initialData.expenseRuleId || '',
          employeeId: initialData.employeeId || '',
          companyId: initialData.companyId || '',
          organizationalUnitId: initialData.organizationalUnitId || '',
          siteLocationId: initialData.siteLocationId || '',
          employmentTypeRef: initialData.employmentType?.id || '',
          contractTypeRef: initialData.contractType?.id || '',
          id: initialData.id
        })
      } else {
        // Set defaults for new assignment
        setFormData(prev => ({
          ...prev,
          cascading: false,
          applicants: false
          // Leave dates empty by default (eternity)
        }))
      }
    }

    loadData()
  }, [initialData?.id, isEditing, fetchExpenseRuleAssignmentById])

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)

      const assignmentData: any = {
        ...(isEditing && initialData?.id ? { id: initialData.id } : {}),
        ...(initialData?.version ? { version: initialData.version } : {}),
        assignmentOrder: initialData?.assignmentOrder || 1, // Use existing order or default to 1
        cascading: formData.cascading || false,
        applicants: formData.applicants || false,
        expenseRule: formData.expenseRuleId
      }

      // Handle optional dates - use null for eternity
      if (formData.activeFrom) {
        assignmentData.activeFrom = dayjs(formData.activeFrom).toISOString()
      }
      if (formData.activeTo) {
        assignmentData.activeTo = dayjs(formData.activeTo).toISOString()
      }

      // Handle optional relationships
      if (formData.employeeId) assignmentData.employee = formData.employeeId
      if (formData.companyId) assignmentData.company = formData.companyId
      if (formData.organizationalUnitId) assignmentData.organizationalUnit = formData.organizationalUnitId
      if (formData.siteLocationId) assignmentData.siteLocation = formData.siteLocationId
      if (formData.employmentTypeRef) assignmentData.employmentTypeRef = formData.employmentTypeRef
      if (formData.contractTypeRef) assignmentData.contractTypeRef = formData.contractTypeRef

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
          <form
            onSubmit={e => {
              e.preventDefault()
              handleSubmit()
            }}
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
                <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
                  <div>
                    <label htmlFor="expenseRuleId" className="gba:block gba:text-sm gba:font-medium gba:mb-2">
                      {getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.expenseRule', 'Expense Rule')} *
                    </label>
                    <Select
                      value={formData.expenseRuleId}
                      onValueChange={value => setFormData(prev => ({ ...prev, expenseRuleId: value }))}
                    >
                      <SelectTrigger data-testid="assignment-form-rule-select">
                        <SelectValue
                          placeholder={getTranslationFromI18nKeyAndLabel(
                            'expenseSettings.assignment.selectRule',
                            'Select expense rule'
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRules.map(rule => (
                          <SelectItem key={rule.id} value={rule.id}>
                            {rule.code} {rule.name && ` - ${rule.name}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
                  <div>
                    <label htmlFor="employee" className="gba:block gba:text-sm gba:font-medium gba:mb-2">
                      {getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.employee', 'Employee')}
                    </label>
                    <SearchableSelect
                      placeholder={getTranslationFromI18nKeyAndLabel(
                        'expenseSettings.assignment.selectEmployee',
                        'Select employee'
                      )}
                      value={formData.employeeId}
                      onChange={value => setFormData(prev => ({ ...prev, employeeId: value }))}
                      options={employeeSelection.employees}
                      loading={employeeSelection.isLoading}
                      hasMore={employeeSelection.hasMore}
                      onSearch={employeeSelection.search}
                      onLoadMore={employeeSelection.loadMore}
                      data-testid="assignment-form-employee-select"
                    />
                  </div>

                  <div>
                    <label htmlFor="company" className="gba:block gba:text-sm gba:font-medium gba:mb-2">
                      {getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.company', 'Company')}
                    </label>
                    <SearchableSelect
                      placeholder={getTranslationFromI18nKeyAndLabel(
                        'expenseSettings.assignment.selectCompany',
                        'Select company'
                      )}
                      value={formData.companyId}
                      onChange={value => setFormData(prev => ({ ...prev, companyId: value }))}
                      options={companySelection.companies}
                      loading={companySelection.isLoading}
                      hasMore={companySelection.hasMore}
                      onSearch={companySelection.search}
                      onLoadMore={companySelection.loadMore}
                      data-testid="assignment-form-company-select"
                    />
                  </div>
                </div>

                <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4 gba:mt-4">
                  <div>
                    <label htmlFor="organizationalUnit" className="gba:block gba:text-sm gba:font-medium gba:mb-2">
                      {getTranslationFromI18nKeyAndLabel(
                        'expenseSettings.assignment.organizationalUnit',
                        'Organizational Unit'
                      )}
                    </label>
                    <SearchableSelect
                      placeholder={getTranslationFromI18nKeyAndLabel(
                        'expenseSettings.assignment.selectOrgUnit',
                        'Select organizational unit'
                      )}
                      value={formData.organizationalUnitId}
                      onChange={value => setFormData(prev => ({ ...prev, organizationalUnitId: value }))}
                      options={orgUnitSelection.organizationalUnits}
                      loading={orgUnitSelection.isLoading}
                      hasMore={orgUnitSelection.hasMore}
                      onSearch={orgUnitSelection.search}
                      onLoadMore={orgUnitSelection.loadMore}
                      data-testid="assignment-form-org-unit-select"
                    />
                  </div>

                  <div>
                    <label htmlFor="siteLocation" className="gba:block gba:text-sm gba:font-medium gba:mb-2">
                      {getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.siteLocation', 'Site Location')}
                    </label>
                    <SearchableSelect
                      placeholder={getTranslationFromI18nKeyAndLabel(
                        'expenseSettings.assignment.selectLocation',
                        'Select site location'
                      )}
                      value={formData.siteLocationId}
                      onChange={value => setFormData(prev => ({ ...prev, siteLocationId: value }))}
                      options={siteLocationSelection.siteLocations}
                      loading={siteLocationSelection.isLoading}
                      hasMore={siteLocationSelection.hasMore}
                      onSearch={siteLocationSelection.search}
                      onLoadMore={siteLocationSelection.loadMore}
                      data-testid="assignment-form-location-select"
                    />
                  </div>
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
                <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
                  <div>
                    <label htmlFor="employmentType" className="gba:block gba:text-sm gba:font-medium gba:mb-2">
                      {getTranslationFromI18nKeyAndLabel(
                        'expenseSettings.assignment.employmentType',
                        'Employment Type'
                      )}
                    </label>
                    <Select
                      value={formData.employmentTypeRef}
                      onValueChange={value => setFormData(prev => ({ ...prev, employmentTypeRef: value }))}
                    >
                      <SelectTrigger data-testid="assignment-form-employment-type-select">
                        <SelectValue
                          placeholder={getTranslationFromI18nKeyAndLabel(
                            'expenseSettings.assignment.selectEmploymentType',
                            'Select employment type'
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {catalogs.employmentTypes.map(type => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label htmlFor="contractType" className="gba:block gba:text-sm gba:font-medium gba:mb-2">
                      {getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.contractType', 'Contract Type')}
                    </label>
                    <Select
                      value={formData.contractTypeRef}
                      onValueChange={value => setFormData(prev => ({ ...prev, contractTypeRef: value }))}
                    >
                      <SelectTrigger data-testid="assignment-form-contract-type-select">
                        <SelectValue
                          placeholder={getTranslationFromI18nKeyAndLabel(
                            'expenseSettings.assignment.selectContractType',
                            'Select contract type'
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {catalogs.contractTypes.map(type => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4 gba:mb-4">
                  <div className="gba:flex gba:items-center gba:space-x-2">
                    <Switch
                      id="cascading"
                      checked={formData.cascading}
                      onCheckedChange={checked => setFormData(prev => ({ ...prev, cascading: checked }))}
                      data-testid="assignment-form-cascading-switch"
                    />
                    <label htmlFor="cascading" className="gba:text-sm gba:font-medium">
                      {getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.cascading', 'Cascading')}
                    </label>
                  </div>

                  <div className="gba:flex gba:items-center gba:space-x-2">
                    <Switch
                      id="applicants"
                      checked={formData.applicants}
                      onCheckedChange={checked => setFormData(prev => ({ ...prev, applicants: checked }))}
                      data-testid="assignment-form-applicants-switch"
                    />
                    <label htmlFor="applicants" className="gba:text-sm gba:font-medium">
                      {getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.applicants', 'For Applicants')}
                    </label>
                  </div>
                </div>

                <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
                  <div>
                    <label className="gba:block gba:text-sm gba:font-medium gba:mb-2">
                      {getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.activeFrom', 'Active From')}
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="gba:w-full gba:justify-start gba:text-left gba:font-normal"
                          data-testid="assignment-form-active-from-trigger"
                        >
                          {formData.activeFrom
                            ? dayjs(formData.activeFrom).format('YYYY-MM-DD')
                            : 'Always active (empty = eternity)'}
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
                    <p className="gba:text-xs gba:text-gray-500 gba:mt-1">
                      Leave empty for 'always active from the beginning'
                    </p>
                  </div>

                  <div>
                    <label className="gba:block gba:text-sm gba:font-medium gba:mb-2">
                      {getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.activeTo', 'Active To')}
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="gba:w-full gba:justify-start gba:text-left gba:font-normal"
                          data-testid="assignment-form-active-to-trigger"
                        >
                          {formData.activeTo
                            ? dayjs(formData.activeTo).format('YYYY-MM-DD')
                            : 'Ongoing (empty = eternity)'}
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
                    <p className="gba:text-xs gba:text-gray-500 gba:mt-1">Leave empty for 'ongoing/never expires'</p>
                  </div>
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
        </CardContent>
      </Card>
    </div>
  )
}

export default AssignmentForm
