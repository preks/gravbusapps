import { useState, useEffect } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { GET_EMPLOYEE_ABSENCES } from '../queries/queries'
import { transformAbsenceData, transformEntitlementsData } from '../utils/utils'
import { AbsenceListCardAbsence, Entitlement } from '../queries/types'
import { EmployeeAbsenceEntitlement } from './useEmployeeData'

export const useAbsenceData = (
  employeeId: string | undefined,
  accessToken: string,
  employeeAbsenceEntitlement: EmployeeAbsenceEntitlement[]
) => {
  const [absenceList, setAbsenceList] = useState<AbsenceListCardAbsence[]>([])
  const [entitlements, setEntitlements] = useState<Entitlement[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentLocale, setCurrentLocale] = useState(getCurrentActiveUserLocale())

  const client = useGraphqlClient(accessToken)

  useEffect(() => {
    const checkLocale = () => {
      const newLocale = getCurrentActiveUserLocale()
      if (newLocale !== currentLocale) {
        setCurrentLocale(newLocale)
      }
    }

    const interval = setInterval(checkLocale, 1000)
    return () => clearInterval(interval)
  }, [currentLocale])

  const fetchData = async () => {
    if (!employeeId) {
      setAbsenceList([])
      setEntitlements(transformEntitlementsData(employeeAbsenceEntitlement))
      return
    }

    setLoading(true)
    setError(null)

    try {
      const absenceRes = await client.request(GET_EMPLOYEE_ABSENCES, {
        employeeId,
        activeUserLocale: getCurrentActiveUserLocale()
      })
      const absences = absenceRes?.EmployeeAbsence || []
      setAbsenceList(transformAbsenceData(absences))
      setEntitlements(transformEntitlementsData(employeeAbsenceEntitlement))
    } catch {
      setError('Failed to load absence data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, accessToken, currentLocale])

  return {
    absenceList,
    entitlements,
    loading,
    error,
    refetch: fetchData
  }
}
