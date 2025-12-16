import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { Calendar, Briefcase, User, Hash } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { JobApplication } from '@/common/data/recruiting/types/jobApplicationTypes'

interface HomeViewProps extends BusinessAppContextProps {
  jobApplicationId: string
  jobApplication: JobApplication | null
}

export const HomeView: React.FC<HomeViewProps> = ({ jobApplication }) => {
  if (!jobApplication) {
    return (
      <div className="gba:p-6 gba:text-center gba:text-muted-foreground">
        {getTranslationFromI18nKeyAndLabel('recruiting.jobApplication.notFound', 'Job application not found')}
      </div>
    )
  }

  const candidate = jobApplication.jobCandidate
  const posting = jobApplication.jobPosting

  return (
    <div className="gba:grid gba:gap-6 gba:p-6" data-testid="job-application-home-view">
      {/* Application Details Card */}
      <Card data-testid="job-application-details-card">
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <Briefcase className="gba:h-5 gba:w-5" />
            {getTranslationFromI18nKeyAndLabel('recruiting.jobApplication.details', 'Application Details')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-6">
            {/* Application Date */}
            {jobApplication.applicationDate && (
              <div className="gba:space-y-1">
                <div className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
                  <Calendar className="gba:h-4 gba:w-4" />
                  {getTranslationFromI18nKeyAndLabel('recruiting.applicationDate', 'Application Date')}
                </div>
                <div className="gba:text-base gba:font-semibold">
                  {new Date(jobApplication.applicationDate).toLocaleDateString()}
                </div>
              </div>
            )}

            {/* Current Stage */}
            {jobApplication.currentStage && (
              <div className="gba:space-y-1">
                <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel('recruiting.currentStage', 'Current Stage')}
                </div>
                <div className="gba:text-base">{jobApplication.currentStage}</div>
              </div>
            )}

            {/* Candidate */}
            {candidate && (
              <div className="gba:space-y-1">
                <div className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
                  <User className="gba:h-4 gba:w-4" />
                  {getTranslationFromI18nKeyAndLabel('recruiting.candidate', 'Candidate')}
                </div>
                <div className="gba:text-base">
                  {candidate.firstName} {candidate.lastName}
                </div>
                {candidate.code && (
                  <div className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1">
                    <Hash className="gba:h-3 gba:w-3" />
                    {candidate.code}
                  </div>
                )}
              </div>
            )}

            {/* Job Posting */}
            {posting && (
              <div className="gba:space-y-1">
                <div className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
                  <Briefcase className="gba:h-4 gba:w-4" />
                  {getTranslationFromI18nKeyAndLabel('recruiting.jobPosting', 'Job Posting')}
                </div>
                <div className="gba:text-base">{posting.jobTitle || '-'}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Audit Information Card */}
      <Card data-testid="job-application-audit-card">
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <Calendar className="gba:h-5 gba:w-5" />
            {getTranslationFromI18nKeyAndLabel('recruiting.auditInfo', 'Record Information')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-6">
            {/* Created Date */}
            {jobApplication.createdAt && (
              <div className="gba:space-y-1">
                <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel('common.createdAt', 'Created At')}
                </div>
                <div className="gba:text-base">{new Date(jobApplication.createdAt).toLocaleString()}</div>
              </div>
            )}

            {/* Updated Date */}
            {jobApplication.updatedAt && (
              <div className="gba:space-y-1">
                <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel('common.updatedAt', 'Updated At')}
                </div>
                <div className="gba:text-base">{new Date(jobApplication.updatedAt).toLocaleString()}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
