import { useState, useEffect, useMemo, useRef } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import dayjs from 'dayjs'

export interface NewJoiner {
  id: string
  userId: string
  firstName: string
  lastName: string
  fullName: string
  pictureThumbnail?: string
  jobPositionName?: string
  orgUnitName?: string
  hireDate: string
}

interface UseNewJoinersProps {
  accessToken: string
}

interface UseNewJoinersResult {
  joiners: NewJoiner[]
  isLoading: boolean
  error: Error | null
}

export const useNewJoiners = ({ accessToken }: UseNewJoinersProps): UseNewJoinersResult => {
  const [joiners, setJoiners] = useState<NewJoiner[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const requestIdRef = useRef(0)

  const graphQLClient = useGraphQLClient(accessToken)

  const dateRange = useMemo(() => {
    const start = dayjs().subtract(7, 'day').format('YYYY-MM-DD')
    const end = dayjs().add(14, 'day').format('YYYY-MM-DD')
    return { start, end }
  }, [])

  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false)
      return
    }

    const currentRequestId = ++requestIdRef.current
    let cancelled = false

    const fetchNewJoiners = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const query = `
          query GetNewJoiners($startDate: timestamp!, $endDate: timestamp!) {
            EmployeeWorkingCondition(
              where: {
                hireDate: { _gte: $startDate, _lte: $endDate },
                employee: { isDeleted: { _eq: false } }
              },
              orderBy: { hireDate: ASC }
            ) {
              hireDate
              employee {
                id
                userId
                firstName
                lastName
                pictureThumbnail
                employeePosition {
                  jobPosition {
                    name
                  }
                  organizationalUnit {
                    name
                  }
                }
              }
            }
          }
        `

        const response = await graphQLClient.request<{
          EmployeeWorkingCondition: Array<{
            hireDate: string
            employee: {
              id: string
              userId: string
              firstName: string
              lastName: string
              pictureThumbnail?: string
              employeePosition?: { jobPosition?: { name?: string }; organizationalUnit?: { name?: string } }
            }
          }>
        }>(query, {
          startDate: dateRange.start,
          endDate: dateRange.end
        })

        if (cancelled || currentRequestId !== requestIdRef.current) return

        const conditions = response?.EmployeeWorkingCondition || []

        const seen = new Set<string>()
        const mapped: NewJoiner[] = []

        for (const wc of conditions) {
          const emp = wc.employee
          if (!emp || seen.has(emp.id)) continue
          seen.add(emp.id)

          mapped.push({
            id: emp.id,
            userId: emp.userId,
            firstName: emp.firstName,
            lastName: emp.lastName,
            fullName: `${emp.firstName} ${emp.lastName}`,
            pictureThumbnail: emp.pictureThumbnail,
            jobPositionName: emp.employeePosition?.jobPosition?.name,
            orgUnitName: emp.employeePosition?.organizationalUnit?.name,
            hireDate: wc.hireDate
          })
        }

        setJoiners(mapped)
      } catch (err) {
        if (!cancelled && currentRequestId === requestIdRef.current) {
          setError(err instanceof Error ? err : new Error('Failed to fetch new joiners'))
        }
      } finally {
        if (!cancelled && currentRequestId === requestIdRef.current) {
          setIsLoading(false)
        }
      }
    }

    fetchNewJoiners()

    return () => {
      cancelled = true
    }
  }, [accessToken, dateRange.start, dateRange.end])

  return { joiners, isLoading, error }
}
