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
  FormMessage
} from '@newwork/nw-design-system'
import { useForm } from 'react-hook-form'
import FormHeader from '../components/FormHeader'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { AppActionForm } from '@/components/app-action-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

// Query to fetch employee header info
const GET_EMPLOYEE_HEADER_INFO = `
query GetEmployeeHeaderInfo($id: uuid!) {
  Employee(where: { id: { _eq: $id } }, limit: 1) {
    id
    firstName
    lastName
    pictureThumbnail
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
  employeeId: string
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

  // GraphQL client for fetching employee header info
  const graphqlClient = useGraphQLClient(accessToken)

  // Resolve the actual employee ID from various sources
  const resolvedEmployeeId = useMemo(() => {
    return (
      employeeId ||
      additionalData?.employeeId ||
      additionalData?.psi_taskPayload?.employeeId ||
      additionalData?.psi_taskPayload?.psi_initialParameters?.employeeId
    )
  }, [employeeId, additionalData])

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

  // Helper: format ISO time to HH:MM for DateInput type="time"
  const formatIsoToHHMM = (iso?: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
  }

  // Initialize/Reset form values from platform params
  React.useEffect(() => {
    if (!platformParams) return
    form.reset({
      date: platformParams.attendanceDateISO || '',
      clockIn: formatIsoToHHMM(platformParams.startTimeISO),
      clockOut: formatIsoToHHMM(platformParams.endTimeISO),
      notes: platformParams.notes || ''
    })
  }, [platformParams, form])

  const [dateVal, clockInVal, clockOutVal, notesVal] = form.watch(['date', 'clockIn', 'clockOut', 'notes']) as [
    string,
    string,
    string,
    string
  ]
  const isValid = useMemo(() => {
    const hasNotes = typeof notesVal === 'string' && notesVal.trim().length > 0
    return Boolean(dateVal && clockInVal && clockOutVal && hasNotes)
  }, [dateVal, clockInVal, clockOutVal, notesVal])

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

  // Combine a base date (ISO) with HH:MM as UTC into full ISO
  const combineDateAndTime = (baseDateIso: string, hhmm: string): string => {
    if (!baseDateIso || !hhmm) return ''
    const base = new Date(baseDateIso)
    if (Number.isNaN(base.getTime())) return ''
    const [hh, mm] = hhmm.split(':').map(v => parseInt(v, 10))
    if (isNaN(hh) || isNaN(mm)) return ''
    const utc = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), hh, mm, 0, 0))
    return utc.toISOString()
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

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const { date, clockIn, clockOut, notes } = form.getValues()

      // Attendance date: prefer platform param if present (already ISO), else form value
      const attendanceDateISO = toUtcMidnightIso(platformParams.attendanceDateISO || date)

      const startTimeISO = combineDateAndTime(attendanceDateISO, clockIn)
      const endTimeISO = combineDateAndTime(attendanceDateISO, clockOut)

      const nowIso = new Date().toISOString()

      const requestEmployeeId =
        employeeId ||
        additionalData?.employeeId ||
        additionalData?.psi_taskPayload?.employeeId ||
        additionalData?.psi_taskPayload?.psi_initialParameters?.employeeId

      const payloadObject = additionalData?.psi_taskPayload?.psi_initialParameters

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
          recordedTime: payloadObject?.recordedTime,
          breakTime: payloadObject?.breakTime,
          effectiveTime: payloadObject?.effectiveTime,
          plannedTime: payloadObject?.plannedTime,
          differenceTime: payloadObject?.differenceTime
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
              rules={{ required: 'Date is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.date', 'Date')}{' '}
                    <span className="gba:text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <div data-testid="rcf-date">
                      <Calendar
                        type="date"
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        // If attendanceDateISO exists, disable changing the date by omitting onSelect
                        {...(!platformParams.attendanceDateISO && {
                          onSelect: (date: Date | undefined) => field.onChange(date ? date.toISOString() : '')
                        })}
                        // Disable dates outside current month; if attendanceDateISO exists, constrain to that exact day
                        disabled={(() => {
                          const start = new Date()
                          start.setDate(1)
                          start.setHours(0, 0, 0, 0)
                          const end = new Date(start)
                          end.setMonth(end.getMonth() + 1)
                          end.setDate(0)
                          end.setHours(23, 59, 59, 999)

                          if (platformParams.attendanceDateISO) {
                            const d = new Date(platformParams.attendanceDateISO)
                            // Only the attendance date remains enabled
                            return [{ before: d }, { after: d }]
                          }
                          return [{ before: start }, { after: end }]
                        })()}
                        // Prevent navigating away from the month if attendanceDateISO is provided
                        {...(platformParams.attendanceDateISO && {
                          fromMonth: new Date(platformParams.attendanceDateISO),
                          toMonth: new Date(platformParams.attendanceDateISO)
                        })}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="clockIn"
              rules={{ required: 'Clock In time is required' }}
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
              rules={{ required: 'Clock Out time is required' }}
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
