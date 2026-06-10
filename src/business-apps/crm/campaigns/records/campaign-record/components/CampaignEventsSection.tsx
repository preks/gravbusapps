import React, { useState, useCallback, useEffect, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Spinner,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  useTranslation
} from '@newwork/nw-design-system'
import { Plus, CaretDown, CaretRight, Trash } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { AppAction } from '@/components/app-action'
import { useAppActionData } from '@/common/hooks/useAppActionData'
import { useCampaignEntityList, useCampaignEntityById } from '@/common/data/customer/hooks/useCampaignEntityData'
import {
  GET_CAMPAIGN_EVENTS,
  GET_CAMPAIGN_EVENT_BY_ID
} from '@/common/data/customer/queries/customerCampaignEventQueries'
import type {
  CustomerCampaignEvent,
  CustomerCampaignEventAccountRef
} from '@/common/data/customer/types/customerCampaignEventTypes'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import dayjs from 'dayjs'
import translations from '@/business-apps/crm/campaigns/_i18n'

interface CampaignEventsSectionProps extends BusinessAppContextProps {
  campaignId: string
}

interface CampaignEventRowActionsProps {
  row: { original: CustomerCampaignEvent }
  accessToken: string | undefined
}

const CampaignEventRowActions: React.FC<CampaignEventRowActionsProps> = ({ row, accessToken }) => {
  const config = useMemo(
    () => ({
      contextsArray: [FlowContextName.customerCampaignEventEntity] as FlowContextName[],
      externalContextData: { eventId: row.original.id },
      accessToken,
      deferMainContextRequestsUntilClick: true,
      emptyStateBehavior: 'enable' as const
    }),
    [row.original.id, accessToken]
  )
  const { combinedData, handleDeferredFetch } = useAppActionData(config, `campaign-events-row-${row.original.id}`)

  return (
    <AppAction
      variant="table-row"
      contextsArray={[]}
      staticFlowData={combinedData}
      prefixDataTestId={`campaign-events-row-${row.original.id}`}
      accessToken={accessToken}
      emptyStateBehavior="enable"
      deferMainContextRequestsUntilClick
      onDropdownOpen={handleDeferredFetch}
    />
  )
}

interface EventAccountsSubRowProps {
  eventId: string
  accessToken: string | undefined
  colSpan: number
}

const EventAccountsSubRow: React.FC<EventAccountsSubRowProps> = ({ eventId, accessToken, colSpan }) => {
  const { t } = useTranslation(translations)
  const {
    entity: event,
    loading,
    refetch
  } = useCampaignEntityById<CustomerCampaignEvent>(
    accessToken || '',
    eventId,
    GET_CAMPAIGN_EVENT_BY_ID(),
    'CustomerCampaignEventByPk',
    'Failed to load event'
  )
  // Refresh the expanded account list immediately after an event account is added/removed.
  useProcessCompletion({ onSuccess: refetch })
  const accounts: CustomerCampaignEventAccountRef[] = event?.customerCampaignEventAccounts ?? []

  return (
    <TableRow data-testid={`campaign-event-accounts-row-${eventId}`}>
      <TableCell colSpan={colSpan} className="gba:bg-muted/30 gba:py-3 gba:px-6">
        {loading ? (
          <div className="gba:flex gba:justify-center gba:py-2">
            <Spinner size="sm" />
          </div>
        ) : (
          <div className="gba:space-y-2">
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
              <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground uppercase gba:tracking-wide">
                {t('campaign-events-accounts')}
              </span>
              <AppAction
                accessToken={accessToken}
                variant="create-secondary"
                contextsArray={[FlowContextName.customerCampaignEventAccountCreate]}
                externalContextData={{ eventId }}
                prefixDataTestId={`campaign-event-accounts-add-${eventId}`}
                emptyStateBehavior="hide"
              >
                <Button size="sm" variant="outline" data-testid={`campaign-event-accounts-add-button-${eventId}`}>
                  <Plus size={14} className="gba:mr-1" />
                  {t('campaign-eventAccount-addTitle')}
                </Button>
              </AppAction>
            </div>
            {accounts.length === 0 ? (
              <p className="gba:text-xs gba:text-muted-foreground gba:py-1">{t('campaign-events-accountsEmpty')}</p>
            ) : (
              <div className="gba:space-y-1">
                {accounts.map(ea => {
                  const accountId = ea.customerAccount?.id ?? ea.customerAccountId
                  const accountName = ea.customerAccount?.name ?? ea.customerAccountId
                  return (
                    <div
                      key={ea.customerAccountId}
                      className="gba:flex gba:items-center gba:justify-between gba:py-1 gba:px-2 gba:rounded gba:bg-muted gba:border gba:border-border"
                      data-testid={`campaign-event-account-item-${ea.id}`}
                    >
                      {accountId ? (
                        <button
                          type="button"
                          onClick={() => navigateTo(buildPlatformUrl('/platform/crm/account-record', { accountId }))}
                          className="gba:text-sm gba:text-primary gba:font-medium gba:text-left gba:hover:underline"
                          data-testid={`campaign-event-account-name-${ea.id}`}
                        >
                          {accountName}
                        </button>
                      ) : (
                        <span className="gba:text-sm">{accountName}</span>
                      )}
                      <AppAction
                        accessToken={accessToken}
                        variant="delete-secondary"
                        contextsArray={[FlowContextName.customerCampaignEventAccountDelete]}
                        externalContextData={{ eventAccountId: ea.id }}
                        prefixDataTestId={`campaign-event-account-delete-${ea.id}`}
                        emptyStateBehavior="hide"
                      >
                        <Button
                          size="icon"
                          variant="ghost"
                          className="gba:h-6 gba:w-6 gba:text-destructive gba:hover:text-destructive"
                          data-testid={`campaign-event-account-delete-button-${ea.id}`}
                        >
                          <Trash size={14} />
                        </Button>
                      </AppAction>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </TableCell>
    </TableRow>
  )
}

const EVENTS_PAGE_SIZE = 10

const CampaignEventsSection: React.FC<CampaignEventsSectionProps> = ({ campaignId, accessToken, ...context }) => {
  const { t } = useTranslation(translations)
  const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(new Set())
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: EVENTS_PAGE_SIZE })

  const ctxProps = { ...context, accessToken } as BusinessAppContextProps
  const {
    items: events,
    totalCount,
    aggregate,
    loading: isLoading,
    error,
    refetch
  } = useCampaignEntityList<CustomerCampaignEvent>({
    context: ctxProps,
    campaignId,
    query: GET_CAMPAIGN_EVENTS(),
    itemsKey: 'CustomerCampaignEvent',
    aggregateKey: 'CustomerCampaignEventAggregate',
    errorMessage: 'Failed to load campaign events',
    pagination
  })
  const totalBudget = aggregate?.sum?.budget ?? 0
  const totalPipeline = aggregate?.sum?.pipelineGenerated ?? 0

  useProcessCompletion({ onSuccess: refetch })

  const totalEventPages = Math.max(1, Math.ceil(totalCount / pagination.pageSize))
  const currentEventsPage = pagination.pageIndex + 1

  useEffect(() => {
    const lastPageIndex = Math.max(0, totalEventPages - 1)
    if (pagination.pageIndex > lastPageIndex) {
      setPagination(prev => ({ ...prev, pageIndex: lastPageIndex }))
    }
  }, [totalEventPages, pagination.pageIndex])

  const goToEventsPage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, pageIndex: Math.max(0, page - 1) }))
  }, [])

  const toggleExpand = useCallback((eventId: string) => {
    setExpandedEventIds(prev => {
      const next = new Set(prev)
      if (next.has(eventId)) {
        next.delete(eventId)
      } else {
        next.add(eventId)
      }
      return next
    })
  }, [])

  const TOTAL_COLS = 7

  if (isLoading && events.length === 0) {
    return (
      <Card className="gba:bg-muted">
        <CardContent className="gba:flex gba:items-center gba:justify-center gba:py-12">
          <Spinner size="md" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="gba:bg-muted" data-testid="campaign-events-section">
      <CardHeader>
        <div className="gba:flex gba:flex-col gba:sm:flex-row gba:sm:items-center gba:sm:justify-between gba:gap-3 gba:w-full gba:min-w-0">
          <CardTitle className="gba:min-w-0 gba:wrap-break-word">{t('campaign-events-title')}</CardTitle>
          <div className="gba:flex gba:items-center gba:gap-3 gba:sm:ml-auto gba:flex-wrap gba:w-full gba:sm:w-auto gba:justify-end gba:min-w-0">
            <div className="gba:flex gba:items-center gba:gap-3 gba:flex-wrap gba:justify-end gba:min-w-0">
              <span className="gba:text-sm gba:text-muted-foreground" data-testid="campaign-events-total-budget">
                {t('campaign-events-totalBudget')}: ${totalBudget.toLocaleString()}
              </span>
              <span className="gba:text-sm gba:text-muted-foreground" data-testid="campaign-events-total-pipeline">
                {t('campaign-events-totalPipeline')}: ${totalPipeline.toLocaleString()}
              </span>
            </div>
            <AppAction
              accessToken={accessToken}
              variant="create-primary"
              contextsArray={[FlowContextName.customerCampaignEventCreate]}
              externalContextData={{ campaignId }}
              prefixDataTestId="campaign-events-add"
              emptyStateBehavior="hide"
              className="gba:h-8"
              data-testid="campaign-events-add-button"
            >
              {t('campaign-events-add')}
            </AppAction>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && <p className="gba:text-destructive gba:text-sm gba:mb-4">{error}</p>}
        {totalCount === 0 && !error ? (
          <p className="gba:text-muted-foreground gba:text-sm gba:text-center gba:py-8">{t('campaign-events-empty')}</p>
        ) : (
          <Table data-testid="campaign-events-table">
            <TableHeader>
              <TableRow>
                <TableHead className="gba:w-8" />
                <TableHead>{t('campaign-events-name')}</TableHead>
                <TableHead>{t('campaign-events-date')}</TableHead>
                <TableHead>{t('campaign-events-budget')}</TableHead>
                <TableHead>{t('campaign-events-meetings')}</TableHead>
                <TableHead>{t('campaign-events-opps')}</TableHead>
                <TableHead>{t('campaign-events-followUp')}</TableHead>
                <TableHead className="gba:w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map(event => {
                const isExpanded = expandedEventIds.has(event.id)
                return (
                  <React.Fragment key={event.id}>
                    <TableRow data-testid={`campaign-event-row-${event.id}`}>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => toggleExpand(event.id)}
                          className="gba:p-1 gba:rounded gba:hover:bg-accent gba:transition-colors"
                          data-testid={`campaign-event-expand-${event.id}`}
                          aria-expanded={isExpanded}
                        >
                          {isExpanded ? <CaretDown size={14} /> : <CaretRight size={14} />}
                        </button>
                      </TableCell>
                      <TableCell>{event.name ?? '-'}</TableCell>
                      <TableCell>{event.eventDate ? dayjs(event.eventDate).format('DD MMM YYYY') : '-'}</TableCell>
                      <TableCell>{event.budget == null ? '-' : `$${Number(event.budget).toLocaleString()}`}</TableCell>
                      <TableCell>{`${event.meetingsHeld ?? 0} / ${event.expectedMeetings ?? 0}`}</TableCell>
                      <TableCell>{String(event.opportunitiesGenerated ?? 0)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={event.followUpComplete ? 'success' : 'secondary'}
                          data-testid={`event-followup-${event.id}`}
                        >
                          {event.followUpComplete ? t('campaign-events-complete') : t('campaign-events-pending')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <CampaignEventRowActions row={{ original: event }} accessToken={accessToken} />
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <EventAccountsSubRow eventId={event.id} accessToken={accessToken} colSpan={TOTAL_COLS + 1} />
                    )}
                  </React.Fragment>
                )
              })}
            </TableBody>
          </Table>
        )}
        {totalCount > pagination.pageSize && (
          <div className="gba:mt-4 gba:flex gba:justify-end" data-testid="campaign-events-pagination">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => goToEventsPage(currentEventsPage - 1)}
                    className={
                      currentEventsPage === 1 ? 'gba:pointer-events-none gba:opacity-50' : 'gba:cursor-pointer'
                    }
                    data-testid="campaign-events-pagination-previous"
                  />
                </PaginationItem>

                {Array.from({ length: totalEventPages }, (_, i) => i + 1).map(page => (
                  <PaginationItem key={`campaign-events-page-${page}`}>
                    <PaginationLink
                      onClick={() => goToEventsPage(page)}
                      isActive={currentEventsPage === page}
                      className="gba:cursor-pointer"
                      data-testid={`campaign-events-pagination-page-${page}`}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => goToEventsPage(currentEventsPage + 1)}
                    className={
                      currentEventsPage === totalEventPages
                        ? 'gba:pointer-events-none gba:opacity-50'
                        : 'gba:cursor-pointer'
                    }
                    data-testid="campaign-events-pagination-next"
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default CampaignEventsSection
