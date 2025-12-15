import React, { useState } from 'react'
import { PageLayout } from '@newwork/nw-design-system'
import { Briefcase, FileText, Users, ClipboardList } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { MODULE_COLORS } from '@/common/constants/ui'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { JobRequestView } from './views/job-request-view/JobRequestView'
import { JobPostingView } from './views/job-posting-view/JobPostingView'
import { JobCandidateView } from './views/job-candidate-view/JobCandidateView'
import { JobApplicationView } from './views/job-application-view/JobApplicationView'

export type RecruitmentManagerProps = BusinessAppContextProps

const moduleColor = MODULE_COLORS.HR

export const RecruitmentManager: React.FC<RecruitmentManagerProps> = context => {
  const viewOptions = [
    {
      key: 'job-requests',
      icon: <Briefcase />,
      label: getTranslationFromI18nKeyAndLabel('jobRequests', 'Job Requests')
    },
    {
      key: 'job-postings',
      icon: <FileText />,
      label: getTranslationFromI18nKeyAndLabel('jobPostings', 'Job Postings')
    },
    {
      key: 'job-candidates',
      icon: <Users />,
      label: getTranslationFromI18nKeyAndLabel('jobCandidates', 'Job Candidates')
    },
    {
      key: 'job-applications',
      icon: <ClipboardList />,
      label: getTranslationFromI18nKeyAndLabel('jobApplications', 'Job Applications')
    }
  ]

  const getInitialView = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const viewFromUrl = urlParams.get('view')
    if (viewFromUrl && viewOptions.some(option => option.key === viewFromUrl)) {
      return viewFromUrl
    }
    return viewOptions[0].key
  }

  const [activeView, setActiveView] = useState<string>(getInitialView())

  const handleViewChange = (view: string) => {
    setActiveView(view)
    const currentUrl = new URL(window.location.href)
    currentUrl.searchParams.set('view', view)
    window.history.pushState({}, '', currentUrl.toString())
  }

  const renderViewContent = () => {
    switch (activeView) {
      case 'job-requests':
        return <JobRequestView {...context} />
      case 'job-postings':
        return <JobPostingView {...context} />
      case 'job-candidates':
        return <JobCandidateView {...context} />
      case 'job-applications':
        return <JobApplicationView {...context} />
      default:
        return null
    }
  }

  return (
    <div data-testid="recruitment-manager-app">
      <PageLayout
        headerIcon={Briefcase}
        headerTitle={getTranslationFromI18nKeyAndLabel('recruitmentManager', 'Recruitment Manager')}
        headerDescription={getTranslationFromI18nKeyAndLabel(
          'recruitmentManagerDescription',
          'Manage job requests, postings, candidates, and applications'
        )}
        headerSubViews={{
          value: activeView,
          onValueChange: handleViewChange,
          items: viewOptions.map(option => ({
            value: option.key,
            label: option.label,
            icon: option.icon
          }))
        }}
        variant={moduleColor}
        className="gba:min-h-screen"
      >
        {renderViewContent()}
      </PageLayout>
    </div>
  )
}

export default RecruitmentManager
