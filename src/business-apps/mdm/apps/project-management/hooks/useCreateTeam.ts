import { useState, useCallback } from 'react'
import { Project, ProjectStatusUI } from '../types'
import { toast } from '@newwork/nw-design-system'
import { useOrgchartClient } from '@/common/network/orgchart/useOrgchartClient'

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
  const orgchartClient = useOrgchartClient(accessToken)
  const [isCreatingTeam, setIsCreatingTeam] = useState(false)

  /**
   * Assign an employee to a matrix team with 0% allocation
   */
  const assignEmployeeToTeam = useCallback(
    async (employeeId: string, matrixUnitId: string, role?: string) => {
      const assignmentPayload = [
        {
          employeeId,
          structureId,
          matrixUnitId,
          percentage: 0,
          ...(role ? { role: role } : {})
        }
      ]

      await orgchartClient.assignEmployeesToMatrixUnit(assignmentPayload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })
    },
    [orgchartClient, accessToken, structureId]
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
        const teamResponse = await orgchartClient.createMatrixUnit(teamData, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })

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

        await orgchartClient.updateProject(project.id, projectUpdateData, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })

        // If project has a manager, automatically add them to the team
        if (project.projectManagerId) {
          try {
            await assignEmployeeToTeam(project.projectManagerId, matrixUnitId, 'Manager')
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
    [accessToken, structureId, orgchartClient, onSuccess, assignEmployeeToTeam]
  )

  return {
    isCreatingTeam,
    createTeamForProject
  }
}
