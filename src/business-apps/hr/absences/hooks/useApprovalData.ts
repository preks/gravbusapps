import { useState, useEffect } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'

interface UseApprovalDataParams {
  accessToken: string
  absenceId?: string
  isTaskCompleted: boolean
  taskOutputApprovalStatus: string | null
  taskOutputApprovalNote: string | null
  completedAt: string | null
  fallbackStatus?: string
  fallbackNote?: string
}

interface UseApprovalDataReturn {
  approvalStatus: string | null
  approvalNote: string | null
  approvalDate: string | null
  isLoadingApprovalData: boolean
}

/**
 * Custom hook to fetch and manage approval data for absence tasks
 * Consolidates the approval data fetching logic used across multiple absence forms
 */
export const useApprovalData = ({
  accessToken,
  absenceId,
  isTaskCompleted,
  taskOutputApprovalStatus,
  taskOutputApprovalNote,
  completedAt,
  fallbackStatus,
  fallbackNote
}: UseApprovalDataParams): UseApprovalDataReturn => {
  const [actualApprovalStatus, setActualApprovalStatus] = useState<string | null>(null)
  const [actualApprovalNote, setActualApprovalNote] = useState<string | null>(null)
  const [actualApprovalDate, setActualApprovalDate] = useState<string | null>(null)
  const [isLoadingApprovalData, setIsLoadingApprovalData] = useState(false)

  const graphqlClient = useGraphqlClient(accessToken)

  useEffect(() => {
    let mounted = true

    const fetchApprovalData = async () => {
      if (!accessToken || !absenceId || !isTaskCompleted) {
        // If we have task output data, use it
        if (taskOutputApprovalStatus && mounted) {
          setActualApprovalStatus(taskOutputApprovalStatus)
          setActualApprovalNote(taskOutputApprovalNote)
        }
        return
      }

      if (mounted) {
        setIsLoadingApprovalData(true)
      }

      try {
        const absenceQuery = `
          query GetAbsenceApprovalData($absenceId: uuid!) {
            EmployeeAbsence(where: {id: {_eq: $absenceId}}, limit: 1) {
              id
              status
              approvalNote
              approverId
              updatedAt
            }
          }
        `

        const response = await graphqlClient.request<{
          EmployeeAbsence: any[]
        }>(absenceQuery, {
          absenceId
        })

        if (!mounted) return

        if (response.EmployeeAbsence && response.EmployeeAbsence.length > 0) {
          const absence = response.EmployeeAbsence[0]

          // Priority order for approval status:
          // 1. Task outputs (most reliable for completed tasks)
          // 2. EmployeeAbsence.status
          if (taskOutputApprovalStatus) {
            setActualApprovalStatus(taskOutputApprovalStatus)
          } else if (absence.status) {
            setActualApprovalStatus(absence.status)
          }

          // Priority order for approval note:
          // 1. Task outputs/inputs (most reliable for completed tasks)
          // 2. EmployeeAbsence.approvalNote
          if (taskOutputApprovalNote) {
            setActualApprovalNote(taskOutputApprovalNote)
          } else if (absence.approvalNote) {
            setActualApprovalNote(absence.approvalNote)
          } else {
            setActualApprovalNote(null)
          }

          // Priority order for approval date:
          // 1. Task completedAt (most reliable for completed tasks)
          // 2. EmployeeAbsence.updatedAt (fallback)
          if (completedAt) {
            setActualApprovalDate(completedAt)
          } else if (absence.updatedAt) {
            setActualApprovalDate(absence.updatedAt)
          } else {
            setActualApprovalDate(null)
          }
        } else {
          // Fallback to task output data if fetch fails
          setActualApprovalStatus(taskOutputApprovalStatus || fallbackStatus || null)
          setActualApprovalNote(taskOutputApprovalNote || fallbackNote || null)
          setActualApprovalDate(completedAt || null)
        }
      } catch (error) {
        console.error('Error fetching approval data:', error)
        if (!mounted) return

        // Fallback to task output data if fetch fails
        setActualApprovalStatus(taskOutputApprovalStatus || fallbackStatus || null)
        setActualApprovalNote(taskOutputApprovalNote || fallbackNote || null)
        setActualApprovalDate(completedAt || null)
      } finally {
        if (mounted) {
          setIsLoadingApprovalData(false)
        }
      }
    }

    fetchApprovalData()

    return () => {
      mounted = false
    }
  }, [
    accessToken,
    absenceId,
    isTaskCompleted,
    taskOutputApprovalStatus,
    taskOutputApprovalNote,
    completedAt,
    fallbackStatus,
    fallbackNote
  ])

  return {
    approvalStatus: actualApprovalStatus !== null ? actualApprovalStatus : taskOutputApprovalStatus,
    approvalNote: actualApprovalNote !== null ? actualApprovalNote : taskOutputApprovalNote,
    approvalDate: actualApprovalDate !== null ? actualApprovalDate : completedAt,
    isLoadingApprovalData
  }
}
