import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { EMPLOYEE_DATA_QUERY, ALL_EMPLOYEE_DATA_QUERY } from '../ChangeWorkingHoursQueries'
import { WorkingHoursFormValues } from '../constants/changeWorkingHoursConstants'
import { getCurrentActiveStructureId, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface EmployeeLite {
  pictureThumbnail?: string
  firstName?: string
  lastName?: string
  employeePosition?: {
    jobPosition?: { name?: string }
  }
}

export interface ChangeWorkingHoursContextState {
  employee: EmployeeLite | null
  employees: Array<{ id: string; firstName: string; lastName: string }>
  defaults: WorkingHoursFormValues | null
  existingWorkingMeta: { id?: string; version?: number; remoteRef?: string } | null
  selectedEmployeeId: string
  setSelectedEmployeeId: (id: string) => void
  activeEmployeeId: string
  isFixedEmployeeId: boolean
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  buildSubmitPayload: (
    values: WorkingHoursFormValues,
    derived: { weeklySum: number; workingDays: number; fte: number }
  ) => any
}

const ChangeWorkingHoursContext = createContext<ChangeWorkingHoursContextState | undefined>(undefined)

export const useChangeWorkingHoursContext = () => {
  const ctx = useContext(ChangeWorkingHoursContext)
  if (!ctx) throw new Error('useChangeWorkingHoursContext must be used within ChangeWorkingHoursProvider')
  return ctx
}

export interface ChangeWorkingHoursProviderProps {
  accessToken: string
  userInfo?: BusinessAppContextProps['userInfo']
  employeeId?: string
  children: React.ReactNode
}

export function ChangeWorkingHoursProvider({
  accessToken,
  userInfo,
  employeeId,
  children
}: ChangeWorkingHoursProviderProps) {
  const graphql = useGraphqlClient(accessToken)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [employee, setEmployee] = useState<EmployeeLite | null>(null)
  const [defaults, setDefaults] = useState<WorkingHoursFormValues | null>(null)
  const [existingWorkingMeta, setExistingWorkingMeta] = useState<{
    id?: string
    version?: number
    remoteRef?: string
  } | null>(null)
  const [employees, setEmployees] = useState<Array<{ id: string; firstName: string; lastName: string }>>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
  const isFixedEmployeeId = useMemo(() => Boolean(employeeId && String(employeeId).trim().length > 0), [employeeId])
  const activeEmployeeId = useMemo(() => employeeId || selectedEmployeeId, [employeeId, selectedEmployeeId])

  const loadEmployee = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res: any = await graphql.request(EMPLOYEE_DATA_QUERY as any, { employeeId: activeEmployeeId })
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
      setExistingWorkingMeta({ id: working?.id, version: working?.version, remoteRef: working?.remoteRef })
    } catch (e: any) {
      setError(
        e?.message ||
          getTranslationFromI18nKeyAndLabel('lowcoder:employee_termination.error_load_title', 'Error Loading Employee')
      )
    } finally {
      setLoading(false)
    }
  }, [activeEmployeeId, graphql])

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
          pso_exitStrategy: 'complete',
          employeeWorkingHours: {
            id: (workingHours as any)?.id,
            version: (workingHours as any)?.version,
            employeeId: activeEmployeeId,
            weeklyHours: weeklySum,
            weeklyDays: workingDays,
            fullTimeWeeklyHours: 40,
            fullTimeEquivalent: fte,
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
        pso_exitStrategy: 'complete',
        employeeWorkingHours: {
          employeeId: activeEmployeeId,
          weeklyHours: weeklySum,
          weeklyDays: workingDays,
          fullTimeWeeklyHours: 40,
          fullTimeEquivalent: fte,
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
    [existingWorkingMeta, activeEmployeeId]
  )

  return (
    <ChangeWorkingHoursContext.Provider
      value={{
        employee,
        employees,
        defaults,
        existingWorkingMeta,
        selectedEmployeeId,
        setSelectedEmployeeId,
        activeEmployeeId,
        isFixedEmployeeId,
        loading,
        error,
        reload,
        buildSubmitPayload
      }}
    >
      {children}
    </ChangeWorkingHoursContext.Provider>
  )
}
