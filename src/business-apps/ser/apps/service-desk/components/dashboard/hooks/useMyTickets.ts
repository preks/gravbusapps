import { useState, useEffect, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { createConductorWorkflowEngine } from '../../../../../services'
import type { StepInstance } from '../../../../../types'
import dayjs from 'dayjs'

/**
 * My Tickets Hook - Fetches tickets assigned to or claimed by the current user
 * Used for personal dashboard view
 */

export interface UseMyTicketsProps extends BusinessAppContextProps {
  limit?: number
  sortBy?: 'dueDate' | 'priority' | 'updatedAt' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

export interface UseMyTicketsReturn {
  myTickets: StepInstance[]
  openTickets: StepInstance[]
  inProgressTickets: StepInstance[]
  completedThisWeek: StepInstance[]
  dueToday: StepInstance[]
  overdue: StepInstance[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export const useMyTickets = ({
  accessToken,
  userInfo,
  limit = 50,
  sortBy = 'dueDate',
  sortOrder = 'asc'
}: UseMyTicketsProps): UseMyTicketsReturn => {
  const [allTickets, setAllTickets] = useState<StepInstance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Use userInfo.id (user ID) not employeeId
  const userId = userInfo?.id

  // Fetch user's tickets
  const fetchMyTickets = async () => {
    if (!accessToken || !userInfo || !userId) {
      setError('Missing authentication or user information')
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      console.log('[useMyTickets] Fetching tickets for user:', userId)

      const workflowEngine = createConductorWorkflowEngine({ accessToken, userInfo })

      // Fetch user tasks (both assigned and claimable)
      const userTickets = await workflowEngine.getUserTasks(userId, {
        includeAssigned: true,
        includeClaimable: true,
        limit
      })

      console.log('[useMyTickets] Fetched tickets:', {
        total: userTickets.length
      })

      setAllTickets(userTickets)
    } catch (err) {
      console.error('[useMyTickets] Error fetching tickets:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch tickets')
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchMyTickets()
  }, [accessToken, userInfo, userId, limit])

  // Sort tickets
  const sortedTickets = useMemo(() => {
    const sorted = [...allTickets]

    sorted.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortBy) {
        case 'dueDate':
          aValue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity
          bValue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity
          break
        case 'priority':
          // Assuming priority is a string like 'HIGH', 'MEDIUM', 'LOW'
          const priorityOrder: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
          aValue = priorityOrder[a.priority?.toUpperCase() || 'MEDIUM'] || 2
          bValue = priorityOrder[b.priority?.toUpperCase() || 'MEDIUM'] || 2
          break
        case 'updatedAt':
          aValue = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
          bValue = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
          break
        case 'createdAt':
          aValue = a.startedAt ? new Date(a.startedAt).getTime() : 0
          bValue = b.startedAt ? new Date(b.startedAt).getTime() : 0
          break
        default:
          return 0
      }

      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
    })

    return sorted
  }, [allTickets, sortBy, sortOrder])

  // Filter tickets by status and date
  const openTickets = useMemo(() => {
    return sortedTickets.filter(
      ticket =>
        ticket.status !== 'COMPLETED' &&
        ticket.status !== 'DONE' &&
        ticket.status !== 'SKIPPED' &&
        ticket.status !== 'REJECTED' &&
        ticket.status !== 'CANCELLED' &&
        ticket.status !== 'CANCELED'
    )
  }, [sortedTickets])

  const inProgressTickets = useMemo(() => {
    return sortedTickets.filter(
      ticket =>
        ticket.status === 'IN_PROGRESS' ||
        ticket.status === 'RUNNING' ||
        (ticket.claimedByUserId && ticket.claimedByUserId === userId)
    )
  }, [sortedTickets, userId])

  const completedThisWeek = useMemo(() => {
    const oneWeekAgo = dayjs().subtract(7, 'days')
    return sortedTickets.filter(ticket => {
      const isCompleted = ticket.status === 'COMPLETED' || ticket.status === 'DONE' || ticket.status === 'SKIPPED'
      const completedDate = ticket.completedAt ? dayjs(ticket.completedAt) : null
      return isCompleted && completedDate && completedDate.isAfter(oneWeekAgo)
    })
  }, [sortedTickets])

  const dueToday = useMemo(() => {
    const today = dayjs().startOf('day')
    const tomorrow = dayjs().add(1, 'day').startOf('day')
    return openTickets.filter(ticket => {
      if (!ticket.dueDate) return false
      const dueDate = dayjs(ticket.dueDate)
      return dueDate.isAfter(today) && dueDate.isBefore(tomorrow)
    })
  }, [openTickets])

  const overdue = useMemo(() => {
    const now = dayjs()
    return openTickets.filter(ticket => {
      if (!ticket.dueDate) return false
      const dueDate = dayjs(ticket.dueDate)
      return dueDate.isBefore(now)
    })
  }, [openTickets])

  const refetch = () => {
    fetchMyTickets()
  }

  return {
    myTickets: sortedTickets,
    openTickets,
    inProgressTickets,
    completedThisWeek,
    dueToday,
    overdue,
    isLoading,
    error,
    refetch
  }
}
