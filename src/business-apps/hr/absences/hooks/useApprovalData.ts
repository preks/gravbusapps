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

    const handleTaskOutputData = () => {
      if (taskOutputApprovalStatus && mounted) {
        setActualApprovalStatus(taskOutputApprovalStatus)
        setActualApprovalNote(taskOutputApprovalNote)
      }
    }

    const setFallbackData = () => {
      setActualApprovalStatus(taskOutputApprovalStatus || fallbackStatus || null)
      setActualApprovalNote(taskOutputApprovalNote || fallbackNote || null)
      setActualApprovalDate(completedAt || null)
    }

    const updateApprovalStatus = (absence: any) => {
      const status = taskOutputApprovalStatus || absence.status
      if (status) {
        setActualApprovalStatus(status)
      } else {
        setActualApprovalStatus(null)
      }
    }

    const updateApprovalNote = (absence: any) => {
      if (taskOutputApprovalNote) {
        setActualApprovalNote(taskOutputApprovalNote)
      } else if (absence.approvalNote) {
        setActualApprovalNote(absence.approvalNote)
      } else {
        setActualApprovalNote(null)
      }
    }

    const updateApprovalDate = (absence: any) => {
      if (completedAt) {
        setActualApprovalDate(completedAt)
      } else if (absence.updatedAt) {
        setActualApprovalDate(absence.updatedAt)
      } else {
        setActualApprovalDate(null)
      }
    }

    const processAbsenceData = (absence: any) => {
      updateApprovalStatus(absence)
      updateApprovalNote(absence)
      updateApprovalDate(absence)
    }

    const fetchApprovalData = async () => {
      if (!accessToken || !absenceId || !isTaskCompleted) {
        handleTaskOutputData()
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
          processAbsenceData(response.EmployeeAbsence[0])
        } else {
          setFallbackData()
        }
      } catch (error) {
        console.error('Error fetching approval data:', error)
        if (!mounted) return
        setFallbackData()
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
    fallbackNote,
    graphqlClient
  ])

  return {
    approvalStatus: actualApprovalStatus ?? taskOutputApprovalStatus,
    approvalNote: actualApprovalNote ?? taskOutputApprovalNote,
    approvalDate: actualApprovalDate ?? completedAt,
    isLoadingApprovalData
  }
}
