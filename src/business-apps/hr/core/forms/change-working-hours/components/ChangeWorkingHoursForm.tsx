import React, { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import {
  DayKey,
  WorkingHoursFormValues,
  dayOrder,
  fullDayLabels,
  minHours,
  maxHours,
  dayInputTestIds,
  buildDayMissingValueError
} from '../constants/changeWorkingHoursConstants'
import { useChangeWorkingHoursContext } from '../context/ChangeWorkingHoursContext'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner
} from '@newwork/nw-design-system'
import WorkingHoursSummary from './WorkingHoursSummary'

export const ChangeWorkingHoursForm: React.FC = () => {
  const {
    employee,
    employees,
    defaults,
    selectedEmployeeId,
    setSelectedEmployeeId,
    isFixedEmployeeId,
    loading,
    error,
    buildSubmitPayload
  } = useChangeWorkingHoursContext()

  const form = useForm<WorkingHoursFormValues>({
    defaultValues: {
      mondayHours: '',
      tuesdayHours: '',
      wednesdayHours: '',
      thursdayHours: '',
      fridayHours: '',
      saturdayHours: '',
      sundayHours: ''
    },
    mode: 'onChange'
  })

  useEffect(() => {
    if (defaults) {
      form.reset(defaults)
    }
  }, [defaults, form])

  const dayLabel = (key: DayKey): string => {
    const config = dayOrder.find(d => d.key === key)!
    return getTranslationFromI18nKeyAndLabel(config.labelKey, config.fallback)
  }

  const fullDayLabel = (key: DayKey): string => {
    const cfg = fullDayLabels[key]
    return getTranslationFromI18nKeyAndLabel(cfg.labelKey, cfg.fallback)
  }

  const buildErrorMessage = (key: DayKey) => buildDayMissingValueError(fullDayLabel(key))

  const watchedValues = form.watch()
  const { weeklySum, workingDays, fte, areAllDaysValid } = useMemo(() => {
    const keys: (keyof WorkingHoursFormValues)[] = [
      'mondayHours',
      'tuesdayHours',
      'wednesdayHours',
      'thursdayHours',
      'fridayHours',
      'saturdayHours',
      'sundayHours'
    ]
    const nums = keys.map(k => {
      const v = watchedValues?.[k]
      if (v === '' || v === null || v === undefined) return NaN
      const n = Number(v)
      return Number.isFinite(n) ? n : NaN
    })
    const valid = nums.every(n => Number.isFinite(n) && n >= minHours && n <= maxHours)
    if (!valid) return { weeklySum: undefined, workingDays: undefined, fte: undefined, areAllDaysValid: false }
    const sum = nums.reduce((acc, n) => acc + (Number.isFinite(n) ? n : 0), 0)
    const days = nums.filter(n => Number.isFinite(n) && n > 0).length
    const raw = Math.round((sum / 40) * 10) / 10
    const fteVal = Math.min(Math.max(parseFloat(raw.toFixed(1)), 0), 1)
    return { weeklySum: sum, workingDays: days, fte: fteVal, areAllDaysValid: true }
  }, [watchedValues])

  const exceedsWeeklyLimit = (weeklySum ?? 0) > 48
  const exceedsWorkingDaysLimit = (workingDays ?? 0) > 6
  const isEmployeeSelectionMissing = !isFixedEmployeeId && !selectedEmployeeId

  const firstDayErrorMessage = (() => {
    for (const { key } of dayOrder) {
      const msg = form.formState.errors[key]?.message as string | undefined
      if (msg) return msg
    }
    return undefined
  })()

  const renderEmployeeHeader = () => {
    if (loading) {
      return (
        <div className="gba:flex gba:items-center gba:gap-2">
          <Spinner size="sm" />
          <div>
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:employee_termination.load_employee_text',
              'Loading employee info...'
            )}
          </div>
        </div>
      )
    }
    if (error) {
      return <div className="gba:text-destructive">{error}</div>
    }
    if (!isFixedEmployeeId) {
      return (
        <div className="gba:w-full" data-testid="flw_updateWorkingHours_employeeLayout">
          {employee && (
            <div className="gba:flex gba:items-center gba:mb-4" data-testid="flw_updateWorkingHours_personData">
              <Avatar size="xl" className="gba:size-16">
                {employee.pictureThumbnail ? (
                  <AvatarImage
                    src={`data:image/gif;base64,${employee.pictureThumbnail}`}
                    alt={getTranslationFromI18nKeyAndLabel(
                      'lowcoder:employee_termination.employee_avatar_alt_text',
                      'Employee photo'
                    )}
                    data-testid="flw_updateWorkingHours_employeeImage"
                  />
                ) : (
                  <AvatarFallback>{`${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`}</AvatarFallback>
                )}
              </Avatar>
              <div className="gba:ml-2">
                <div
                  className="gba:font-semibold"
                  data-testid="flw_updateWorkingHours_employeeName"
                >{`${employee.firstName || ''} ${employee.lastName || ''}`}</div>
                <div data-testid="flw_updateWorkingHours_employeeJobPosition">
                  {employee.employeePosition?.jobPosition?.name}
                </div>
              </div>
            </div>
          )}
          <div className="gba:font-semibold gba:mb-2">
            {getTranslationFromI18nKeyAndLabel('lowcoder:working_hours_form.employee_label', 'Employee')}
            <span className="gba:text-destructive"> *</span>
          </div>
          <div data-testid="flw_updateWorkingHours_allEmployeesData">
            <Select value={selectedEmployeeId} onValueChange={v => setSelectedEmployeeId(v)}>
              <SelectTrigger className="gba:w-full" data-testid="flw_updateWorkingHours_allEmployees">
                <SelectValue
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    'lowcoder:working_hours_form.employee_placeholder',
                    'Select...'
                  )}
                />
              </SelectTrigger>
              <SelectContent>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>{`${emp.firstName || ''} ${emp.lastName || ''}`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isEmployeeSelectionMissing && (
            <div className="gba:mt-2 gba:text-destructive" data-testid="working-hours-employee-select-error">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:working_hours_form.employee_validation_message',
                'The Employee field is required. Please select an employee.'
              )}
            </div>
          )}
        </div>
      )
    }
    if (!employee) {
      return (
        <div>
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:employee_termination.no_data_found_text',
            'No employee data found'
          )}
        </div>
      )
    }
    return (
      <div className="gba:flex gba:items-center" data-testid="flw_updateWorkingHours_personData">
        <Avatar size="xl" className="gba:size-16">
          {employee.pictureThumbnail ? (
            <AvatarImage
              src={`data:image/gif;base64,${employee.pictureThumbnail}`}
              alt={getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_termination.employee_avatar_alt_text',
                'Employee photo'
              )}
              data-testid="flw_updateWorkingHours_employeeImage"
            />
          ) : (
            <AvatarFallback>{`${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`}</AvatarFallback>
          )}
        </Avatar>
        <div className="gba:ml-2">
          <div
            className="gba:font-semibold"
            data-testid="flw_updateWorkingHours_employeeName"
          >{`${employee.firstName || ''} ${employee.lastName || ''}`}</div>
          <div data-testid="flw_updateWorkingHours_employeeJobPosition">
            {employee.employeePosition?.jobPosition?.name}
          </div>
        </div>
      </div>
    )
  }

  return (
    <AppActionForm
      processType="update"
      form={form as any}
      formData={defaults || {}}
      submitEventType="pse_submit"
      cancelEventType="pse_abort"
      submitButtonTestId="flw_updateWorkingHours_submitBtn"
      cancelButtonTestId="flw_updateWorkingHours_cancelBtn"
      submitButtonText={getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.submit', 'Submit')}
      cancelButtonText={getTranslationFromI18nKeyAndLabel(
        'lowcoder:create_expense_request.initiate_cancel_button',
        'Cancel'
      )}
      isSubmitDisabled={
        !form.formState.isValid ||
        !areAllDaysValid ||
        Boolean(firstDayErrorMessage) ||
        !form.formState.isDirty ||
        exceedsWeeklyLimit ||
        exceedsWorkingDaysLimit ||
        isEmployeeSelectionMissing
      }
      data-testid="change-working-hours-form"
      onSubmit={async (values: WorkingHoursFormValues) => {
        const payload = buildSubmitPayload(values, {
          weeklySum: typeof weeklySum === 'number' ? weeklySum : 0,
          workingDays: typeof workingDays === 'number' ? workingDays : 0,
          fte: typeof fte === 'number' ? fte : 0
        })
        return {
          ...payload
        }
      }}
    >
      <div
        className="gba:flex-1 gba:flex gba:flex-col gba:justify-between"
        data-testid="flw_updateWorkingHours_mainContainer"
      >
        <div>
          <div className="gba:flex gba:items-center gba:mb-6">{renderEmployeeHeader()}</div>
          <div className="gba:border-t gba:mb-6" />

          <div
            className="gba:grid gba:grid-cols-2 gba:sm:grid-cols-3 gba:md:grid-cols-4 gba:lg:grid-cols-7 gba:gap-4"
            data-testid="flw_updateWorkingHours_columnLayout"
          >
            {dayOrder.map(({ key }) => {
              const label = dayLabel(key)
              const hasError = Boolean(form.formState.errors[key])
              return (
                <div
                  key={key}
                  className="gba:flex gba:flex-col gba:items-start gba:space-y-2"
                  data-testid={`working-hours-${key}`}
                >
                  <label className="gba:block gba:font-semibold">
                    {label}
                    <span className="gba:text-destructive"> *</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className={`gba:w-12 gba:h-12 gba:border ${hasError ? 'gba:border-destructive' : 'gba:border-input'} gba:rounded-md gba:text-center gba:text-base gba:shrink-0`}
                    aria-invalid={hasError}
                    aria-label={label}
                    defaultValue={defaults ? (defaults[key] as number) : undefined}
                    data-testid={dayInputTestIds[key]}
                    onChange={e => {
                      const raw = e.target.value
                      const numericOrEmpty: number | '' = raw === '' ? '' : Number(raw)
                      form.setValue(key, numericOrEmpty as any, { shouldValidate: true, shouldDirty: true })
                      const val = numericOrEmpty
                      if (
                        val === '' ||
                        Number.isNaN(val as any) ||
                        (val as number) < minHours ||
                        (val as number) > maxHours
                      ) {
                        form.setError(key, { type: 'validate', message: buildErrorMessage(key) })
                      } else {
                        form.clearErrors(key)
                      }
                    }}
                    onBlur={e => {
                      const raw = e.currentTarget.value
                      const val: number | '' = raw === '' ? '' : Number(raw)
                      if (
                        val === '' ||
                        Number.isNaN(val as any) ||
                        (val as number) < minHours ||
                        (val as number) > maxHours
                      ) {
                        form.setError(key, { type: 'validate', message: buildErrorMessage(key) })
                      } else {
                        form.clearErrors(key)
                      }
                    }}
                  />
                </div>
              )
            })}
          </div>

          <div
            className={`${firstDayErrorMessage ? 'gba:mt-2' : ''} gba:flex gba:flex-col gba:gap-2`}
            data-testid="working-hours-errors"
          >
            {firstDayErrorMessage ? (
              <div
                className="gba:text-destructive gba:text-sm"
                data-testid="flw_updateWorkingHours_dailyHoursValidationMessage"
              >
                {firstDayErrorMessage}
              </div>
            ) : null}
          </div>

          <WorkingHoursSummary
            fte={areAllDaysValid ? fte : undefined}
            weeklySum={areAllDaysValid ? weeklySum : undefined}
            workingDays={areAllDaysValid ? workingDays : undefined}
            exceedsWeeklyLimit={areAllDaysValid && exceedsWeeklyLimit}
            exceedsWorkingDaysLimit={areAllDaysValid && exceedsWorkingDaysLimit}
          />
        </div>
      </div>
    </AppActionForm>
  )
}

export default ChangeWorkingHoursForm
