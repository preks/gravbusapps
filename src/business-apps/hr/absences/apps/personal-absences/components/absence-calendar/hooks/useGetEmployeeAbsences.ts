import { useEffect, useState } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'

interface UseGetEmployeeAbsencesProps {
  employeeId?: string
  accessToken: string
}

export interface EmployeeAbsence {
  id: string
  description?: string
  startDate: string
  endDate: string
  status?: string
  type: {
    value: string
    objectValue?: any
  }
}

export function useGetEmployeeAbsences({ employeeId, accessToken }: UseGetEmployeeAbsencesProps) {
  const client = useGraphqlClient(accessToken)
  const [absences, setAbsences] = useState<EmployeeAbsence[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!employeeId || !client) return
    setLoading(true)
    setError(null)

    const ABSENCES_QUERY = `
      query GetEmployeeAbsences($employeeId: uuid!) {
        EmployeeAbsence(where: { employee: { id: { _eq: $employeeId } } }) {
          id
          description
          startDate
          endDate
          status
          type {
            value
            objectValue
          }
        }
      }
    `

    client
      .request(ABSENCES_QUERY, { employeeId })
      .then((data: any) => {
        if (data && data.EmployeeAbsence) {
          setAbsences(data.EmployeeAbsence)
        } else {
          setAbsences([])
        }
      })
      .catch(err => {
        setError(err as Error)
        setAbsences([])
      })
      .finally(() => setLoading(false))
  }, [client, employeeId])

  return { absences, loading, error }
}
