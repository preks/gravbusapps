import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Spinner, RecordLayout, IconAvatar, HeaderSlot } from '@newwork/nw-design-system'
import { Briefcase, Calendar, User, FileText } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useJobApplication } from '@/common/data/recruiting/hooks/useJobApplication'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
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
    if (globalThis.window === undefined || !globalThis.window?.location) return 'overview'
    const params = new URLSearchParams(globalThis.window.location.search)
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
    if (globalThis.window === undefined) return
    const url = new URL(globalThis.window.location.href)
    url.searchParams.set('tab', value)
    globalThis.history.replaceState(null, '', url.toString())
  }, [])

  useEffect(() => {
    if (globalThis.window === undefined || !globalThis.window?.location) return
    const params = new URLSearchParams(globalThis.window.location.search)
    if (!params.get('tab')) {
      const url = new URL(globalThis.window.location.href)
      url.searchParams.set('tab', activeTab)
      globalThis.history.replaceState(null, '', url.toString())
    }
    const onPop = () => {
      const next = new URLSearchParams(globalThis.window.location.search).get('tab') || 'overview'
      setActiveTab(next)
    }
    globalThis.window.addEventListener('popstate', onPop)
    return () => globalThis.window.removeEventListener('popstate', onPop)
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
            label: getTranslationFromI18nKeyAndLabel('recruiting.jobApplicationStage', 'Current Stage'),
            value:
              jobApplication?.jobApplicationStage?.value ||
              jobApplication?.jobApplicationStageRef ||
              getTranslationFromI18nKeyAndLabel('common.notSpecified', 'Not specified'),
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
              jobApplication?.jobPosting?.title ||
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
    ? `${jobApplication.jobCandidate.firstName} ${jobApplication.jobCandidate.lastName} - ${jobApplication.jobPosting?.title || 'Application'}`
    : getTranslationFromI18nKeyAndLabel('recruiting.jobApplication.unnamed', 'Unnamed Application')

  const headerActionButton = useMemo(
    () => (
      <AppAction
        data-testid="job-application-record-action-button"
        variant="header"
        contexts={[
          {
            context: FlowContextName.jobApplicationEntity,
            contextData: { jobApplicationId }
          }
        ]}
        shareContext={{
          entityType: 'jobApplication',
          entityId: jobApplicationId,
          entityName: jobApplicationName,
          entityUrl: buildPlatformUrl('/platform/hr/recruiting/job-application-record', {
            jobApplicationId
          })
        }}
        prefixDataTestId="job-application-record-action"
        accessToken={props.accessToken}
      />
    ),
    [jobApplicationId, jobApplicationName, props.accessToken]
  )

  const subViewsConfig = useMemo(
    () => ({
      defaultValue: activeTab,
      onValueChange: handleTabChange,
      items: [
        {
          value: 'overview',
          label: getTranslationFromI18nKeyAndLabel('recruiting.overview', 'Overview'),
          icon: <Briefcase className="gba:mr-2" />,
          content: <HomeView jobApplication={jobApplication} {...props} />
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
      headerAvatar={<IconAvatar icon={Briefcase} variant="decorative" size="xl" />}
      headerOverline={getTranslationFromI18nKeyAndLabel('recruiting.jobApplication', 'Job Application')}
      onBack={onBack}
      headerTitle={jobApplicationName}
      headerSlotMain={<HeaderSlot headerSlotItemGroups={headerDetailGroups} orientation="horizontal" />}
      headerActionButton={headerActionButton}
      views={subViewsConfig.items}
      defaultView={subViewsConfig.defaultValue}
      onViewChange={subViewsConfig.onValueChange}
    />
  )
}

// Wrapper component to handle ID extraction and navigation
const JobApplicationRecord: React.FC<BusinessAppContextProps> = ({ additionalData = {}, ...props }) => {
  const jobApplicationId =
    additionalData.jobApplicationId ||
    (globalThis.window !== undefined && globalThis.window?.location
      ? new URLSearchParams(globalThis.window.location.search).get('jobApplicationId')
      : null)

  const handleBack = () => {
    // Navigate back based on context - could be from candidate or posting
    const url = buildPlatformUrl('/platform/hr/recruiting/recruiting-manager', {
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
