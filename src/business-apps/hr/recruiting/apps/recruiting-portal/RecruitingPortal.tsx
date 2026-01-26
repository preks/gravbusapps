import React, { useState, useEffect, useRef } from 'react'
import { Alert, AlertTitle, AlertDescription, Button, Spinner } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useJobPostings } from '@/common/data/recruiting/hooks/useJobPostings'
import { JobPostingExpandableCard } from './components/JobPostingExpandableCard'
import { RecruitingSearch } from './components/RecruitingSearch'
import { RecruitingPortalBanner } from './components/RecruitingPortalBanner'
import { CandidateProfileSection } from './components/CandidateProfileSection'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { useJobCandidateByUserId } from '@/common/data/recruiting/hooks/useJobCandidateByUserId'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { useDebounce } from '@/common/hooks/useDebounce'

interface RecruitingPortalProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const RecruitingPortal: React.FC<RecruitingPortalProps> = ({
  accessToken,
  userInfo,
  prefixDataTestId = 'RecruitingPortal'
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const { jobPostings, loading, error, refetch } = useJobPostings(
    accessToken,
    {
      limit: 100,
      offset: 0,
      orderBy: [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }],
      search: debouncedSearchQuery || undefined
    },
    'record'
  )

  // Check if current user has a job candidate profile
  const {
    jobCandidateId,
    loading: candidateLoading,
    refetch: refetchCandidate
  } = useJobCandidateByUserId({
    accessToken: accessToken || '',
    userId: userInfo?.id
  })

  // Listen for process completion (job application/candidate submission) and refresh data
  useProcessCompletion({
    onSuccess: () => {
      console.log('Process completed successfully, refreshing data')
      refetch()
      refetchCandidate()
    }
  })

  // URL state management for expanded card
  const [expandedJobPostingId, setExpandedJobPostingId] = useState<string | null>(() => {
    const params = new URLSearchParams(globalThis.location.search)
    return params.get('jobPostingId')
  })

  // Update URL when state changes
  const updateUrl = (jobPostingId: string | null) => {
    const params = new URLSearchParams(globalThis.location.search)

    if (jobPostingId) {
      params.set('jobPostingId', jobPostingId)
    } else {
      params.delete('jobPostingId')
    }

    const newUrl = `${globalThis.location.pathname}?${params.toString()}`
    globalThis.history.replaceState({}, '', newUrl)
  }

  const handleExpandCard = (jobPostingId: string) => {
    setExpandedJobPostingId(jobPostingId)
    updateUrl(jobPostingId)
  }

  const handleCollapseCard = () => {
    setExpandedJobPostingId(null)
    updateUrl(null)
  }

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(globalThis.location.search)
      setExpandedJobPostingId(params.get('jobPostingId'))
    }

    globalThis.addEventListener('popstate', handlePopState)
    return () => globalThis.removeEventListener('popstate', handlePopState)
  }, [])

  // Keep focus on search input when typing
  useEffect(() => {
    if (searchQuery && searchInputRef.current && document.activeElement === searchInputRef.current) {
      // If user is typing, maintain focus after data update
      const timeoutId = setTimeout(() => {
        if (searchInputRef.current && document.activeElement !== searchInputRef.current) {
          searchInputRef.current.focus()
        }
      }, 0)
      return () => clearTimeout(timeoutId)
    }
  }, [jobPostings, searchQuery])

  // Authentication Check
  if (!accessToken) {
    return (
      <div className="gba:p-6 gba:text-center">
        <Alert variant="destructive">
          <AlertTitle>{getTranslationFromI18nKeyAndLabel('error.authTitle', 'Authentication Error')}</AlertTitle>
          <AlertDescription>
            {getTranslationFromI18nKeyAndLabel(
              'error.noAccessToken',
              'No access token found. Please ensure you are properly authenticated.'
            )}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Loading State
  if (loading) {
    return (
      <div className="gba:min-h-screen gba:bg-background">
        {/* Header */}
        <RecruitingPortalBanner userInfo={userInfo} jobPostingCount={0} />

        {/* Content */}
        <div className="gba:w-full gba:max-w-[1440px] gba:mx-auto gba:px-8 gba:py-8">
          <div className="gba:flex gba:justify-center gba:items-center gba:min-h-[400px]">
            <Spinner size="lg" data-testid={formatDataTestId(prefixDataTestId, 'loading-spinner')} />
          </div>
        </div>
      </div>
    )
  }

  // Error State
  if (error) {
    return (
      <div className="gba:min-h-screen gba:bg-background">
        {/* Header */}
        <RecruitingPortalBanner userInfo={userInfo} jobPostingCount={0} />

        {/* Content */}
        <div className="gba:w-full gba:max-w-[1440px] gba:mx-auto gba:px-8 gba:py-8">
          <Alert variant="destructive" data-testid={formatDataTestId(prefixDataTestId, 'error-alert')}>
            <AlertTitle>{getTranslationFromI18nKeyAndLabel('error.loadingTitle', 'Error Loading Data')}</AlertTitle>
            <AlertDescription>
              {error}
              <Button variant="outline" size="sm" onClick={() => refetch()} className="gba:ml-4">
                {getTranslationFromI18nKeyAndLabel('button.retry', 'Retry')}
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  // No Job Postings State (only show if not searching)
  if (jobPostings.length === 0 && debouncedSearchQuery === '') {
    return (
      <div className="gba:min-h-screen gba:bg-background">
        {/* Header */}
        <RecruitingPortalBanner userInfo={userInfo} jobPostingCount={0} />

        {/* Content */}
        <div className="gba:w-full gba:max-w-[1440px] gba:mx-auto gba:px-8 gba:py-8">
          <div className="gba:text-center gba:py-16">
            <Alert data-testid={formatDataTestId(prefixDataTestId, 'empty-state')}>
              <AlertTitle>
                {getTranslationFromI18nKeyAndLabel('recruiting.portal.noPostings.title', 'No Job Postings Available')}
              </AlertTitle>
              <AlertDescription>
                {getTranslationFromI18nKeyAndLabel(
                  'recruiting.portal.noPostings.description',
                  'There are currently no open positions. Please check back later for new opportunities.'
                )}
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    )
  }

  const hasMultiplePostings = jobPostings.length > 1

  return (
    <div className="gba:min-h-screen gba:bg-background" data-testid={formatDataTestId(prefixDataTestId, 'container')}>
      {/* Header */}
      <RecruitingPortalBanner userInfo={userInfo} jobPostingCount={jobPostings.length} />

      {/* Content */}
      <div className="gba:w-full gba:max-w-[1440px] gba:mx-auto gba:px-8 gba:py-8 gba:space-y-6">
        {/* Candidate Profile Section */}
        {jobCandidateId ? (
          <CandidateProfileSection
            jobCandidateId={jobCandidateId}
            accessToken={accessToken}
            userInfo={userInfo}
            prefixDataTestId={formatDataTestId(prefixDataTestId, 'candidate-profile')}
          />
        ) : (
          <div className="gba:bg-card gba:border gba:border-border gba:rounded-lg gba:p-6 gba:flex gba:items-center gba:justify-between gba:gap-4">
            <div className="gba:flex-1">
              <h2 className="gba:text-lg gba:font-semibold gba:mb-1">
                {getTranslationFromI18nKeyAndLabel('recruiting.portal.candidateProfile', 'Your Candidate Profile')}
              </h2>
              <p className="gba:text-sm gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  'recruiting.portal.candidateProfileMissing',
                  'Create your candidate profile to apply for job postings'
                )}
              </p>
            </div>
            <div className="gba:flex gba:gap-2">
              {candidateLoading ? (
                <Spinner size="sm" />
              ) : (
                <AppAction
                  variant="create-primary"
                  contexts={[
                    {
                      context: FlowContextName.jobCandidateCreate,
                      contextData: { scope: 'personal', userId: userInfo?.id }
                    }
                  ]}
                  accessToken={accessToken}
                  data-testid={formatDataTestId(prefixDataTestId, 'create-profile-button')}
                >
                  {getTranslationFromI18nKeyAndLabel('recruiting.portal.createProfile', 'Create Profile')}
                </AppAction>
              )}
            </div>
          </div>
        )}
        {/* Search Bar */}
        <RecruitingSearch ref={searchInputRef} value={searchQuery} onChange={setSearchQuery} />

        {/* Results Count */}
        {debouncedSearchQuery && (
          <div className="gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'recruiting.portal.search.results',
              `Showing ${jobPostings.length} position${jobPostings.length !== 1 ? 's' : ''}`
            )}
          </div>
        )}

        {/* Job Posting Cards */}
        <div className="gba:space-y-4">
          {jobPostings.map(posting => {
            const isCurrentlyExpanded = expandedJobPostingId === posting.id
            return (
              <JobPostingExpandableCard
                key={posting.id}
                jobPosting={posting}
                accessToken={accessToken}
                userInfo={userInfo}
                jobCandidateId={jobCandidateId || undefined}
                prefixDataTestId={`${prefixDataTestId}-card`}
                defaultExpanded={!hasMultiplePostings}
                showExpandButton={hasMultiplePostings}
                isExpandedFromUrl={isCurrentlyExpanded}
                onExpandChange={(jobPostingId, isExpanded) =>
                  isExpanded ? handleExpandCard(jobPostingId) : handleCollapseCard()
                }
              />
            )
          })}
        </div>

        {/* Empty Search Results */}
        {jobPostings.length === 0 && debouncedSearchQuery && (
          <div className="gba:text-center gba:py-12">
            <p className="gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'recruiting.portal.search.empty',
                `No positions match "${debouncedSearchQuery}". Try a different search term.`
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default RecruitingPortal
