import { useState, useCallback } from 'react'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { Project, ProjectStatusUI } from '../types'
import { toast } from '@newwork/nw-design-system'

const ORGCHART_BASE_URL = `${env('NEXT_PUBLIC_ORGCHART_API_URL')}/orgchart/api/v1`

// Transform UI status to BE status
const transformUIStatusToBE = (status: ProjectStatusUI): string => {
  switch (status) {
    case ProjectStatusUI.Planned:
      return 'PLANNED'
    case ProjectStatusUI.InProgress:
      return 'IN_PROGRESS'
    case ProjectStatusUI.OnHold:
      return 'ON_HOLD'
    case ProjectStatusUI.Canceled:
      return 'CANCELLED'
    case ProjectStatusUI.Completed:
      return 'COMPLETED'
    default:
      return 'PLANNED'
  }
}

// Format date to ISO string
const formatDateToISO = (date: string | undefined): string | undefined => {
  if (!date) return undefined
  const dateObj = new Date(date)
  if (!Number.isNaN(dateObj.getTime())) {
    return dateObj.toISOString()
  }
  return undefined
}

interface UseCreateTeamProps {
  accessToken: string
  structureId: string
  onSuccess?: () => void
}

interface CreateTeamResult {
  isCreatingTeam: boolean
  createTeamForProject: (project: Project) => Promise<void>
}

/**
 * Hook for creating a matrix team for a project
 * Creates the team and updates the project with the new matrixUnitId
 * If the project has a manager assigned, automatically adds them to the team
 */
export const useCreateTeam = ({ accessToken, structureId, onSuccess }: UseCreateTeamProps): CreateTeamResult => {
  const restClient = useRestClient(ORGCHART_BASE_URL)
  const [isCreatingTeam, setIsCreatingTeam] = useState(false)

  /**
   * Assign an employee to a matrix team with 0% allocation
   */
  const assignEmployeeToTeam = useCallback(
    async (employeeId: string, matrixUnitId: string) => {
      const assignmentPayload = [
        {
          employeeId,
          structureId,
          matrixUnitId,
          percentage: 0
        }
      ]

      await restClient.post('/employee-assignments/matrix-unit', assignmentPayload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })
    },
    [restClient, accessToken, structureId]
  )

  const createTeamForProject = useCallback(
    async (project: Project) => {
      try {
        setIsCreatingTeam(true)

        const teamData = {
          name: project.name,
          description: project.description || '',
          rank: 0,
          structureId: structureId
        }

        // Create matrix team
        const teamResponse = await restClient.post<{ id: string } | { data: { id: string } }>(
          '/matrix-units',
          teamData,
          {
            headers: { Authorization: `Bearer ${accessToken}` }
          }
        )

        // Extract matrix unit ID from response (handle different response formats)
        const matrixUnitId = (teamResponse as { id: string }).id || (teamResponse as { data: { id: string } }).data?.id

        if (!matrixUnitId) {
          console.error('No matrix unit ID returned from team creation', teamResponse)
          return
        }

        // Transform UI status to BE status
        const beStatus = transformUIStatusToBE(project.status)
        const formattedValidFrom = formatDateToISO(project.validFrom)
        const formattedValidTo = formatDateToISO(project.validTo)

        // Update project with matrixUnitId
        const projectUpdateData = {
          name: project.name,
          description: project.description,
          projectType: project.projectType,
          validFrom: formattedValidFrom,
          validTo: formattedValidTo,
          structureId: project.structureId,
          status: beStatus,
          ...(project.customerId ? { customerId: project.customerId } : {}),
          ...(project.projectManagerId ? { projectManagerId: project.projectManagerId } : {}),
          matrixUnitId: matrixUnitId
        }

        await restClient.put(`/projects/${project.id}`, projectUpdateData, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })

        // If project has a manager, automatically add them to the team
        if (project.projectManagerId) {
          try {
            await assignEmployeeToTeam(project.projectManagerId, matrixUnitId)
          } catch (assignError) {
            // Log error but don't fail the entire operation
            console.error('Error assigning project manager to team:', assignError)
            toast.error('Error assigning project manager to team')
          }
        }

        onSuccess?.()
      } catch (error) {
        console.error('Error creating team:', error)
        throw error
      } finally {
        setIsCreatingTeam(false)
      }
    },
    [accessToken, structureId, restClient, onSuccess, assignEmployeeToTeam]
  )

  return {
    isCreatingTeam,
    createTeamForProject
  }
}
