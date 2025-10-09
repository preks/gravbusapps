import React, { useState, useEffect } from 'react'
import { Badge, Button, Tooltip } from '@newwork/nw-design-system'
import { Users, Eye, Loader2, AlertTriangle } from 'lucide-react'
import { FlowTemplate, ExecutionAssignment } from '../types'

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
  'data-testid'?: string
}

// Mock user resolution service - In real implementation, this would call the backend
const resolveAssignmentTargets = async (
  assignment: ExecutionAssignment,
  accessToken: string
): Promise<AssignmentTargetInfo> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000))

  // Mock user resolution based on assignment mode
  const mockUsers = [
    { id: 'user1', name: 'John Smith', email: 'john.smith@company.com', source: 'direct assignment' },
    { id: 'user2', name: 'Sarah Johnson', email: 'sarah.johnson@company.com', source: 'department: Engineering' },
    { id: 'user3', name: 'Mike Chen', email: 'mike.chen@company.com', source: 'role: Senior Developer' },
    { id: 'user4', name: 'Emma Wilson', email: 'emma.wilson@company.com', source: 'capability: Code Review' },
    { id: 'user5', name: 'David Brown', email: 'david.brown@company.com', source: 'team: Backend Team' }
  ]

  // Randomly select users based on assignment
  const userCount = Math.floor(Math.random() * 4) + 1 // 1-4 users
  const selectedUsers = mockUsers.slice(0, userCount)

  return {
    targetCount: selectedUsers.length,
    resolvedUsers: selectedUsers,
    assignmentMode: assignment.assignmentMode,
    isLoading: false
  }
}

export const AssignmentTargetCounter: React.FC<AssignmentTargetCounterProps> = ({
  template,
  assignments,
  accessToken,
  onTargetCountsChange,
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
          const resolved = await resolveAssignmentTargets(assignment, accessToken)
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
  }, [assignments, accessToken, onTargetCountsChange])

  const renderAssignmentInfo = (stepIndex: number) => {
    const step = template.steps[stepIndex]
    const info = targetInfo[stepIndex]

    if (!info) {
      return null
    }

    const getAssignmentModeColor = (mode: string) => {
      switch (mode) {
        case 'ASSIGN':
          return 'var(--color-primary-500)'
        case 'CLAIM':
          return 'var(--color-warning-500)'
        default:
          return 'var(--color-surface-disabled)'
      }
    }

    return (
      <div
        key={stepIndex}
        className="gba:p-3 gba:rounded-lg gba:border"
        style={{
          backgroundColor: 'var(--color-surface-primary)',
          borderColor: 'var(--color-border-default)'
        }}
        data-testid={`${testId}-step-${stepIndex}`}
      >
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
          <h4 className="gba:font-medium gba:text-sm gba:line-clamp-1" style={{ color: 'var(--color-text-primary)' }}>
            {step?.title || `Step ${stepIndex + 1}`}
          </h4>

          <Badge
            variant="outline"
            style={{
              backgroundColor: getAssignmentModeColor(info.assignmentMode),
              color: 'var(--color-on-primary)',
              border: 'none',
              fontSize: 'var(--font-size-xs)'
            }}
          >
            {info.assignmentMode}
          </Badge>
        </div>

        <div className="gba:flex gba:items-center gba:gap-2">
          {info.isLoading ? (
            <>
              <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin" style={{ color: 'var(--color-primary-500)' }} />
              <span className="gba:text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Resolving targets...
              </span>
            </>
          ) : info.error ? (
            <>
              <AlertTriangle className="gba:w-4 gba:h-4" style={{ color: 'var(--color-danger-500)' }} />
              <span className="gba:text-sm" style={{ color: 'var(--color-danger-600)' }}>
                {info.error}
              </span>
            </>
          ) : (
            <>
              <Users className="gba:w-4 gba:h-4" style={{ color: 'var(--color-primary-500)' }} />
              <span className="gba:text-sm gba:font-medium" style={{ color: 'var(--color-text-primary)' }}>
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
                <Badge
                  key={source}
                  variant="secondary"
                  style={{
                    backgroundColor: 'var(--color-surface-secondary)',
                    color: 'var(--color-text-secondary)',
                    fontSize: 'var(--font-size-xs)'
                  }}
                >
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
        className="gba:p-4 gba:rounded-lg gba:border gba:text-center"
        style={{
          backgroundColor: 'var(--color-surface-secondary)',
          borderColor: 'var(--color-border-default)',
          borderStyle: 'dashed'
        }}
        data-testid={testId}
      >
        <Users
          className="gba:w-8 gba:h-8 gba:mx-auto gba:mb-2 gba:opacity-50"
          style={{ color: 'var(--color-text-secondary)' }}
        />
        <p className="gba:text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          No assignment configuration required for this template.
        </p>
      </div>
    )
  }

  return (
    <div className="gba:space-y-3" data-testid={testId}>
      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
        <Users className="gba:w-5 gba:h-5" style={{ color: 'var(--color-primary-500)' }} />
        <h3 className="gba:text-lg gba:font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Assignment Targets
        </h3>
      </div>

      {assignments.map(assignment => renderAssignmentInfo(assignment.stepIndex))}
    </div>
  )
}
