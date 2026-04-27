import React, { useCallback, useMemo, useState } from 'react'
import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import { FieldValues, useFormContext } from 'react-hook-form'
import { formatDataTestId } from '../../shims/formatDataTestId'
import { useSetupTranslation } from '../../useSetupTranslation'
import PlatformShellLayout from './containers/PlatformShellLayout'
import { Network, Trash2 } from 'lucide-react'
import { Capability, Department, SetupEmployee } from './types'
import { wizardSectionTheme } from './theme'
import { getSetupProgressItems, setupProgressStepIndex } from './progress-steps'
import { v4 as uuidv4 } from 'uuid'
import { createEnterprisePresetState, enterprisePresetDepartments } from '../../data'
import { SETUP_ENTERPRISE_MANAGEMENT_DEPARTMENT_ID } from '../../setupConstants'

export interface DepartmentSelectionStepProps<T extends FieldValues = FieldValues> {
  readonly onNext: () => void
  readonly onBack: () => void
}

const DATA_TEST_ID_PREFIX = 'DepartmentSelection'
const ADD_BUTTON_CLASSNAME =
  'gba:inline-flex gba:w-[176px] gba:items-center gba:justify-center gba:rounded-md gba:bg-[#334155] gba:px-4 gba:py-2 gba:text-sm gba:font-medium gba:text-white gba:disabled:cursor-not-allowed gba:disabled:opacity-50'

function DepartmentSelectionStep<T extends FieldValues = FieldValues>({
  onNext,
  onBack
}: DepartmentSelectionStepProps<T>) {
  const { t } = useSetupTranslation()
  const { watch, setValue, getValues } = useFormContext()
  const [customDepartmentName, setCustomDepartmentName] = useState('')
  const [presetDepartmentToAdd, setPresetDepartmentToAdd] = useState('')
  const [isAdvancedDepartmentSetup, setIsAdvancedDepartmentSetup] = useState(false)

  const selectedDepartments = watch('selectedDepartments') || []
  const departments = watch('departments') || []
  const capabilities = watch('capabilities') || []
  const selectedCapabilities = watch('selectedCapabilities') || []
  const departmentCapabilities = watch('departmentCapabilities') || {}
  const normalizedDepartmentNames = useMemo(() => {
    return new Set(departments.map((department: Department) => department.name.trim().toLowerCase()).filter(Boolean))
  }, [departments])

  // Define a specific handler for the next button to ensure proper navigation
  const handleNext = useCallback(() => {
    if (typeof onNext === 'function') {
      onNext()
    }
  }, [onNext])

  const presetDepartmentNames = useMemo(() => {
    return new Set(enterprisePresetDepartments.map(department => department.name.trim().toLowerCase()))
  }, [])

  const selectedDepartmentEntries = useMemo(() => {
    return departments.filter((department: Department) => selectedDepartments.includes(department.id))
  }, [departments, selectedDepartments])

  const availablePresetOptions = useMemo(() => {
    return departments
      .filter((department: Department) => {
        const normalizedName = department.name.trim().toLowerCase()
        return presetDepartmentNames.has(normalizedName) && !selectedDepartments.includes(department.id)
      })
      .map((department: Department) => ({
        id: department.id,
        name: department.name
      }))
  }, [departments, presetDepartmentNames, selectedDepartments])

  const handleAddDepartment = useCallback(() => {
    const normalizedName = customDepartmentName.trim()
    if (!normalizedName) return

    if (normalizedDepartmentNames.has(normalizedName.toLowerCase())) {
      setCustomDepartmentName('')
      return
    }

    const newDepartment = {
      id: uuidv4(),
      name: normalizedName
    }

    setValue('departments', [...departments, newDepartment])
    setValue('selectedDepartments', [...selectedDepartments, newDepartment.id])
    setValue('departmentCapabilities', {
      ...departmentCapabilities,
      [newDepartment.id]: []
    })
    setValue('selectedDepartmentId', null)
    setCustomDepartmentName('')
  }, [
    customDepartmentName,
    departmentCapabilities,
    departments,
    normalizedDepartmentNames,
    selectedDepartments,
    setValue
  ])

  const handleAddPresetDepartment = useCallback(() => {
    if (!presetDepartmentToAdd) return

    if (selectedDepartments.includes(presetDepartmentToAdd)) {
      setPresetDepartmentToAdd('')
      return
    }

    const capabilityIdsForDepartment = departmentCapabilities[presetDepartmentToAdd] ?? []

    setValue('selectedDepartments', [...selectedDepartments, presetDepartmentToAdd])
    setValue('selectedCapabilities', Array.from(new Set([...selectedCapabilities, ...capabilityIdsForDepartment])))
    setValue('selectedDepartmentId', null)
    setPresetDepartmentToAdd('')
  }, [departmentCapabilities, presetDepartmentToAdd, selectedCapabilities, selectedDepartments, setValue])

  const applyQuickDepartmentPreset = useCallback(() => {
    const preset = createEnterprisePresetState()
    setValue('departments', preset.departments)
    setValue('selectedDepartments', preset.selectedDepartments)
    setValue('selectedDepartmentId', null)
    setValue('selectedDepartmentName', null)
    setValue('capabilities', preset.capabilities)
    setValue('departmentCapabilities', preset.departmentCapabilities)
    setValue('selectedCapabilities', preset.selectedCapabilities)
    const currentEmployees = (getValues('additionalEmployees') as SetupEmployee[] | undefined) ?? []
    setValue(
      'additionalEmployees',
      currentEmployees.map((employee: SetupEmployee) => ({
        ...employee,
        capabilityIds: employee.capabilityIds.filter(id => preset.selectedCapabilities.includes(id))
      })),
      { shouldDirty: true, shouldTouch: true }
    )
  }, [getValues, setValue])

  const handleDepartmentSetupModeChange = useCallback(
    (mode: 'quick' | 'advanced') => {
      if (mode === 'quick') {
        if (isAdvancedDepartmentSetup) {
          applyQuickDepartmentPreset()
        }
        setIsAdvancedDepartmentSetup(false)
      } else {
        setIsAdvancedDepartmentSetup(true)
      }
    },
    [applyQuickDepartmentPreset, isAdvancedDepartmentSetup]
  )

  const departmentSetupModeOptions = useMemo(
    () => [
      {
        id: 'quick' as const,
        title: t('department-setup-mode-quick'),
        description: t('department-setup-mode-quick-help')
      },
      {
        id: 'advanced' as const,
        title: t('department-setup-mode-advanced'),
        description: t('department-setup-mode-advanced-description')
      }
    ],
    [t]
  )

  const handleRemoveDepartment = useCallback(
    (departmentId: string) => {
      if (departmentId === SETUP_ENTERPRISE_MANAGEMENT_DEPARTMENT_ID) {
        return
      }
      const department = departments.find((entry: Department) => entry.id === departmentId)
      const isPresetDepartment = presetDepartmentNames.has(department?.name.trim().toLowerCase() ?? '')
      const capabilityIdsForDepartment = departmentCapabilities[departmentId] ?? []
      const remainingSelectedDepartmentIds = selectedDepartments.filter((id: string) => id !== departmentId)
      const capabilityIdsStillReferenced = new Set(
        remainingSelectedDepartmentIds.flatMap((id: string) => departmentCapabilities[id] ?? [])
      )
      const capabilityIdsToDeactivate = capabilityIdsForDepartment.filter(
        (capabilityId: string) => !capabilityIdsStillReferenced.has(capabilityId)
      )
      const remainingSelectedCapabilities = selectedCapabilities.filter(
        (capabilityId: string) => !capabilityIdsToDeactivate.includes(capabilityId)
      )

      setValue('selectedDepartments', remainingSelectedDepartmentIds)
      setValue('selectedCapabilities', remainingSelectedCapabilities)
      setValue('selectedDepartmentId', null)
      const currentEmployees = (getValues('additionalEmployees') as SetupEmployee[] | undefined) ?? []
      setValue(
        'additionalEmployees',
        currentEmployees
          .filter((employee: SetupEmployee) => employee.departmentId !== departmentId)
          .map((employee: SetupEmployee) => ({
            ...employee,
            capabilityIds: employee.capabilityIds.filter(capabilityId =>
              remainingSelectedCapabilities.includes(capabilityId)
            )
          })),
        { shouldDirty: true, shouldTouch: true }
      )

      if (!isPresetDepartment) {
        const { [departmentId]: _removedDepartmentCapabilities, ...remainingDepartmentCapabilities } =
          departmentCapabilities
        const remainingCapabilityIds = new Set(Object.values(remainingDepartmentCapabilities).flat())
        const remainingCapabilities = capabilities.filter((capability: Capability) =>
          remainingCapabilityIds.has(capability.id)
        )

        setValue(
          'departments',
          departments.filter((entry: Department) => entry.id !== departmentId)
        )
        setValue('capabilities', remainingCapabilities)
        setValue('departmentCapabilities', remainingDepartmentCapabilities)
      }
    },
    [
      capabilities,
      departmentCapabilities,
      departments,
      getValues,
      presetDepartmentNames,
      selectedCapabilities,
      selectedDepartments,
      setValue
    ]
  )

  return (
    <PlatformShellLayout
      backgroundColorIcon={wizardSectionTheme.departments.shellIconBackground}
      icon={<Network width={40} height={40} className="gba:text-[#2563EB]" />}
      title={t('department-selection-step-progress')}
      description={t('department-selection-select-departments-description')}
      currentStep={setupProgressStepIndex.departments}
      stepItems={getSetupProgressItems(t)}
      dataTestIdPrefix={DATA_TEST_ID_PREFIX}
      onNext={handleNext}
      onBack={onBack}
      contentClassName="gba:overflow-hidden"
    >
      <div className="gba:w-full gba:overflow-y-auto gba:overflow-x-hidden">
        <div className="gba:mb-6 gba:space-y-4">
          <div className={`gba:text-sm gba:font-medium ${wizardSectionTheme.departments.titleText}`}>
            {t('department-setup-mode-title')}
          </div>
          <div className="gba:grid gba:gap-4">
            {departmentSetupModeOptions.map(option => {
              const isSelected = option.id === 'advanced' ? isAdvancedDepartmentSetup : !isAdvancedDepartmentSetup
              return (
                <label
                  key={option.id}
                  className={`gba:flex gba:cursor-pointer gba:items-start gba:gap-4 gba:rounded-2xl gba:border gba:p-5 gba:transition-colors ${
                    isSelected
                      ? `${wizardSectionTheme.departments.selectedBorder} ${wizardSectionTheme.departments.idleBackground} gba:shadow-sm`
                      : 'gba:border-gray-200 gba:bg-white gba:hover:border-[#CBD5E1] gba:hover:bg-[#FAFAFA]'
                  }`}
                  data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, `mode-${option.id}`)}
                >
                  <input
                    type="radio"
                    name="department-setup-mode"
                    checked={isSelected}
                    onChange={() => handleDepartmentSetupModeChange(option.id)}
                    className="gba:mt-1"
                  />
                  <div className="gba:min-w-0">
                    <div className={`gba:text-lg gba:font-semibold ${wizardSectionTheme.departments.titleText}`}>
                      {option.title}
                    </div>
                    <div className="gba:mt-1 gba:text-sm gba:leading-6 gba:text-gray-600">{option.description}</div>
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        {!isAdvancedDepartmentSetup ? null : (
          <>
            <div className="gba:mb-6 gba:rounded-md gba:border gba:border-[#D6D3D1] gba:bg-[#FAFAF9] gba:p-4">
              <div className={`gba:mb-3 gba:text-sm gba:font-medium ${wizardSectionTheme.departments.titleText}`}>
                {t('department-selection-selected-departments')}
              </div>
              <p className="gba:mb-4 gba:text-sm gba:leading-6 gba:text-[#78716C]">
                {t('department-selection-selected-departments-explanation')}
              </p>

              {selectedDepartmentEntries.length === 0 ? (
                <p className="gba:text-sm gba:text-[#78716C]">{t('department-selection-empty-state')}</p>
              ) : (
                <div className="gba:grid gba:gap-3 gba:md:grid-cols-2">
                  {selectedDepartmentEntries.map((department: Department) => (
                    <div
                      key={department.id}
                      className={`gba:flex gba:min-h-[64px] gba:items-center gba:justify-between gba:rounded-md gba:px-4 gba:py-3 ${wizardSectionTheme.departments.selectedBackground}`}
                      data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, `selected-department-${department.id}`)}
                    >
                      <span
                        className={`gba:text-sm ${wizardSectionTheme.departments.titleText} gba:font-normal gba:leading-5 gba:font-sans`}
                      >
                        {department.name}
                      </span>
                      {department.id !== SETUP_ENTERPRISE_MANAGEMENT_DEPARTMENT_ID && (
                        <button
                          type="button"
                          className="gba:rounded-md gba:p-2 gba:text-[#78716C] gba:transition-colors gba:hover:bg-[#FEF2F2] gba:hover:text-[#B42318]"
                          onClick={() => handleRemoveDepartment(department.id)}
                          data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, `remove-department-${department.id}`)}
                          aria-label={t('department-selection-remove-department')}
                        >
                          <Trash2 size={18} aria-hidden />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {availablePresetOptions.length > 0 && (
              <div className="gba:mb-6 gba:rounded-md gba:border gba:border-[#D6D3D1] gba:bg-white gba:p-4">
                <div className={`gba:mb-2 gba:text-sm gba:font-medium ${wizardSectionTheme.departments.titleText}`}>
                  {t('department-selection-add-from-preset')}
                </div>
                <div className="gba:flex gba:gap-3">
                  <div className="gba:flex-1 gba:space-y-2">
                    <Label className="gba:sr-only" htmlFor="preset-department-select">
                      {t('department-selection-select-department')}
                    </Label>
                    <Select value={presetDepartmentToAdd || undefined} onValueChange={v => setPresetDepartmentToAdd(v)}>
                      <SelectTrigger
                        id="preset-department-select"
                        className="gba:w-full"
                        data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'preset-department-select')}
                      >
                        <SelectValue placeholder={t('department-selection-select-department')} />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePresetOptions.map(opt => (
                          <SelectItem key={opt.id} value={opt.id}>
                            {opt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <button
                    type="button"
                    className={ADD_BUTTON_CLASSNAME}
                    onClick={handleAddPresetDepartment}
                    disabled={!presetDepartmentToAdd}
                    data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'add-preset-department-button')}
                  >
                    {t('department-selection-add-department')}
                  </button>
                </div>
              </div>
            )}

            <div className="gba:rounded-md gba:border gba:border-[#D6D3D1] gba:bg-white gba:p-4">
              <div className={`gba:mb-2 gba:text-sm gba:font-medium ${wizardSectionTheme.departments.titleText}`}>
                {t('department-selection-new-department')}
              </div>
              <div className="gba:flex gba:gap-3">
                <input
                  type="text"
                  value={customDepartmentName}
                  onChange={event => setCustomDepartmentName(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      handleAddDepartment()
                    }
                  }}
                  placeholder={t('department-selection-new-department')}
                  className="gba:flex-1 gba:h-[52px] gba:rounded-md gba:border gba:border-[#D6D3D1] gba:bg-white gba:px-4 gba:text-sm gba:text-[#1C1917] gba:outline-none gba:focus:border-[#94A3B8]"
                  data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'new-department-input')}
                />
                <button
                  type="button"
                  className={ADD_BUTTON_CLASSNAME}
                  onClick={handleAddDepartment}
                  disabled={!customDepartmentName.trim()}
                  data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'add-department-button')}
                >
                  {t('department-selection-add-department')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </PlatformShellLayout>
  )
}

export default DepartmentSelectionStep
