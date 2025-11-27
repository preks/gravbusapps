'use client'

import React from 'react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ScrollArea,
  Separator,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import {
  CalendarIcon,
  UserIcon,
  ArrowSquareOutIcon,
  BuildingsIcon,
  CurrencyCircleDollarIcon,
  ChartLineUpIcon,
  ClockCounterClockwiseIcon,
  TextAlignLeftIcon,
  UserCircleIcon,
  Icon as PhosphorIcon
} from '@phosphor-icons/react'
import { Opportunity } from './types'
import { getOpportunityStatusBadgeVariant, formatCurrency } from './utils'
import dayjs from 'dayjs'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { getCatalogEntryValue } from '@/common/data/catalog/utils/catalogTranslationUtils'
import translations from './_i18n'

interface OpportunityDetailSheetProps {
  opportunity: Opportunity | null
  open: boolean
  onOpenChange: (open: boolean) => void
  buildAccountUrl?: (accountId: string) => string
  buildLeadUrl?: (leadId: string) => string
  buildContactUrl?: (contactId: string) => string
  'data-testid'?: string
}

const DATA_TEST_ID_PREFIX = 'OpportunityDetailSheet'

interface FieldRowProps {
  icon: PhosphorIcon
  label: string
  children: React.ReactNode
  testId?: string
}

const FieldRow: React.FC<FieldRowProps> = ({ icon: IconComponent, label, children, testId }) => (
  <div className="gba:flex gba:items-start gba:gap-3 gba:py-2" data-testid={testId}>
    <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-[100px] gba:text-sm gba:text-muted-foreground">
      <IconComponent size={14} className="gba:text-muted-foreground" />
      <span>{label}</span>
    </div>
    <div className="gba:flex-1">{children}</div>
  </div>
)

/**
 * OpportunityDetailSheet with integrated Sheet component
 * Displays detailed opportunity information in a slide-out panel
 */
export const OpportunityDetailSheet: React.FC<OpportunityDetailSheetProps> = ({
  opportunity,
  open,
  onOpenChange,
  buildAccountUrl,
  buildLeadUrl,
  buildContactUrl,
  'data-testid': dataTestId
}) => {
  const { t } = useTranslation(translations)

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t('title')}>
      <SheetContent className="gba:!w-[500px] gba:sm:!w-[500px] gba:!max-w-[90vw] gba:p-0 gba:flex gba:flex-col">
        <SheetHeader className="gba:px-6 gba:py-6 gba:border-b gba:border-border gba:shrink-0">
          <SheetTitle className="gba:text-xl gba:font-semibold gba:text-left">
            {opportunity?.name || t('title')}
          </SheetTitle>
        </SheetHeader>
        <div className="gba:flex-1 gba:overflow-hidden gba:px-6">
          {opportunity ? (
            <OpportunityDetailContent
              opportunity={opportunity}
              buildAccountUrl={buildAccountUrl}
              buildLeadUrl={buildLeadUrl}
              buildContactUrl={buildContactUrl}
              data-testid={dataTestId}
            />
          ) : (
            <div className="gba:p-4 gba:text-center gba:text-muted-foreground">{t('no-opportunity-selected')}</div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

/**
 * OpportunityDetailContent - Internal component for rendering opportunity details
 */
interface OpportunityDetailContentProps {
  opportunity: Opportunity
  buildAccountUrl?: (accountId: string) => string
  buildLeadUrl?: (leadId: string) => string
  buildContactUrl?: (contactId: string) => string
  'data-testid'?: string
}

const OpportunityDetailContent: React.FC<OpportunityDetailContentProps> = ({
  opportunity,
  buildAccountUrl,
  buildLeadUrl,
  buildContactUrl,
  'data-testid': dataTestId
}) => {
  const { t } = useTranslation(translations)

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-'
    const date = dayjs(dateString)
    return date.isValid() ? date.format('MMM DD, YYYY') : '-'
  }

  const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return '-'
    const date = dayjs(dateString)
    return date.isValid() ? date.format('MMM DD, YYYY h:mm A') : '-'
  }

  const getInitials = (firstName: string = '', lastName: string = ''): string => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'U'
  }

  const handleEmployeeClick = (employeeId: string) => {
    if (!employeeId) return
    const url = buildPlatformUrl('/platform/employee-record', { employeeId })
    navigateTo(url)
  }

  const handleAccountClick = () => {
    if (!opportunity.account?.id) return

    if (buildAccountUrl) {
      navigateTo(buildAccountUrl(opportunity.account.id))
    } else {
      // Default URL based on sourceApp
      const basePath = opportunity.sourceApp === 'IRM' ? '/platform/irm/account-record' : '/platform/crm/account-record'
      const url = buildPlatformUrl(basePath, { accountId: opportunity.account.id })
      navigateTo(url)
    }
  }

  const handleLeadClick = () => {
    if (!opportunity.lead?.id) return

    if (buildLeadUrl) {
      navigateTo(buildLeadUrl(opportunity.lead.id))
    } else {
      const basePath = opportunity.sourceApp === 'IRM' ? '/platform/irm/lead-record' : '/platform/crm/lead-record'
      const url = buildPlatformUrl(basePath, { leadId: opportunity.lead.id })
      navigateTo(url)
    }
  }

  const handleContactClick = (contactId: string) => {
    if (!contactId) return

    if (buildContactUrl) {
      navigateTo(buildContactUrl(contactId))
    } else {
      const basePath = opportunity.sourceApp === 'IRM' ? '/platform/irm/contact-record' : '/platform/crm/contact-record'
      const url = buildPlatformUrl(basePath, { contactId })
      navigateTo(url)
    }
  }

  const handleGoToRecord = () => {
    if (!opportunity.id) return

    const basePath =
      opportunity.sourceApp === 'IRM' ? '/platform/irm/opportunity-record' : '/platform/crm/opportunity-record'
    const url = buildPlatformUrl(basePath, { opportunityId: opportunity.id })
    navigateTo(url)
  }

  // Get pipeline and stage (works for both CRM and IRM)
  const pipeline = opportunity.opportunityPipeline || opportunity.salesPipeline
  const stage = opportunity.opportunityPipelineStage || opportunity.salesPipelineStage

  // Determine amount to display
  const displayAmount = opportunity.forecastedProfitAmount || opportunity.estimatedAmount
  const currencyCode = opportunity.currency?.code || 'EUR'

  // Get contacts (handles both naming conventions)
  const contacts = opportunity.opportunityContacts || opportunity.contacts || []

  // Safety check
  if (!opportunity) {
    return (
      <div
        className="gba:p-4 gba:text-center gba:text-muted-foreground"
        data-testid={`${dataTestId || DATA_TEST_ID_PREFIX}-no-data`}
      >
        {t('no-opportunity-data')}
      </div>
    )
  }

  return (
    <ScrollArea className="gba:h-full gba:w-full" data-testid={`${dataTestId || DATA_TEST_ID_PREFIX}-scroll-area`}>
      <div className="gba:space-y-4 gba:p-1" data-testid={`${dataTestId || DATA_TEST_ID_PREFIX}-container`}>
        <Card data-testid={`${dataTestId || DATA_TEST_ID_PREFIX}-details-card`}>
          <CardHeader className="gba:pb-3 gba:flex gba:flex-row gba:items-center gba:justify-between gba:space-y-0">
            <CardTitle className="gba:text-base gba:font-medium gba:text-muted-foreground">{t('details')}</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGoToRecord}
              data-testid={`${dataTestId || DATA_TEST_ID_PREFIX}-go-to-record-button`}
            >
              {t('go-to-record')}
            </Button>
          </CardHeader>
          <CardContent className="gba:space-y-1">
            {/* Status */}
            <FieldRow
              icon={ChartLineUpIcon}
              label={t('status')}
              testId={`${dataTestId || DATA_TEST_ID_PREFIX}-status-field`}
            >
              {opportunity.opportunityStatus ? (
                <Badge variant={getOpportunityStatusBadgeVariant(opportunity.opportunityStatus.code || '')}>
                  {getCatalogEntryValue(opportunity.opportunityStatus as any)}
                </Badge>
              ) : (
                <span className="gba:text-sm gba:text-muted-foreground">-</span>
              )}
            </FieldRow>

            {/* Owner */}
            <FieldRow icon={UserIcon} label={t('owner')} testId={`${dataTestId || DATA_TEST_ID_PREFIX}-owner-field`}>
              {opportunity.ownerEmployee ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer gba:hover:bg-accent gba:px-2 gba:py-1 gba:rounded gba:transition-colors gba:w-fit gba:min-h-[24px] gba:bg-transparent gba:border-none gba:font-inherit gba:text-inherit"
                      onClick={() => handleEmployeeClick(opportunity.ownerEmployee!.id)}
                      data-testid={`${dataTestId || DATA_TEST_ID_PREFIX}-owner-link`}
                    >
                      <Avatar size="sm" className="gba:size-6">
                        {opportunity.ownerEmployee.pictureThumbnail && (
                          <AvatarImage
                            src={`data:image/gif;base64,${opportunity.ownerEmployee.pictureThumbnail}`}
                            alt={opportunity.ownerEmployee.displayName || t('employee')}
                          />
                        )}
                        <AvatarFallback className="gba:text-xs">
                          {getInitials(opportunity.ownerEmployee.firstName, opportunity.ownerEmployee.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="gba:text-sm gba:font-medium">
                        {opportunity.ownerEmployee.displayName ||
                          `${opportunity.ownerEmployee.firstName} ${opportunity.ownerEmployee.lastName}`.trim() ||
                          t('unknown')}
                      </span>
                      <ArrowSquareOutIcon size={12} className="gba:text-muted-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{t('view-employee-profile')}</TooltipContent>
                </Tooltip>
              ) : (
                <span className="gba:text-sm gba:text-muted-foreground gba:px-2 gba:py-1">{t('unassigned')}</span>
              )}
            </FieldRow>

            {/* Account */}
            <FieldRow
              icon={BuildingsIcon}
              label={t('account')}
              testId={`${dataTestId || DATA_TEST_ID_PREFIX}-account-field`}
            >
              {opportunity.account ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer gba:hover:bg-accent gba:px-2 gba:py-1 gba:rounded gba:transition-colors gba:w-fit gba:min-h-[24px] gba:bg-transparent gba:border-none gba:font-inherit gba:text-inherit"
                      onClick={handleAccountClick}
                      data-testid={`${dataTestId || DATA_TEST_ID_PREFIX}-account-link`}
                    >
                      <span className="gba:text-sm gba:font-medium">{opportunity.account.name}</span>
                      <ArrowSquareOutIcon size={12} className="gba:text-muted-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{t('view-account-record')}</TooltipContent>
                </Tooltip>
              ) : (
                <span className="gba:text-sm gba:text-muted-foreground">{t('no-account')}</span>
              )}
            </FieldRow>

            {/* Lead (if exists) */}
            {opportunity.lead && (
              <FieldRow
                icon={UserCircleIcon}
                label={t('lead')}
                testId={`${dataTestId || DATA_TEST_ID_PREFIX}-lead-field`}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer gba:hover:bg-accent gba:px-2 gba:py-1 gba:rounded gba:transition-colors gba:w-fit gba:min-h-[24px] gba:bg-transparent gba:border-none gba:font-inherit gba:text-inherit"
                      onClick={handleLeadClick}
                      data-testid={`${dataTestId || DATA_TEST_ID_PREFIX}-lead-link`}
                    >
                      <span className="gba:text-sm gba:font-medium">{opportunity.lead.companyName}</span>
                      <ArrowSquareOutIcon size={12} className="gba:text-muted-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{t('view-lead-record')}</TooltipContent>
                </Tooltip>
              </FieldRow>
            )}

            <Separator className="gba:my-4" />

            {/* Pipeline */}
            {pipeline && (
              <FieldRow
                icon={ChartLineUpIcon}
                label={t('pipeline')}
                testId={`${dataTestId || DATA_TEST_ID_PREFIX}-pipeline-field`}
              >
                <Badge variant="outline" className="gba:text-xs">
                  {getCatalogEntryValue(pipeline as any)}
                </Badge>
              </FieldRow>
            )}

            {/* Stage */}
            {stage && (
              <FieldRow
                icon={ChartLineUpIcon}
                label={t('stage')}
                testId={`${dataTestId || DATA_TEST_ID_PREFIX}-stage-field`}
              >
                <Badge variant="info" className="gba:text-xs">
                  {getCatalogEntryValue(stage as any)}
                </Badge>
              </FieldRow>
            )}

            {/* Amount */}
            {displayAmount !== undefined && displayAmount !== null && (
              <FieldRow
                icon={CurrencyCircleDollarIcon}
                label={t('amount')}
                testId={`${dataTestId || DATA_TEST_ID_PREFIX}-amount-field`}
              >
                <span className="gba:text-sm gba:font-bold gba:text-foreground">
                  {formatCurrency(displayAmount, currencyCode)}
                </span>
              </FieldRow>
            )}

            {/* Close Date */}
            {opportunity.closeDate && (
              <FieldRow
                icon={CalendarIcon}
                label={t('close-date')}
                testId={`${dataTestId || DATA_TEST_ID_PREFIX}-close-date-field`}
              >
                <span className="gba:text-sm gba:text-foreground">{formatDate(opportunity.closeDate)}</span>
              </FieldRow>
            )}

            <Separator className="gba:my-4" />

            {/* Created At */}
            <FieldRow
              icon={ClockCounterClockwiseIcon}
              label={t('created')}
              testId={`${dataTestId || DATA_TEST_ID_PREFIX}-created-field`}
            >
              <span className="gba:text-sm gba:text-muted-foreground">{formatDateTime(opportunity.createdAt)}</span>
            </FieldRow>

            {/* Description */}
            {opportunity.description && (
              <FieldRow
                icon={TextAlignLeftIcon}
                label={t('description')}
                testId={`${dataTestId || DATA_TEST_ID_PREFIX}-description-field`}
              >
                <p className="gba:text-sm gba:text-foreground gba:whitespace-pre-wrap">{opportunity.description}</p>
              </FieldRow>
            )}
          </CardContent>
        </Card>

        {/* Contacts Card */}
        {contacts.length > 0 && (
          <Card data-testid={`${dataTestId || DATA_TEST_ID_PREFIX}-contacts-card`}>
            <CardHeader className="gba:pb-3">
              <CardTitle className="gba:text-base gba:font-medium gba:text-muted-foreground">
                {t('contacts')} ({contacts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="gba:space-y-2">
                {contacts.map(oppContact => {
                  const contact = oppContact.contact
                  if (!contact) return null

                  return (
                    <button
                      type="button"
                      key={oppContact.id}
                      onClick={() => handleContactClick(contact.id)}
                      className="gba:w-full gba:flex gba:items-center gba:gap-3 gba:p-3 gba:text-left gba:bg-muted gba:rounded-lg gba:hover:bg-accent gba:transition-colors gba:group"
                      data-testid={`${dataTestId || DATA_TEST_ID_PREFIX}-contact-${contact.id}`}
                    >
                      <Avatar size="sm" className="gba:size-8">
                        <AvatarFallback className="gba:text-xs">
                          {getInitials(contact.firstName, contact.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="gba:flex-1 gba:min-w-0">
                        <div className="gba:text-sm gba:font-medium gba:text-foreground">
                          {`${contact.firstName || ''} ${contact.lastName || ''}`.trim() || t('unknown')}
                        </div>
                        {contact.jobTitle && (
                          <div className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">{contact.jobTitle}</div>
                        )}
                        {contact.email && (
                          <div className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">{contact.email}</div>
                        )}
                      </div>
                      <ArrowSquareOutIcon
                        size={16}
                        className="gba:text-muted-foreground gba:shrink-0 gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity"
                      />
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="gba:h-4" />
      </div>
    </ScrollArea>
  )
}

export default OpportunityDetailSheet
