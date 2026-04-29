import { useCallback, useMemo, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Checkbox,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner
} from '@newwork/nw-design-system'
import { useFormContext } from 'react-hook-form'
import { v4 as uuidv4 } from 'uuid'
import { Trash2 } from 'lucide-react'
import PlatformShellLayout from './containers/PlatformShellLayout'
import { formatDataTestId } from '../../shims/formatDataTestId'
import { useSetupTranslation } from '../../useSetupTranslation'
import { Capability, Department, SetupEmployee } from './types'
import { getSetupProgressItems, setupProgressStepIndex } from './progress-steps'
import { findUserManagementUserMatchingEmployeeEmail } from '../../../../setup-add-employees/employeeOnboardingApi'

type DraftEmployee = Omit<SetupEmployee, 'id'>

export interface AdditionalEmployeesStepProps {
  readonly accessToken?: string
  readonly onNext: () => void
  readonly onBack: () => void
}

const DATA_TEST_ID_PREFIX = 'AdditionalEmployees'
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const EMPTY_DRAFT: DraftEmployee = {
  firstName: '',
  lastName: '',
  email: '',
  jobPosition: '',
  departmentId: '',
  capabilityIds: [],
  initialPassword: '',
  isManager: false
}

export default function AdditionalEmployeesStep({ accessToken, onNext, onBack }: AdditionalEmployeesStepProps) {
  const { t } = useSetupTranslation()
  const { watch, setValue, getValues } = useFormContext()
  const [draftEmployee, setDraftEmployee] = useState<DraftEmployee>(EMPTY_DRAFT)
  const [draftErrors, setDraftErrors] = useState<Partial<Record<keyof DraftEmployee, string>>>({})
  /** Remount department Select after add so Radix controlled value cannot stay out of sync with cleared `departmentId`. */
  const [departmentSelectNonce, setDepartmentSelectNonce] = useState(0)
  const [checkingExistingUser, setCheckingExistingUser] = useState(false)
  const [umLookupError, setUmLookupError] = useState<string | null>(null)
  const [duplicateConfirmOpen, setDuplicateConfirmOpen] = useState(false)
  const [pendingEmployee, setPendingEmployee] = useState<SetupEmployee | null>(null)

  const additionalEmployees = watch('additionalEmployees') || []
  const departments = watch('departments') || []
  const selectedDepartments = watch('selectedDepartments') || []
  const capabilities = watch('capabilities') || []
  const selectedCapabilities = watch('selectedCapabilities') || []

  const departmentOptions = useMemo(() => {
    return departments
      .filter((department: Department) => selectedDepartments.includes(department.id))
      .map((department: Department) => ({
        id: department.id,
        name: department.name
      }))
  }, [departments, selectedDepartments])

  const capabilityOptions = useMemo(() => {
    return capabilities
      .filter((capability: Capability) => selectedCapabilities.includes(capability.id))
      .map((capability: Capability) => ({
        id: capability.id,
        name: capability.name
      }))
  }, [capabilities, selectedCapabilities])

  const capabilityNameMap = useMemo(() => {
    return Object.fromEntries(
      capabilityOptions.map((option: { id: string; name: string }) => [option.id, option.name])
    ) as Record<string, string>
  }, [capabilityOptions])

  const hasDuplicateManagersInList = useMemo(() => {
    const managerCountByDept = new Map<string, number>()
    for (const employee of additionalEmployees) {
      if (employee.isManager && employee.departmentId) {
        managerCountByDept.set(employee.departmentId, (managerCountByDept.get(employee.departmentId) ?? 0) + 1)
      }
    }
    return [...managerCountByDept.values()].some(count => count > 1)
  }, [additionalEmployees])

  const departmentNameMap = useMemo(() => {
    return Object.fromEntries(
      departmentOptions.map((option: { id: string; name: string }) => [option.id, option.name])
    ) as Record<string, string>
  }, [departmentOptions])

  const handleDraftChange = useCallback(<K extends keyof DraftEmployee>(field: K, value: DraftEmployee[K]) => {
    setDraftEmployee(prev => ({ ...prev, [field]: value }))
    setDraftErrors(prev => ({ ...prev, [field]: undefined }))
  }, [])

  const toggleCapability = useCallback((id: string) => {
    setDraftEmployee(prev => ({
      ...prev,
      capabilityIds: prev.capabilityIds.includes(id)
        ? prev.capabilityIds.filter(c => c !== id)
        : [...prev.capabilityIds, id]
    }))
  }, [])

  const commitEmployeeRow = useCallback(
    (row: SetupEmployee) => {
      const current = (getValues('additionalEmployees') as SetupEmployee[] | undefined) ?? []
      setValue('additionalEmployees', [...current, row], { shouldDirty: true, shouldTouch: true })
      setDraftEmployee(EMPTY_DRAFT)
      setDraftErrors({})
      setDepartmentSelectNonce(n => n + 1)
      setUmLookupError(null)
    },
    [getValues, setValue]
  )

  const buildValidatedRowFromDraft = useCallback((): SetupEmployee | null => {
    const nextErrors: Partial<Record<keyof DraftEmployee, string>> = {}

    if (!draftEmployee.firstName.trim()) {
      nextErrors.firstName = t('validation-required-field')
    }

    if (!draftEmployee.lastName.trim()) {
      nextErrors.lastName = t('validation-required-field')
    }

    if (!draftEmployee.email.trim() || !EMAIL_REGEX.test(draftEmployee.email.trim())) {
      nextErrors.email = t('validation-valid-email')
    }

    if (!draftEmployee.jobPosition.trim()) {
      nextErrors.jobPosition = t('validation-required-field')
    }

    const departmentIdTrimmed = draftEmployee.departmentId.trim()
    if (!departmentIdTrimmed) {
      nextErrors.departmentId = t('validation-additional-employee-department-required')
    }

    const currentBeforeAdd = (getValues('additionalEmployees') as SetupEmployee[] | undefined) ?? []
    if (
      draftEmployee.isManager &&
      departmentIdTrimmed &&
      currentBeforeAdd.some(e => e.isManager && e.departmentId === departmentIdTrimmed)
    ) {
      nextErrors.departmentId = t('validation-additional-managers-duplicate')
    }

    if (Object.keys(nextErrors).length > 0) {
      setDraftErrors(nextErrors)
      return null
    }

    return {
      id: uuidv4(),
      firstName: draftEmployee.firstName.trim(),
      lastName: draftEmployee.lastName.trim(),
      email: draftEmployee.email.trim(),
      jobPosition: draftEmployee.jobPosition.trim(),
      departmentId: departmentIdTrimmed,
      capabilityIds: draftEmployee.capabilityIds,
      isManager: Boolean(draftEmployee.isManager),
      initialPassword: draftEmployee.initialPassword?.trim() ? draftEmployee.initialPassword.trim() : null
    }
  }, [draftEmployee, getValues, t])

  const handleAddEmployee = useCallback(async () => {
    setUmLookupError(null)
    const row = buildValidatedRowFromDraft()
    if (!row) return

    const token = accessToken?.trim()
    if (!token) {
      commitEmployeeRow(row)
      return
    }

    setCheckingExistingUser(true)
    try {
      const existing = await findUserManagementUserMatchingEmployeeEmail(token, row.email)
      if (existing) {
        setPendingEmployee(row)
        setDuplicateConfirmOpen(true)
        return
      }
      commitEmployeeRow(row)
    } catch {
      setUmLookupError(t('additional-employees-um-lookup-error'))
    } finally {
      setCheckingExistingUser(false)
    }
  }, [accessToken, buildValidatedRowFromDraft, commitEmployeeRow, t])

  const handleConfirmDuplicateAdd = useCallback(() => {
    if (pendingEmployee) {
      commitEmployeeRow(pendingEmployee)
    }
    setPendingEmployee(null)
    setDuplicateConfirmOpen(false)
  }, [commitEmployeeRow, pendingEmployee])

  const handleDuplicateDialogOpenChange = useCallback((open: boolean) => {
    setDuplicateConfirmOpen(open)
    if (!open) {
      setPendingEmployee(null)
    }
  }, [])

  const handleRemoveEmployee = useCallback(
    (employeeId: string) => {
      const current = (getValues('additionalEmployees') as SetupEmployee[] | undefined) ?? []
      setValue(
        'additionalEmployees',
        current.filter((employee: SetupEmployee) => employee.id !== employeeId),
        { shouldDirty: true, shouldTouch: true }
      )
    },
    [getValues, setValue]
  )

  return (
    <PlatformShellLayout
      title={t('additional-employees-title')}
      description={t('additional-employees-description')}
      currentStep={setupProgressStepIndex.employees}
      stepItems={getSetupProgressItems(t)}
      dataTestIdPrefix={DATA_TEST_ID_PREFIX}
      onNext={onNext}
      onBack={onBack}
      disableNext={hasDuplicateManagersInList}
    >
      <div className="gba:space-y-6">
        {umLookupError ? (
          <p className="gba:text-sm gba:text-[#B42318]" role="alert">
            {umLookupError}
          </p>
        ) : null}
        <div className="gba:rounded-xl gba:border gba:border-gray-200 gba:bg-white gba:p-6 gba:shadow-sm">
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <div>
              <label className="gba:mb-2 gba:block gba:text-sm gba:font-medium gba:text-[#1F2937]">
                {t('additional-employees-first-name')}
              </label>
              <input
                value={draftEmployee.firstName}
                onChange={event => handleDraftChange('firstName', event.target.value)}
                className="gba:w-full gba:rounded-md gba:border gba:border-gray-300 gba:px-3 gba:py-2"
                data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'first-name-input')}
              />
              {draftErrors.firstName && (
                <p className="gba:mt-1 gba:text-xs gba:text-[#B42318]">{draftErrors.firstName}</p>
              )}
            </div>
            <div>
              <label className="gba:mb-2 gba:block gba:text-sm gba:font-medium gba:text-[#1F2937]">
                {t('additional-employees-last-name')}
              </label>
              <input
                value={draftEmployee.lastName}
                onChange={event => handleDraftChange('lastName', event.target.value)}
                className="gba:w-full gba:rounded-md gba:border gba:border-gray-300 gba:px-3 gba:py-2"
                data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'last-name-input')}
              />
              {draftErrors.lastName && (
                <p className="gba:mt-1 gba:text-xs gba:text-[#B42318]">{draftErrors.lastName}</p>
              )}
            </div>
            <div>
              <label className="gba:mb-2 gba:block gba:text-sm gba:font-medium gba:text-[#1F2937]">
                {t('additional-employees-email')}
              </label>
              <input
                type="email"
                value={draftEmployee.email}
                onChange={event => handleDraftChange('email', event.target.value)}
                className="gba:w-full gba:rounded-md gba:border gba:border-gray-300 gba:px-3 gba:py-2"
                data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'email-input')}
              />
              {draftErrors.email && <p className="gba:mt-1 gba:text-xs gba:text-[#B42318]">{draftErrors.email}</p>}
            </div>
            <div>
              <label className="gba:mb-2 gba:block gba:text-sm gba:font-medium gba:text-[#1F2937]">
                {t('additional-employees-job-position')}
              </label>
              <input
                value={draftEmployee.jobPosition}
                onChange={event => handleDraftChange('jobPosition', event.target.value)}
                className="gba:w-full gba:rounded-md gba:border gba:border-gray-300 gba:px-3 gba:py-2"
                data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'job-position-input')}
              />
              {draftErrors.jobPosition && (
                <p className="gba:mt-1 gba:text-xs gba:text-[#B42318]">{draftErrors.jobPosition}</p>
              )}
            </div>
            <div className="gba:col-span-2 gba:space-y-2">
              <Label htmlFor={formatDataTestId(DATA_TEST_ID_PREFIX, 'initial-password-input')}>
                {t('additional-employees-initial-password')}
              </Label>
              <input
                id={formatDataTestId(DATA_TEST_ID_PREFIX, 'initial-password-input')}
                type="password"
                value={draftEmployee.initialPassword ?? ''}
                onChange={event => handleDraftChange('initialPassword', event.target.value)}
                autoComplete="new-password"
                className="gba:w-full gba:rounded-md gba:border gba:border-gray-300 gba:px-3 gba:py-2"
                data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'initial-password-input')}
              />
            </div>
            <div className="gba:col-span-2 gba:space-y-2">
              <Label htmlFor="additional-dept-select">{t('additional-employees-department')}</Label>
              <Select
                key={`additional-dept-select-${departmentSelectNonce}`}
                value={draftEmployee.departmentId || undefined}
                onValueChange={v => handleDraftChange('departmentId', v)}
              >
                <SelectTrigger
                  id="additional-dept-select"
                  className="gba:w-full"
                  data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'department-select')}
                >
                  <SelectValue placeholder={t('additional-employees-department-placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {departmentOptions.map((opt: { id: string; name: string }) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {draftErrors.departmentId && (
                <p className="gba:mt-1 gba:text-xs gba:text-[#B42318]">{draftErrors.departmentId}</p>
              )}
            </div>
            <div className="gba:col-span-2 gba:flex gba:items-center gba:gap-2">
              <Checkbox
                id={formatDataTestId(DATA_TEST_ID_PREFIX, 'is-manager')}
                checked={Boolean(draftEmployee.isManager)}
                onCheckedChange={checked => handleDraftChange('isManager', checked === true)}
                data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'is-manager')}
              />
              <Label
                htmlFor={formatDataTestId(DATA_TEST_ID_PREFIX, 'is-manager')}
                className="gba:cursor-pointer gba:font-normal"
              >
                {t('additional-employees-is-manager')}
              </Label>
            </div>
            <div className="gba:col-span-2 gba:space-y-2">
              <div className="gba:text-sm gba:font-medium gba:text-[#1F2937]">
                {t('additional-employees-capabilities')}
              </div>
              <p className="gba:text-xs gba:text-muted-foreground">
                {t('additional-employees-capabilities-placeholder')}
              </p>
              <div
                className="gba:flex gba:max-h-40 gba:flex-col gba:gap-2 gba:overflow-y-auto gba:rounded-md gba:border gba:border-gray-200 gba:p-3"
                data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'capabilities-select')}
              >
                {capabilityOptions.map((opt: { id: string; name: string }) => (
                  <label key={opt.id} className="gba:flex gba:items-center gba:gap-2 gba:text-sm">
                    <Checkbox
                      checked={draftEmployee.capabilityIds.includes(opt.id)}
                      onCheckedChange={() => toggleCapability(opt.id)}
                    />
                    {opt.name}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="gba:mt-6 gba:flex gba:justify-end">
            <Button
              type="button"
              variant="default"
              onClick={() => void handleAddEmployee()}
              disabled={checkingExistingUser || duplicateConfirmOpen}
              data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'add-employee-button')}
            >
              {checkingExistingUser ? (
                <span className="gba:inline-flex gba:items-center gba:gap-2">
                  <Spinner size="sm" />
                  {t('additional-employees-checking-user')}
                </span>
              ) : (
                t('additional-employees-add-employee')
              )}
            </Button>
          </div>
        </div>

        <AlertDialog open={duplicateConfirmOpen} onOpenChange={handleDuplicateDialogOpenChange}>
          <AlertDialogContent data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'duplicate-user-dialog')}>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('additional-employees-existing-user-confirm-title')}</AlertDialogTitle>
              <AlertDialogDescription className="gba:space-y-2">
                <span>{t('additional-employees-existing-user-confirm-body')}</span>
                {pendingEmployee ? (
                  <span className="gba:block gba:font-medium gba:text-foreground">{pendingEmployee.email}</span>
                ) : null}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel type="button">{t('additional-employees-existing-user-cancel')}</AlertDialogCancel>
              <AlertDialogAction type="button" onClick={handleConfirmDuplicateAdd}>
                {t('additional-employees-existing-user-confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="gba:rounded-xl gba:border gba:border-gray-200 gba:bg-white gba:p-6 gba:shadow-sm">
          <div className="gba:mb-4 gba:flex gba:items-center gba:justify-between">
            <h2 className="gba:text-lg gba:font-semibold gba:text-[#111827]">{t('additional-employees-list-title')}</h2>
            <span className="gba:text-sm gba:text-gray-500">{additionalEmployees.length}</span>
          </div>

          {additionalEmployees.length === 0 ? (
            <p
              className="gba:text-sm gba:text-gray-500"
              data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'empty-state')}
            >
              {t('additional-employees-empty-state')}
            </p>
          ) : (
            <div className="gba:space-y-3">
              {additionalEmployees.map((employee: SetupEmployee) => (
                <div
                  key={employee.id}
                  className="gba:flex gba:items-start gba:justify-between gba:rounded-lg gba:border gba:border-gray-200 gba:bg-[#F9FAFB] gba:px-4 gba:py-3"
                  data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, `employee-row-${employee.id}`)}
                >
                  <div className="gba:space-y-1">
                    <div className="gba:font-medium gba:text-[#111827]">{`${employee.firstName} ${employee.lastName}`}</div>
                    <div className="gba:text-sm gba:text-gray-600">{employee.email}</div>
                    <div className="gba:text-sm gba:text-gray-600">
                      {departmentNameMap[employee.departmentId] ?? employee.departmentId} | {employee.jobPosition}
                      {employee.isManager ? ` · ${t('additional-employees-manager-badge')}` : ''}
                    </div>
                    {employee.capabilityIds.length > 0 && (
                      <div className="gba:text-sm gba:text-gray-500">
                        {employee.capabilityIds
                          .map(capabilityId => capabilityNameMap[capabilityId] ?? capabilityId)
                          .join(', ')}
                      </div>
                    )}
                    {employee.initialPassword?.trim() ? (
                      <div className="gba:text-sm gba:text-gray-500">
                        {t('additional-employees-list-initial-password-set')}
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="gba:rounded-md gba:p-2 gba:text-[#78716C] gba:transition-colors gba:hover:bg-[#FEF2F2] gba:hover:text-[#B42318]"
                    onClick={() => handleRemoveEmployee(employee.id)}
                    data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, `remove-employee-${employee.id}`)}
                    aria-label={t('additional-employees-remove-employee')}
                  >
                    <Trash2 size={18} aria-hidden />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PlatformShellLayout>
  )
}
