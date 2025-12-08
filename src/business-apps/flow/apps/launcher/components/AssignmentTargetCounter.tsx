import React, { useState, useEffect } from 'react'
import { Badge, Button, Tooltip } from '@newwork/nw-design-system'
import { Users, Eye, Loader2, AlertTriangle } from 'lucide-react'
import { FlowTemplate, ExecutionAssignment } from '../types'
import { TaskAssignment, AssignmentTarget } from '@/common/network/flows/FlowTemplateClient'
import { mockUsers } from '../../../data/mockUsers'
import { env } from '@/common/env/EnvUtils'

interface AssignmentTargetInfo {
  targetCount: number
  resolvedUsers: Array<{
    id: string
    name: string
    email?: string
    source: string
  }>
  assignmentMode: string
  isLoading: boolean
  error?: string
}

interface AssignmentTargetCounterProps {
  template: FlowTemplate
  assignments: ExecutionAssignment[]
  accessToken: string
  onTargetCountsChange: (counts: { [stepIndex: number]: number }) => void
  stepAssignments?: { [stepIndex: number]: TaskAssignment }
  'data-testid'?: string
}

// API base URL
const API_BASE =
  (env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || 'https://newwork-dev.newwork.com/flow-engine') + '/api'

// Convert AssignmentTarget to API format
const convertTargetToApiFormat = (target: AssignmentTarget) => {
  const apiTargets: Array<{ entity: string; id: string }> = []

  // Direct users
  if (target.users && target.users.length > 0) {
    target.users.forEach(userId => {
      apiTargets.push({ entity: 'user', id: userId })
    })
  }

  // Organizational units (departments)
  if (target.organizationalUnits && target.organizationalUnits.length > 0) {
    target.organizationalUnits.forEach(deptId => {
      apiTargets.push({ entity: 'department', id: deptId })
    })
  }

  // Matrix teams
  if (target.matrixTeams && target.matrixTeams.length > 0) {
    target.matrixTeams.forEach(teamId => {
      apiTargets.push({ entity: 'matrix_team', id: teamId })
    })
  }

  // Companies (legal entities)
  if (target.companies && target.companies.length > 0) {
    target.companies.forEach(companyId => {
      apiTargets.push({ entity: 'company', id: companyId })
    })
  }

  // Site locations
  if (target.siteLocations && target.siteLocations.length > 0) {
    target.siteLocations.forEach(locationId => {
      apiTargets.push({ entity: 'location', id: locationId })
    })
  }

  // Cost centers
  if (target.costCenters && target.costCenters.length > 0) {
    target.costCenters.forEach(costCenterId => {
      apiTargets.push({ entity: 'cost_center', id: costCenterId })
    })
  }

  // Capabilities
  if (target.capabilities && target.capabilities.length > 0) {
    target.capabilities.forEach(capabilityId => {
      apiTargets.push({ entity: 'capability', id: capabilityId })
    })
  }

  return apiTargets
}

// Enhanced user resolution service that calls the real API
const resolveAssignmentTargets = async (
  assignment: ExecutionAssignment,
  accessToken: string,
  taskAssignment?: TaskAssignment
): Promise<AssignmentTargetInfo> => {
  try {
    // If we have a configured assignment with targets, use the API
    if (taskAssignment?.targets) {
      const targets = taskAssignment.targets
      const apiTargets = convertTargetToApiFormat(targets)

      // If no targets configured, return empty result
      if (apiTargets.length === 0) {
        return {
          targetCount: 0,
          resolvedUsers: [],
          assignmentMode: assignment.assignmentMode,
          isLoading: false
        }
      }

      // Call the resolve API
      const response = await fetch(`${API_BASE}/tasks/assignment/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ targets: apiTargets })
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const result = await response.json()
      const resolvedUsers = result.data?.resolvedUsers || []

      // Map resolved users to our format with source information
      const usersWithSource = resolvedUsers.map((user: any) => {
        // Determine source from the API targets
        let source = 'direct assignment'
        // Simple heuristic: pick the first configured target as the source
        const matchingTarget = apiTargets[0]

        if (matchingTarget) {
          switch (matchingTarget.entity) {
            case 'user':
              source = 'direct assignment'
              break
            case 'department':
              source = 'department assignment'
              break
            case 'matrix_team':
              source = 'matrix team assignment'
              break
            case 'company':
              source = 'company assignment'
              break
            case 'location':
              source = 'location assignment'
              break
            case 'cost_center':
              source = 'cost center assignment'
              break
            case 'capability':
              source = 'capability assignment'
              break
          }
        }

        return {
          id: user.id,
          name: user.name || user.displayName || user.id,
          email: user.email,
          source
        }
      })

      return {
        targetCount: usersWithSource.length,
        resolvedUsers: usersWithSource,
        assignmentMode: assignment.assignmentMode,
        isLoading: false
      }
    } else {
      // Fallback: use assigned users from ExecutionAssignment (mock data)
      const resolvedUsers = assignment.assignedUsers
        .map(userId => {
          const user = mockUsers.find(u => u.id === userId)
          if (user) {
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              source: 'direct assignment'
            }
          }
          return null
        })
        .filter(Boolean) as Array<{
        id: string
        name: string
        email?: string
        source: string
      }>

      return {
        targetCount: resolvedUsers.length,
        resolvedUsers,
        assignmentMode: assignment.assignmentMode,
        isLoading: false
      }
    }
  } catch (error) {
    console.error('Error resolving assignment targets:', error)
    throw error
  }
}

export const AssignmentTargetCounter: React.FC<AssignmentTargetCounterProps> = ({
  template,
  assignments,
  accessToken,
  onTargetCountsChange,
  stepAssignments,
  'data-testid': testId = 'assignment-target-counter'
}) => {
  const [targetInfo, setTargetInfo] = useState<{ [stepIndex: number]: AssignmentTargetInfo }>({})

  // Resolve assignment targets for all steps
  useEffect(() => {
    const resolveAllTargets = async () => {
      const newTargetInfo: { [stepIndex: number]: AssignmentTargetInfo } = {}
      const newCounts: { [stepIndex: number]: number } = {}

      // Set loading state for all assignments
      assignments.forEach(assignment => {
        newTargetInfo[assignment.stepIndex] = {
          targetCount: 0,
          resolvedUsers: [],
          assignmentMode: assignment.assignmentMode,
          isLoading: true
        }
      })
      setTargetInfo(newTargetInfo)

      // Resolve each assignment
      for (const assignment of assignments) {
        try {
          const taskAssignment = stepAssignments?.[assignment.stepIndex]
          const resolved = await resolveAssignmentTargets(assignment, accessToken, taskAssignment)
          newTargetInfo[assignment.stepIndex] = resolved
          newCounts[assignment.stepIndex] = resolved.targetCount
        } catch (error) {
          newTargetInfo[assignment.stepIndex] = {
            targetCount: 0,
            resolvedUsers: [],
            assignmentMode: assignment.assignmentMode,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to resolve targets'
          }
        }
      }

      setTargetInfo({ ...newTargetInfo })
      onTargetCountsChange(newCounts)
    }

    if (assignments.length > 0) {
      resolveAllTargets()
    }
  }, [assignments, accessToken, onTargetCountsChange, stepAssignments])

  const renderAssignmentInfo = (stepIndex: number) => {
    const step = template.steps[stepIndex]
    const info = targetInfo[stepIndex]

    if (!info) {
      return null
    }

    return (
      <div
        key={stepIndex}
        className="gba:p-3 gba:rounded-lg gba:border gba:bg-card gba:border-border"
        data-testid={`${testId}-step-${stepIndex}`}
      >
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
          <h4 className="gba:font-medium gba:text-sm gba:line-clamp-1 gba:text-foreground">
            {step?.title || `Step ${stepIndex + 1}`}
          </h4>

          <Badge variant={info.assignmentMode === 'ASSIGN' ? 'default' : 'warning'} className="gba:text-xs">
            {info.assignmentMode}
          </Badge>
        </div>

        <div className="gba:flex gba:items-center gba:gap-2">
          {info.isLoading ? (
            <>
              <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin gba:text-primary" />
              <span className="gba:text-sm gba:text-muted-foreground">Resolving targets...</span>
            </>
          ) : info.error ? (
            <>
              <AlertTriangle className="gba:w-4 gba:h-4 gba:text-destructive" />
              <span className="gba:text-sm gba:text-destructive">{info.error}</span>
            </>
          ) : (
            <>
              <Users className="gba:w-4 gba:h-4 gba:text-primary" />
              <span className="gba:text-sm gba:font-medium gba:text-foreground">
                {info.targetCount} {info.targetCount === 1 ? 'user' : 'users'}
              </span>

              {info.resolvedUsers.length > 0 && (
                <Tooltip
                  content={
                    <div className="gba:space-y-1">
                      {info.resolvedUsers.map(user => (
                        <div key={user.id} className="gba:text-xs">
                          <div className="gba:font-medium">{user.name}</div>
                          <div className="gba:opacity-75">{user.source}</div>
                        </div>
                      ))}
                    </div>
                  }
                >
                  <Button variant="ghost" size="sm" className="gba:p-1 gba:h-auto">
                    <Eye className="gba:w-3 gba:h-3" />
                  </Button>
                </Tooltip>
              )}
            </>
          )}
        </div>

        {/* Assignment distribution summary */}
        {!info.isLoading && !info.error && info.resolvedUsers.length > 0 && (
          <div className="gba:mt-2">
            <div className="gba:flex gba:gap-1 gba:flex-wrap">
              {Array.from(new Set(info.resolvedUsers.map(u => u.source))).map(source => (
                <Badge key={source} variant="secondary" className="gba:text-xs">
                  {source}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (assignments.length === 0) {
    return (
      <div
        className="gba:p-4 gba:rounded-lg gba:border gba:border-dashed gba:border-border gba:bg-muted gba:text-center"
        data-testid={testId}
      >
        <Users className="gba:w-8 gba:h-8 gba:mx-auto gba:mb-2 gba:opacity-50 gba:text-muted-foreground" />
        <p className="gba:text-sm gba:text-muted-foreground">No assignment configuration required for this template.</p>
      </div>
    )
  }

  return (
    <div className="gba:space-y-3" data-testid={testId}>
      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
        <Users className="gba:w-5 gba:h-5 gba:text-primary" />
        <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">Assignment Targets</h3>
      </div>

      {assignments.map(assignment => renderAssignmentInfo(assignment.stepIndex))}
    </div>
  )
}
