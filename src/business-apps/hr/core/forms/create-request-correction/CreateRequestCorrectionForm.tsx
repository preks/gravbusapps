'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Input,
  Calendar,
  DateInput,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  useTranslation
} from '@newwork/nw-design-system'
import { useForm } from 'react-hook-form'
import FormHeader from '../components/FormHeader'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { AppActionForm } from '@/components/app-action-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import translations from '../_i18n'
import {
  parseDurationToMinutes,
  minutesToHHMM,
  minutesToSignedHHMM
} from '@/business-apps/hr/core/apps/my-time/utils/duration'
import {
  employeeAttendanceMonthlyAllQuery,
  employeeRegionLookupQuery,
  employmentRegionHolidaysQuery
} from '@/business-apps/hr/core/apps/employee-record/queries/attendanceQueries'
import {
  employeeWorkingHoursQuery,
  getEmployeeAbsences
} from '@/business-apps/hr/core/forms/create-new-absence/queries/getEmployeeAbsences'
import { getActiveWorkingHours } from '@/business-apps/hr/core/utils/workingHoursUtils'

type WeeklyWorkingHours = {
  activeFrom?: string | null
  activeTo?: string | null
  sundayHours?: number
  mondayHours?: number
  tuesdayHours?: number
  wednesdayHours?: number
  thursdayHours?: number
  fridayHours?: number
  saturdayHours?: number
}

const getPlannedMinutesForDate = (dateIso: string, wh?: WeeklyWorkingHours): number => {
  if (!wh || !dateIso) return 0
  const d = new Date(dateIso)
  const day = d.getUTCDay()
  const hoursByDay = [
    wh.sundayHours,
    wh.mondayHours,
    wh.tuesdayHours,
    wh.wednesdayHours,
    wh.thursdayHours,
    wh.fridayHours,
    wh.saturdayHours
  ]
  const hours = hoursByDay[day] ?? 0
  return typeof hours === 'number' ? Math.max(0, Math.round(hours * 60)) : 0
}

const DEFAULT_BREAK_TIME = '01:00'

// Query to fetch employee header info
const GET_EMPLOYEE_HEADER_INFO = `
query GetEmployeeHeaderInfo($id: uuid!) {
  Employee(where: { id: { _eq: $id } }, limit: 1) {
    id
    firstName
    lastName
    pictureThumbnail
    workingCondition {
      hireDate
    }
    employeePosition {
      jobPosition {
        name
      }
    }
  }
}
`

import { EmployeeInfo } from '../components/FormHeader'

interface RequestCorrectionFormProps extends BusinessAppContextProps {
  employeeId?: string
  onSubmitted?: () => void
  additionalData: any
}

export const CreateRequestCorrectionForm: React.FC<RequestCorrectionFormProps> = ({
  employeeId,
  onSubmitted,
  additionalData,
  accessToken
}) => {
  const form = useForm<{ date: string; clockIn: string; clockOut: string; notes?: string }>({
    defaultValues: { date: '', clockIn: '', clockOut: '', notes: '' },
    mode: 'onChange'
  })
  const [submitting, setSubmitting] = useState(false)
  const [employeeHeaderInfo, setEmployeeHeaderInfo] = useState<EmployeeInfo | undefined>(undefined)
  const [workingHours, setWorkingHours] = useState<WeeklyWorkingHours | undefined>(undefined)
  const [disabledDatesSet, setDisabledDatesSet] = useState<Set<string>>(new Set())
  const [absenceDatesSet, setAbsenceDatesSet] = useState<Set<string>>(new Set())
  const [employeeHireDateKey, setEmployeeHireDateKey] = useState<string | undefined>(undefined)

  // GraphQL client for fetching employee header info
  const graphqlClient = useGraphQLClient(accessToken)
  const { t } = useTranslation(translations)
  // Resolve the actual employee ID from various sources
  const resolvedEmployeeId = useMemo(() => {
    return (
      employeeId ||
      additionalData?.employeeId ||
      additionalData?.psi_taskPayload?.employeeId ||
      additionalData?.psi_taskPayload?.psi_initialParameters?.employeeId
    )
  }, [employeeId, additionalData])

  const toLocalDateKey = (d: Date): string => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const toDateKey = (value?: string): string | undefined => {
    if (!value) return undefined
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
    if (dateOnly) return `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`

    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return undefined
    return toLocalDateKey(parsed)
  }

  const isBeforeHireDate = useCallback(
    (dateKey: string) => Boolean(employeeHireDateKey && dateKey < employeeHireDateKey),
    [employeeHireDateKey]
  )

  // Fetch employee header info
  const fetchEmployeeHeaderInfo = useCallback(async () => {
    if (!accessToken || !resolvedEmployeeId) return
    try {
      const res = await graphqlClient.request<any>(GET_EMPLOYEE_HEADER_INFO, { id: resolvedEmployeeId })
      const emp = res?.Employee?.[0]
      if (emp) {
        setEmployeeHeaderInfo({
          firstName: emp.firstName,
          lastName: emp.lastName,
          pictureThumbnail: emp.pictureThumbnail,
          jobTitle: emp.employeePosition?.jobPosition?.name
        })
        setEmployeeHireDateKey(toDateKey(emp.workingCondition?.[0]?.hireDate))
      }
    } catch {
      // Silently fail - form still works without header info
    }
  }, [accessToken, resolvedEmployeeId, graphqlClient])

  useEffect(() => {
    fetchEmployeeHeaderInfo()
  }, [fetchEmployeeHeaderInfo])

  // Extract platform/flow-provided parameters (supports nested psi_taskPayload as well as externalContextData)
  const platformParams = React.useMemo(() => {
    const nested = additionalData?.psi_taskPayload?.psi_initialParameters || additionalData?.psi_initialParameters || {}
    const externalContext = additionalData?.externalContextData || {}

    const attendanceDateISO =
      externalContext.attendanceDateISO || nested.attendanceDateISO || additionalData?.attendanceDateISO
    const startTimeISO = externalContext.startTimeISO || nested.startTimeISO || additionalData?.startTimeISO
    const endTimeISO = externalContext.endTimeISO || nested.endTimeISO || additionalData?.endTimeISO
    const notes = externalContext.notes || nested.notes || additionalData?.notes

    return { attendanceDateISO, startTimeISO, endTimeISO, notes }
  }, [additionalData])

  // Fetch: (1) dates with existing attendance -> disable in calendar; (2) absence dates (holidays + personal) -> validate on submit only
  useEffect(() => {
    if (!resolvedEmployeeId || !accessToken || !graphqlClient) return
    const monthRef = platformParams.attendanceDateISO ? new Date(platformParams.attendanceDateISO) : new Date()
    const monthStart = new Date(monthRef.getFullYear(), monthRef.getMonth(), 1)
    const monthEnd = new Date(monthRef.getFullYear(), monthRef.getMonth() + 1, 0)
    const dateFrom = toLocalDateKey(monthStart)
    const dateTo = toLocalDateKey(monthEnd)

    const attendanceOnlySet = new Set<string>()
    const absenceOnlySet = new Set<string>()

    const run = async () => {
      try {
        const [attendanceRes, absencesRes] = await Promise.all([
          graphqlClient.request<{ EmployeeAttendance: { attendanceDate: string }[] }>(
            employeeAttendanceMonthlyAllQuery,
            { employeeId: resolvedEmployeeId, dateFrom, dateTo }
          ),
          graphqlClient.request<{
            EmployeeAbsence: {
              startDate: string
              endDate: string
              status?: string
              type?: { objectValue?: string; translations?: { value?: string }[] }
            }[]
          }>(getEmployeeAbsences, {
            employeeId: resolvedEmployeeId,
            startDate: new Date(
              monthStart.getFullYear(),
              monthStart.getMonth(),
              monthStart.getDate(),
              0,
              0,
              0
            ).toISOString(),
            endDate: new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate(), 23, 59, 59).toISOString()
          })
        ])

        const attendanceRows = attendanceRes?.EmployeeAttendance ?? []
        attendanceRows.forEach((r: { attendanceDate: string }) => attendanceOnlySet.add(String(r.attendanceDate)))

        const absences: any[] = absencesRes?.EmployeeAbsence ?? []
        const approvedAbsences = absences.filter((a: any) => String(a.status).toUpperCase() === 'APPROVED')
        const WORK_ABSENCE_GROUP = 'AbsenceGroup:v1:WORK'
        const isBlockingAbsence = (a: any): boolean => {
          const parentEntryId = a?.type?.parentEntryId
          if (parentEntryId === WORK_ABSENCE_GROUP) return false
          return true
        }
        const blockingAbsences = approvedAbsences.filter(isBlockingAbsence)
        blockingAbsences.forEach((a: { startDate: string; endDate: string }) => {
          const from = new Date(a.startDate)
          const to = new Date(a.endDate)
          const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate())
          const end = new Date(to.getFullYear(), to.getMonth(), to.getDate())
          while (cursor <= end) {
            const key = toLocalDateKey(cursor)
            if (cursor >= monthStart && cursor <= monthEnd) absenceOnlySet.add(key)
            cursor.setDate(cursor.getDate() + 1)
          }
        })

        const locale = getCurrentActiveUserLocale()
        const regionRes = await graphqlClient.request<any>(employeeRegionLookupQuery, {
          employeeId: resolvedEmployeeId,
          activeUserLocale: locale,
          today: new Date().toISOString()
        })
        const regionIdRaw: string | undefined = regionRes?.employee?.[0]?.workingCondition?.[0]?.region?.id
        if (regionIdRaw) {
          let regionId = regionIdRaw
          const seg = String(regionIdRaw).split(':').pop() || ''
          if (seg.startsWith('RO') && seg !== 'ROU') regionId = 'EmploymentRegion:v1:ROU'
          const holidaysRes = await graphqlClient.request<{
            holidays: { alternativeCode?: string; additionalValue3?: string }[]
          }>(employmentRegionHolidaysQuery, { activeUserLocale: locale, regionId })
          const yearStr = String(monthRef.getFullYear())
          const holidaysForYear = (holidaysRes?.holidays ?? []).filter(
            (h: { additionalValue3?: string }) => String(h?.additionalValue3 ?? '') === yearStr
          )
          const monthNum = monthRef.getMonth() + 1
          holidaysForYear.forEach((h: { alternativeCode?: string }) => {
            const code = String(h?.alternativeCode ?? '')
            const m = /^(\d{4})(\d{2})(\d{2})$/.exec(code)
            if (!m) return
            const y = Number(m[1])
            const mo = Number(m[2])
            const day = Number(m[3])
            if (y === monthRef.getFullYear() && mo === monthNum && day >= 1 && day <= 31) {
              const d = new Date(y, mo - 1, day)
              if (d.getMonth() === monthRef.getMonth()) absenceOnlySet.add(toLocalDateKey(d))
            }
          })
        }
      } catch {
        // keep existing sets on error
      }
      setDisabledDatesSet(attendanceOnlySet)
      setAbsenceDatesSet(absenceOnlySet)
    }
    run()
  }, [resolvedEmployeeId, accessToken, graphqlClient, platformParams.attendanceDateISO])

  // Helper: format ISO time to HH:MM for DateInput type="time"
  const formatIsoToHHMM = (iso?: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
  }

  // Track the original values so we can detect whether the user changed anything
  const [initialValues, setInitialValues] = useState<{
    date: string
    clockIn: string
    clockOut: string
    notes: string
  } | null>(null)

  // Initialize/Reset form values from platform params
  React.useEffect(() => {
    if (!platformParams) return
    const vals = {
      date: platformParams.attendanceDateISO || '',
      clockIn: formatIsoToHHMM(platformParams.startTimeISO),
      clockOut: formatIsoToHHMM(platformParams.endTimeISO),
      notes: platformParams.notes || ''
    }
    form.reset(vals)
    setInitialValues(vals)
  }, [platformParams, form])

  const [dateVal, clockInVal, clockOutVal, notesVal] = form.watch(['date', 'clockIn', 'clockOut', 'notes']) as [
    string,
    string,
    string,
    string
  ]

  useEffect(() => {
    if (!accessToken || !resolvedEmployeeId) return

    const fetchWorkingHours = async () => {
      try {
        const res = await graphqlClient.request<any>(employeeWorkingHoursQuery, {
          employeeId: resolvedEmployeeId
        })
        const targetDate = dateVal || platformParams.attendanceDateISO || new Date()
        const wh = getActiveWorkingHours<WeeklyWorkingHours>(res?.employee?.[0]?.workingHours, targetDate)
        setWorkingHours(wh)
      } catch {
        // Non-critical: planned time will fall back to 0
        setWorkingHours(undefined)
      }
    }

    fetchWorkingHours()
  }, [accessToken, resolvedEmployeeId, dateVal, platformParams.attendanceDateISO, graphqlClient])

  // Re-validate date when blocked date data is loaded so pre-selected or chosen dates show the error
  useEffect(() => {
    if ((absenceDatesSet.size > 0 || employeeHireDateKey) && dateVal) form.trigger('date')
  }, [absenceDatesSet, dateVal, employeeHireDateKey, form])

  // Convert HH:MM to total minutes for comparison
  const hhmmToMinutes = (hhmm?: string): number | null => {
    if (!hhmm || typeof hhmm !== 'string' || !hhmm.includes(':')) return null
    const [hh, mm] = hhmm.split(':').map(v => parseInt(v, 10))
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null
    return hh * 60 + mm
  }
  const hasChanges = useMemo(() => {
    if (!initialValues) return true
    return (
      dateVal !== initialValues.date ||
      clockInVal !== initialValues.clockIn ||
      clockOutVal !== initialValues.clockOut ||
      notesVal !== initialValues.notes
    )
  }, [dateVal, clockInVal, clockOutVal, notesVal, initialValues])

  const isDateAbsence = useMemo(() => {
    if (!dateVal) return false
    let key = ''
    try {
      const d = new Date(dateVal)
      if (!Number.isNaN(d.getTime())) {
        key = toLocalDateKey(d)
      }
    } catch {
      // no-op
    }
    return key ? absenceDatesSet.has(key) : false
  }, [dateVal, absenceDatesSet])

  const isDateBeforeHireDate = useMemo(() => {
    if (!dateVal) return false
    const key = toDateKey(dateVal)
    return key ? isBeforeHireDate(key) : false
  }, [dateVal, isBeforeHireDate])

  const isZeroPlannedDay = useMemo(() => {
    if (!dateVal || !workingHours) return false
    const d = new Date(dateVal)
    if (Number.isNaN(d.getTime())) return false
    const day = d.getDay()
    const hoursByDay = [
      workingHours.sundayHours,
      workingHours.mondayHours,
      workingHours.tuesdayHours,
      workingHours.wednesdayHours,
      workingHours.thursdayHours,
      workingHours.fridayHours,
      workingHours.saturdayHours
    ]
    return (hoursByDay[day] ?? 0) <= 0
  }, [dateVal, workingHours])

  const isValid = useMemo(() => {
    const hasNotes = typeof notesVal === 'string' && notesVal.trim().length > 0
    const startMins = hhmmToMinutes(clockInVal)
    const endMins = hhmmToMinutes(clockOutVal)
    const timeOrderOk = startMins === null || endMins === null || startMins <= endMins
    const dateNotAbsence = !isDateAbsence
    const dateIsHireDateOrLater = !isDateBeforeHireDate
    return Boolean(
      dateVal &&
        clockInVal &&
        clockOutVal &&
        hasNotes &&
        timeOrderOk &&
        hasChanges &&
        dateNotAbsence &&
        dateIsHireDateOrLater
    )
  }, [dateVal, clockInVal, clockOutVal, notesVal, hasChanges, isDateAbsence, isDateBeforeHireDate])

  // Normalize any date (ISO with time or YYYY-MM-DD) to UTC midnight ISO
  const toUtcMidnightIso = (input: string): string => {
    if (!input) return ''
    try {
      let year: number, monthIndex: number, day: number
      if (input.includes('T')) {
        const d = new Date(input)
        if (Number.isNaN(d.getTime())) return ''
        // Use local calendar parts to preserve the chosen calendar date
        year = d.getFullYear()
        monthIndex = d.getMonth()
        day = d.getDate()
      } else {
        const parts = input.split('-')
        if (parts.length !== 3) return ''
        year = Number(parts[0])
        monthIndex = Number(parts[1]) - 1
        day = Number(parts[2])
      }
      const utc = new Date(Date.UTC(year, monthIndex, day, 0, 0, 0, 0))
      return utc.toISOString()
    } catch {
      return ''
    }
  }

  // Combine a base date (ISO) with an HH:MM entered/viewed in LOCAL time
  // and return the corresponding UTC ISO string.
  // Example: baseDate "2025-12-08T00:00:00.000Z", hhmm "12:54", TZ=UTC+2
  // -> result "2025-12-08T10:54:00.000Z"
  const combineDateAndTimeLocalToUtc = (baseDateIso: string, hhmm: string): string => {
    if (!baseDateIso || !hhmm) return ''
    const base = new Date(baseDateIso)
    if (Number.isNaN(base.getTime())) return ''
    const [hh, mm] = hhmm.split(':').map(v => parseInt(v, 10))
    if (isNaN(hh) || isNaN(mm)) return ''
    // Use UTC parts for the calendar date (to preserve the selected date),
    // but construct a LOCAL date/time with the entered hours/minutes.
    const local = new Date(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), hh, mm, 0, 0)
    return local.toISOString()
  }

  // Extract YYYY-MM-DD from an ISO string (or return the date if already in that format)
  const toDateOnly = (isoOrDate: string): string => {
    if (!isoOrDate) return ''
    try {
      const d = new Date(isoOrDate)
      if (!Number.isNaN(d.getTime())) {
        const y = d.getUTCFullYear()
        const m = String(d.getUTCMonth() + 1).padStart(2, '0')
        const day = String(d.getUTCDate()).padStart(2, '0')
        return `${y}-${m}-${day}`
      }
    } catch {
      // no-op, fallback below
    }
    const m = String(isoOrDate).match(/^(\d{4}-\d{2}-\d{2})/)
    return m ? m[1] : ''
  }

  // Render the calendar with a preselected date, constrained behavior, and selection handling
  const renderCalendar = useCallback(
    (field: any) => {
      const preselectedDate: Date | undefined = platformParams.attendanceDateISO
        ? new Date(platformParams.attendanceDateISO)
        : field.value
          ? new Date(field.value)
          : undefined

      return (
        <Calendar
          type="date"
          mode="single"
          selected={preselectedDate}
          {...(preselectedDate && { month: preselectedDate })}
          {...(!platformParams.attendanceDateISO && {
            onSelect: (date: Date | undefined) => field.onChange(date ? date.toISOString() : '')
          })}
          disabled={(() => {
            const start = new Date()
            start.setDate(1)
            start.setHours(0, 0, 0, 0)
            const today = new Date()
            today.setHours(23, 59, 59, 999)

            const rangeMatchers: ({ before?: Date; after?: Date } | ((date: Date) => boolean))[] =
              platformParams.attendanceDateISO
                ? (() => {
                    const d = new Date(platformParams.attendanceDateISO)
                    return [{ before: d }, { after: d }]
                  })()
                : [{ before: start }, { after: today }]

            // When user can pick any date in the month, disable only dates that already have an attendance entry
            if (!platformParams.attendanceDateISO) {
              const isDisabledDate = (date: Date) => disabledDatesSet.has(toLocalDateKey(date))
              rangeMatchers.push(isDisabledDate)
            }
            if (employeeHireDateKey) {
              const isBeforeHireDateMatcher = (date: Date) => isBeforeHireDate(toLocalDateKey(date))
              rangeMatchers.push(isBeforeHireDateMatcher)
            }
            return rangeMatchers
          })()}
          {...(platformParams.attendanceDateISO && {
            fromMonth: new Date(platformParams.attendanceDateISO),
            toMonth: new Date(platformParams.attendanceDateISO)
          })}
        />
      )
    },
    [platformParams, disabledDatesSet, employeeHireDateKey, isBeforeHireDate]
  )

  const handleSubmit = async () => {
    if (isDateBeforeHireDate) {
      form.setError('date', { message: t('request-correction-date-before-hire-error') })
      return
    }
    if (isDateAbsence) {
      form.setError('date', { message: t('request-correction-date-absence-error') })
      return
    }
    setSubmitting(true)
    try {
      const { date, clockIn, clockOut, notes } = form.getValues()

      // Attendance date: prefer platform param if present (already ISO), else form value
      const attendanceDateISO = toUtcMidnightIso(platformParams.attendanceDateISO || date)

      // Interpret HH:MM as LOCAL time and convert to UTC for payload
      const startTimeISO = combineDateAndTimeLocalToUtc(attendanceDateISO, clockIn)
      const endTimeISO = combineDateAndTimeLocalToUtc(attendanceDateISO, clockOut)

      const nowIso = new Date().toISOString()

      const payloadObject = additionalData?.psi_taskPayload?.psi_initialParameters
      const externalContext = additionalData?.externalContextData || {}
      const requestEmployeeId = payloadObject?.employeeId

      const recordedMinutes = Math.max(
        0,
        Math.round((new Date(endTimeISO).getTime() - new Date(startTimeISO).getTime()) / 60000)
      )
      const breakTimeRaw = payloadObject?.breakTime || externalContext.breakTime || DEFAULT_BREAK_TIME
      const breakMinutes = parseDurationToMinutes(breakTimeRaw)
      const effectiveMinutes = Math.max(0, recordedMinutes - breakMinutes)
      const plannedTimeRaw = payloadObject?.plannedTime || externalContext.plannedTime
      const plannedMinutes = plannedTimeRaw
        ? parseDurationToMinutes(plannedTimeRaw)
        : getPlannedMinutesForDate(attendanceDateISO, workingHours)
      const differenceMinutes = effectiveMinutes - plannedMinutes

      const payload = {
        changeMode: 'INSERT',
        employeeid: requestEmployeeId,
        employeeAttendanceCorrectionRequest: {
          version: payloadObject?.timeEntryVersion,
          attendanceDate: toDateOnly(attendanceDateISO),
          requestDate: nowIso,
          decisionDate: nowIso,
          startTime: startTimeISO,
          endTime: endTimeISO,
          status: 'UNKNOWN_CORRECTION_REQUEST_STATUS',
          correctionDescription: notes,
          employee: requestEmployeeId,
          employeeAttendance: payloadObject?.timeEntryId,
          recordedTime: minutesToHHMM(recordedMinutes),
          breakTime: minutesToHHMM(breakMinutes),
          effectiveTime: minutesToHHMM(effectiveMinutes),
          plannedTime: minutesToHHMM(plannedMinutes),
          differenceTime: minutesToSignedHHMM(differenceMinutes)
        },
        employeeInfo: {
          userId: payloadObject?.userId,
          id: requestEmployeeId,
          employeeUserId: payloadObject?.userId
        },
        completeNotification: {
          type: 'success',
          message: t('complete-notification')
        }
      }

      onSubmitted?.()
      return payload
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div data-testid="request-correction-form">
      <FormHeader
        title={getTranslationFromI18nKeyAndLabel(
          'lowcoder:time_tracking.actions.request_correction',
          'Request Correction'
        )}
        flowIconUrl={flowIconUrl}
        employee={
          employeeHeaderInfo
            ? {
                firstName: employeeHeaderInfo.firstName,
                lastName: employeeHeaderInfo.lastName,
                pictureThumbnail: employeeHeaderInfo.pictureThumbnail,
                jobTitle: employeeHeaderInfo.jobTitle
              }
            : undefined
        }
      />

      <AppActionForm
        processType="create"
        onSubmit={handleSubmit}
        form={form as any}
        formData={form.getValues()}
        data-testid="request-correction-app-action-form"
        submitButtonText="Submit"
        isSubmitDisabled={!isValid || submitting}
      >
        <div className="gba:flex-1 gba:space-y-4">
          <div className="gba:grid gba:grid-cols-1 gba:gap-4">
            <FormField
              control={form.control as any}
              name="date"
              rules={{
                required: 'Date is required',
                validate: (value: string) => {
                  if (!value) return true
                  let key = ''
                  try {
                    const d = new Date(value)
                    if (!Number.isNaN(d.getTime())) {
                      key = toLocalDateKey(d)
                    }
                  } catch {
                    // no-op
                  }
                  if (key && isBeforeHireDate(key)) return t('request-correction-date-before-hire-error')
                  if (key && absenceDatesSet.has(key)) return t('request-correction-date-absence-error')
                  return true
                }
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.date', 'Date')}{' '}
                    <span className="gba:text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <div data-testid="rcf-date">{renderCalendar(field)}</div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              {isZeroPlannedDay && !isDateAbsence ? (
                <p className="gba:text-sm gba:text-warning">{t('request-correction-zero-planned-warning')}</p>
              ) : null}
            </div>

            <FormField
              control={form.control as any}
              name="clockIn"
              rules={{
                required: 'Clock In time is required',
                validate: value => {
                  const start = hhmmToMinutes(value)
                  const end = hhmmToMinutes(form.getValues('clockOut'))
                  if (start !== null && end !== null && start > end) {
                    return 'Start time cannot be after end time'
                  }
                  return true
                }
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.actions.start', 'Start')}{' '}
                    <span className="gba:text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <div data-testid="rcf-clock-in">
                      <DateInput
                        type="time"
                        value={field.value}
                        onChange={v => field.onChange(typeof v === 'string' ? v : '')}
                        placeholder="HH:MM"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="clockOut"
              rules={{
                required: 'Clock Out time is required',
                validate: value => {
                  const end = hhmmToMinutes(value)
                  const start = hhmmToMinutes(form.getValues('clockIn'))
                  if (start !== null && end !== null && start > end) {
                    return 'Start time cannot be after end time'
                  }
                  return true
                }
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.actions.end', 'End')}{' '}
                    <span className="gba:text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <div data-testid="rcf-clock-out">
                      <DateInput
                        type="time"
                        value={field.value}
                        onChange={v => field.onChange(typeof v === 'string' ? v : '')}
                        placeholder="HH:MM"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control as any}
            name="notes"
            rules={{ required: 'Notes are required' }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.notes', 'Notes')}{' '}
                  <span className="gba:text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="Add details..." {...field} data-testid="rcf-notes" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </AppActionForm>
    </div>
  )
}

export default CreateRequestCorrectionForm
