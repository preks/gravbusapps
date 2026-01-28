import React, { useState, useEffect, useMemo } from 'react'
import {
  Card,
  CardContent,
  Badge,
  Avatar,
  AvatarFallback,
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@newwork/nw-design-system'
import {
  BriefcaseIcon,
  CaretDownIcon,
  CaretUpIcon,
  MapPinIcon,
  DownloadIcon,
  ClockIcon,
  CurrencyCircleDollarIcon
} from '@phosphor-icons/react'
import {
  getTranslationFromI18nKeyAndLabel,
  formatDate,
  getCurrentActiveUserLocale,
  getCatalogValue
} from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import type { JobPosting } from '@/common/data/recruiting/types/jobPostingTypes'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { ContentHtmlRenderer } from '@/business-apps/core/content/records/content-record/components/ContentHtmlRenderer'
import { buildFileUrl } from '@/common/utils/fileUtils'

interface JobPostingExpandableCardProps {
  jobPosting: JobPosting
  accessToken: string
  jobCandidateId?: string
  prefixDataTestId?: string
  defaultExpanded?: boolean
  showExpandButton?: boolean
  isExpandedFromUrl?: boolean
  onExpandChange?: (jobPostingId: string, isExpanded: boolean) => void
}

/**
 * Extract translated value from i18n object
 * i18n objects are structured as { [localeCode]: value }
 */
function getI18nValue(i18nObj: any, fallback: string | undefined): string {
  if (!i18nObj || typeof i18nObj !== 'object') {
    return fallback || ''
  }

  const currentLocale = getCurrentActiveUserLocale().toLowerCase()

  // Try exact locale match first
  if (i18nObj[currentLocale]) {
    return String(i18nObj[currentLocale]) || fallback || ''
  }

  // Try locale without region (e.g., 'en' from 'en-US')
  const localeBase = currentLocale.split('-')[0]
  if (i18nObj[localeBase]) {
    return String(i18nObj[localeBase]) || fallback || ''
  }

  // Try any available locale
  const availableLocales = Object.keys(i18nObj)
  if (availableLocales.length > 0) {
    const firstValue = i18nObj[availableLocales[0]]
    if (firstValue) {
      return String(firstValue)
    }
  }

  return fallback || ''
}

export const JobPostingExpandableCard: React.FC<JobPostingExpandableCardProps> = ({
  jobPosting,
  accessToken,
  jobCandidateId,
  prefixDataTestId = 'JobPostingExpandableCard',
  defaultExpanded = false,
  showExpandButton = true,
  isExpandedFromUrl,
  onExpandChange
}) => {
  const [isExpanded, setIsExpanded] = useState(isExpandedFromUrl ?? defaultExpanded)

  const hasCandidate = !!jobCandidateId

  useEffect(() => {
    if (isExpandedFromUrl !== undefined) {
      setIsExpanded(isExpandedFromUrl)
    }
  }, [isExpandedFromUrl])

  // Extract translated title and content
  const displayTitle = useMemo(() => {
    return getI18nValue(jobPosting.titleI18n, jobPosting.title)
  }, [jobPosting.titleI18n, jobPosting.title])

  const displayContent = useMemo(() => {
    return getI18nValue(jobPosting.contentI18n, jobPosting.content)
  }, [jobPosting.contentI18n, jobPosting.content])

  // Get job request data
  const jobRequest = jobPosting.jobRequest

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

  const handleDownloadFile = () => {
    if (!jobPosting.fileInfo) return

    try {
      const fileUrl = buildFileUrl(jobPosting.fileInfo)
      const fileName = jobPosting.fileInfo.name || 'job-posting-file'

      const link = globalThis.document.createElement('a')
      link.href = fileUrl
      link.download = fileName
      globalThis.document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('Error downloading file:', error)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showExpandButton && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      handleExpandToggle()
    }
  }

  const expandAction = isExpanded ? 'Collapse' : 'Expand'
  const headerAriaLabel = showExpandButton ? `${expandAction} ${displayTitle} job posting details` : undefined

  return (
    <Card
      data-testid={formatDataTestId(prefixDataTestId, jobPosting.id)}
      className="gba:border gba:border-border gba:bg-card gba:transition-all gba:duration-200"
    >
      <CardContent className="gba:p-0">
        {/* Header - Always visible */}
        {showExpandButton ? (
          <>
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
                  {jobRequest?.organizationalUnit?.name && (
                    <p className="gba:text-xs gba:text-muted-foreground gba:m-0 gba:mb-1">
                      {jobRequest.organizationalUnit.name}
                    </p>
                  )}
                  <div className="gba:flex gba:items-center gba:gap-3 gba:mb-1 gba:flex-wrap">
                    <h3 className="gba:m-0 gba:text-xl gba:font-bold gba:text-foreground">
                      {displayTitle || 'Untitled Position'}
                    </h3>
                    {jobRequest?.jobExperienceLevel && (
                      <Badge variant="outline" className="gba:text-xs">
                        {getCatalogValue(jobRequest.jobExperienceLevel)}
                      </Badge>
                    )}
                  </div>
                  <TooltipProvider>
                    <div className="gba:flex gba:items-center gba:gap-4 gba:mb-1 gba:flex-wrap">
                      {jobRequest?.employmentType && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-sm gba:text-muted-foreground gba:cursor-help">
                              <BriefcaseIcon size={14} weight="duotone" />
                              <span>{getCatalogValue(jobRequest.employmentType)}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{getTranslationFromI18nKeyAndLabel('recruiting.employmentType', 'Employment Type')}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {jobRequest?.contractType && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-sm gba:text-muted-foreground gba:cursor-help">
                              <ClockIcon size={14} weight="duotone" />
                              <span>{getCatalogValue(jobRequest.contractType)}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{getTranslationFromI18nKeyAndLabel('recruiting.contractType', 'Contract Type')}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <div className="gba:flex gba:items-center gba:gap-4 gba:text-sm gba:text-muted-foreground gba:flex-wrap">
                      {jobRequest?.company?.name && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="gba:flex gba:items-center gba:gap-1.5 gba:cursor-help">
                              <BriefcaseIcon size={14} weight="duotone" />
                              <span>{jobRequest.company.name}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{getTranslationFromI18nKeyAndLabel('recruiting.company', 'Company')}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {jobRequest?.siteLocation?.name && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="gba:flex gba:items-center gba:gap-1.5 gba:cursor-help">
                              <MapPinIcon size={14} weight="duotone" />
                              <span>{jobRequest.siteLocation.name}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{getTranslationFromI18nKeyAndLabel('recruiting.location', 'Location')}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {jobRequest?.costCenter?.name && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="gba:flex gba:items-center gba:gap-1.5 gba:cursor-help">
                              <CurrencyCircleDollarIcon size={14} weight="duotone" />
                              <span>{jobRequest.costCenter.name}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{getTranslationFromI18nKeyAndLabel('recruiting.costCenter', 'Cost Center')}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TooltipProvider>
                </div>
              </div>

              {/* Expand Icon */}
              <div className="gba:flex-shrink-0">
                {isExpanded ? <CaretUpIcon size={20} /> : <CaretDownIcon size={20} />}
              </div>
            </button>

            {/* Apply Button - Outside the expand button to avoid nested buttons */}
            {hasCandidate && (
              <div className="gba:px-6 gba:pb-4 gba:flex gba:justify-end">
                <AppAction
                  variant="create-primary"
                  contexts={[
                    {
                      context: FlowContextName.jobApplicationCreate,
                      contextData: {
                        jobPostingId: jobPosting.id,
                        jobCandidateId: jobCandidateId,
                        scope: 'personal'
                      }
                    }
                  ]}
                  accessToken={accessToken}
                  data-testid={formatDataTestId(prefixDataTestId, `apply-button-${jobPosting.id}`)}
                >
                  {getTranslationFromI18nKeyAndLabel('recruiting.portal.applyButton', 'Apply Now')}
                </AppAction>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="gba:p-6 gba:flex gba:items-center gba:justify-between gba:gap-4">
              <div className="gba:flex gba:items-center gba:gap-4 gba:flex-1 gba:min-w-0">
                <Avatar size="lg" className="gba:flex-shrink-0">
                  <AvatarFallback className="gba:bg-gradient-to-br gba:from-primary/15 gba:to-primary/5 gba:text-primary">
                    <BriefcaseIcon size={28} weight="duotone" />
                  </AvatarFallback>
                </Avatar>

                <div className="gba:flex-1 gba:min-w-0">
                  {jobRequest?.organizationalUnit?.name && (
                    <p className="gba:text-xs gba:text-muted-foreground gba:m-0 gba:mb-1">
                      {jobRequest.organizationalUnit.name}
                    </p>
                  )}
                  <div className="gba:flex gba:items-center gba:gap-3 gba:mb-1 gba:flex-wrap">
                    <h3 className="gba:m-0 gba:text-xl gba:font-bold gba:text-foreground">
                      {displayTitle || 'Untitled Position'}
                    </h3>
                    {jobRequest?.jobExperienceLevel && (
                      <Badge variant="outline" className="gba:text-xs">
                        {getCatalogValue(jobRequest.jobExperienceLevel)}
                      </Badge>
                    )}
                  </div>
                  <TooltipProvider>
                    <div className="gba:flex gba:items-center gba:gap-4 gba:mb-1 gba:flex-wrap">
                      {jobRequest?.employmentType && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-sm gba:text-muted-foreground gba:cursor-help">
                              <BriefcaseIcon size={14} weight="duotone" />
                              <span>{getCatalogValue(jobRequest.employmentType)}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{getTranslationFromI18nKeyAndLabel('recruiting.employmentType', 'Employment Type')}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {jobRequest?.contractType && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-sm gba:text-muted-foreground gba:cursor-help">
                              <ClockIcon size={14} weight="duotone" />
                              <span>{getCatalogValue(jobRequest.contractType)}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{getTranslationFromI18nKeyAndLabel('recruiting.contractType', 'Contract Type')}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <div className="gba:flex gba:items-center gba:gap-4 gba:text-sm gba:text-muted-foreground gba:flex-wrap">
                      {jobRequest?.company?.name && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="gba:flex gba:items-center gba:gap-1.5 gba:cursor-help">
                              <BriefcaseIcon size={14} weight="duotone" />
                              <span>{jobRequest.company.name}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{getTranslationFromI18nKeyAndLabel('recruiting.company', 'Company')}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {jobRequest?.siteLocation?.name && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="gba:flex gba:items-center gba:gap-1.5 gba:cursor-help">
                              <MapPinIcon size={14} weight="duotone" />
                              <span>{jobRequest.siteLocation.name}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{getTranslationFromI18nKeyAndLabel('recruiting.location', 'Location')}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {jobRequest?.costCenter?.name && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="gba:flex gba:items-center gba:gap-1.5 gba:cursor-help">
                              <CurrencyCircleDollarIcon size={14} weight="duotone" />
                              <span>{jobRequest.costCenter.name}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{getTranslationFromI18nKeyAndLabel('recruiting.costCenter', 'Cost Center')}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TooltipProvider>
                </div>
              </div>
            </div>

            {/* Apply Button - Outside to avoid nested buttons */}
            {hasCandidate && (
              <div className="gba:px-6 gba:pb-4 gba:flex gba:justify-end">
                <AppAction
                  variant="create-primary"
                  contexts={[
                    {
                      context: FlowContextName.jobApplicationCreate,
                      contextData: {
                        jobPostingId: jobPosting.id,
                        jobCandidateId: jobCandidateId,
                        scope: 'personal'
                      }
                    }
                  ]}
                  accessToken={accessToken}
                  data-testid={formatDataTestId(prefixDataTestId, `apply-button-${jobPosting.id}`)}
                >
                  {getTranslationFromI18nKeyAndLabel('recruiting.portal.applyButton', 'Apply Now')}
                </AppAction>
              </div>
            )}
          </>
        )}

        {/* Expanded Content */}
        {(isExpanded || !showExpandButton) && (
          <div className="gba:border-t gba:border-border gba:p-6">
            <div className="gba:space-y-6" data-testid={formatDataTestId(prefixDataTestId, 'expanded-content')}>
              {/* General Information */}
              {jobRequest?.jobPosition?.name && (
                <div className="gba:space-y-4">
                  <h4 className="gba:text-lg gba:font-semibold gba:text-foreground gba:m-0">
                    {getTranslationFromI18nKeyAndLabel('recruiting.portal.generalInformation', 'General Information')}
                  </h4>
                  <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
                    <div className="gba:space-y-1">
                      <p className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:m-0">
                        {getTranslationFromI18nKeyAndLabel('recruiting.jobPosition', 'Job Position')}
                      </p>
                      <p className="gba:text-base gba:font-medium gba:text-foreground gba:m-0">
                        {jobRequest.jobPosition.name}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Description/Content */}
              {displayContent && (
                <div className="gba:space-y-4">
                  {jobPosting.createdAt && (
                    <p className="gba:text-sm gba:text-muted-foreground gba:m-0">
                      {formatDateOnly(jobPosting.createdAt)}
                    </p>
                  )}
                  <ContentHtmlRenderer
                    content={displayContent}
                    variant="default"
                    data-testid={formatDataTestId(prefixDataTestId, 'content')}
                  />
                </div>
              )}

              {/* File Download */}
              {jobPosting.fileInfo && (
                <div className="gba:space-y-2">
                  <h4 className="gba:text-lg gba:font-semibold gba:text-foreground gba:m-0">
                    {getTranslationFromI18nKeyAndLabel('recruiting.portal.attachments', 'Attachments')}
                  </h4>
                  <Button
                    variant="outline"
                    onClick={handleDownloadFile}
                    startIcon={<DownloadIcon size={16} />}
                    data-testid={formatDataTestId(prefixDataTestId, 'download-file-button')}
                  >
                    {jobPosting.fileInfo.name ||
                      getTranslationFromI18nKeyAndLabel('recruiting.portal.downloadFile', 'Download File')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
