import React, { useState } from 'react'
import { PageLayout } from '@newwork/nw-design-system'
import { Briefcase, FileText, Users, Calendar } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { MODULE_COLORS } from '@/common/constants/ui'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { JobRequestView } from './views/job-request-view/JobRequestView'
import { JobPostingView } from './views/job-posting-view/JobPostingView'
import { JobCandidateView } from './views/job-candidate-view/JobCandidateView'
import { JobInterviewView } from './views/job-interview-view/JobInterviewView'

export type RecruitingManagerProps = BusinessAppContextProps

const moduleColor = MODULE_COLORS.HR

export const RecruitingManager: React.FC<RecruitingManagerProps> = context => {
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
      key: 'job-interviews',
      icon: <Calendar />,
      label: getTranslationFromI18nKeyAndLabel('jobInterviews', 'Job Interviews')
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
      case 'job-interviews':
        return <JobInterviewView {...context} />
      default:
        return null
    }
  }

  return (
    <PageLayout
      data-testid="recruiting-manager-app"
      headerIcon={Briefcase}
      headerTitle={getTranslationFromI18nKeyAndLabel('RecruitingManager', 'Recruiting Manager')}
      headerDescription={getTranslationFromI18nKeyAndLabel(
        'RecruitingManagerDescription',
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
      className="gba:min-h-full"
    >
      {renderViewContent()}
    </PageLayout>
  )
}

export default RecruitingManager
