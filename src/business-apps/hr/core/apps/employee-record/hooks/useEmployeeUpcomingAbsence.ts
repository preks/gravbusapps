import { useState, useEffect } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import dayjs from 'dayjs'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

interface EmployeeAbsence {
  id: string
  startDate: string
  endDate: string
  calendarDays: number
  effectiveDays: number
  status: string
  type: {
    value: string
    parentEntryId?: string
    translations?: {
      localeCode: string
      value: string
    }[]
  }
}

const getEmployeeUpcomingAbsence = `
  query GetEmployeeUpcomingAbsence($employeeId: uuid!, $startDate: timestamp!, $activeUserLocale: String!) {
    EmployeeAbsence(
     where: {
        employeeId: { _eq: $employeeId },
        isDeleted: { _eq: false },
        _and: [
          { startDate: { _gte: $startDate } }
        ]
      }
      orderBy: { startDate: ASC }
    ) {
      id
      startDate
      endDate
      calendarDays
      effectiveDays
      status
      type {
        value
        parentEntryId
        translations(where: { localeCode: { _eq: $activeUserLocale } }) {
          localeCode
          value
        }
      }
    }
  }
`

export const useEmployeeUpcomingAbsence = (accessToken: string, employeeId: string) => {
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [upcomingAbsence, setUpcomingAbsence] = useState<EmployeeAbsence[] | null>(null)
  const [currentLocale, setCurrentLocale] = useState(getCurrentActiveUserLocale())

  const graphqlClient = useGraphqlClient(accessToken)

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

  useEffect(() => {
    const fetchUpcomingAbsence = async () => {
      if (!accessToken || !employeeId) return

      setLoading(true)
      setError(null)

      try {
        const variables = {
          employeeId,
          startDate: dayjs().format('YYYY-MM-DD'),
          activeUserLocale: currentLocale
        }

        const response = await graphqlClient.request(getEmployeeUpcomingAbsence, variables)

        // Check if we have data and sort by startDate to get the most immediate upcoming absence
        if (response?.EmployeeAbsence && response.EmployeeAbsence.length > 0) {
          // If we have multiple absences, sort them by startDate (ascending)
          if (response.EmployeeAbsence.length > 1) {
            response.EmployeeAbsence.sort((a: EmployeeAbsence, b: EmployeeAbsence) => {
              return new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
            })
          }
          setUpcomingAbsence(response.EmployeeAbsence)
        } else {
          setUpcomingAbsence(null)
        }
      } catch (err) {
        console.error('Error fetching upcoming absence:', err)
        setError('Failed to fetch upcoming absence')
        setUpcomingAbsence(null)
      } finally {
        setLoading(false)
      }
    }

    fetchUpcomingAbsence()
  }, [accessToken, employeeId, graphqlClient, currentLocale])

  return {
    loading,
    error,
    upcomingAbsence
  }
}
