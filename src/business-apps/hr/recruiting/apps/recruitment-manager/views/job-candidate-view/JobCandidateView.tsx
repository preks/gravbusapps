import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useJobCandidates } from '@/common/data/recruiting/hooks/useJobCandidates'
import { Card } from '@newwork/nw-design-system'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export type JobCandidateViewProps = BusinessAppContextProps

export const JobCandidateView: React.FC<JobCandidateViewProps> = context => {
  const { jobCandidates, total, loading, error, refetch } = useJobCandidates(context.accessToken, {})

  if (loading && jobCandidates.length === 0) {
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
    <div data-testid="job-candidate-view" className="gba:h-full gba:overflow-auto gba:p-6">
      <div className="gba:mb-4">
        <h2 className="gba:text-2xl gba:font-bold">
          {getTranslationFromI18nKeyAndLabel('allJobCandidates', 'All Job Candidates')}
        </h2>
        <p className="gba:text-muted-foreground">Total: {total}</p>
      </div>

      <div className="gba:grid gba:gap-4">
        {jobCandidates.map(candidate => (
          <Card key={candidate.id} className="gba:p-4">
            <div className="gba:flex gba:justify-between gba:items-start">
              <div>
                <h3 className="gba:text-lg gba:font-semibold">
                  {candidate.firstName} {candidate.lastName}
                </h3>
                <p className="gba:text-sm gba:text-muted-foreground">Code: {candidate.code || '-'}</p>
                {candidate.createdAt && <p className="gba:text-sm">Created: {candidate.createdAt}</p>}
              </div>
              <AppActionButton
                data-testid={`job-candidate-update-button-${candidate.id}`}
                size="icon"
                contextsArray={[]}
                externalContextData={{ jobCandidateId: candidate.id }}
                prefixDataTestId="job-candidate-update"
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
