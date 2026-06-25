import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { EMPLOYEE_DATA_QUERY, ALL_EMPLOYEE_DATA_QUERY } from '../ChangeWorkingHoursQueries'
import { WorkingHoursFormValues } from '../constants/changeWorkingHoursConstants'
import { getCurrentActiveStructureId, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

type ChangeMode = 'UPDATE' | 'INSERT'

export interface WorkingHoursValidationRecord {
  id?: string
  version?: number
  activeFrom?: string | null
  activeTo?: string | null
}

export interface EmployeeLite {
  pictureThumbnail?: string
  firstName?: string
  lastName?: string
  employeePosition?:
    | {
        hireDate?: string | null
        jobPosition?: { name?: string }
      }
    | Array<{
        hireDate?: string | null
        jobPosition?: { name?: string }
      }>
  workingCondition?: Array<{
    hireDate?: string | null
  }>
}

export interface ChangeWorkingHoursContextState {
  employee: EmployeeLite | null
  employees: Array<{ id: string; firstName: string; lastName: string }>
  defaults: WorkingHoursFormValues | null
  employeeHireDate: string
  isFirstWorkingHoursEntry: boolean
  existingWorkingMeta: { id?: string; version?: number; remoteRef?: string } | null
  workingHoursValidationRecords: WorkingHoursValidationRecord[]
  selectedEmployeeId: string
  setSelectedEmployeeId: (id: string) => void
  activeEmployeeId: string
  isFixedEmployeeId: boolean
  loading: boolean
  error: string | null
  changeMode: ChangeMode
  reload: () => Promise<void>
  buildSubmitPayload: (
    values: WorkingHoursFormValues,
    derived: { weeklySum: number; workingDays: number; fte: number }
  ) => any
}

const ChangeWorkingHoursContext = createContext<ChangeWorkingHoursContextState | undefined>(undefined)

const toDateInputValue = (value?: string | null): string => {
  if (!value) {
    return ''
  }

  const timestampIndex = value.indexOf('T')
  return timestampIndex === -1 ? value : value.substring(0, timestampIndex)
}

const toInstantDate = (value: string): string | undefined => {
  const dateValue = toDateInputValue(value)
  return dateValue ? `${dateValue}T00:00:00.000Z` : undefined
}

const toTimestamp = (value?: string | null): number | null => {
  if (!value) {
    return null
  }

  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? null : timestamp
}

const isActiveWorkingHours = (record: any, today: string): boolean => {
  const activeFrom = toTimestamp(record?.activeFrom)
  const todayTimestamp = toTimestamp(today)

  if (activeFrom === null || todayTimestamp === null || activeFrom > todayTimestamp) {
    return false
  }

  const activeTo = toTimestamp(record?.activeTo)
  return activeTo === null || activeTo >= todayTimestamp
}

const isLegacyWorkingHours = (record: any): boolean => !record?.activeFrom && !record?.activeTo

const getCurrentWorkingHours = (records: any[], today: string, workingHoursId?: string, changeMode?: ChangeMode) => {
  if (changeMode === 'INSERT') {
    return null
  }

  if (workingHoursId) {
    return records.find(record => record?.id === workingHoursId) || null
  }

  const activeRecord = records.find(record => isActiveWorkingHours(record, today))

  if (activeRecord) {
    return activeRecord
  }

  return records.find(isLegacyWorkingHours) || null
}

const getEmployeeHireDate = (employee?: EmployeeLite | null): string => {
  const workingConditionHireDate = employee?.workingCondition?.find(condition => condition?.hireDate)?.hireDate
  const employeePosition = Array.isArray(employee?.employeePosition)
    ? employee?.employeePosition.find(position => position?.hireDate)
    : employee?.employeePosition
  return toDateInputValue(workingConditionHireDate || employeePosition?.hireDate)
}

export const useChangeWorkingHoursContext = () => {
  const ctx = useContext(ChangeWorkingHoursContext)
  if (!ctx) throw new Error('useChangeWorkingHoursContext must be used within ChangeWorkingHoursProvider')
  return ctx
}

export interface ChangeWorkingHoursProviderProps {
  accessToken: string
  userInfo?: BusinessAppContextProps['userInfo']
  additionalData?: BusinessAppContextProps['additionalData']
  employeeId?: string
  children: React.ReactNode
}

export function ChangeWorkingHoursProvider({
  accessToken,
  userInfo,
  additionalData,
  employeeId,
  children
}: Readonly<ChangeWorkingHoursProviderProps>) {
  const graphql = useGraphqlClient(accessToken)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [employee, setEmployee] = useState<EmployeeLite | null>(null)
  const [defaults, setDefaults] = useState<WorkingHoursFormValues | null>(null)
  const [employeeHireDate, setEmployeeHireDate] = useState('')
  const [isFirstWorkingHoursEntry, setIsFirstWorkingHoursEntry] = useState(false)
  const [existingWorkingMeta, setExistingWorkingMeta] = useState<{
    id?: string
    version?: number
    remoteRef?: string
  } | null>(null)
  const [workingHoursValidationRecords, setWorkingHoursValidationRecords] = useState<WorkingHoursValidationRecord[]>([])
  const [employees, setEmployees] = useState<Array<{ id: string; firstName: string; lastName: string }>>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
  const contextEmployeeId = useMemo(() => {
    const externalContextData = additionalData?.externalContextData
    const psiTaskPayload = additionalData?.psi_taskPayload
    const initialParameters = psiTaskPayload?.psi_initialParameters

    return (
      externalContextData?.employeeId ||
      additionalData?.employeeId ||
      psiTaskPayload?.employeeId ||
      initialParameters?.employeeId ||
      ''
    )
  }, [additionalData])
  const workingHoursId = useMemo(() => {
    const externalContextData = additionalData?.externalContextData
    const psiTaskPayload = additionalData?.psi_taskPayload
    const initialParameters = psiTaskPayload?.psi_initialParameters

    return (
      externalContextData?.workingHoursId ||
      additionalData?.workingHoursId ||
      psiTaskPayload?.workingHoursId ||
      initialParameters?.workingHoursId ||
      undefined
    )
  }, [additionalData])
  const changeMode = useMemo<ChangeMode>(() => {
    const externalContextData = additionalData?.externalContextData
    const psiTaskPayload = additionalData?.psi_taskPayload
    const initialParameters = psiTaskPayload?.psi_initialParameters
    const requestedChangeMode =
      externalContextData?.changeMode ||
      additionalData?.changeMode ||
      psiTaskPayload?.changeMode ||
      initialParameters?.changeMode

    return requestedChangeMode === 'INSERT' ? 'INSERT' : 'UPDATE'
  }, [additionalData])
  const fixedEmployeeId = useMemo(() => employeeId || contextEmployeeId, [contextEmployeeId, employeeId])
  const isFixedEmployeeId = useMemo(
    () => Boolean(fixedEmployeeId && String(fixedEmployeeId).trim().length > 0),
    [fixedEmployeeId]
  )
  const activeEmployeeId = useMemo(() => fixedEmployeeId || selectedEmployeeId, [fixedEmployeeId, selectedEmployeeId])

  const loadEmployee = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res: any = await graphql.request(EMPLOYEE_DATA_QUERY as any, { employeeId: activeEmployeeId })
      const emp = res?.Employee?.[0]
      const today = `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`
      const workingHoursCandidates = res?.employee?.[0]?.workingHours || []
      const working = getCurrentWorkingHours(workingHoursCandidates, today, workingHoursId, changeMode)
      const hireDate = getEmployeeHireDate(emp)
      setEmployee(emp)
      setEmployeeHireDate(hireDate)
      setIsFirstWorkingHoursEntry(workingHoursCandidates.length === 0)
      setWorkingHoursValidationRecords(res?.employee?.[0]?.workingHoursValidationRecords || [])
      const d: WorkingHoursFormValues = {
        activeFrom: toDateInputValue(working?.activeFrom) || hireDate,
        activeTo: toDateInputValue(working?.activeTo),
        mondayHours: (working?.mondayHours ?? 0) as number,
        tuesdayHours: (working?.tuesdayHours ?? 0) as number,
        wednesdayHours: (working?.wednesdayHours ?? 0) as number,
        thursdayHours: (working?.thursdayHours ?? 0) as number,
        fridayHours: (working?.fridayHours ?? 0) as number,
        saturdayHours: (working?.saturdayHours ?? 0) as number,
        sundayHours: (working?.sundayHours ?? 0) as number
      }
      setDefaults(d)
      setExistingWorkingMeta({ id: working?.id, version: working?.version, remoteRef: working?.remoteRef })
    } catch (e: any) {
      setError(
        e?.message ||
          getTranslationFromI18nKeyAndLabel('lowcoder:employee_termination.error_load_title', 'Error Loading Employee')
      )
    } finally {
      setLoading(false)
    }
  }, [activeEmployeeId, changeMode, graphql, workingHoursId])

  const loadAllEmployees = useCallback(async () => {
    try {
      const res: any = await graphql.request(ALL_EMPLOYEE_DATA_QUERY as any, {
        userId: userInfo?.id || '',
        structureId: getCurrentActiveStructureId()
      })
      setEmployees(res?.allEmployees || [])
    } catch {
      setEmployees([])
    }
  }, [graphql, userInfo])

  useEffect(() => {
    if (activeEmployeeId) {
      loadEmployee()
    } else {
      const zeroDefaults: WorkingHoursFormValues = {
        activeFrom: '',
        activeTo: '',
        mondayHours: 0,
        tuesdayHours: 0,
        wednesdayHours: 0,
        thursdayHours: 0,
        fridayHours: 0,
        saturdayHours: 0,
        sundayHours: 0
      }
      setEmployee(null)
      setEmployeeHireDate('')
      setIsFirstWorkingHoursEntry(false)
      setExistingWorkingMeta(null)
      setWorkingHoursValidationRecords([])
      setDefaults(zeroDefaults)
      setLoading(false)
      if (!isFixedEmployeeId) {
        loadAllEmployees()
      }
    }
  }, [activeEmployeeId, isFixedEmployeeId, loadEmployee, loadAllEmployees])

  const reload = useCallback(async () => {
    await loadEmployee()
  }, [loadEmployee])

  const buildSubmitPayload = useCallback(
    (values: WorkingHoursFormValues, derived: { weeklySum: number; workingDays: number; fte: number }) => {
      const { weeklySum, workingDays, fte } = derived
      const workingHours = existingWorkingMeta || {}
      if ((workingHours as any)?.id !== undefined && (workingHours as any)?.version !== undefined) {
        return {
          employeeId: activeEmployeeId,
          event: 'pse_submit',
          changeMode,
          pso_exitStrategy: 'complete',
          employeeWorkingHours: {
            id: (workingHours as any)?.id,
            version: (workingHours as any)?.version,
            employeeId: activeEmployeeId,
            weeklyHours: weeklySum,
            weeklyDays: workingDays,
            fullTimeWeeklyHours: 40,
            fullTimeEquivalent: fte,
            activeFrom: toInstantDate(values.activeFrom),
            activeTo: toInstantDate(values.activeTo),
            mondayHours: Number(values.mondayHours || 0),
            tuesdayHours: Number(values.tuesdayHours || 0),
            wednesdayHours: Number(values.wednesdayHours || 0),
            thursdayHours: Number(values.thursdayHours || 0),
            fridayHours: Number(values.fridayHours || 0),
            saturdayHours: Number(values.saturdayHours || 0),
            sundayHours: Number(values.sundayHours || 0),
            remoteRef: (workingHours as any)?.remoteRef ? (workingHours as any)?.remoteRef : ''
          }
        }
      }
      return {
        employeeId: activeEmployeeId,
        event: 'pse_submit',
        changeMode,
        pso_exitStrategy: 'complete',
        employeeWorkingHours: {
          employeeId: activeEmployeeId,
          weeklyHours: weeklySum,
          weeklyDays: workingDays,
          fullTimeWeeklyHours: 40,
          fullTimeEquivalent: fte,
          activeFrom: toInstantDate(values.activeFrom),
          activeTo: toInstantDate(values.activeTo),
          mondayHours: Number(values.mondayHours || 0),
          tuesdayHours: Number(values.tuesdayHours || 0),
          wednesdayHours: Number(values.wednesdayHours || 0),
          thursdayHours: Number(values.thursdayHours || 0),
          fridayHours: Number(values.fridayHours || 0),
          saturdayHours: Number(values.saturdayHours || 0),
          sundayHours: Number(values.sundayHours || 0),
          remoteRef: (workingHours as any)?.remoteRef ? (workingHours as any)?.remoteRef : ''
        }
      }
    },
    [existingWorkingMeta, activeEmployeeId, changeMode]
  )

  const contextValue = useMemo<ChangeWorkingHoursContextState>(
    () => ({
      employee,
      employees,
      defaults,
      employeeHireDate,
      isFirstWorkingHoursEntry,
      existingWorkingMeta,
      workingHoursValidationRecords,
      selectedEmployeeId,
      setSelectedEmployeeId,
      activeEmployeeId,
      isFixedEmployeeId,
      loading,
      error,
      changeMode,
      reload,
      buildSubmitPayload
    }),
    [
      employee,
      employees,
      defaults,
      employeeHireDate,
      isFirstWorkingHoursEntry,
      existingWorkingMeta,
      workingHoursValidationRecords,
      selectedEmployeeId,
      activeEmployeeId,
      isFixedEmployeeId,
      loading,
      error,
      changeMode,
      reload,
      buildSubmitPayload
    ]
  )

  return <ChangeWorkingHoursContext.Provider value={contextValue}>{children}</ChangeWorkingHoursContext.Provider>
}
