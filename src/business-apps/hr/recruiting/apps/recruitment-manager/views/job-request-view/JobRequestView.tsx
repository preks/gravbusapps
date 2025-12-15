import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useJobRequests } from '@/common/data/recruiting/hooks/useJobRequests'
import { Card } from '@newwork/nw-design-system'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export type JobRequestViewProps = BusinessAppContextProps

export const JobRequestView: React.FC<JobRequestViewProps> = context => {
  const { jobRequests, total, loading, error, refetch } = useJobRequests(context.accessToken, {})

  if (loading && jobRequests.length === 0) {
    return <div className="gba:flex gba:items-center gba:justify-center gba:h-full">Loading...</div>
  }

  if (error) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:flex-col gba:gap-4">
        <p className="gba:text-destructive">Error: {error}</p>
        <button
          onClick={() => refetch()}
          className="gba:px-4 gba:py-2 gba:bg-primary gba:text-primary-foreground gba:rounded"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div data-testid="job-request-view" className="gba:h-full gba:overflow-auto gba:p-6">
      <div className="gba:mb-4">
        <h2 className="gba:text-2xl gba:font-bold">
          {getTranslationFromI18nKeyAndLabel('allJobRequests', 'All Job Requisitions')}
        </h2>
        <p className="gba:text-muted-foreground">Total: {total}</p>
      </div>

      <div className="gba:grid gba:gap-4">
        {jobRequests.map(request => (
          <Card key={request.id} className="gba:p-4">
            <div className="gba:flex gba:justify-between gba:items-start">
              <div>
                <h3 className="gba:text-lg gba:font-semibold">{request.name || '-'}</h3>
                <p className="gba:text-sm gba:text-muted-foreground">Code: {request.code || '-'}</p>
                <p className="gba:text-sm">Headcount: {request.headcount || 0}</p>
                {request.endDate && <p className="gba:text-sm">End Date: {request.endDate}</p>}
              </div>
              <AppActionButton
                data-testid={`job-request-update-button-${request.id}`}
                size="icon"
                contextsArray={[]}
                externalContextData={{ jobRequestId: request.id }}
                prefixDataTestId="job-request-update"
                accessToken={context.accessToken}
                emptyStateBehavior="enable"
                deferMainContextRequestsUntilClick
              />
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
