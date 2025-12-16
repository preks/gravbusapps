import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Spinner, RecordLayout } from '@newwork/nw-design-system'
import { Briefcase, Calendar, User, FileText } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useJobApplication } from '@/common/data/recruiting/hooks/useJobApplication'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { AppAction } from '@/components/app-action'
import { HomeView } from './views/home-view'
import { InterviewsView } from './views/interviews-view'

interface JobApplicationRecordContentProps extends BusinessAppContextProps {
  jobApplicationId: string
  onBack: () => void
}

const JobApplicationRecordContent: React.FC<JobApplicationRecordContentProps> = ({
  jobApplicationId,
  onBack,
  ...props
}) => {
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window === 'undefined') return 'overview'
    const params = new URLSearchParams(window.location.search)
    return params.get('tab') || 'overview'
  })

  // Fetch job application data
  const { jobApplication, loading, error, refetch } = useJobApplication(props.accessToken, jobApplicationId, 'record')

  // Fetch job application data function for refetch
  const fetchJobApplicationData = useCallback(async () => {
    await refetch()
  }, [refetch])

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value)
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    url.searchParams.set('tab', value)
    window.history.replaceState(null, '', url.toString())
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (!params.get('tab')) {
      const url = new URL(window.location.href)
      url.searchParams.set('tab', activeTab)
      window.history.replaceState(null, '', url.toString())
    }
    const onPop = () => {
      const next = new URLSearchParams(window.location.search).get('tab') || 'overview'
      setActiveTab(next)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [activeTab])

  // Memoized callback for process completion
  const handleProcessSuccess = useCallback(() => {
    fetchJobApplicationData()
  }, [fetchJobApplicationData])

  // Listen for process completion events to refresh job application data
  useProcessCompletion({
    onSuccess: handleProcessSuccess
  })

  // Memoize header data
  const headerDetailGroups = useMemo(
    () => [
      {
        id: 'job-application-details',
        items: [
          {
            label: getTranslationFromI18nKeyAndLabel('recruiting.applicationDate', 'Application Date'),
            value: jobApplication?.applicationDate
              ? new Date(jobApplication.applicationDate).toLocaleDateString()
              : getTranslationFromI18nKeyAndLabel('common.notSpecified', 'Not specified'),
            icon: Calendar
          },
          {
            label: getTranslationFromI18nKeyAndLabel('recruiting.currentStage', 'Current Stage'),
            value:
              jobApplication?.currentStage || getTranslationFromI18nKeyAndLabel('common.notSpecified', 'Not specified'),
            icon: Briefcase
          },
          {
            label: getTranslationFromI18nKeyAndLabel('recruiting.candidate', 'Candidate'),
            value: jobApplication?.jobCandidate
              ? `${jobApplication.jobCandidate.firstName} ${jobApplication.jobCandidate.lastName}`.trim()
              : getTranslationFromI18nKeyAndLabel('common.notSpecified', 'Not specified'),
            icon: User
          },
          {
            label: getTranslationFromI18nKeyAndLabel('recruiting.jobPosting', 'Job Posting'),
            value:
              jobApplication?.jobPosting?.jobTitle ||
              getTranslationFromI18nKeyAndLabel('common.notSpecified', 'Not specified'),
            icon: FileText
          }
        ]
      }
    ],
    [jobApplication]
  )

  // Calculate jobApplicationName early for use in headerActionButton
  const jobApplicationName = jobApplication?.jobCandidate
    ? `${jobApplication.jobCandidate.firstName} ${jobApplication.jobCandidate.lastName} - ${jobApplication.jobPosting?.jobTitle || 'Application'}`
    : getTranslationFromI18nKeyAndLabel('recruiting.jobApplication.unnamed', 'Unnamed Application')

  const headerActionButton = useMemo(() => {
    const entityUrl = buildPlatformUrl('/platform/hr/recruiting/job-application-record', {
      jobApplicationId
    })

    return (
      <AppAction
        data-testid="job-application-record-action-button"
        variant="header"
        contexts={[]}
        shareContext={{
          entityType: 'jobApplication',
          entityId: jobApplicationId,
          entityName: jobApplicationName,
          entityUrl
        }}
        prefixDataTestId="job-application-record-action"
        accessToken={props.accessToken}
      />
    )
  }, [jobApplicationId, jobApplicationName, props.accessToken])

  const subViewsConfig = useMemo(
    () => ({
      defaultValue: activeTab,
      onValueChange: handleTabChange,
      items: [
        {
          value: 'overview',
          label: getTranslationFromI18nKeyAndLabel('recruiting.overview', 'Overview'),
          icon: <Briefcase className="gba:mr-2" />,
          content: <HomeView jobApplicationId={jobApplicationId} jobApplication={jobApplication} {...props} />
        },
        {
          value: 'interviews',
          label: getTranslationFromI18nKeyAndLabel('recruiting.interviews', 'Interviews'),
          icon: <Calendar className="gba:mr-2" />,
          content: <InterviewsView jobApplicationId={jobApplicationId} {...props} />
        }
      ]
    }),
    [activeTab, handleTabChange, jobApplicationId, jobApplication, props]
  )

  if (loading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !jobApplication) {
    return (
      <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:min-h-screen gba:gap-4">
        <div className="gba:text-lg gba:font-semibold gba:text-destructive">
          {getTranslationFromI18nKeyAndLabel('recruiting.jobApplication.loadError', 'Failed to load job application')}
        </div>
        {error && <div className="gba:text-sm gba:text-muted-foreground">{error}</div>}
      </div>
    )
  }

  return (
    <RecordLayout
      headerOrientation="horizontal"
      headerIcon={Briefcase}
      headerCategory={getTranslationFromI18nKeyAndLabel('recruiting.jobApplication', 'Job Application')}
      onBack={onBack}
      headerTitle={jobApplicationName}
      headerDetailGroups={headerDetailGroups}
      headerActionButton={headerActionButton}
      subViews={subViewsConfig}
    />
  )
}

// Wrapper component to handle ID extraction and navigation
const JobApplicationRecord: React.FC<BusinessAppContextProps> = ({ additionalData = {}, ...props }) => {
  const jobApplicationId =
    additionalData.jobApplicationId || new URLSearchParams(window.location.search).get('jobApplicationId')

  const handleBack = () => {
    // Navigate back based on context - could be from candidate or posting
    const url = buildPlatformUrl('/platform/hr/recruiting/recruitment-manager', {
      view: 'job-postings'
    })
    navigateTo(url)
  }

  if (!jobApplicationId) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <div className="gba:text-lg gba:font-semibold gba:text-destructive">
          {getTranslationFromI18nKeyAndLabel('recruiting.jobApplication.missingId', 'Job application ID is missing')}
        </div>
      </div>
    )
  }

  return <JobApplicationRecordContent jobApplicationId={jobApplicationId} onBack={handleBack} {...props} />
}

export default JobApplicationRecord
