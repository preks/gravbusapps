import React, { useEffect, useMemo, useRef, useState } from 'react'
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
import {
  useChangeWorkingHoursContext,
  type EmployeeLite,
  type WorkingHoursValidationRecord
} from '../context/ChangeWorkingHoursContext'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Button,
  DateInput,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../../../apps/employee-record/_i18n'

type WorkingHoursMode = 'standard' | 'custom' | null
type DateInputValue = string | [string | null, string | null] | null
const PROCESS_PENDING_TIMEOUT_MS = 12000

const standardFullTimeValues: WorkingHoursFormValues = {
  activeFrom: '',
  activeTo: '',
  mondayHours: 8,
  tuesdayHours: 8,
  wednesdayHours: 8,
  thursdayHours: 8,
  fridayHours: 8,
  saturdayHours: 0,
  sundayHours: 0
}

function formatHoursInputValue(value: number | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return ''
  }
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100)
}

function parsePositiveNumber(value: string): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

const getDateInputValue = (value?: string): string | undefined => value || undefined

const toDateInputValue = (value: string): string => {
  const timestampIndex = value.indexOf('T')
  return timestampIndex === -1 ? value : value.substring(0, timestampIndex)
}

const getSingleDateValue = (value: DateInputValue): string => (typeof value === 'string' ? toDateInputValue(value) : '')

const formatDateAsDateInputValue = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const normalizeDateInputValue = (value: string): string | null => {
  const dateValue = toDateInputValue(value).trim()

  if (!dateValue) {
    return ''
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return Number.isNaN(Date.parse(dateValue)) ? null : dateValue
  }

  const timestamp = Date.parse(dateValue)
  return Number.isNaN(timestamp) ? null : formatDateAsDateInputValue(new Date(timestamp))
}

const isDateBefore = (dateValue?: string, comparisonValue?: string): boolean => {
  if (!dateValue || !comparisonValue) {
    return false
  }

  const dateTimestamp = Date.parse(dateValue)
  const comparisonTimestamp = Date.parse(comparisonValue)

  return Number.isFinite(dateTimestamp) && Number.isFinite(comparisonTimestamp) && dateTimestamp < comparisonTimestamp
}

const getDateTimestamp = (value?: string | null): number | null => {
  if (!value) {
    return null
  }

  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? null : timestamp
}

const hasWorkingHoursDateRange = (record: WorkingHoursValidationRecord): boolean =>
  getDateTimestamp(record.activeFrom) !== null || getDateTimestamp(record.activeTo) !== null

const hasActivePeriodOverlap = (
  submittedRecord: { id?: string; activeFrom?: string; activeTo?: string },
  existingRecord: WorkingHoursValidationRecord,
  changeMode: 'UPDATE' | 'INSERT'
): boolean => {
  if (submittedRecord.id && existingRecord.id === submittedRecord.id) {
    return false
  }

  if (!hasWorkingHoursDateRange(existingRecord)) {
    return false
  }

  const submittedFrom = getDateTimestamp(submittedRecord.activeFrom)
  const submittedTo = getDateTimestamp(submittedRecord.activeTo) ?? Number.POSITIVE_INFINITY
  const existingFrom = getDateTimestamp(existingRecord.activeFrom) ?? Number.NEGATIVE_INFINITY
  const existingTo = getDateTimestamp(existingRecord.activeTo) ?? Number.POSITIVE_INFINITY

  if (submittedFrom === null) {
    return false
  }

  const isReplacingOpenEndedRecord =
    changeMode === 'INSERT' &&
    !submittedRecord.activeTo &&
    !existingRecord.activeTo &&
    existingFrom !== Number.NEGATIVE_INFINITY &&
    submittedFrom > existingFrom

  if (isReplacingOpenEndedRecord) {
    return false
  }

  return submittedFrom <= existingTo && existingFrom <= submittedTo
}

function deriveWeeklySummary(values: WorkingHoursFormValues): { weeklyHours: number; workingDays: number } {
  const hours = dayOrder.map(({ key }) => Number(values[key] || 0)).filter(value => Number.isFinite(value))
  return {
    weeklyHours: hours.reduce((sum, value) => sum + value, 0),
    workingDays: hours.filter(value => value > 0).length
  }
}

const getEmployeeJobPositionName = (employee?: EmployeeLite | null): string | undefined => {
  const employeePosition = Array.isArray(employee?.employeePosition)
    ? employee?.employeePosition[0]
    : employee?.employeePosition

  return employeePosition?.jobPosition?.name
}

export const ChangeWorkingHoursForm: React.FC = () => {
  const { t } = useTranslation(translations)
  const {
    employee,
    employees,
    defaults,
    employeeHireDate,
    isFirstWorkingHoursEntry,
    existingWorkingMeta,
    workingHoursValidationRecords,
    selectedEmployeeId,
    setSelectedEmployeeId,
    isFixedEmployeeId,
    loading,
    error,
    changeMode,
    buildSubmitPayload
  } = useChangeWorkingHoursContext()
  const [mode, setMode] = useState<WorkingHoursMode>(null)
  const [weeklyHoursInput, setWeeklyHoursInput] = useState('0')
  const [workingDaysInput, setWorkingDaysInput] = useState('0')
  const [hasInteractedWithWorkingTime, setHasInteractedWithWorkingTime] = useState(false)
  const [isProcessPending, setIsProcessPending] = useState(false)
  const [activeFromDraft, setActiveFromDraft] = useState('')
  const processPendingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isActiveFromLockedToHireDate = isFirstWorkingHoursEntry && Boolean(employeeHireDate)

  const form = useForm<WorkingHoursFormValues>({
    defaultValues: {
      activeFrom: '',
      activeTo: '',
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
      const summary = deriveWeeklySummary(defaults)
      setMode(existingWorkingMeta?.id ? 'custom' : null)
      setWeeklyHoursInput(formatHoursInputValue(summary.weeklyHours))
      setWorkingDaysInput(formatHoursInputValue(summary.workingDays))
      setHasInteractedWithWorkingTime(false)
      setActiveFromDraft(defaults.activeFrom || '')
    }
  }, [defaults, existingWorkingMeta?.id, form])

  useEffect(() => {
    if (!isActiveFromLockedToHireDate) {
      return
    }

    form.setValue('activeFrom', employeeHireDate, { shouldDirty: false, shouldValidate: true })
    setActiveFromDraft(employeeHireDate)
  }, [employeeHireDate, form, isActiveFromLockedToHireDate])

  useEffect(() => {
    return () => {
      if (processPendingTimeoutRef.current) {
        clearTimeout(processPendingTimeoutRef.current)
      }
    }
  }, [])

  const clearProcessPending = () => {
    if (processPendingTimeoutRef.current) {
      clearTimeout(processPendingTimeoutRef.current)
      processPendingTimeoutRef.current = null
    }
    setIsProcessPending(false)
  }

  const showProcessPending = () => {
    if (processPendingTimeoutRef.current) {
      clearTimeout(processPendingTimeoutRef.current)
    }

    setIsProcessPending(true)
    processPendingTimeoutRef.current = setTimeout(() => {
      processPendingTimeoutRef.current = null
      setIsProcessPending(false)
    }, PROCESS_PENDING_TIMEOUT_MS)
  }

  const setDailyHours = (values: WorkingHoursFormValues) => {
    for (const { key } of dayOrder) {
      form.setValue(key, values[key], { shouldValidate: true, shouldDirty: true })
      form.clearErrors(key)
    }
  }

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
  const isActiveFromMissing = !watchedValues?.activeFrom
  const isActiveToBeforeActiveFrom = isDateBefore(watchedValues?.activeTo, watchedValues?.activeFrom)
  const isActiveFromBeforeHireDate = isDateBefore(activeFromDraft || watchedValues?.activeFrom, employeeHireDate)
  const activeFromBeforeHireDateMessage = t('working-hours-active-from-before-hire-date-warning')
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
  const hasPositiveWorkingDay = (workingDays ?? 0) > 0
  const isEmployeeSelectionMissing = !isFixedEmployeeId && !selectedEmployeeId
  const activePeriodOverlapError = useMemo(() => {
    const submittedRecord = {
      id: changeMode === 'UPDATE' ? existingWorkingMeta?.id : undefined,
      activeFrom: watchedValues?.activeFrom,
      activeTo: watchedValues?.activeTo
    }
    const hasOverlap = workingHoursValidationRecords.some(record =>
      hasActivePeriodOverlap(submittedRecord, record, changeMode)
    )

    return hasOverlap ? t('working-hours-active-period-overlap') : undefined
  }, [
    changeMode,
    existingWorkingMeta?.id,
    t,
    watchedValues?.activeFrom,
    watchedValues?.activeTo,
    workingHoursValidationRecords
  ])
  const parsedWeeklyHoursInput = parsePositiveNumber(weeklyHoursInput)
  const parsedWorkingDaysInput = parsePositiveNumber(workingDaysInput)
  const canDistributeEvenly =
    parsedWeeklyHoursInput != null &&
    parsedWorkingDaysInput != null &&
    parsedWorkingDaysInput <= dayOrder.length &&
    parsedWeeklyHoursInput / parsedWorkingDaysInput <= maxHours

  useEffect(() => {
    if (mode !== 'custom' || !hasInteractedWithWorkingTime) {
      return
    }

    setWeeklyHoursInput(formatHoursInputValue(areAllDaysValid ? weeklySum : undefined))
    setWorkingDaysInput(formatHoursInputValue(areAllDaysValid ? workingDays : undefined))
  }, [areAllDaysValid, hasInteractedWithWorkingTime, mode, weeklySum, workingDays])

  const applyStandardFullTime = () => {
    setMode('standard')
    setHasInteractedWithWorkingTime(true)
    setWeeklyHoursInput('40')
    setWorkingDaysInput('5')
    setDailyHours(standardFullTimeValues)
  }

  const enableCustomByDay = () => {
    setMode('custom')
    if (defaults) {
      const summary = deriveWeeklySummary(defaults)
      setDailyHours(defaults)
      setWeeklyHoursInput(formatHoursInputValue(summary.weeklyHours))
      setWorkingDaysInput(formatHoursInputValue(summary.workingDays))
      setHasInteractedWithWorkingTime(false)
    }
  }

  const distributeEvenly = () => {
    if (parsedWeeklyHoursInput == null || parsedWorkingDaysInput == null) {
      return
    }

    const daysToFill = Math.min(Math.floor(parsedWorkingDaysInput), dayOrder.length)
    const hoursPerDay = Math.round((parsedWeeklyHoursInput / daysToFill) * 100) / 100
    const distributed = dayOrder.reduce<WorkingHoursFormValues>(
      (acc, { key }, index) => {
        acc[key] = index < daysToFill ? hoursPerDay : 0
        return acc
      },
      {
        activeFrom: form.getValues('activeFrom') || '',
        activeTo: form.getValues('activeTo') || ''
      } as WorkingHoursFormValues
    )

    setMode('custom')
    setHasInteractedWithWorkingTime(true)
    setDailyHours(distributed)
  }

  const firstDayErrorMessage = (() => {
    for (const { key } of dayOrder) {
      const msg = form.formState.errors[key]?.message as string | undefined
      if (msg) return msg
    }
    return undefined
  })()

  const validateWorkingHoursForm = (values: WorkingHoursFormValues): string[] | null => {
    if (!values.activeFrom) {
      return [
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:working_hours_form.active_from_required',
          'Active From is required.'
        )
      ]
    }

    if (isDateBefore(values.activeFrom, employeeHireDate)) {
      return [activeFromBeforeHireDateMessage]
    }

    if (isDateBefore(values.activeTo, values.activeFrom)) {
      return [
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:working_hours_form.active_to_before_active_from',
          'Active To cannot be before Active From.'
        )
      ]
    }

    const hasAtLeastOneWorkingDay = dayOrder.some(({ key }) => Number(values[key] || 0) > 0)
    if (!hasAtLeastOneWorkingDay) {
      return [t('working-hours-at-least-one-working-day-required')]
    }

    const submittedRecord = {
      id: changeMode === 'UPDATE' ? existingWorkingMeta?.id : undefined,
      activeFrom: values.activeFrom,
      activeTo: values.activeTo
    }
    const hasOverlap = workingHoursValidationRecords.some(record =>
      hasActivePeriodOverlap(submittedRecord, record, changeMode)
    )

    if (hasOverlap) {
      return [
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:working_hours_form.active_period_overlap',
          'Employee working hours active period overlaps with an existing working hours entry.'
        )
      ]
    }

    return null
  }

  const renderModeButton = (value: WorkingHoursMode, label: string, description: string, onClick: () => void) => {
    const selected = mode === value
    return (
      <button
        type="button"
        className={`gba:flex gba:flex-1 gba:flex-col gba:items-start gba:gap-1 gba:rounded-lg gba:border gba:p-4 gba:text-left gba:transition-colors ${
          selected ? 'gba:border-primary gba:bg-primary/5' : 'gba:border-border gba:bg-background hover:gba:bg-muted/40'
        }`}
        aria-pressed={selected}
        onClick={onClick}
      >
        <span className="gba:text-sm gba:font-semibold gba:text-foreground">{label}</span>
        <span className="gba:text-xs gba:text-muted-foreground">{description}</span>
      </button>
    )
  }

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
                  {getEmployeeJobPositionName(employee)}
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
          <div data-testid="flw_updateWorkingHours_employeeJobPosition">{getEmployeeJobPositionName(employee)}</div>
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
        isProcessPending ||
        !hasPositiveWorkingDay ||
        exceedsWeeklyLimit ||
        exceedsWorkingDaysLimit ||
        isActiveFromMissing ||
        isActiveFromBeforeHireDate ||
        isActiveToBeforeActiveFrom ||
        Boolean(activePeriodOverlapError) ||
        isEmployeeSelectionMissing
      }
      validateForm={validateWorkingHoursForm}
      onProcessCompletion={clearProcessPending}
      data-testid="change-working-hours-form"
      onSubmit={async (values: WorkingHoursFormValues) => {
        showProcessPending()
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
        {isProcessPending ? (
          <div
            className="gba:flex gba:min-h-96 gba:flex-col gba:items-center gba:justify-center gba:gap-3"
            data-testid="flw_updateWorkingHours_submitLoading"
          >
            <Spinner size="lg" srText={t('working-hours-submitting-message')} />
            <div className="gba:text-sm gba:text-muted-foreground">{t('working-hours-submitting-message')}</div>
          </div>
        ) : (
          <div>
            <div className="gba:flex gba:items-center gba:mb-6">{renderEmployeeHeader()}</div>
            <div className="gba:border-t gba:mb-6" />

            <div className="gba:mb-6 gba:space-y-4">
              <div className="gba:grid gba:grid-cols-1 gba:gap-4 sm:gba:grid-cols-2">
                <div className="gba:space-y-2 gba:overflow-hidden">
                  <div className="gba:text-sm gba:font-medium">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:working_hours_form.active_from_label', 'Active From')}
                    <span className="gba:text-destructive"> *</span>
                  </div>
                  <DateInput
                    type="date"
                    value={getDateInputValue(activeFromDraft || watchedValues?.activeFrom)}
                    onDraftChange={(value: string) => {
                      if (isActiveFromLockedToHireDate) {
                        return
                      }

                      setActiveFromDraft(value)
                      const normalizedValue = normalizeDateInputValue(value)

                      if (normalizedValue !== null) {
                        form.setValue('activeFrom', normalizedValue, {
                          shouldValidate: true,
                          shouldDirty: true
                        })
                      }
                    }}
                    onChange={(value: DateInputValue) => {
                      if (isActiveFromLockedToHireDate) {
                        return
                      }

                      const singleDateValue = getSingleDateValue(value)
                      setActiveFromDraft(singleDateValue)
                      form.setValue('activeFrom', singleDateValue, {
                        shouldValidate: true,
                        shouldDirty: true
                      })
                    }}
                    min={employeeHireDate || undefined}
                    disabled={isActiveFromLockedToHireDate}
                    outputFormat="iso"
                    data-testid="flw_updateWorkingHours_activeFromDatePicker"
                  />
                  {isActiveFromLockedToHireDate ? (
                    <p
                      className="gba:mt-1 gba:text-xs gba:text-muted-foreground"
                      data-testid="flw_updateWorkingHours_activeFromHireDateHelper"
                    >
                      {t('working-hours-active-from-hire-date-preselected')}
                    </p>
                  ) : null}
                  {isActiveFromMissing ? (
                    <div
                      className="gba:text-sm gba:text-destructive"
                      data-testid="flw_updateWorkingHours_activeFromError"
                    >
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:working_hours_form.active_from_required',
                        'Active From is required.'
                      )}
                    </div>
                  ) : null}
                  {isActiveFromBeforeHireDate ? (
                    <div
                      className="gba:text-sm gba:text-destructive"
                      data-testid="flw_updateWorkingHours_activeFromHireDateWarning"
                    >
                      {activeFromBeforeHireDateMessage}
                    </div>
                  ) : null}
                </div>

                <div className="gba:space-y-2 gba:overflow-hidden">
                  <div className="gba:text-sm gba:font-medium">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:working_hours_form.active_to_label', 'Active To')}
                  </div>
                  <DateInput
                    type="date"
                    value={getDateInputValue(watchedValues?.activeTo)}
                    onChange={(value: DateInputValue) => {
                      form.setValue('activeTo', getSingleDateValue(value), {
                        shouldValidate: true,
                        shouldDirty: true
                      })
                    }}
                    min={watchedValues?.activeFrom || undefined}
                    outputFormat="iso"
                    data-testid="flw_updateWorkingHours_activeToDatePicker"
                  />
                  {isActiveToBeforeActiveFrom ? (
                    <div
                      className="gba:text-sm gba:text-destructive"
                      data-testid="flw_updateWorkingHours_activeToError"
                    >
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:working_hours_form.active_to_before_active_from',
                        'Active To cannot be before Active From.'
                      )}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="gba:flex gba:flex-col gba:gap-3 sm:gba:flex-row">
                {renderModeButton(
                  'standard',
                  t('working-hours-standard-full-time-option'),
                  t('working-hours-standard-full-time-description'),
                  applyStandardFullTime
                )}
                {renderModeButton(
                  'custom',
                  t('working-hours-customize-by-day-option'),
                  t('working-hours-customize-by-day-description'),
                  enableCustomByDay
                )}
              </div>

              <div className="gba:grid gba:grid-cols-1 gba:gap-4 sm:gba:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:gba:items-end">
                <div>
                  <label className="gba:mb-2 gba:block gba:font-semibold" htmlFor="weekly-working-hours-input">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:working_hours_form.weekly_working_hours_label',
                      'Weekly Working Hours'
                    )}
                  </label>
                  <input
                    id="weekly-working-hours-input"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={48}
                    step="0.01"
                    className="gba:h-10 gba:w-full gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:text-sm"
                    value={weeklyHoursInput}
                    onChange={event => setWeeklyHoursInput(event.target.value)}
                    data-testid="flw_updateWorkingHours_weeklyWorkingHoursInput"
                  />
                </div>
                <div>
                  <label className="gba:mb-2 gba:block gba:font-semibold" htmlFor="working-days-week-input">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:working_hours_form.working_days_week_label',
                      'Working Days / Week'
                    )}
                  </label>
                  <input
                    id="working-days-week-input"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={7}
                    step="1"
                    className="gba:h-10 gba:w-full gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:text-sm"
                    value={workingDaysInput}
                    onChange={event => setWorkingDaysInput(event.target.value)}
                    data-testid="flw_updateWorkingHours_workingDaysWeekInput"
                  />
                </div>
                {weeklyHoursInput.trim() !== '' && workingDaysInput.trim() !== '' ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="gba:whitespace-nowrap"
                    disabled={!canDistributeEvenly}
                    onClick={distributeEvenly}
                    data-testid="flw_updateWorkingHours_distributeEvenly"
                  >
                    {t('working-hours-distribute-evenly-action')}
                  </Button>
                ) : null}
              </div>
            </div>

            <div
              className="gba:grid gba:grid-cols-2 gba:sm:grid-cols-3 gba:md:grid-cols-4 gba:lg:grid-cols-7 gba:gap-2"
              data-testid="flw_updateWorkingHours_columnLayout"
            >
              {dayOrder.map(({ key }) => {
                const label = dayLabel(key)
                const hasError = Boolean(form.formState.errors[key])
                return (
                  <div
                    key={key}
                    className="gba:flex gba:min-w-0 gba:flex-col gba:items-center gba:space-y-2"
                    data-testid={`working-hours-${key}`}
                  >
                    <label className="gba:block gba:font-semibold">
                      {label}
                      <span className="gba:text-destructive"> *</span>
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      className={`gba:w-full gba:max-w-12 gba:h-12 gba:border ${hasError ? 'gba:border-destructive' : 'gba:border-input'} gba:rounded-md gba:text-center gba:text-base`}
                      aria-invalid={hasError}
                      aria-label={label}
                      disabled={mode !== 'custom'}
                      value={watchedValues?.[key] ?? ''}
                      data-testid={dayInputTestIds[key]}
                      onChange={e => {
                        setHasInteractedWithWorkingTime(true)
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

            <div className="gba:mt-6 gba:w-full" data-testid="working-hours-summary">
              <div className="gba:mb-2 gba:block gba:font-semibold">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:working_hours_form.fte_label',
                  'FTE (Full Time Equivalent)'
                )}
              </div>
              <div
                className="gba:flex gba:h-10 gba:items-center gba:rounded-md gba:border gba:border-input gba:bg-muted gba:px-3 gba:text-sm"
                data-testid="flw_updateWorkingHours_fteInput"
              >
                {areAllDaysValid && typeof fte === 'number' ? fte : '-'}
              </div>
            </div>

            <div
              className={`${firstDayErrorMessage || !hasPositiveWorkingDay || activePeriodOverlapError ? 'gba:mt-2' : ''} gba:flex gba:flex-col gba:gap-2`}
              data-testid="working-hours-errors"
            >
              {activePeriodOverlapError ? (
                <div className="gba:text-destructive gba:text-sm" data-testid="flw_updateWorkingHours_overlapError">
                  {activePeriodOverlapError}
                </div>
              ) : null}
              {!hasPositiveWorkingDay ? (
                <div
                  className="gba:text-destructive gba:text-sm"
                  data-testid="flw_updateWorkingHours_atLeastOneDayValidationMessage"
                >
                  {t('working-hours-at-least-one-working-day-required')}
                </div>
              ) : null}
              {firstDayErrorMessage ? (
                <div
                  className="gba:text-destructive gba:text-sm"
                  data-testid="flw_updateWorkingHours_dailyHoursValidationMessage"
                >
                  {firstDayErrorMessage}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </AppActionForm>
  )
}

export default ChangeWorkingHoursForm
