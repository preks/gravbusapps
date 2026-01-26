import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { User, Hash, Calendar } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { JobCandidate } from '@/common/data/recruiting/types/jobCandidateTypes'

interface HomeViewProps extends BusinessAppContextProps {
  jobCandidate: JobCandidate | null
}

export const HomeView: React.FC<HomeViewProps> = ({ jobCandidate }) => {
  if (!jobCandidate) {
    return (
      <div className="gba:p-6 gba:text-center gba:text-muted-foreground">
        {getTranslationFromI18nKeyAndLabel('recruiting.jobCandidate.notFound', 'Job candidate not found')}
      </div>
    )
  }

  const fullName = `${jobCandidate.firstName} ${jobCandidate.lastName}`.trim()

  return (
    <>
      {/* Candidate Details Card - Full width */}
      <Card
        className="gba:col-span-1 gba:sm:col-span-12 gba:md:col-span-12 gba:lg:col-span-12"
        data-testid="job-candidate-details-card"
      >
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <User className="gba:h-5 gba:w-5" />
            {getTranslationFromI18nKeyAndLabel('recruiting.jobCandidate.details', 'Candidate Details')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-6">
            {/* Full Name */}
            <div className="gba:space-y-1">
              <div className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
                <User className="gba:h-4 gba:w-4" />
                {getTranslationFromI18nKeyAndLabel('recruiting.fullName', 'Full Name')}
              </div>
              <div className="gba:text-base gba:font-semibold">{fullName}</div>
            </div>

            {/* First Name */}
            <div className="gba:space-y-1">
              <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel('recruiting.firstName', 'First Name')}
              </div>
              <div className="gba:text-base">{jobCandidate.firstName}</div>
            </div>

            {/* Last Name */}
            <div className="gba:space-y-1">
              <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel('recruiting.lastName', 'Last Name')}
              </div>
              <div className="gba:text-base">{jobCandidate.lastName}</div>
            </div>

            {/* Candidate Code */}
            {jobCandidate.code && (
              <div className="gba:space-y-1">
                <div className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
                  <Hash className="gba:h-4 gba:w-4" />
                  {getTranslationFromI18nKeyAndLabel('recruiting.candidateCode', 'Candidate Code')}
                </div>
                <div className="gba:text-base gba:font-mono">{jobCandidate.code}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Audit Information Card - Full width */}
      <Card
        className="gba:col-span-1 gba:sm:col-span-12 gba:md:col-span-12 gba:lg:col-span-12"
        data-testid="job-candidate-audit-card"
      >
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <Calendar className="gba:h-5 gba:w-5" />
            {getTranslationFromI18nKeyAndLabel('recruiting.auditInfo', 'Record Information')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-6">
            {/* Created Date */}
            {jobCandidate.createdAt && (
              <div className="gba:space-y-1">
                <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel('common.createdAt', 'Created At')}
                </div>
                <div className="gba:text-base">{new Date(jobCandidate.createdAt).toLocaleString()}</div>
              </div>
            )}

            {/* Updated Date */}
            {jobCandidate.updatedAt && (
              <div className="gba:space-y-1">
                <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel('common.updatedAt', 'Updated At')}
                </div>
                <div className="gba:text-base">{new Date(jobCandidate.updatedAt).toLocaleString()}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  )
}
