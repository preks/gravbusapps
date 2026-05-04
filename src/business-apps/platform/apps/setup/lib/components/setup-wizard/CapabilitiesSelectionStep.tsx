import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { formatDataTestId } from '../../shims/formatDataTestId'
import { useSetupTranslation } from '../../useSetupTranslation'
import PlatformShellLayout from './containers/PlatformShellLayout'
import { Brain, Check, ChevronDown } from 'lucide-react'
import { Capability, Department, SetupEmployee } from './types'
import { wizardSectionTheme } from './theme'
import { v4 as uuidv4 } from 'uuid'
import { getSetupProgressItems, setupProgressStepIndex } from './progress-steps'
import { createEnterprisePresetState } from '../../data'

export interface CapabilitiesSelectionStepProps {
  readonly onNext: () => void
  readonly onBack: () => void
}

const DATA_TEST_ID_PREFIX = 'CapabilitiesSelection'

function CapabilitiesSelectionStep({ onNext, onBack }: CapabilitiesSelectionStepProps) {
  const { t } = useSetupTranslation()
  const { watch, setValue, getValues } = useFormContext()
  const [draftCapabilities, setDraftCapabilities] = useState<Record<string, string>>({})
  const [expandedDepartmentId, setExpandedDepartmentId] = useState<string | null>(null)
  const [hasAutoExpandedDepartment, setHasAutoExpandedDepartment] = useState(false)
  const [isAdvancedCapabilitiesSetup, setIsAdvancedCapabilitiesSetup] = useState(false)

  const selectedCapabilities = watch('selectedCapabilities') || []
  const capabilities = watch('capabilities') || []
  const departments = watch('departments') || []
  const selectedDepartments = watch('selectedDepartments') || []
  const departmentCapabilities = watch('departmentCapabilities') || {}

  const capabilityNameMap = useMemo(() => {
    return new Map(capabilities.map((capability: Capability) => [capability.id, capability]))
  }, [capabilities])

  const groupedDepartments = useMemo(() => {
    return departments
      .filter((department: Department) => selectedDepartments.includes(department.id))
      .map((department: Department) => ({
        ...department,
        capabilities: (departmentCapabilities[department.id] ?? [])
          .map((capabilityId: string) => capabilityNameMap.get(capabilityId))
          .filter(Boolean) as Capability[]
      }))
  }, [capabilityNameMap, departmentCapabilities, departments, selectedDepartments])

  const normalizedCapabilityNames = useMemo(() => {
    return new Map<string, Capability>(
      capabilities.map((capability: Capability) => [capability.name.trim().toLowerCase(), capability])
    )
  }, [capabilities])

  useEffect(() => {
    if (groupedDepartments.length === 0) {
      setExpandedDepartmentId(null)
      setHasAutoExpandedDepartment(false)
      return
    }

    const hasExpandedDepartment = groupedDepartments.some(
      (department: Department & { capabilities: Capability[] }) => department.id === expandedDepartmentId
    )
    if (expandedDepartmentId !== null && !hasExpandedDepartment) {
      setExpandedDepartmentId(null)
      return
    }

    if (!hasAutoExpandedDepartment && expandedDepartmentId === null) {
      setExpandedDepartmentId(groupedDepartments[0].id)
      setHasAutoExpandedDepartment(true)
    }
  }, [expandedDepartmentId, groupedDepartments, hasAutoExpandedDepartment])

  // Define a specific handler for the next button to ensure proper navigation
  const handleNext = useCallback(() => {
    if (typeof onNext === 'function') {
      onNext()
    }
  }, [onNext])

  // Handle capability selection toggle
  const handleCapabilityToggle = useCallback(
    (capabilityId: string, isChecked: boolean) => {
      const currentSelected = [...(selectedCapabilities ?? [])]

      if (isChecked) {
        if (!currentSelected.includes(capabilityId)) {
          setValue('selectedCapabilities', [...currentSelected, capabilityId])
        }
      } else {
        const nextSelectedCapabilities = currentSelected.filter(id => id !== capabilityId)

        setValue('selectedCapabilities', nextSelectedCapabilities)
        const currentEmployees = (getValues('additionalEmployees') as SetupEmployee[] | undefined) ?? []
        setValue(
          'additionalEmployees',
          currentEmployees.map((employee: SetupEmployee) => ({
            ...employee,
            capabilityIds: employee.capabilityIds.filter(id => nextSelectedCapabilities.includes(id))
          })),
          { shouldDirty: true, shouldTouch: true }
        )
      }
    },
    [getValues, selectedCapabilities, setValue]
  )

  const handleDraftChange = useCallback((departmentId: string, value: string) => {
    setDraftCapabilities(prev => ({
      ...prev,
      [departmentId]: value
    }))
  }, [])

  const applyQuickCapabilitiesPreset = useCallback(() => {
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

  const handleAddCapability = useCallback(
    (departmentId: string) => {
      const draftCapabilityName = draftCapabilities[departmentId]?.trim()

      if (!draftCapabilityName) {
        return
      }

      const existingCapability = normalizedCapabilityNames.get(draftCapabilityName.toLowerCase())
      const capabilityId = existingCapability?.id ?? uuidv4()
      const nextCapabilities = existingCapability
        ? capabilities
        : [
            ...capabilities,
            {
              id: capabilityId,
              name: draftCapabilityName
            }
          ]
      const nextDepartmentCapabilities = Array.from(
        new Set([...(departmentCapabilities[departmentId] ?? []), capabilityId])
      )

      setValue('capabilities', nextCapabilities)
      setValue('departmentCapabilities', {
        ...departmentCapabilities,
        [departmentId]: nextDepartmentCapabilities
      })
      setValue('selectedCapabilities', Array.from(new Set([...selectedCapabilities, capabilityId])))
      setDraftCapabilities(prev => ({
        ...prev,
        [departmentId]: ''
      }))
    },
    [capabilities, departmentCapabilities, draftCapabilities, normalizedCapabilityNames, selectedCapabilities, setValue]
  )

  const handleDepartmentToggle = useCallback((departmentId: string) => {
    setExpandedDepartmentId(currentDepartmentId => (currentDepartmentId === departmentId ? null : departmentId))
  }, [])

  const handleCapabilitiesSetupModeChange = useCallback(
    (mode: 'quick' | 'advanced') => {
      if (mode === 'quick') {
        if (isAdvancedCapabilitiesSetup) {
          applyQuickCapabilitiesPreset()
        }
        setIsAdvancedCapabilitiesSetup(false)
      } else {
        setIsAdvancedCapabilitiesSetup(true)
      }
    },
    [applyQuickCapabilitiesPreset, isAdvancedCapabilitiesSetup]
  )

  const capabilitiesSetupModeOptions = useMemo(
    () => [
      {
        id: 'quick' as const,
        title: t('capabilities-setup-mode-quick'),
        description: t('capabilities-setup-mode-quick-help')
      },
      {
        id: 'advanced' as const,
        title: t('capabilities-setup-mode-advanced'),
        description: t('capabilities-setup-mode-advanced-description')
      }
    ],
    [t]
  )

  // Custom checkbox component that matches the design
  const CustomCheckbox = ({
    checked,
    disabled,
    onChange,
    id
  }: {
    checked: boolean
    disabled?: boolean
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    id: string
  }) => {
    return (
      <div className="gba:relative gba:flex gba:items-center gba:justify-center gba:w-6 gba:h-6">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          disabled={disabled}
          onChange={onChange}
          className="gba:absolute gba:opacity-0 gba:w-0 gba:h-0"
        />
        <label
          htmlFor={id}
          className={`gba:flex gba:items-center gba:justify-center gba:w-6 gba:h-6 gba:rounded-sm ${
            checked
              ? wizardSectionTheme.capabilities.checkboxChecked
              : wizardSectionTheme.capabilities.checkboxUnchecked
          } ${disabled ? 'gba:cursor-not-allowed' : 'gba:cursor-pointer'}`}
        >
          {checked && <Check />}
        </label>
      </div>
    )
  }

  return (
    <PlatformShellLayout
      icon={<Brain className="gba:text-[#0F766E]" />}
      backgroundColorIcon={wizardSectionTheme.capabilities.shellIconBackground}
      title={t('capabilities-selection-main-title')}
      description={t('capabilities-selection-main-description')}
      currentStep={setupProgressStepIndex.capabilities}
      stepItems={getSetupProgressItems(t)}
      dataTestIdPrefix={DATA_TEST_ID_PREFIX}
      onNext={handleNext}
      onBack={onBack}
      contentClassName="gba:overflow-hidden"
    >
      <div className="gba:w-full gba:overflow-y-auto gba:overflow-x-hidden">
        <div className="gba:mb-6 gba:space-y-4">
          <div className={`gba:text-sm gba:font-medium ${wizardSectionTheme.capabilities.titleText}`}>
            {t('capabilities-setup-mode-title')}
          </div>
          <div className="gba:grid gba:gap-4">
            {capabilitiesSetupModeOptions.map(option => {
              const isSelected = option.id === 'advanced' ? isAdvancedCapabilitiesSetup : !isAdvancedCapabilitiesSetup
              return (
                <label
                  key={option.id}
                  className={`gba:flex gba:cursor-pointer gba:items-start gba:gap-4 gba:rounded-2xl gba:border gba:p-5 gba:transition-colors ${
                    isSelected
                      ? `${wizardSectionTheme.capabilities.selectedBorder} ${wizardSectionTheme.capabilities.idleBackground} gba:shadow-sm`
                      : 'gba:border-gray-200 gba:bg-white gba:hover:border-[#CBD5E1] gba:hover:bg-[#FAFAFA]'
                  }`}
                  data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, `mode-${option.id}`)}
                >
                  <input
                    type="radio"
                    name="capabilities-setup-mode"
                    checked={isSelected}
                    onChange={() => handleCapabilitiesSetupModeChange(option.id)}
                    className="gba:mt-1"
                  />
                  <div className="gba:min-w-0">
                    <div className={`gba:text-lg gba:font-semibold ${wizardSectionTheme.capabilities.titleText}`}>
                      {option.title}
                    </div>
                    <div className="gba:mt-1 gba:text-sm gba:leading-6 gba:text-gray-600">{option.description}</div>
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        {!isAdvancedCapabilitiesSetup ? null : (
          <>
            <div className="gba:mb-4 gba:rounded-xl gba:border gba:border-[#D6D3D1] gba:bg-[#FAFAF9] gba:px-5 gba:py-4 gba:text-sm gba:leading-6 gba:text-[#57534E]">
              {t('capabilities-selection-group-description')}
            </div>
            {groupedDepartments.map((department: Department & { capabilities: Capability[] }) => {
              const selectedCapabilitiesCount = department.capabilities.filter((capability: Capability) =>
                selectedCapabilities?.includes(capability.id)
              ).length
              const isExpanded = expandedDepartmentId === department.id

              return (
                <div
                  key={department.id}
                  className={`gba:mb-4 gba:rounded-xl gba:border gba:border-[#D6D3D1] ${
                    isExpanded ? 'gba:bg-white' : wizardSectionTheme.capabilities.idleBackground
                  }`}
                  data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, `department-group-${department.id}`)}
                >
                  <button
                    type="button"
                    className={`gba:flex gba:w-full gba:items-center gba:justify-between gba:rounded-xl gba:px-5 gba:py-4 gba:text-left gba:transition-colors ${
                      isExpanded
                        ? wizardSectionTheme.capabilities.selectedBackground
                        : wizardSectionTheme.capabilities.idleBackground
                    }`}
                    onClick={() => handleDepartmentToggle(department.id)}
                    data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, `accordion-trigger-${department.id}`)}
                    aria-expanded={isExpanded}
                  >
                    <div>
                      <h3 className={`gba:text-base gba:font-semibold ${wizardSectionTheme.capabilities.titleText}`}>
                        {department.name}
                      </h3>
                    </div>
                    <div className="gba:ml-4 gba:flex gba:items-center gba:gap-3">
                      <span className="gba:rounded-full gba:bg-white gba:px-3 gba:py-1 gba:text-sm gba:text-gray-600 gba:shadow-sm">
                        {selectedCapabilitiesCount}
                      </span>
                      <ChevronDown
                        className={`gba:h-[22px] gba:w-[22px] gba:text-[#78716C] gba:transition-transform ${isExpanded ? 'gba:rotate-180' : ''}`}
                        aria-hidden
                      />
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="gba:px-5 gba:pb-4 gba:pt-2">
                      <div className="gba:space-y-2">
                        {department.capabilities.length === 0 && (
                          <div className="gba:rounded-md gba:border gba:border-dashed gba:border-gray-300 gba:px-4 gba:py-3 gba:text-sm gba:text-gray-500">
                            {t('capabilities-selection-empty-department-group')}
                          </div>
                        )}

                        {department.capabilities.map((capability: Capability) => {
                          const isSelected = selectedCapabilities?.includes(capability.id)

                          return (
                            <div
                              key={capability.id}
                              className={`gba:flex gba:items-center gba:justify-between gba:py-4 gba:px-4 gba:rounded-md ${
                                isSelected
                                  ? wizardSectionTheme.capabilities.selectedBackground
                                  : wizardSectionTheme.capabilities.idleBackground
                              } gba:cursor-pointer`}
                              style={{ minHeight: '52px' }}
                              onClick={() => {
                                handleCapabilityToggle(capability.id, !isSelected)
                              }}
                              data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, `capability-item-${capability.id}`)}
                            >
                              <div className="gba:flex-1">
                                <span
                                  className={`gba:text-sm ${wizardSectionTheme.capabilities.titleText} gba:font-medium gba:leading-5 gba:font-sans`}
                                >
                                  {capability.name}
                                </span>
                              </div>

                              <CustomCheckbox
                                id={`cap-${capability.id}`}
                                checked={isSelected}
                                onChange={e => {
                                  handleCapabilityToggle(capability.id, e.target.checked)
                                }}
                              />
                            </div>
                          )
                        })}
                      </div>

                      <div className="gba:mt-4 gba:flex gba:gap-3">
                        <input
                          type="text"
                          value={draftCapabilities[department.id] ?? ''}
                          onChange={event => handleDraftChange(department.id, event.target.value)}
                          onKeyDown={event => {
                            if (event.key === 'Enter') {
                              event.preventDefault()
                              handleAddCapability(department.id)
                            }
                          }}
                          placeholder={t('capabilities-selection-add-custom-placeholder')}
                          className="gba:flex-1 gba:rounded-md gba:border gba:border-[#D6D3D1] gba:bg-white gba:px-3 gba:py-2 gba:text-sm gba:text-[#1C1917] gba:outline-none gba:focus:border-[#94A3B8]"
                          data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, `new-capability-input-${department.id}`)}
                        />
                        <button
                          type="button"
                          className="gba:rounded-md gba:bg-[#334155] gba:px-4 gba:py-2 gba:text-sm gba:font-medium gba:text-white gba:disabled:cursor-not-allowed gba:disabled:opacity-50"
                          onClick={() => handleAddCapability(department.id)}
                          disabled={!draftCapabilities[department.id]?.trim()}
                          data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, `add-capability-button-${department.id}`)}
                        >
                          {t('capabilities-selection-add-capability')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}
      </div>
    </PlatformShellLayout>
  )
}

export default CapabilitiesSelectionStep
