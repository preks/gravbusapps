import React, { useMemo, useCallback } from 'react'
import { Spinner, RecordLayout } from '@newwork/nw-design-system'
import { Briefcase, MapPin, FileText, Home as HomeIcon, Users } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useJobPosting } from '@/common/data/recruiting/hooks/useJobPosting'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { ApplicationsView } from './views/applications-view'

interface JobPostingRecordContentProps extends BusinessAppContextProps {
  jobPostingId: string
  onBack: () => void
}

const JobPostingRecordContent: React.FC<JobPostingRecordContentProps> = ({ jobPostingId, onBack, ...props }) => {
  // Fetch job posting data
  const { jobPosting, loading, error, refetch } = useJobPosting(props.accessToken, jobPostingId, 'record')

  // Fetch job posting data function for refetch
  const fetchJobPostingData = useCallback(async () => {
    await refetch()
  }, [refetch])

  // Memoized callback for process completion
  const handleProcessSuccess = useCallback(() => {
    fetchJobPostingData()
  }, [fetchJobPostingData])

  // Listen for process completion events to refresh job posting data
  useProcessCompletion({
    onSuccess: handleProcessSuccess
  })

  // Memoize header data
  const headerDetailGroups = useMemo(
    () => [
      {
        id: 'job-posting-details',
        items: [
          {
            label: getTranslationFromI18nKeyAndLabel('recruiting.department', 'Department'),
            value: jobPosting?.department || getTranslationFromI18nKeyAndLabel('common.notSpecified', 'Not specified'),
            icon: Briefcase
          },
          {
            label: getTranslationFromI18nKeyAndLabel('recruiting.location', 'Location'),
            value: jobPosting?.location || getTranslationFromI18nKeyAndLabel('common.notSpecified', 'Not specified'),
            icon: MapPin
          },
          {
            label: getTranslationFromI18nKeyAndLabel('recruiting.contractType', 'Contract Type'),
            value:
              jobPosting?.contractType || getTranslationFromI18nKeyAndLabel('common.notSpecified', 'Not specified'),
            icon: FileText
          },
          {
            label: getTranslationFromI18nKeyAndLabel('recruiting.remote', 'Remote'),
            value: jobPosting?.remote || getTranslationFromI18nKeyAndLabel('common.notSpecified', 'Not specified'),
            icon: HomeIcon
          }
        ]
      }
    ],
    [jobPosting]
  )

  // Calculate jobPostingName early for use in headerActionButton
  const jobPostingName =
    jobPosting?.jobTitle || getTranslationFromI18nKeyAndLabel('recruiting.jobPosting.unnamed', 'Unnamed Job Posting')

  const headerActionButton = useMemo(
    () => (
      <AppAction
        data-testid="job-posting-record-action-button"
        variant="header"
        contexts={[
          {
            context: FlowContextName.jobPostingEntity,
            contextData: { jobPostingId }
          }
        ]}
        shareContext={{
          entityType: 'jobPosting',
          entityId: jobPostingId,
          entityName: jobPostingName,
          entityUrl: buildPlatformUrl('/platform/hr/recruiting/job-posting-record', {
            jobPostingId
          })
        }}
        prefixDataTestId="job-posting-record-action"
        accessToken={props.accessToken}
      />
    ),
    [jobPostingId, jobPostingName, props.accessToken]
  )

  // Single tab configuration for Applications (must be before early returns to satisfy Rules of Hooks)
  const subViewsConfig = useMemo(
    () => ({
      defaultValue: 'applications',
      onValueChange: () => {}, // No-op since we only have one tab
      items: [
        {
          value: 'applications',
          label: getTranslationFromI18nKeyAndLabel('recruiting.jobPosting.applications', 'Applications'),
          icon: <Users className="gba:mr-2" />,
          content: <ApplicationsView jobPostingId={jobPostingId} {...props} />
        }
      ]
    }),
    [jobPostingId, props]
  )

  if (loading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !jobPosting) {
    return (
      <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:min-h-screen gba:gap-4">
        <div className="gba:text-lg gba:font-semibold gba:text-destructive">
          {getTranslationFromI18nKeyAndLabel('recruiting.jobPosting.loadError', 'Failed to load job posting')}
        </div>
        {error && <div className="gba:text-sm gba:text-muted-foreground">{error}</div>}
      </div>
    )
  }

  return (
    <RecordLayout
      headerOrientation="horizontal"
      headerIcon={Briefcase}
      headerCategory={getTranslationFromI18nKeyAndLabel('recruiting.jobPosting', 'Job Posting')}
      onBack={onBack}
      headerTitle={jobPostingName}
      headerDetailGroups={headerDetailGroups}
      headerActionButton={headerActionButton}
      subViews={subViewsConfig}
    />
  )
}

// Wrapper component to handle ID extraction and navigation
const JobPostingRecord: React.FC<BusinessAppContextProps> = ({ additionalData = {}, ...props }) => {
  const jobPostingId = additionalData.jobPostingId || new URLSearchParams(window.location.search).get('jobPostingId')

  const handleBack = () => {
    const url = buildPlatformUrl('/platform/hr/recruiting/recruitment-manager', {
      view: 'job-postings'
    })
    navigateTo(url)
  }

  if (!jobPostingId) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <div className="gba:text-lg gba:font-semibold gba:text-destructive">
          {getTranslationFromI18nKeyAndLabel('recruiting.jobPosting.missingId', 'Job posting ID is missing')}
        </div>
      </div>
    )
  }

  return <JobPostingRecordContent jobPostingId={jobPostingId} onBack={handleBack} {...props} />
}

export default JobPostingRecord
