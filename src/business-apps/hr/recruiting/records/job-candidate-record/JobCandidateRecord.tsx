import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Spinner, RecordLayout, IconAvatar, HeaderSlot } from '@newwork/nw-design-system'
import { User, Hash, Calendar, FileText } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useJobCandidate } from '@/common/data/recruiting/hooks/useJobCandidate'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { HomeView } from './views/home-view'
import { ApplicationsView } from './views/applications-view'

interface JobCandidateRecordContentProps extends BusinessAppContextProps {
  jobCandidateId: string
  onBack: () => void
}

const JobCandidateRecordContent: React.FC<JobCandidateRecordContentProps> = ({ jobCandidateId, onBack, ...props }) => {
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (!globalThis.window?.location) return 'overview'
    const params = new URLSearchParams(globalThis.window.location.search)
    return params.get('tab') || 'overview'
  })

  // Fetch job candidate data
  const { jobCandidate, loading, error, refetch } = useJobCandidate(props.accessToken, jobCandidateId, 'record')

  // Fetch job candidate data function for refetch
  const fetchJobCandidateData = useCallback(async () => {
    await refetch()
  }, [refetch])

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value)
    if (!globalThis.window?.location) return
    const url = new URL(globalThis.window.location.href)
    url.searchParams.set('tab', value)
    globalThis.history.replaceState(null, '', url.toString())
  }, [])

  useEffect(() => {
    if (globalThis.window === undefined) return
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
    fetchJobCandidateData()
  }, [fetchJobCandidateData])

  // Listen for process completion events to refresh job candidate data
  useProcessCompletion({
    onSuccess: handleProcessSuccess
  })

  // Memoize header data
  const headerDetailGroups = useMemo(
    () => [
      {
        id: 'job-candidate-details',
        items: [
          {
            label: getTranslationFromI18nKeyAndLabel('recruiting.firstName', 'First Name'),
            value: jobCandidate?.firstName || getTranslationFromI18nKeyAndLabel('common.notSpecified', 'Not specified'),
            icon: User
          },
          {
            label: getTranslationFromI18nKeyAndLabel('recruiting.lastName', 'Last Name'),
            value: jobCandidate?.lastName || getTranslationFromI18nKeyAndLabel('common.notSpecified', 'Not specified'),
            icon: User
          },
          {
            label: getTranslationFromI18nKeyAndLabel('recruiting.candidateCode', 'Candidate Code'),
            value: jobCandidate?.code || getTranslationFromI18nKeyAndLabel('common.notSpecified', 'Not specified'),
            icon: Hash
          },
          {
            label: getTranslationFromI18nKeyAndLabel('common.createdAt', 'Created At'),
            value: jobCandidate?.createdAt
              ? new Date(jobCandidate.createdAt).toLocaleDateString()
              : getTranslationFromI18nKeyAndLabel('common.notSpecified', 'Not specified'),
            icon: Calendar
          }
        ]
      }
    ],
    [jobCandidate]
  )

  // Calculate jobCandidateName early for use in headerActionButton
  const jobCandidateName = jobCandidate
    ? jobCandidate.displayName || `${jobCandidate.firstName} ${jobCandidate.lastName}`.trim()
    : getTranslationFromI18nKeyAndLabel('recruiting.jobCandidate.unnamed', 'Unnamed Candidate')

  const headerActionButton = useMemo(
    () => (
      <AppAction
        data-testid="job-candidate-record-action-button"
        variant="header"
        contexts={[
          {
            context: FlowContextName.jobCandidateEntity,
            contextData: { jobCandidateId }
          }
        ]}
        shareContext={{
          entityType: 'jobCandidate',
          entityId: jobCandidateId,
          entityName: jobCandidateName,
          entityUrl: buildPlatformUrl('/platform/hr/recruiting/job-candidate-record', {
            jobCandidateId
          })
        }}
        prefixDataTestId="job-candidate-record-action"
        accessToken={props.accessToken}
      />
    ),
    [jobCandidateId, jobCandidateName, props.accessToken]
  )

  const subViewsConfig = useMemo(
    () => ({
      defaultValue: activeTab,
      onValueChange: handleTabChange,
      items: [
        {
          value: 'overview',
          label: getTranslationFromI18nKeyAndLabel('recruiting.overview', 'Overview'),
          icon: <User className="gba:mr-2" />,
          content: <HomeView jobCandidate={jobCandidate} {...props} />
        },
        {
          value: 'applications',
          label: getTranslationFromI18nKeyAndLabel('recruiting.applications', 'Applications'),
          icon: <FileText className="gba:mr-2" />,
          content: <ApplicationsView jobCandidateId={jobCandidateId} {...props} />
        }
      ]
    }),
    [activeTab, handleTabChange, jobCandidateId, jobCandidate, props]
  )

  if (loading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !jobCandidate) {
    return (
      <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:min-h-screen gba:gap-4">
        <div className="gba:text-lg gba:font-semibold gba:text-destructive">
          {getTranslationFromI18nKeyAndLabel('recruiting.jobCandidate.loadError', 'Failed to load job candidate')}
        </div>
        {error && <div className="gba:text-sm gba:text-muted-foreground">{error}</div>}
      </div>
    )
  }

  return (
    <RecordLayout
      headerOrientation="horizontal"
      headerAvatar={<IconAvatar icon={User} variant="decorative" size="xl" />}
      headerOverline={getTranslationFromI18nKeyAndLabel('recruiting.jobCandidate', 'Job Candidate')}
      onBack={onBack}
      headerTitle={jobCandidateName}
      headerSlotMain={<HeaderSlot headerSlotItemGroups={headerDetailGroups} orientation="horizontal" />}
      headerActionButton={headerActionButton}
      views={subViewsConfig.items}
      defaultView={subViewsConfig.defaultValue}
      onViewChange={subViewsConfig.onValueChange}
    />
  )
}

// Wrapper component to handle ID extraction and navigation
const JobCandidateRecord: React.FC<BusinessAppContextProps> = ({ additionalData = {}, ...props }) => {
  const jobCandidateId =
    additionalData.jobCandidateId ||
    (globalThis.window?.location ? new URLSearchParams(globalThis.window.location.search).get('jobCandidateId') : null)

  const handleBack = () => {
    const url = buildPlatformUrl('/platform/hr/recruiting/recruiting-manager', {
      view: 'job-candidates'
    })
    navigateTo(url)
  }

  if (!jobCandidateId) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <div className="gba:text-lg gba:font-semibold gba:text-destructive">
          {getTranslationFromI18nKeyAndLabel('recruiting.jobCandidate.missingId', 'Job candidate ID is missing')}
        </div>
      </div>
    )
  }

  return <JobCandidateRecordContent jobCandidateId={jobCandidateId} onBack={handleBack} {...props} />
}

export default JobCandidateRecord
