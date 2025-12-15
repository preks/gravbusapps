import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useJobPostings } from '@/common/data/recruiting/hooks/useJobPostings'
import { Card } from '@newwork/nw-design-system'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export type JobPostingViewProps = BusinessAppContextProps

export const JobPostingView: React.FC<JobPostingViewProps> = context => {
  const { jobPostings, total, loading, error, refetch } = useJobPostings(context.accessToken, {})

  if (loading && jobPostings.length === 0) {
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
    <div data-testid="job-posting-view" className="gba:h-full gba:overflow-auto gba:p-6">
      <div className="gba:mb-4">
        <h2 className="gba:text-2xl gba:font-bold">
          {getTranslationFromI18nKeyAndLabel('allJobPostings', 'All Job Postings')}
        </h2>
        <p className="gba:text-muted-foreground">Total: {total}</p>
      </div>

      <div className="gba:grid gba:gap-4">
        {jobPostings.map(posting => (
          <Card key={posting.id} className="gba:p-4">
            <div className="gba:flex gba:justify-between gba:items-start">
              <div>
                <h3 className="gba:text-lg gba:font-semibold">{posting.jobTitle || '-'}</h3>
                {posting.department && <p className="gba:text-sm">Department: {posting.department}</p>}
                {posting.location && <p className="gba:text-sm">Location: {posting.location}</p>}
                {posting.contractType && <p className="gba:text-sm">Contract Type: {posting.contractType}</p>}
                {posting.remote && <p className="gba:text-sm">Remote: {posting.remote}</p>}
              </div>
              <AppActionButton
                data-testid={`job-posting-update-button-${posting.id}`}
                size="icon"
                contextsArray={[]}
                externalContextData={{ jobPostingId: posting.id }}
                prefixDataTestId="job-posting-update"
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
