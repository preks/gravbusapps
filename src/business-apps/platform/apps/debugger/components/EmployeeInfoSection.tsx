import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button, Spinner, Alert } from '@newwork/nw-design-system'
import { CopyIcon } from '@phosphor-icons/react'
import { useEmployeeData } from '../hooks/useEmployeeData'
import { JsonViewer } from './JsonViewer'

interface EmployeeInfoSectionProps {
  accessToken: string
  userId?: string
}

export const EmployeeInfoSection: React.FC<EmployeeInfoSectionProps> = ({ accessToken, userId }) => {
  const { employee, loading, error } = useEmployeeData(accessToken, userId)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (employee) {
      navigator.clipboard.writeText(JSON.stringify(employee, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle>Employee Info</CardTitle>
          {employee && (
            <Button variant="ghost" size="sm" onClick={handleCopy}>
              <CopyIcon className="gba:w-4 gba:h-4 gba:mr-1" />
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="gba:flex gba:items-center gba:gap-2">
            <Spinner className="gba:w-4 gba:h-4" />
            <span>Loading employee data...</span>
          </div>
        )}
        {error && (
          <Alert variant="destructive">
            <div className="gba:font-semibold">Error</div>
            <div className="gba:text-sm gba:mt-1">{error}</div>
          </Alert>
        )}
        {!loading && !error && !employee && (
          <div className="gba:text-muted-foreground">
            No employee data found. {userId ? 'User ID: ' + userId : 'No user ID available.'}
          </div>
        )}
        {!loading && !error && employee && <JsonViewer data={employee} />}
      </CardContent>
    </Card>
  )
}
