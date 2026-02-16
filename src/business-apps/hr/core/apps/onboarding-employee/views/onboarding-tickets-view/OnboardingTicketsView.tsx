import React, { useCallback, useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  DataDisplay,
  useTranslation,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Spinner
} from '@newwork/nw-design-system'
import { TicketDetail, TaskRecord } from '@/business-apps/ser/apps/service-desk/components'
import { useOnboardingTickets, type OnboardingTask } from '../../hooks/useOnboardingTickets'
import { useOnboardingTaskActions } from '../../hooks/useOnboardingTaskActions'
import { useOnboardingEmployeeNames } from '../../hooks/useOnboardingEmployeeNames'
import { OnboardingTicketsTable } from './OnboardingTicketsTable'
import onboardingI18n from '../../_i18n'

export type OnboardingTicketsViewProps = BusinessAppContextProps

export const OnboardingTicketsView: React.FC<OnboardingTicketsViewProps> = ({ accessToken, userInfo }) => {
  const { t } = useTranslation(onboardingI18n)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  /** When set, show full-page TaskRecord (same as Service Desk); click on ticket name sets this. */
  const [selectedTaskIdForPage, setSelectedTaskIdForPage] = useState<string | null>(null)

  const { tickets, isLoading, error, refetch } = useOnboardingTickets({ accessToken, userInfo })

  const ticketUserIds = useMemo(() => {
    const ids: string[] = []
    for (const t of tickets) {
      if (t.flowInitiatedById) ids.push(t.flowInitiatedById)
      const assignedTo = t.assignment?.assignedTo
      if (assignedTo && assignedTo !== t.flowInitiatedById) ids.push(assignedTo)
    }
    return ids
  }, [tickets])

  const { displayNames, employeeInfo } = useOnboardingEmployeeNames({
    userIds: ticketUserIds,
    accessToken: accessToken ?? '',
    enabled: tickets.length > 0
  })

  const onActionSuccess = useCallback(() => {
    void refetch()
  }, [refetch])

  const { claim, isPerforming } = useOnboardingTaskActions({
    accessToken,
    userId: userInfo?.id,
    onSuccess: onActionSuccess
  })

  const handleClaim = useCallback(
    (ticket: OnboardingTask) => {
      claim(ticket.id)
    },
    [claim]
  )

  const handleView = useCallback((ticket: OnboardingTask) => {
    setSelectedTaskId(ticket.id)
    setIsDetailOpen(true)
  }, [])

  /** Click on ticket name → full-page TaskRecord (same pattern as Service Desk). */
  const handleTaskSelect = useCallback((ticket: OnboardingTask) => {
    setSelectedTaskIdForPage(ticket.id)
  }, [])

  const handleTaskRecordClose = useCallback(() => {
    setSelectedTaskIdForPage(null)
  }, [])

  const handleTaskChange = useCallback((taskId: string) => {
    setSelectedTaskIdForPage(taskId)
  }, [])

  const showClaim = useCallback((ticket: OnboardingTask) => {
    const mode = ticket.assignment?.assignmentMode
    const status = ticket.assignment?.assignmentStatus
    return mode === 'CLAIM' && status !== 'CLAIMED'
  }, [])

  const handleCloseDetail = useCallback((open: boolean) => {
    if (!open) {
      setIsDetailOpen(false)
      setSelectedTaskId(null)
    }
  }, [])

  if (isLoading && tickets.length === 0) {
    return (
      <div data-testid="onboarding-tickets-view" className="gba:h-full">
        <DataDisplay
          titleSections={[
            {
              id: 'tickets',
              label: t('onboarding-employee-section-tickets-title'),
              metadata: { count: 0, isLoading: true }
            }
          ]}
          currentSection="tickets"
          toolbarDensity="default"
        >
          <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
            <Spinner size="lg" />
          </div>
        </DataDisplay>
      </div>
    )
  }

  /** Full-page TaskRecord (same as Service Desk) when user clicks on ticket name. */
  if (selectedTaskIdForPage) {
    return (
      <TaskRecord
        taskId={selectedTaskIdForPage}
        deskKey="HR"
        accessToken={accessToken}
        userInfo={userInfo}
        onClose={handleTaskRecordClose}
        onTaskChange={handleTaskChange}
      />
    )
  }

  if (error) {
    return (
      <div data-testid="onboarding-tickets-view" className="gba:h-full">
        <DataDisplay
          titleSections={[
            {
              id: 'tickets',
              label: t('onboarding-employee-section-tickets-title'),
              metadata: { count: 0, isLoading: false }
            }
          ]}
          currentSection="tickets"
          toolbarDensity="default"
        >
          <div className="gba:rounded-lg gba:border gba:border-destructive/50 gba:bg-destructive/10 gba:px-4 gba:py-6 gba:text-center gba:text-destructive">
            {error}
          </div>
        </DataDisplay>
      </div>
    )
  }

  return (
    <div data-testid="onboarding-tickets-view" className="gba:h-full">
      <DataDisplay
        titleSections={[
          {
            id: 'tickets',
            label: t('onboarding-employee-section-tickets-title'),
            metadata: { count: tickets.length, isLoading: false }
          }
        ]}
        currentSection="tickets"
        toolbarDensity="default"
      >
        <OnboardingTicketsTable
          tickets={tickets}
          displayNames={displayNames}
          employeeInfo={employeeInfo}
          isLoading={isLoading}
          emptyMessage={t('onboarding-employee-tickets-empty')}
          claimLabel={t('onboarding-employee-tickets-action-claim')}
          viewLabel={t('onboarding-employee-tickets-action-view')}
          columnTask={t('onboarding-employee-tickets-column-ticket-title')}
          columnRequester={t('onboarding-employee-tickets-column-requester')}
          columnStatus={t('onboarding-employee-tickets-column-status')}
          columnUrgency={t('onboarding-employee-tickets-column-urgency')}
          columnDueDate={t('onboarding-employee-tickets-column-due-date')}
          columnAssignee={t('onboarding-employee-tickets-column-assignee')}
          columnUpdated={t('onboarding-employee-tickets-column-updated')}
          columnActions={t('onboarding-employee-tickets-column-actions')}
          onClaim={handleClaim}
          onView={handleView}
          onTaskSelect={handleTaskSelect}
          showClaim={showClaim}
          isClaimDisabled={isPerforming}
        />
      </DataDisplay>

      <Sheet open={isDetailOpen} onOpenChange={handleCloseDetail}>
        <SheetContent
          side="right"
          className="gba:w-[1200px] sm:gba:max-w-[1200px] gba:max-w-[90vw]"
          data-testid="ticket-detail-sheet"
        >
          <SheetHeader>
            <SheetTitle>
              {getTranslationFromI18nKeyAndLabel('services.ticket.detail.title', 'Ticket Details')}
            </SheetTitle>
            <SheetDescription>
              {getTranslationFromI18nKeyAndLabel(
                'services.ticket.detail.description',
                'View and manage ticket details and actions'
              )}
            </SheetDescription>
          </SheetHeader>
          <div className="gba:mt-6">
            {selectedTaskId && (
              <TicketDetail
                ticketId={selectedTaskId}
                deskKey="HR"
                accessToken={accessToken}
                userInfo={userInfo}
                onTicketUpdate={refetch}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
