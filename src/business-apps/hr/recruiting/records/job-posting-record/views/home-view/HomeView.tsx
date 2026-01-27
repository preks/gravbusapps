import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { Briefcase, MapPin, FileText, Home, Calendar } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { JobPosting } from '@/common/data/recruiting/types/jobPostingTypes'

interface HomeViewProps extends BusinessAppContextProps {
  jobPosting: JobPosting | null
}

export const HomeView: React.FC<HomeViewProps> = ({ jobPosting }) => {
  if (!jobPosting) {
    return (
      <div className="gba:p-6 gba:text-center gba:text-muted-foreground">
        {getTranslationFromI18nKeyAndLabel('recruiting.jobPosting.notFound', 'Job posting not found')}
      </div>
    )
  }

  return (
    <>
      {/* Job Details Card - Full width */}
      <Card
        className="gba:col-span-1 gba:sm:col-span-12 gba:md:col-span-12 gba:lg:col-span-12"
        data-testid="job-posting-details-card"
      >
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <Briefcase className="gba:h-5 gba:w-5" />
            {getTranslationFromI18nKeyAndLabel('recruiting.jobPosting.details', 'Job Details')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-6">
            {/* Job Title */}
            <div className="gba:space-y-1">
              <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel('recruiting.title', 'Job Title')}
              </div>
              <div className="gba:text-base gba:font-semibold">{jobPosting.title || '-'}</div>
            </div>

            {/* Department */}
            {jobPosting.department && (
              <div className="gba:space-y-1">
                <div className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
                  <Briefcase className="gba:h-4 gba:w-4" />
                  {getTranslationFromI18nKeyAndLabel('recruiting.department', 'Department')}
                </div>
                <div className="gba:text-base">{jobPosting.department}</div>
              </div>
            )}

            {/* Location */}
            {jobPosting.location && (
              <div className="gba:space-y-1">
                <div className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
                  <MapPin className="gba:h-4 gba:w-4" />
                  {getTranslationFromI18nKeyAndLabel('recruiting.location', 'Location')}
                </div>
                <div className="gba:text-base">{jobPosting.location}</div>
              </div>
            )}

            {/* Contract Type */}
            {jobPosting.contractType && (
              <div className="gba:space-y-1">
                <div className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
                  <FileText className="gba:h-4 gba:w-4" />
                  {getTranslationFromI18nKeyAndLabel('recruiting.contractType', 'Contract Type')}
                </div>
                <div className="gba:text-base">{jobPosting.contractType}</div>
              </div>
            )}

            {/* Remote */}
            {jobPosting.remote && (
              <div className="gba:space-y-1">
                <div className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
                  <Home className="gba:h-4 gba:w-4" />
                  {getTranslationFromI18nKeyAndLabel('recruiting.remote', 'Remote')}
                </div>
                <div className="gba:text-base">{jobPosting.remote}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Audit Information Card - Full width */}
      <Card
        className="gba:col-span-1 gba:sm:col-span-12 gba:md:col-span-12 gba:lg:col-span-12"
        data-testid="job-posting-audit-card"
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
            {jobPosting.createdAt && (
              <div className="gba:space-y-1">
                <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel('common.createdAt', 'Created At')}
                </div>
                <div className="gba:text-base">{new Date(jobPosting.createdAt).toLocaleString()}</div>
              </div>
            )}

            {/* Updated Date */}
            {jobPosting.updatedAt && (
              <div className="gba:space-y-1">
                <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel('common.updatedAt', 'Updated At')}
                </div>
                <div className="gba:text-base">{new Date(jobPosting.updatedAt).toLocaleString()}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  )
}
