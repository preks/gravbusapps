import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@newwork/nw-design-system'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

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

  if (isLoading) {
    return (
      <Card className="gba:w-full gba:animate-pulse">
        <CardContent className="gba:p-4">
          <div className="gba:h-32 gba:bg-muted gba:rounded" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="gba:w-full">
        <CardContent className="gba:p-4">
          <span className="gba:text-destructive gba:text-lg">{error}</span>
        </CardContent>
      </Card>
    )
  }

  if (!absence) {
    return null
  }

  return (
    <Card className="gba:w-full gba:rounded-2xl" data-testid="absence-display">
      <CardContent className="gba:p-6">
        <div className="gba:flex gba:items-start gba:justify-between gba:mb-4">
          <span className="gba:text-lg gba:font-semibold">Absence</span>
          {operation && (
            <span
              className={`gba:text-sm gba:font-medium gba:px-2.5 gba:py-0.5 gba:rounded-xl gba:capitalize ${
                operation === 'create'
                  ? 'gba:bg-success-secondary gba:text-success'
                  : 'gba:bg-muted gba:text-muted-foreground'
              }`}
            >
              {operation}
            </span>
          )}
        </div>

        <div className="gba:space-y-3">
          <div>
            <div className="gba:text-muted-foreground gba:text-sm">Employee</div>
            <div className="gba:text-foreground gba:text-base gba:font-bold">
              {absence.employee ? `${absence.employee.firstName} ${absence.employee.lastName}` : '-'}
            </div>
          </div>

          <div>
            <div className="gba:text-muted-foreground gba:text-sm">Type of absence</div>
            <div className="gba:text-foreground gba:text-sm">{absence.reason || '-'}</div>
          </div>

          <div>
            <div className="gba:text-muted-foreground gba:text-sm">Start</div>
            <div className="gba:text-foreground gba:text-sm">{absence.startDate || '-'}</div>
          </div>

          <div>
            <div className="gba:text-muted-foreground gba:text-sm">End</div>
            <div className="gba:text-foreground gba:text-sm">{absence.endDate || '-'}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default AbsenceDisplay
