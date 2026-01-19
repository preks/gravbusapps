import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_PENDING_APPROVALS, APPROVE_EXPENSE_REQUEST, REJECT_EXPENSE_REQUEST } from '../queries/approvals'
import { ensureShortDateFormat } from '../utils/dateUtils'

export interface ApprovalRequest {
  id: string
  title: string
  description: string | null
  totalAmount: number
  status: string
  requestDate: string
  createdAt: string
  employee: {
    id: string
    fullName: string
    firstName: string
    lastName: string
  }
}

export interface UseGetApprovalsResult {
  approvalRequests: ApprovalRequest[]
  totalCount: number
  isLoading: boolean
  error: string | null
  currentPage: number
  setCurrentPage: (page: number) => void
  pageSize: number
  setPageSize: (size: number) => void
  searchTerm: string
  setSearchTerm: (term: string) => void
  refresh: () => Promise<void>
  approving: boolean
  rejecting: boolean
  approveRequest: (requestId: string, comments?: string) => Promise<void>
  rejectRequest: (requestId: string, comments?: string) => Promise<void>
  requestIdToAction: string
}

export const useGetApprovals = (context?: BusinessAppContextProps): UseGetApprovalsResult => {
  // State for approval requests data
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(10)

  // Search state
  const [searchTerm, setSearchTerm] = useState<string>('')

  // Action states
  const [approving, setApproving] = useState<boolean>(false)
  const [rejecting, setRejecting] = useState<boolean>(false)
  const [requestIdToAction, setRequestIdToAction] = useState<string>('')

  // Initialize the GraphQL client
  const accessToken = context?.accessToken || ''
  const graphQLClient: ReturnType<typeof useGraphQLClient> = useGraphQLClient(accessToken)

  // Fetch approval requests data
  const fetchApprovalRequests = useCallback(async () => {
    if (!accessToken) return

    setIsLoading(true)
    setError(null)

    try {
      const managerId =
        context?.userInfo?.employeeDetails?.employeeId ||
        context?.userInfo?.id ||
        '00000000-0000-0000-0000-000000000000'

      const offset = (currentPage - 1) * pageSize

      const data = await graphQLClient.request(GET_PENDING_APPROVALS, {
        managerId,
        offset,
        limit: pageSize,
        searchTerm: `%${searchTerm}%`
      })

      // Check if data exists and has the expected structure
      if (!data || !data.PendingApprovals) {
        throw new Error('Invalid data structure received from server')
      }

      // Map the response data to our interface
      const mappedRequests = data.PendingApprovals.map((request: any) => ({
        id: request.id,
        title: request.title ?? 'Untitled Request',
        description: request.description,
        totalAmount: request.totalAmount ?? 0,
        status: request.status ?? 'PENDING',
        requestDate: request.requestDate ? ensureShortDateFormat(request.requestDate) : 'N/A',
        createdAt: request.createdAt ? ensureShortDateFormat(request.createdAt) : 'N/A',
        employee: {
          id: request.employee?.id ?? '',
          fullName: request.employee?.fullName ?? 'Unknown Employee',
          firstName: request.employee?.firstName ?? 'Unknown',
          lastName: request.employee?.lastName ?? 'Unknown'
        }
      }))

      // Get total count for pagination
      const total = data?.PendingApprovalsAggregate?.aggregate?.count ?? 0

      setApprovalRequests(mappedRequests)
      setTotalCount(total)
    } catch (err: any) {
      let errorMessage = 'Failed to fetch approval requests'

      // Extract GraphQL error message if available
      if (err.message?.includes('GraphQL error:')) {
        try {
          const errorJson = err.message.replaceAll('GraphQL error:', '').trim()
          const parsedError = JSON.parse(errorJson)
          if (Array.isArray(parsedError) && parsedError.length > 0) {
            errorMessage = parsedError[0].message || errorMessage
          }
        } catch {
          // If parsing fails, use the original error message
          errorMessage = err.message
        }
      } else if (err.message) {
        errorMessage = err.message
      }

      setError(errorMessage)
      setApprovalRequests([])
      setTotalCount(0)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, context?.userInfo?.employeeDetails?.employeeId, currentPage, pageSize, searchTerm, graphQLClient])

  // Approve an expense request
  const approveRequest = useCallback(
    async (requestId: string, comments?: string) => {
      if (!accessToken) return

      setApproving(true)
      setRequestIdToAction(requestId)

      try {
        await graphQLClient.request(APPROVE_EXPENSE_REQUEST, { requestId, comments })

        // Refresh the data after approval
        await fetchApprovalRequests()
      } catch (err: any) {
        setError(err.message || 'Failed to approve request')
      } finally {
        setApproving(false)
        setRequestIdToAction('')
      }
    },
    [accessToken, fetchApprovalRequests, graphQLClient]
  )

  // Reject an expense request
  const rejectRequest = useCallback(
    async (requestId: string, comments?: string) => {
      if (!accessToken) return

      setRejecting(true)
      setRequestIdToAction(requestId)

      try {
        await graphQLClient.request(REJECT_EXPENSE_REQUEST, { requestId, comments })

        // Refresh the data after rejection
        await fetchApprovalRequests()
      } catch (err: any) {
        setError(err.message || 'Failed to reject request')
      } finally {
        setRejecting(false)
        setRequestIdToAction('')
      }
    },
    [accessToken, fetchApprovalRequests, graphQLClient]
  )

  // Fetch data on component mount and when dependencies change
  useEffect(() => {
    fetchApprovalRequests()
  }, [fetchApprovalRequests])

  return {
    approvalRequests,
    totalCount,
    isLoading,
    error,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    searchTerm,
    setSearchTerm,
    refresh: fetchApprovalRequests,
    approving,
    rejecting,
    approveRequest,
    rejectRequest,
    requestIdToAction
  }
}
