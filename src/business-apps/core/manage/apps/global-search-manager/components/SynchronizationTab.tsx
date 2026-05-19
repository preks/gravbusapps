import React, { useState } from 'react'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Spinner } from '@newwork/nw-design-system'
import type { GlobalSearchClient } from '@/common/network/global-search/GlobalSearchClient'

interface SynchronizationTabProps {
  client: GlobalSearchClient
}

export const SynchronizationTab: React.FC<SynchronizationTabProps> = ({ client }) => {
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const triggerAnalyticsMaintenance = async () => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const response = await client.triggerAnalyticsMaintenance()
      const jobLabels = response.jobs.map(job => `${job.queue}/${job.jobId}`).join(', ')
      setStatusMessage(`Analytics maintenance queued: ${jobLabels}`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Triggering maintenance failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card data-testid="global-search-manager-sync-tab">
      <CardHeader>
        <CardTitle>Analytics Maintenance</CardTitle>
        <CardDescription>Trigger trend recalculation, popular entity aggregation, and event cleanup.</CardDescription>
      </CardHeader>
      <CardContent className="gba:space-y-3">
        <Button onClick={() => void triggerAnalyticsMaintenance()} disabled={isLoading}>
          {isLoading ? <Spinner size="sm" /> : null}
          Trigger
        </Button>
        {statusMessage && <p className="gba:text-sm gba:text-muted-foreground">{statusMessage}</p>}
        {errorMessage && <p className="gba:text-sm gba:text-destructive">{errorMessage}</p>}
      </CardContent>
    </Card>
  )
}
