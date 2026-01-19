import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Eye, UserPlus, UserMinus } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { StepReceiver, StepStatus } from '../../../../packages/services-plus-core/src'
import type { StepInstance } from '../../../types'
import { TicketDetail } from './TicketDetail'
import { DebugFlowModal } from './DebugFlowModal'
import { useDeskTickets } from '../hooks/useDeskTickets'
import { useTicketActions } from '../hooks/useTicketActions'
import { TicketTable, type TicketAction } from '../../../components/shared/TicketTable'

// Import nw-design-system components
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@newwork/nw-design-system'

export interface DeskQueueProps extends BusinessAppContextProps {
  deskKey: StepReceiver
  ticketId?: string
  onTaskSelect?: (taskId: string, deskKey: string) => void
}

export const DeskQueue: React.FC<DeskQueueProps> = ({ deskKey, ticketId, accessToken, userInfo, onTaskSelect }) => {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(ticketId || null)
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState<boolean>(!!ticketId)

  // Debug modal state for development
  const [debugTicket, setDebugTicket] = useState<StepInstance | null>(null)
  const [isDebugModalOpen, setIsDebugModalOpen] = useState<boolean>(false)

  // Optimistic updates state
  const [optimisticUpdates, setOptimisticUpdates] = useState<Record<string, Partial<StepInstance>>>({})

  // Fetch tickets for this desk
  const { tickets, isLoading, refetch } = useDeskTickets({
    deskKey,
    accessToken,
    userInfo
  })

  // Apply optimistic updates to tickets
  const ticketsWithOptimisticUpdates = useMemo(() => {
    if (!tickets) return []
    return tickets.map(ticket => ({
      ...ticket,
      ...optimisticUpdates[ticket.id]
    }))
  }, [tickets, optimisticUpdates])

  // Ticket actions (claim, unclaim)
  const { claimTicket, assignTicket, isPerformingAction } = useTicketActions({
    accessToken,
    userInfo,
    onSuccess: () => {
      setOptimisticUpdates({}) // Clear all optimistic updates
      refetch() // Refresh the ticket list after successful action
    }
  })

  // Get current user ID for action permissions
  const currentUserId = userInfo?.employeeDetails?.employeeId

  // Handle claim ticket with optimistic update
  const handleClaimTicket = useCallback(
    async (ticket: StepInstance) => {
      if (!currentUserId) {
        console.error(getTranslationFromI18nKeyAndLabel('services.error.noUser', 'User information not available'))
        return
      }

      // Optimistic update
      setOptimisticUpdates(prev => ({
        ...prev,
        [ticket.id]: {
          claimedByUserId: currentUserId,
          status: 'claimed' as StepStatus
        }
      }))

      try {
        await claimTicket(ticket.id)
      } catch (error) {
        // Remove optimistic update on error
        setOptimisticUpdates(prev => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [ticket.id]: _removed, ...rest } = prev
          return rest
        })
        console.error(
          getTranslationFromI18nKeyAndLabel('services.queue.claimed.error', 'Failed to claim ticket'),
          error
        )
      }
    },
    [currentUserId, claimTicket]
  )

  // Handle unclaim ticket (assign to null)
  const handleUnclaimTicket = useCallback(
    async (ticket: StepInstance) => {
      // Optimistic update
      setOptimisticUpdates(prev => ({
        ...prev,
        [ticket.id]: {
          claimedByUserId: undefined,
          assignedToUserId: undefined,
          status: 'queued' as StepStatus
        }
      }))

      try {
        // Use assign with empty string to simulate unclaim
        await assignTicket(ticket.id, '')
      } catch (error) {
        // Remove optimistic update on error
        setOptimisticUpdates(prev => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [ticket.id]: _removed, ...rest } = prev
          return rest
        })
        console.error(
          getTranslationFromI18nKeyAndLabel('services.queue.unclaimed.error', 'Failed to unclaim ticket'),
          error
        )
      }
    },
    [assignTicket]
  )

  // Handle debug modal open
  const handleOpenDebugModal = useCallback((ticket: StepInstance) => {
    setDebugTicket(ticket)
    setIsDebugModalOpen(true)
  }, [])

  // Handle ticket selection
  const handleViewTicket = useCallback((ticket: StepInstance) => {
    setSelectedTicketId(ticket.id)
    setIsDetailDrawerOpen(true)
  }, [])

  // Define ticket actions
  const ticketActions: TicketAction[] = useMemo(
    () => [
      {
        type: 'claim',
        label: getTranslationFromI18nKeyAndLabel('services.queue.actions.claim', 'Claim'),
        icon: <UserPlus className="gba:w-3 gba:h-3" />,
        onClick: handleClaimTicket,
        show: (ticket, currentUserId) => !ticket.claimedByUserId && !!currentUserId,
        disabled: ticket => isPerformingAction && !!optimisticUpdates[ticket.id],
        title: getTranslationFromI18nKeyAndLabel('services.queue.actions.claim.tooltip', 'Claim this ticket')
      },
      {
        type: 'unclaim',
        label: getTranslationFromI18nKeyAndLabel('services.queue.actions.unclaim', 'Unclaim'),
        icon: <UserMinus className="gba:w-3 gba:h-3" />,
        onClick: handleUnclaimTicket,
        show: (ticket, currentUserId) => ticket.claimedByUserId === currentUserId,
        disabled: ticket => isPerformingAction && !!optimisticUpdates[ticket.id],
        title: getTranslationFromI18nKeyAndLabel('services.queue.actions.unclaim.tooltip', 'Unclaim this ticket')
      },
      {
        type: 'view',
        label: getTranslationFromI18nKeyAndLabel('services.queue.actions.view', 'View'),
        icon: <Eye className="gba:w-3 gba:h-3" />,
        onClick: handleViewTicket,
        show: () => true,
        title: getTranslationFromI18nKeyAndLabel('services.queue.actions.view.tooltip', 'View ticket details')
      }
    ],
    [handleClaimTicket, handleUnclaimTicket, handleViewTicket, isPerformingAction, optimisticUpdates]
  )

  // Update drawer state when ticketId prop changes
  useEffect(() => {
    if (ticketId) {
      setSelectedTicketId(ticketId)
      setIsDetailDrawerOpen(true)
    }
  }, [ticketId])

  // Handle sheet close
  const handleCloseDetail = (open: boolean) => {
    setIsDetailDrawerOpen(open)
    if (!open) {
      setSelectedTicketId(null)
    }
  }

  // Handle debug modal close
  const handleCloseDebugModal = () => {
    setIsDebugModalOpen(false)
    setDebugTicket(null)
  }

  return (
    <div data-testid={`desk-queue-${deskKey.toLowerCase()}`} className="gba:w-full">
      <TicketTable
        // Data
        tickets={ticketsWithOptimisticUpdates}
        isLoading={isLoading}
        // Configuration
        tableId={`deskQueue_${deskKey}`}
        // Customization
        actions={ticketActions}
        // Callbacks
        onTicketSelect={handleViewTicket}
        onTaskSelect={onTaskSelect}
        onDebugTicket={handleOpenDebugModal}
        // Context for onTaskSelect
        deskKey={deskKey}
        // Display options
        showDebug={true}
        emptyMessage={getTranslationFromI18nKeyAndLabel('services.queue.empty', 'No tickets found for this desk')}
        emptySearchMessage={getTranslationFromI18nKeyAndLabel(
          'services.queue.searchEmpty',
          'No tickets found matching your search'
        )}
        // Context
        accessToken={accessToken}
        userInfo={userInfo}
      />

      {/* Ticket Detail Sheet */}
      <Sheet open={isDetailDrawerOpen} onOpenChange={handleCloseDetail}>
        <SheetContent
          side="right"
          className="gba:w-[1200px] sm:gba:max-w-[1200px] gba:max-w-[90vw]"
          data-testid="ticket-detail-sheet"
        >
          <SheetHeader>
            <SheetTitle>
              {getTranslationFromI18nKeyAndLabel('services.ticket.detail.title', 'Ticket Details')}
            </SheetTitle>
            <SheetDescription>View and manage ticket details and actions</SheetDescription>
          </SheetHeader>
          <div className="gba:mt-6">
            {selectedTicketId && (
              <TicketDetail
                ticketId={selectedTicketId}
                deskKey={deskKey}
                accessToken={accessToken}
                userInfo={userInfo}
                onTicketUpdate={refetch}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Debug Flow Modal - Development Tool */}
      <DebugFlowModal
        ticket={debugTicket}
        deskKey={deskKey}
        isOpen={isDebugModalOpen}
        onClose={handleCloseDebugModal}
        accessToken={accessToken}
        userInfo={userInfo}
      />
    </div>
  )
}
