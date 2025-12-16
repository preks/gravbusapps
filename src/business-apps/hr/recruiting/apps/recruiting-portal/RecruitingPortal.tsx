import React, { useMemo, useState, useEffect } from 'react'
import { Alert, AlertTitle, AlertDescription, Button, Spinner } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useJobPostings } from '@/common/data/recruiting/hooks/useJobPostings'
import { JobPostingExpandableCard } from './components/JobPostingExpandableCard'
import { RecruitingSearch } from './components/RecruitingSearch'
import { RecruitingPortalBanner } from './components/RecruitingPortalBanner'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'

interface RecruitingPortalProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const RecruitingPortal: React.FC<RecruitingPortalProps> = ({
  accessToken,
  userInfo,
  prefixDataTestId = 'RecruitingPortal'
}) => {
  const [searchQuery, setSearchQuery] = useState('')

  const { jobPostings, loading, error, refetch } = useJobPostings(
    accessToken,
    {
      limit: 100,
      offset: 0,
      orderBy: [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }]
    },
    'list'
  )

  // Listen for process completion (job application submission) and refresh data
  useProcessCompletion({
    onSuccess: () => {
      console.log('Process completed successfully, refreshing job posting data')
      refetch()
    }
  })

  // URL state management for expanded card and active tab
  const [expandedJobPostingId, setExpandedJobPostingId] = useState<string | null>(() => {
    const params = new URLSearchParams(globalThis.location.search)
    return params.get('jobPostingId')
  })

  const [activeTab, setActiveTab] = useState<string>(() => {
    const params = new URLSearchParams(globalThis.location.search)
    return params.get('tab') || 'overview'
  })

  // Update URL when state changes
  const updateUrl = (jobPostingId: string | null, tab: string) => {
    const params = new URLSearchParams(globalThis.location.search)

    if (jobPostingId) {
      params.set('jobPostingId', jobPostingId)
      params.set('tab', tab)
    } else {
      params.delete('jobPostingId')
      params.delete('tab')
    }

    const newUrl = `${globalThis.location.pathname}?${params.toString()}`
    globalThis.history.replaceState({}, '', newUrl)
  }

  const handleExpandCard = (jobPostingId: string) => {
    setExpandedJobPostingId(jobPostingId)
    updateUrl(jobPostingId, activeTab)
  }

  const handleCollapseCard = () => {
    setExpandedJobPostingId(null)
    updateUrl(null, 'overview')
  }

  const handleTabChange = (jobPostingId: string, tab: string) => {
    setActiveTab(tab)
    updateUrl(jobPostingId, tab)
  }

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(globalThis.location.search)
      setExpandedJobPostingId(params.get('jobPostingId'))
      setActiveTab(params.get('tab') || 'overview')
    }

    globalThis.addEventListener('popstate', handlePopState)
    return () => globalThis.removeEventListener('popstate', handlePopState)
  }, [])

  // Filter job postings based on search query
  const filteredJobPostings = useMemo(() => {
    if (!searchQuery.trim()) return jobPostings

    const query = searchQuery.toLowerCase()
    return jobPostings.filter(posting => {
      const matchesTitle = posting.jobTitle?.toLowerCase().includes(query)
      const matchesDepartment = posting.department?.toLowerCase().includes(query)
      const matchesLocation = posting.location?.toLowerCase().includes(query)
      const matchesContract = posting.contractType?.toLowerCase().includes(query)
      const matchesRemote = posting.remote?.toLowerCase().includes(query)

      return matchesTitle || matchesDepartment || matchesLocation || matchesContract || matchesRemote
    })
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

  // No Job Postings State
  if (jobPostings.length === 0) {
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
        {/* Search Bar - Only show if multiple postings */}
        {hasMultiplePostings && (
          <>
            <RecruitingSearch value={searchQuery} onChange={setSearchQuery} />

            {/* Results Count */}
            {searchQuery && (
              <div className="gba:text-sm gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  'recruiting.portal.search.results',
                  `Showing ${filteredJobPostings.length} of ${jobPostings.length} positions`
                )}
              </div>
            )}
          </>
        )}

        {/* Job Posting Cards */}
        <div className="gba:space-y-4">
          {filteredJobPostings.map(posting => {
            const isCurrentlyExpanded = expandedJobPostingId === posting.id
            return (
              <JobPostingExpandableCard
                key={posting.id}
                jobPosting={posting}
                accessToken={accessToken}
                prefixDataTestId={`${prefixDataTestId}-card`}
                defaultExpanded={!hasMultiplePostings}
                showExpandButton={hasMultiplePostings}
                isExpandedFromUrl={isCurrentlyExpanded}
                activeTabFromUrl={isCurrentlyExpanded ? activeTab : undefined}
                onExpandChange={(jobPostingId, isExpanded) =>
                  isExpanded ? handleExpandCard(jobPostingId) : handleCollapseCard()
                }
                onTabChange={handleTabChange}
              />
            )
          })}
        </div>

        {/* Empty Search Results */}
        {filteredJobPostings.length === 0 && searchQuery && (
          <div className="gba:text-center gba:py-12">
            <p className="gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'recruiting.portal.search.empty',
                `No positions match "${searchQuery}". Try a different search term.`
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default RecruitingPortal
