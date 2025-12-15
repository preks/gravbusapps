import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useJobApplications } from '@/common/data/recruiting/hooks/useJobApplications'
import { Card } from '@newwork/nw-design-system'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export type JobApplicationViewProps = BusinessAppContextProps

export const JobApplicationView: React.FC<JobApplicationViewProps> = context => {
  const { jobApplications, total, loading, error, refetch } = useJobApplications(context.accessToken, {})

  if (loading && jobApplications.length === 0) {
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
    <div data-testid="job-application-view" className="gba:h-full gba:overflow-auto gba:p-6">
      <div className="gba:mb-4">
        <h2 className="gba:text-2xl gba:font-bold">
          {getTranslationFromI18nKeyAndLabel('allJobApplications', 'All Job Applications')}
        </h2>
        <p className="gba:text-muted-foreground">Total: {total}</p>
      </div>

      <div className="gba:grid gba:gap-4">
        {jobApplications.map(application => (
          <Card key={application.id} className="gba:p-4">
            <div className="gba:flex gba:justify-between gba:items-start">
              <div>
                <h3 className="gba:text-lg gba:font-semibold">
                  {application.jobCandidate
                    ? `${application.jobCandidate.firstName || ''} ${application.jobCandidate.lastName || ''}`.trim()
                    : 'Unknown Candidate'}
                </h3>
                {application.jobPosting && <p className="gba:text-sm">Job: {application.jobPosting.jobTitle || '-'}</p>}
                {application.applicationDate && <p className="gba:text-sm">Applied: {application.applicationDate}</p>}
                {application.currentStage && <p className="gba:text-sm">Stage: {application.currentStage}</p>}
              </div>
              <AppActionButton
                data-testid={`job-application-update-button-${application.id}`}
                size="icon"
                contextsArray={[]}
                externalContextData={{ jobApplicationId: application.id }}
                prefixDataTestId="job-application-update"
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
