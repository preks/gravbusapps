import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import FormHeader from '../components/FormHeader'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { useForm } from 'react-hook-form'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { EMPLOYEE_DATA_QUERY, ALL_EMPLOYEE_DATA_QUERY } from './ChangeWorkingHoursQueries'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Spinner,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@newwork/nw-design-system'

type DayKey =
  | 'mondayHours'
  | 'tuesdayHours'
  | 'wednesdayHours'
  | 'thursdayHours'
  | 'fridayHours'
  | 'saturdayHours'
  | 'sundayHours'

interface WorkingHoursFormValues {
  mondayHours: number | ''
  tuesdayHours: number | ''
  wednesdayHours: number | ''
  thursdayHours: number | ''
  fridayHours: number | ''
  saturdayHours: number | ''
  sundayHours: number | ''
}

const dayOrder: Array<{ key: DayKey; labelKey: string; fallback: string }> = [
  { key: 'mondayHours', labelKey: 'lowcoder:absence_hub.day_mon', fallback: 'Mon' },
  { key: 'tuesdayHours', labelKey: 'lowcoder:absence_hub.day_tue', fallback: 'Tue' },
  { key: 'wednesdayHours', labelKey: 'lowcoder:absence_hub.day_wed', fallback: 'Wed' },
  { key: 'thursdayHours', labelKey: 'lowcoder:absence_hub.day_thu', fallback: 'Thu' },
  { key: 'fridayHours', labelKey: 'lowcoder:absence_hub.day_fri', fallback: 'Fri' },
  { key: 'saturdayHours', labelKey: 'lowcoder:absence_hub.day_sat', fallback: 'Sat' },
  { key: 'sundayHours', labelKey: 'lowcoder:absence_hub.day_sun', fallback: 'Sun' }
]

// Full weekday names for error messages
const fullDayLabels: Record<DayKey, { labelKey: string; fallback: string }> = {
  mondayHours: { labelKey: 'lowcoder:weekdays.monday', fallback: 'Monday' },
  tuesdayHours: { labelKey: 'lowcoder:weekdays.tuesday', fallback: 'Tuesday' },
  wednesdayHours: { labelKey: 'lowcoder:weekdays.wednesday', fallback: 'Wednesday' },
  thursdayHours: { labelKey: 'lowcoder:weekdays.thursday', fallback: 'Thursday' },
  fridayHours: { labelKey: 'lowcoder:weekdays.friday', fallback: 'Friday' },
  saturdayHours: { labelKey: 'lowcoder:weekdays.saturday', fallback: 'Saturday' },
  sundayHours: { labelKey: 'lowcoder:weekdays.sunday', fallback: 'Sunday' }
}

const minHours = 0
const maxHours = 10

export const ChangeWorkingHours: React.FC<BusinessAppContextProps> = context => {
  const { accessToken, additionalData, userInfo } = context
  const graphql = useGraphqlClient(accessToken)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [employee, setEmployee] = useState<any | null>(null)
  const [defaults, setDefaults] = useState<WorkingHoursFormValues | null>(null)
  const [existingWorkingMeta, setExistingWorkingMeta] = useState<{
    id?: string
    version?: number
    remoteRef?: string
  } | null>(null)
  const [employees, setEmployees] = useState<Array<{ id: string; firstName: string; lastName: string }>>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')

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

  const employeeId = useMemo(() => {
    // Prefer process payload; fallback to additionalData initialParameters
    return (
      additionalData?.employeeId ||
      additionalData?.psi_taskPayload?.employeeId ||
      additionalData?.psi_taskPayload?.initialParameters?.employeeId ||
      userInfo?.employeeDetails?.employeeId ||
      ''
    )
  }, [additionalData])

  const activeEmployeeId = useMemo(() => employeeId || selectedEmployeeId, [employeeId, selectedEmployeeId])
  const isFixedEmployeeId = useMemo(() => Boolean(employeeId && String(employeeId).trim().length > 0), [employeeId])

  const loadEmployee = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const query = EMPLOYEE_DATA_QUERY
      const res: any = await graphql.request(query as any, { employeeId: activeEmployeeId })
      const emp = res?.Employee?.[0]
      const working = res?.employee?.[0]?.workingHours?.[0]
      setEmployee(emp)
      const d: WorkingHoursFormValues = {
        mondayHours: (working?.mondayHours ?? 0) as number,
        tuesdayHours: (working?.tuesdayHours ?? 0) as number,
        wednesdayHours: (working?.wednesdayHours ?? 0) as number,
        thursdayHours: (working?.thursdayHours ?? 0) as number,
        fridayHours: (working?.fridayHours ?? 0) as number,
        saturdayHours: (working?.saturdayHours ?? 0) as number,
        sundayHours: (working?.sundayHours ?? 0) as number
      }
      setDefaults(d)
      form.reset(d)
      setExistingWorkingMeta({ id: working?.id, version: working?.version, remoteRef: working?.remoteRef })
    } catch (e: any) {
      setError(
        e?.message ||
          getTranslationFromI18nKeyAndLabel('lowcoder:employee_termination.error_load_title', 'Error Loading Employee')
      )
    } finally {
      setLoading(false)
    }
  }, [activeEmployeeId, graphql, form])

  const loadAllEmployees = useCallback(async () => {
    try {
      const res: any = await graphql.request(ALL_EMPLOYEE_DATA_QUERY as any, {
        userId: userInfo?.id || '',
        structureId: getCurrentActiveStructureId()
      })
      const list = res?.allEmployees || []
      setEmployees(list)
    } catch {
      setEmployees([])
    }
  }, [graphql, userInfo])

  useEffect(() => {
    if (activeEmployeeId) {
      loadEmployee()
    } else {
      // Initialize zero defaults when no fixed id and no selection yet
      const zeroDefaults: WorkingHoursFormValues = {
        mondayHours: 0,
        tuesdayHours: 0,
        wednesdayHours: 0,
        thursdayHours: 0,
        fridayHours: 0,
        saturdayHours: 0,
        sundayHours: 0
      }
      setEmployee(null)
      setExistingWorkingMeta(null)
      setDefaults(zeroDefaults)
      form.reset(zeroDefaults)
      setLoading(false)
      if (!isFixedEmployeeId) {
        loadAllEmployees()
      }
    }
  }, [activeEmployeeId, loadEmployee, loadAllEmployees, isFixedEmployeeId])

  const title = useMemo(
    () =>
      getTranslationFromI18nKeyAndLabel(
        'lowcoder:working_hours_form.update_working_hours_title',
        'Update Working Hours'
      ),
    []
  )

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
        <div className="gba:w-full">
          {employee && (
            <div className="gba:flex gba:items-center gba:mb-4">
              <Avatar size="xl" className="gba:size-16">
                {employee.pictureThumbnail ? (
                  <AvatarImage
                    src={`data:image/gif;base64,${employee.pictureThumbnail}`}
                    alt={getTranslationFromI18nKeyAndLabel(
                      'lowcoder:employee_termination.employee_avatar_alt_text',
                      'Employee photo'
                    )}
                  />
                ) : (
                  <AvatarFallback>{`${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`}</AvatarFallback>
                )}
              </Avatar>
              <div className="gba:ml-2">
                <div className="gba:font-semibold">{`${employee.firstName || ''} ${employee.lastName || ''}`}</div>
                <div>{employee.employeePosition?.jobPosition?.name}</div>
              </div>
            </div>
          )}
          <div className="gba:font-semibold gba:mb-2">
            {getTranslationFromI18nKeyAndLabel('lowcoder:working_hours_form.employee_label', 'Employee')}
          </div>
          <Select value={selectedEmployeeId} onValueChange={v => setSelectedEmployeeId(v)}>
            <SelectTrigger className="gba:w-full" data-testid="working-hours-employee-select">
              <SelectValue
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:working_hours_form.employee_placeholder',
                  'Select an employee'
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
      )
    }
    // Fixed employee id: show employee info only
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
      <>
        <Avatar size="xl" className="gba:size-16">
          {employee.pictureThumbnail ? (
            <AvatarImage
              src={`data:image/gif;base64,${employee.pictureThumbnail}`}
              alt={getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_termination.employee_avatar_alt_text',
                'Employee photo'
              )}
            />
          ) : (
            <AvatarFallback>{`${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`}</AvatarFallback>
          )}
        </Avatar>
        <div className="gba:ml-2">
          <div className="gba:font-semibold">{`${employee.firstName || ''} ${employee.lastName || ''}`}</div>
          <div>{employee.employeePosition?.jobPosition?.name}</div>
        </div>
      </>
    )
  }

  const dayLabel = (key: DayKey): string => {
    const config = dayOrder.find(d => d.key === key)!
    return getTranslationFromI18nKeyAndLabel(config.labelKey, config.fallback)
  }

  const fullDayLabel = (key: DayKey): string => {
    const cfg = fullDayLabels[key]
    return getTranslationFromI18nKeyAndLabel(cfg.labelKey, cfg.fallback)
  }

  const buildErrorMessage = (key: DayKey) =>
    getTranslationFromI18nKeyAndLabel(
      'lowcoder:working_hours_form.day_missing_value_validation_error',
      `Please enter a valid number of hours (0 - 10) for ${fullDayLabel(key)}.`,
      { dayName: fullDayLabel(key), interpolation: { escapeValue: false } }
    )

  // Derived values for summary widgets
  const watchedValues = form.watch() as Partial<WorkingHoursFormValues>
  const { weeklySum, workingDays, fte, areAllDaysValid } = useMemo(() => {
    const keys: DayKey[] = [
      'mondayHours',
      'tuesdayHours',
      'wednesdayHours',
      'thursdayHours',
      'fridayHours',
      'saturdayHours',
      'sundayHours'
    ]
    const nums = keys.map(k => {
      const v = (watchedValues as any)?.[k]
      if (v === '' || v === null || v === undefined) return NaN
      const n = Number(v)
      return Number.isFinite(n) ? n : NaN
    })

    const valid = nums.every(n => Number.isFinite(n) && n >= minHours && n <= maxHours)
    if (!valid) {
      return { weeklySum: undefined, workingDays: undefined, fte: undefined, areAllDaysValid: false }
    }
    const sum = nums.reduce((acc, n) => acc + (Number.isFinite(n) ? n : 0), 0)
    const days = nums.filter(n => Number.isFinite(n) && n > 0).length
    const raw = Math.round((sum / 40) * 10) / 10
    const fteVal = Math.min(Math.max(parseFloat(raw.toFixed(1)), 0), 1)
    return { weeklySum: sum, workingDays: days, fte: fteVal, areAllDaysValid: true }
  }, [watchedValues])

  const exceedsWeeklyLimit = (weeklySum ?? 0) > 48
  const exceedsWorkingDaysLimit = (workingDays ?? 0) > 6

  return (
    <div className="gba:bg-card gba:rounded-2xl gba:flex gba:flex-col gba:min-h-[600px] gba:p-0 gba:[&>div[data-testid='change-working-hours-form']]:!pt-0">
      <FormHeader title={title} flowIconUrl={flowIconUrl} className="gba:px-6" />

      <AppActionForm
        processType="update"
        form={form as any}
        formData={defaults || {}}
        submitEventType="pse_submit"
        cancelEventType="pse_abort"
        submitButtonText={getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.submit', 'Submit')}
        cancelButtonText={getTranslationFromI18nKeyAndLabel(
          'lowcoder:create_expense_request.initiate_cancel_button',
          'Cancel'
        )}
        isSubmitDisabled={!form.formState.isValid || !areAllDaysValid || exceedsWeeklyLimit || exceedsWorkingDaysLimit}
        data-testid="change-working-hours-form"
        onSubmit={async (values: WorkingHoursFormValues) => {
          const idForSubmit = activeEmployeeId
          const weeklySumVal = typeof weeklySum === 'number' ? weeklySum : 0
          const workingDaysVal = typeof workingDays === 'number' ? workingDays : 0
          const fteVal = typeof fte === 'number' ? fte : 0

          const workingHours = existingWorkingMeta || {}

          if ((workingHours as any)?.id !== undefined && (workingHours as any)?.version !== undefined) {
            return {
              employeeWorkingHours: {
                id: (workingHours as any)?.id,
                version: (workingHours as any)?.version,
                employeeId: idForSubmit,
                weeklyHours: weeklySumVal,
                weeklyDays: workingDaysVal,
                fullTimeWeeklyHours: 40,
                fullTimeEquivalent: fteVal,
                mondayHours: Number(values.mondayHours || 0),
                tuesdayHours: Number(values.tuesdayHours || 0),
                wednesdayHours: Number(values.wednesdayHours || 0),
                thursdayHours: Number(values.thursdayHours || 0),
                fridayHours: Number(values.fridayHours || 0),
                saturdayHours: Number(values.saturdayHours || 0),
                sundayHours: Number(values.sundayHours || 0),
                remoteRef: (workingHours as any)?.remoteRef ? (workingHours as any)?.remoteRef : ''
              },
              event: 'pse_submit'
            }
          } else {
            return {
              employeeWorkingHours: {
                employeeId: idForSubmit,
                weeklyHours: weeklySumVal,
                weeklyDays: workingDaysVal,
                fullTimeWeeklyHours: 40,
                fullTimeEquivalent: fteVal,
                mondayHours: Number(values.mondayHours || 0),
                tuesdayHours: Number(values.tuesdayHours || 0),
                wednesdayHours: Number(values.wednesdayHours || 0),
                thursdayHours: Number(values.thursdayHours || 0),
                fridayHours: Number(values.fridayHours || 0),
                saturdayHours: Number(values.saturdayHours || 0),
                sundayHours: Number(values.sundayHours || 0),
                remoteRef: (workingHours as any)?.remoteRef ? (workingHours as any)?.remoteRef : ''
              },
              event: 'pse_submit'
            }
          }
        }}
      >
        <div className="gba:flex-1 gba:flex gba:flex-col gba:justify-between">
          <div className="gba:pt-4">
            <div className="gba:flex gba:items-center gba:mb-6">{renderEmployeeHeader()}</div>

            {/* Inputs for each day */}
            <div className="gba:grid gba:grid-cols-2 gba:sm:grid-cols-3 gba:md:grid-cols-4 gba:lg:grid-cols-7 gba:gap-4">
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
                      onChange={e => {
                        const raw = e.target.value
                        const num = raw === '' ? '' : Number(raw)
                        form.setValue(key, num as any, { shouldValidate: true, shouldDirty: true })
                        // immediate validation on change
                        const val = raw === '' ? '' : Number(raw)
                        if (val === '' || Number.isNaN(val) || val < minHours || val > maxHours) {
                          form.setError(key, { type: 'validate', message: buildErrorMessage(key) })
                        } else {
                          form.clearErrors(key)
                        }
                      }}
                      onBlur={e => {
                        const raw = e.currentTarget.value
                        const val = raw === '' ? '' : Number(raw)
                        if (val === '' || Number.isNaN(val) || val < minHours || val > maxHours) {
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
            {/* Errors list under the entire section (one row per error) */}
            <div className="gba:mt-2 gba:flex gba:flex-col gba:gap-2" data-testid="working-hours-errors">
              {dayOrder.map(({ key }) => {
                const fieldError = form.formState.errors[key]?.message as string | undefined
                return fieldError ? (
                  <div key={`err-${key}`} className="gba:text-destructive gba:text-sm" data-testid={`error-${key}`}>
                    {fieldError}
                  </div>
                ) : null
              })}
            </div>

            {/* Display rows (one per row with label above the value) */}
            <div className="gba:mt-6 gba:flex gba:flex-col gba:gap-6" data-testid="working-hours-summary">
              {/* FTE */}
              <div data-testid="working-hours-fte">
                <div className="gba:font-semibold gba:mb-2">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:working_hours_form.fte_label',
                    'FTE (Full Time Equivalent)'
                  )}
                </div>
                <div className="gba:bg-muted gba:rounded-md gba:p-4 gba:text-base">
                  {areAllDaysValid && typeof fte === 'number' ? fte : '-'}
                </div>
              </div>

              {/* Weekly Working Hours */}
              <div data-testid="working-hours-weekly-hours">
                <div className="gba:font-semibold gba:mb-2">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:working_hours_form.weekly_working_hours_label',
                    'Weekly Working Hours'
                  )}
                </div>
                <div className="gba:bg-muted gba:rounded-md gba:p-4 gba:text-base">
                  {areAllDaysValid && typeof weeklySum === 'number' ? weeklySum : '-'}
                </div>
                {areAllDaysValid && exceedsWeeklyLimit && (
                  <div className="gba:mt-2 gba:text-destructive" data-testid="working-hours-weekly-hours-warning">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:working_hours_form.working_hours_limit_exceeded_error',
                      'Warning: The total hours entered exceed the maximum allowable limit of 48 hours per week. Please adjust your working hours to comply with legal regulations.'
                    )}
                  </div>
                )}
              </div>

              {/* Working Days / Week */}
              <div data-testid="working-hours-working-days">
                <div className="gba:font-semibold gba:mb-2">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:working_hours_form.working_days_week_label',
                    'Working Days / Week'
                  )}
                </div>
                <div className="gba:bg-muted gba:rounded-md gba:p-4 gba:text-base">
                  {areAllDaysValid && typeof workingDays === 'number' ? workingDays : '-'}
                </div>
                {areAllDaysValid && exceedsWorkingDaysLimit && (
                  <div className="gba:mt-2 gba:text-destructive" data-testid="working-hours-working-days-warning">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:working_hours_form.working_days_limit_exceeded_error',
                      'Warning: The total days entered exceed the maximum allowable limit of 6 days per week. Please adjust your working days to comply with legal regulations.'
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </AppActionForm>
    </div>
  )
}

export default ChangeWorkingHours
