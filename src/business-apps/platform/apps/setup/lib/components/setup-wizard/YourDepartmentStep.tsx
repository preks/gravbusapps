import React, { useCallback, useMemo } from 'react'
import { Controller, FieldValues, useFormContext } from 'react-hook-form'
import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import { formatDataTestId } from '../../shims/formatDataTestId'
import { useSetupTranslation } from '../../useSetupTranslation'
import PlatformShellLayout from './containers/PlatformShellLayout'
import { Network } from 'lucide-react'
import { Department } from './types'
import { FormFieldErrorMessage } from '../../shims/FormFieldErrorMessage'
import { wizardSectionTheme } from './theme'
import { getSetupProgressItems, setupProgressStepIndex } from './progress-steps'
import { MAX_CHARACTERS_FOR_NAME } from '../../shims/ui'
import {
  SETUP_ENTERPRISE_MANAGEMENT_DEPARTMENT_ID,
  SETUP_ROOT_ORGANIZATIONAL_UNIT_DISPLAY_NAME
} from '../../setupConstants'

export interface YourDepartmentStepProps<T extends FieldValues = FieldValues> {
  readonly onNext: () => void
  readonly onBack: () => void
}

const DATA_TEST_ID_PREFIX = 'YourDepartment'

function YourDepartmentStep<T extends FieldValues = FieldValues>({ onNext, onBack }: YourDepartmentStepProps<T>) {
  const { t } = useSetupTranslation()
  const { watch, control, setValue } = useFormContext()

  const selectedDepartments = watch('selectedDepartments') || []
  const departments = watch('departments') || []
  const userPlacementMode = watch('userPlacementMode')
  const selectedDepartmentId = watch('selectedDepartmentId')
  const firstName = watch('firstName')
  const lastName = watch('lastName')
  const jobPosition = watch('jobPosition')

  const isFormValid = useMemo(() => {
    if (userPlacementMode === 'not_in_org') {
      return true
    }
    if (userPlacementMode === 'ceo') {
      return Boolean(firstName?.trim() && lastName?.trim())
    }
    if (userPlacementMode === 'existing_department') {
      return Boolean(selectedDepartmentId && firstName?.trim() && lastName?.trim() && jobPosition?.trim())
    }
    return false
  }, [firstName, jobPosition, lastName, selectedDepartmentId, userPlacementMode])

  const departmentOptions = useMemo(() => {
    const availableDepartments = departments.filter((dept: Department) => selectedDepartments.includes(dept.id))

    return availableDepartments.map((dept: Department) => ({
      id: dept.id,
      name: dept.name
    }))
  }, [departments, selectedDepartments])

  const handleDepartmentChange = useCallback(
    (value: string) => {
      const selectedDept = departments.find((dept: Department) => dept.id === value)
      if (selectedDept) {
        setValue('selectedDepartmentName', selectedDept.name)
      }
    },
    [departments, setValue]
  )

  const handlePlacementModeChange = useCallback(
    (mode: 'ceo' | 'existing_department' | 'not_in_org') => {
      setValue('userPlacementMode', mode)
      setValue('customDepartmentName', null)

      if (mode === 'not_in_org') {
        setValue('selectedDepartmentId', null)
        setValue('selectedDepartmentName', null)
        setValue('jobPosition', '')
        return
      }

      if (mode === 'ceo') {
        setValue('jobPosition', 'CEO')
        setValue('selectedDepartmentId', SETUP_ENTERPRISE_MANAGEMENT_DEPARTMENT_ID)
        setValue('selectedDepartmentName', SETUP_ROOT_ORGANIZATIONAL_UNIT_DISPLAY_NAME)
        return
      }

      if (mode === 'existing_department') {
        if (selectedDepartmentId === SETUP_ENTERPRISE_MANAGEMENT_DEPARTMENT_ID) {
          setValue('selectedDepartmentId', null)
          setValue('selectedDepartmentName', null)
        }
        if (jobPosition === 'CEO') {
          setValue('jobPosition', '')
        }
      }
    },
    [jobPosition, selectedDepartmentId, setValue]
  )

  const getErrorMessage = useCallback(
    (error: { message?: string }) => {
      return error?.message ?? t('validation-required-field')
    },
    [t]
  )

  const renderTextField = useCallback(
    (name: 'firstName' | 'lastName' | 'jobPosition', label: string, placeholder: string) => (
      <Controller
        name={name}
        control={control}
        render={({ field, fieldState: { error } }) => (
          <div>
            <label
              className="gba:mb-2 gba:block gba:text-sm gba:font-medium gba:text-[#111827]"
              htmlFor={formatDataTestId(DATA_TEST_ID_PREFIX, name)}
            >
              {label} *
            </label>
            <input
              id={formatDataTestId(DATA_TEST_ID_PREFIX, name)}
              value={field.value ?? ''}
              onChange={event => field.onChange(event.target.value)}
              onBlur={field.onBlur}
              placeholder={placeholder}
              maxLength={MAX_CHARACTERS_FOR_NAME}
              className="gba:w-full gba:rounded-md gba:border gba:border-gray-300 gba:px-3 gba:py-2 gba:text-sm gba:text-[#111827] gba:outline-none gba:focus:border-[#94A3B8]"
              data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, name)}
            />
            {error && (
              <FormFieldErrorMessage
                prefixDataTestId={formatDataTestId(DATA_TEST_ID_PREFIX, name)}
                message={getErrorMessage(error)}
                extraClasses="gba:mt-1"
              />
            )}
          </div>
        )}
      />
    ),
    [control, getErrorMessage]
  )

  const placementOptions = useMemo(
    () => [
      {
        id: 'ceo' as const,
        title: t('your-department-ceo-title'),
        description: t('your-department-ceo-description')
      },
      {
        id: 'existing_department' as const,
        title: t('your-department-existing-department-title'),
        description: t('your-department-existing-department-description')
      },
      {
        id: 'not_in_org' as const,
        title: t('your-department-not-in-org-title'),
        description: t('your-department-not-in-org-description')
      }
    ],
    [t]
  )

  const showDepartmentSelect = userPlacementMode === 'existing_department'
  const showUserProfileFields = userPlacementMode === 'ceo' || userPlacementMode === 'existing_department'

  return (
    <PlatformShellLayout
      backgroundColorIcon={wizardSectionTheme.departments.shellIconBackground}
      icon={<Network width={40} height={40} className="gba:text-[#2563EB]" />}
      title={t('your-department-title')}
      description={t('your-department-description')}
      currentStep={setupProgressStepIndex.placement}
      stepItems={getSetupProgressItems(t)}
      dataTestIdPrefix={DATA_TEST_ID_PREFIX}
      onNext={onNext}
      onBack={onBack}
      disableNext={!isFormValid}
      className="gba:w-full gba:max-w-[760px]"
    >
      <div className="gba:w-full gba:space-y-5">
        <div className="gba:grid gba:gap-4">
          {placementOptions.map(option => {
            const isSelected = userPlacementMode === option.id

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
                  name="userPlacementMode"
                  checked={isSelected}
                  onChange={() => handlePlacementModeChange(option.id)}
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

        {showDepartmentSelect && (
          <div className="gba:rounded-2xl gba:border gba:border-[#E7E5E4] gba:bg-white gba:p-5 gba:shadow-sm">
            <Controller
              name="selectedDepartmentId"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <>
                  <div className="gba:space-y-2">
                    <Label htmlFor={formatDataTestId(DATA_TEST_ID_PREFIX, 'select')}>
                      {t('your-department-select-label')}
                    </Label>
                    <Select
                      value={field.value ? String(field.value) : undefined}
                      onValueChange={value => {
                        field.onChange(value ? value : null)
                        if (value) handleDepartmentChange(value)
                      }}
                    >
                      <SelectTrigger
                        id={formatDataTestId(DATA_TEST_ID_PREFIX, 'select')}
                        className="gba:w-full"
                        data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'select')}
                      >
                        <SelectValue placeholder={t('your-department-select-placeholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {departmentOptions.map(opt => (
                          <SelectItem key={opt.id} value={opt.id}>
                            {opt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {error && (
                    <FormFieldErrorMessage
                      prefixDataTestId={formatDataTestId(DATA_TEST_ID_PREFIX, 'selectedDepartmentId')}
                      message={getErrorMessage(error)}
                      extraClasses="gba:mt-1"
                    />
                  )}
                </>
              )}
            />
          </div>
        )}

        {showUserProfileFields && (
          <div className="gba:space-y-4 gba:rounded-2xl gba:border gba:border-[#E7E5E4] gba:bg-[#FAFAF9] gba:p-5 gba:shadow-sm">
            <div>
              <div className={`gba:text-lg gba:font-semibold ${wizardSectionTheme.departments.titleText}`}>
                {t('your-department-user-details-title')}
              </div>
              <div className="gba:mt-1 gba:text-sm gba:leading-6 gba:text-gray-600">
                {t('your-department-user-details-description')}
              </div>
            </div>
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              {renderTextField('firstName', t('user-details-first-name'), t('user-details-enter-first-name'))}
              {renderTextField('lastName', t('user-details-last-name'), t('user-details-enter-last-name'))}
              {userPlacementMode === 'existing_department' && (
                <div className="gba:col-span-2">
                  {renderTextField('jobPosition', t('user-details-job-position'), t('user-details-enter-job-position'))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PlatformShellLayout>
  )
}

export default YourDepartmentStep
