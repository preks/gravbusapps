import React, { useState, useEffect } from 'react'
import { EntityCard } from './EntityCard'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getOperationBadge } from './utils/displayUtils'

interface AbsenceDisplayProps {
  absenceId: string
  accessToken: string
  operation?: 'create' | 'update' | 'delete' | 'read'
}

interface Absence {
  id: string
  startDate: string
  endDate: string
  reason: string | null
  employee: {
    firstName: string
    lastName: string
  } | null
}

export const AbsenceDisplay: React.FC<AbsenceDisplayProps> = ({ absenceId, accessToken, operation }) => {
  const [absence, setAbsence] = useState<Absence | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchAbsence = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const query = `
          query GetAbsence($id: uuid!) {
            employeeAbsences_by_pk(id: $id) {
              id
              startDate
              endDate
              reason
              employee {
                firstName
                lastName
              }
            }
          }
        `

        const result = await graphqlClient.request<{ employeeAbsences_by_pk: Absence }>(query, { id: absenceId })

        if (result.employeeAbsences_by_pk) {
          setAbsence(result.employeeAbsences_by_pk)
        } else {
          setError('Absence not found')
        }
      } catch (err) {
        console.error('Error fetching absence:', err)
        setError('Failed to load absence')
      } finally {
        setIsLoading(false)
      }
    }

    if (absenceId && accessToken) {
      fetchAbsence()
    }
  }, [absenceId, accessToken, graphqlClient])

  const operationBadge = getOperationBadge(operation)

  const icon = (
    <div className="gba:h-12 gba:w-12 gba:rounded-full gba:bg-info-secondary gba:flex gba:items-center gba:justify-center">
      <svg className="gba:h-6 gba:w-6 gba:text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    </div>
  )

  return (
    <EntityCard
      title={absence?.employee ? `${absence.employee.firstName} ${absence.employee.lastName}` : 'Absence'}
      subtitle={absence?.reason || undefined}
      icon={icon}
      status={operationBadge?.text}
      statusVariant={operationBadge?.variant}
      fields={
        absence
          ? [
              { label: 'Start', value: absence.startDate },
              { label: 'End', value: absence.endDate }
            ]
          : undefined
      }
      isLoading={isLoading}
      error={error || undefined}
      data-testid="absence-display"
    />
  )
}

export default AbsenceDisplay
