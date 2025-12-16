import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  Badge,
  Avatar,
  AvatarFallback,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '@newwork/nw-design-system'
import {
  BriefcaseIcon,
  CalendarIcon,
  CaretDownIcon,
  CaretUpIcon,
  MapPinIcon,
  InfoIcon,
  ListBulletsIcon,
  PaperPlaneIcon
} from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import type { JobPosting } from '@/common/data/recruiting/types/jobPostingTypes'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'

interface JobPostingExpandableCardProps {
  jobPosting: JobPosting
  accessToken: string
  prefixDataTestId?: string
  defaultExpanded?: boolean
  showExpandButton?: boolean
  isExpandedFromUrl?: boolean
  activeTabFromUrl?: string
  onExpandChange?: (jobPostingId: string, isExpanded: boolean) => void
  onTabChange?: (jobPostingId: string, tab: string) => void
}

export const JobPostingExpandableCard: React.FC<JobPostingExpandableCardProps> = ({
  jobPosting,
  accessToken,
  prefixDataTestId = 'JobPostingExpandableCard',
  defaultExpanded = false,
  showExpandButton = true,
  isExpandedFromUrl,
  activeTabFromUrl,
  onExpandChange,
  onTabChange
}) => {
  const [isExpanded, setIsExpanded] = useState(isExpandedFromUrl ?? defaultExpanded)
  const [activeTab, setActiveTab] = useState(activeTabFromUrl ?? 'overview')

  useEffect(() => {
    if (isExpandedFromUrl !== undefined) {
      setIsExpanded(isExpandedFromUrl)
    }
  }, [isExpandedFromUrl])

  useEffect(() => {
    if (activeTabFromUrl) {
      setActiveTab(activeTabFromUrl)
    }
  }, [activeTabFromUrl])

  const formatDateOnly = (dateString: string | undefined): string => {
    if (!dateString) return '-'

    const formatted = formatDate(dateString, 'date.short')

    if (formatted?.includes('T')) {
      const date = new Date(dateString)
      return date.toLocaleDateString()
    }

    return formatted || '-'
  }

  const handleExpandToggle = () => {
    const newExpanded = !isExpanded
    setIsExpanded(newExpanded)
    onExpandChange?.(jobPosting.id || '', newExpanded)
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    onTabChange?.(jobPosting.id || '', tab)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showExpandButton && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      handleExpandToggle()
    }
  }

  const headerAriaLabel = showExpandButton
    ? `${isExpanded ? 'Collapse' : 'Expand'} ${jobPosting.jobTitle} job posting details`
    : undefined

  return (
    <Card
      data-testid={formatDataTestId(prefixDataTestId, jobPosting.id)}
      className="gba:border gba:border-border gba:bg-card gba:transition-all gba:duration-200"
    >
      <CardContent className="gba:p-0">
        {/* Header - Always visible */}
        {showExpandButton ? (
          <button
            type="button"
            className="gba:w-full gba:p-6 gba:flex gba:items-center gba:justify-between gba:gap-4 gba:cursor-pointer gba:bg-transparent gba:border-0 gba:text-left"
            onClick={handleExpandToggle}
            onKeyDown={handleKeyDown}
            aria-expanded={isExpanded}
            aria-label={headerAriaLabel}
            data-testid={formatDataTestId(prefixDataTestId, `expand-button-${jobPosting.id}`)}
          >
            <div className="gba:flex gba:items-center gba:gap-4 gba:flex-1 gba:min-w-0">
              {/* Avatar */}
              <Avatar size="lg" className="gba:flex-shrink-0">
                <AvatarFallback className="gba:bg-gradient-to-br gba:from-primary/15 gba:to-primary/5 gba:text-primary">
                  <BriefcaseIcon size={28} weight="duotone" />
                </AvatarFallback>
              </Avatar>

              {/* Job Posting Info */}
              <div className="gba:flex-1 gba:min-w-0">
                <div className="gba:flex gba:items-center gba:gap-3 gba:mb-1 gba:flex-wrap">
                  <h3 className="gba:m-0 gba:text-xl gba:font-bold gba:text-foreground">
                    {jobPosting.jobTitle || 'Untitled Position'}
                  </h3>
                  {jobPosting.department && (
                    <Badge variant="secondary" className="gba:text-xs">
                      {jobPosting.department}
                    </Badge>
                  )}
                  {jobPosting.contractType && (
                    <Badge variant="outline" className="gba:text-xs">
                      {jobPosting.contractType}
                    </Badge>
                  )}
                  {jobPosting.remote && (
                    <Badge variant="success" className="gba:text-xs">
                      {jobPosting.remote}
                    </Badge>
                  )}
                </div>

                <div className="gba:flex gba:items-center gba:gap-4 gba:text-sm gba:text-muted-foreground gba:flex-wrap">
                  {jobPosting.code && <span className="gba:font-medium">{jobPosting.code}</span>}
                  {jobPosting.location && (
                    <div className="gba:flex gba:items-center gba:gap-1.5">
                      <MapPinIcon size={14} weight="duotone" />
                      <span>{jobPosting.location}</span>
                    </div>
                  )}
                  {jobPosting.createdAt && (
                    <div className="gba:flex gba:items-center gba:gap-1.5">
                      <CalendarIcon size={14} weight="duotone" />
                      <span>{formatDateOnly(jobPosting.createdAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Expand Button */}
            <div className="gba:flex gba:items-center gba:gap-2 gba:flex-shrink-0">
              {isExpanded ? <CaretUpIcon size={20} /> : <CaretDownIcon size={20} />}
            </div>
          </button>
        ) : (
          <div className="gba:p-6 gba:flex gba:items-center gba:justify-between gba:gap-4">
            <div className="gba:flex gba:items-center gba:gap-4 gba:flex-1 gba:min-w-0">
              <Avatar size="lg" className="gba:flex-shrink-0">
                <AvatarFallback className="gba:bg-gradient-to-br gba:from-primary/15 gba:to-primary/5 gba:text-primary">
                  <BriefcaseIcon size={28} weight="duotone" />
                </AvatarFallback>
              </Avatar>

              <div className="gba:flex-1 gba:min-w-0">
                <div className="gba:flex gba:items-center gba:gap-3 gba:mb-1 gba:flex-wrap">
                  <h3 className="gba:m-0 gba:text-xl gba:font-bold gba:text-foreground">
                    {jobPosting.jobTitle || 'Untitled Position'}
                  </h3>
                  {jobPosting.department && (
                    <Badge variant="secondary" className="gba:text-xs">
                      {jobPosting.department}
                    </Badge>
                  )}
                  {jobPosting.contractType && (
                    <Badge variant="outline" className="gba:text-xs">
                      {jobPosting.contractType}
                    </Badge>
                  )}
                  {jobPosting.remote && (
                    <Badge variant="success" className="gba:text-xs">
                      {jobPosting.remote}
                    </Badge>
                  )}
                </div>

                <div className="gba:flex gba:items-center gba:gap-4 gba:text-sm gba:text-muted-foreground gba:flex-wrap">
                  {jobPosting.code && <span className="gba:font-medium">{jobPosting.code}</span>}
                  {jobPosting.location && (
                    <div className="gba:flex gba:items-center gba:gap-1.5">
                      <MapPinIcon size={14} weight="duotone" />
                      <span>{jobPosting.location}</span>
                    </div>
                  )}
                  {jobPosting.createdAt && (
                    <div className="gba:flex gba:items-center gba:gap-1.5">
                      <CalendarIcon size={14} weight="duotone" />
                      <span>{formatDateOnly(jobPosting.createdAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Expanded Content - Tabs */}
        {(isExpanded || !showExpandButton) && (
          <div className="gba:border-t gba:border-border gba:p-6">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="gba:w-full">
              <TabsList className="gba:mb-4">
                <TabsTrigger value="overview" startIcon={<InfoIcon size={16} />}>
                  {getTranslationFromI18nKeyAndLabel('recruiting.portal.overview', 'Overview')}
                </TabsTrigger>
                <TabsTrigger value="description" startIcon={<ListBulletsIcon size={16} />}>
                  {getTranslationFromI18nKeyAndLabel('recruiting.portal.description', 'Description')}
                </TabsTrigger>
                <TabsTrigger value="apply" startIcon={<PaperPlaneIcon size={16} />}>
                  {getTranslationFromI18nKeyAndLabel('recruiting.portal.apply', 'Apply')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <div className="gba:space-y-4" data-testid={formatDataTestId(prefixDataTestId, 'overview-tab')}>
                  <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
                    <div className="gba:space-y-1">
                      <p className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:m-0">
                        {getTranslationFromI18nKeyAndLabel('recruiting.department', 'Department')}
                      </p>
                      <p className="gba:text-base gba:font-medium gba:text-foreground gba:m-0">
                        {jobPosting.department || '-'}
                      </p>
                    </div>

                    <div className="gba:space-y-1">
                      <p className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:m-0">
                        {getTranslationFromI18nKeyAndLabel('recruiting.location', 'Location')}
                      </p>
                      <p className="gba:text-base gba:font-medium gba:text-foreground gba:m-0">
                        {jobPosting.location || '-'}
                      </p>
                    </div>

                    <div className="gba:space-y-1">
                      <p className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:m-0">
                        {getTranslationFromI18nKeyAndLabel('recruiting.contractType', 'Contract Type')}
                      </p>
                      <p className="gba:text-base gba:font-medium gba:text-foreground gba:m-0">
                        {jobPosting.contractType || '-'}
                      </p>
                    </div>

                    <div className="gba:space-y-1">
                      <p className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:m-0">
                        {getTranslationFromI18nKeyAndLabel('recruiting.remote', 'Remote')}
                      </p>
                      <p className="gba:text-base gba:font-medium gba:text-foreground gba:m-0">
                        {jobPosting.remote || '-'}
                      </p>
                    </div>

                    <div className="gba:space-y-1">
                      <p className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:m-0">
                        {getTranslationFromI18nKeyAndLabel('recruiting.postedDate', 'Posted Date')}
                      </p>
                      <p className="gba:text-base gba:font-medium gba:text-foreground gba:m-0">
                        {formatDateOnly(jobPosting.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="description">
                <div className="gba:space-y-4" data-testid={formatDataTestId(prefixDataTestId, 'description-tab')}>
                  <div className="gba:prose gba:prose-sm gba:max-w-none">
                    <p className="gba:text-muted-foreground">
                      {getTranslationFromI18nKeyAndLabel(
                        'recruiting.portal.descriptionPlaceholder',
                        'Detailed job description will be displayed here.'
                      )}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="apply">
                <div
                  data-testid={formatDataTestId(prefixDataTestId, 'apply-tab')}
                  className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8 gba:space-y-4"
                >
                  <p className="gba:text-center gba:text-muted-foreground gba:mb-4">
                    {getTranslationFromI18nKeyAndLabel(
                      'recruiting.portal.applyDescription',
                      'Ready to apply for this position? Click below to submit your application.'
                    )}
                  </p>

                  <AppActionButton
                    data-testid={formatDataTestId(`${prefixDataTestId}-apply`, `button-${jobPosting.id}`)}
                    size="default"
                    variant="default"
                    contextsArray={[]}
                    externalContextData={{ jobPostingId: jobPosting.id }}
                    prefixDataTestId={`${prefixDataTestId}-apply`}
                    accessToken={accessToken}
                    emptyStateBehavior="enable"
                    deferMainContextRequestsUntilClick
                  >
                    {getTranslationFromI18nKeyAndLabel('recruiting.portal.applyButton', 'Apply Now')}
                  </AppActionButton>

                  <p className="gba:text-sm gba:text-muted-foreground gba:text-center">
                    {getTranslationFromI18nKeyAndLabel(
                      'recruiting.portal.applyNote',
                      'You will be guided through the application process'
                    )}
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
