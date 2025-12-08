import React from 'react'
import {
  Card,
  CardHeader,
  CardContent,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label
} from '@newwork/nw-design-system'
import { Users, User } from 'lucide-react'
import { mockUsers } from '../../../data/mockUsers'
import { useOrgUsersSearch } from '@/common/network/org-directory/useOrgUsersSearch'
import EmployeeSelect, { type EmployeeOption } from '@/components/employee-select/EmployeeSelect'
import { ExecutionAssignment } from '../types'

interface AssignmentConfigurationProps {
  assignments: ExecutionAssignment[]
  onChange: (assignments: ExecutionAssignment[]) => void
  compact?: boolean
  'data-testid'?: string
  accessToken: string
}

export const AssignmentConfiguration: React.FC<AssignmentConfigurationProps> = ({
  assignments,
  onChange,
  compact = false,
  'data-testid': testId,
  accessToken
}) => {
  const [employeeQuery, setEmployeeQuery] = React.useState('')
  const [pageOffset, setPageOffset] = React.useState(0)
  const {
    users,
    loading: usersLoading,
    hasMore
  } = useOrgUsersSearch(accessToken, {
    search: employeeQuery,
    limit: 20,
    offset: pageOffset
  })
  const employees: EmployeeOption[] = React.useMemo(() => {
    return (users || []).map(u => ({ id: u.id, displayName: u.name }))
  }, [users])

  const handleAssignmentChange = (index: number, selectedUsers: string[]) => {
    const updatedAssignments = [...assignments]
    updatedAssignments[index] = {
      ...updatedAssignments[index],
      assignedUsers: selectedUsers
    }
    onChange(updatedAssignments)
  }

  if (assignments.length === 0) {
    return compact ? (
      <div className="gba:text-sm gba:text-gray-600" data-testid={testId}>
        This template uses automatic assignment and doesn't require manual user assignment.
      </div>
    ) : (
      <Card className="gba:shadow-sm gba:border gba:border-gray-200 gba:bg-white" data-testid={testId}>
        <CardContent className="gba:p-6 gba:text-center">
          <div className="gba:w-12 gba:h-12 gba:mx-auto gba:bg-green-50 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:mb-4">
            <Users className="gba:h-6 gba:w-6 gba:text-green-600" />
          </div>
          <h3 className="gba:font-medium gba:text-gray-900 gba:mb-2">No Assignment Required</h3>
          <p className="gba:text-sm gba:text-gray-600">
            This template uses automatic assignment and doesn't require manual user assignment.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (compact) {
    return (
      <div className="gba:space-y-4" data-testid={testId}>
        {assignments.map((assignment, index) => (
          <div
            key={assignment.stepIndex}
            className="gba:p-4 gba:rounded-lg gba:bg-gray-50"
            data-testid={`${testId}-assignment-${assignment.stepIndex}`}
          >
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
              <h4 className="gba:font-medium gba:text-sm gba:text-gray-900">{assignment.stepTitle}</h4>
              <Badge variant="outline" className="gba:text-xs gba:bg-blue-50 gba:text-blue-700 gba:border-blue-200">
                {assignment.assignmentMode} Mode
              </Badge>
            </div>
            <div className="gba:space-y-3">
              <div>
                <Label
                  htmlFor={`assignment-${assignment.stepIndex}`}
                  className="gba:text-sm gba:font-medium gba:text-gray-700"
                >
                  Assign to users:
                </Label>
                <EmployeeSelect
                  value={assignment.assignedUsers.length > 0 ? assignment.assignedUsers[0] : ''}
                  employees={
                    employeeQuery.length >= 2 ? employees : mockUsers.map(u => ({ id: u.id, displayName: u.name }))
                  }
                  loading={employeeQuery.length >= 2 ? usersLoading : false}
                  onSearch={q => {
                    setPageOffset(0)
                    setEmployeeQuery(q)
                  }}
                  hasMore={employeeQuery.length >= 2 ? hasMore : false}
                  onLoadMore={() => {
                    if (employeeQuery.length >= 2 && hasMore) setPageOffset(prev => prev + 20)
                  }}
                  onValueChange={val => handleAssignmentChange(index, val ? [val] : [])}
                  placeholder="Select users for this task"
                  searchPlaceholder="Type at least 2 characters to search..."
                  data-testid={`${testId}-employee-select-${assignment.stepIndex}`}
                />
              </div>
              {assignment.assignedUsers.length > 0 && (
                <div>
                  <p className="gba:text-xs gba:font-medium gba:text-gray-700 gba:mb-2">Selected users:</p>
                  <div className="gba:flex gba:gap-2 gba:flex-wrap">
                    {assignment.assignedUsers.map(userId => {
                      const user =
                        employees.find(e => e.id === userId)?.displayName || mockUsers.find(u => u.id === userId)?.name
                      return user ? (
                        <Badge
                          key={userId}
                          variant="secondary"
                          className="gba:bg-blue-100 gba:text-blue-800 gba:text-xs"
                        >
                          {user}
                        </Badge>
                      ) : null
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Card className="gba:shadow-sm gba:border gba:border-gray-200 gba:bg-white" data-testid={testId}>
      <CardHeader className="gba:pb-3">
        <div className="gba:flex gba:items-center gba:gap-3">
          <div className="gba:p-2 gba:bg-blue-50 gba:rounded-lg">
            <Users className="gba:h-5 gba:w-5 gba:text-blue-600" />
          </div>
          <div>
            <h3 className="gba:text-base gba:font-medium gba:text-gray-900">Task Assignments</h3>
            <p className="gba:text-sm gba:text-gray-600">
              Configure who should be assigned to each task in this workflow.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="gba:pt-0 gba:space-y-4">
        {assignments.map((assignment, index) => (
          <div
            key={assignment.stepIndex}
            className="gba:p-4 gba:border gba:border-gray-200 gba:rounded-lg gba:bg-gray-50"
            data-testid={`${testId}-assignment-${assignment.stepIndex}`}
          >
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
              <h4 className="gba:font-medium gba:text-sm gba:text-gray-900">{assignment.stepTitle}</h4>
              <Badge variant="outline" className="gba:text-xs gba:bg-blue-50 gba:text-blue-700 gba:border-blue-200">
                {assignment.assignmentMode} Mode
              </Badge>
            </div>

            <div className="gba:space-y-3">
              <div>
                <Label
                  htmlFor={`assignment-${assignment.stepIndex}`}
                  className="gba:text-sm gba:font-medium gba:text-gray-700"
                >
                  Assign to users:
                </Label>
                <Select
                  value={assignment.assignedUsers.length > 0 ? assignment.assignedUsers[0] : ''}
                  onValueChange={value => {
                    handleAssignmentChange(index, value ? [value] : [])
                  }}
                >
                  <SelectTrigger id={`assignment-${assignment.stepIndex}`} className="gba:w-full gba:mt-1">
                    <SelectValue placeholder="Select users for this task" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockUsers.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <User className="gba:h-4 gba:w-4 gba:text-gray-500" />
                          <span>{user.name}</span>
                          <span className="gba:text-xs gba:text-gray-500">({user.role})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {assignment.assignedUsers.length > 0 && (
                <div>
                  <p className="gba:text-xs gba:font-medium gba:text-gray-700 gba:mb-2">Selected users:</p>
                  <div className="gba:flex gba:gap-2 gba:flex-wrap">
                    {assignment.assignedUsers.map(userId => {
                      const user = mockUsers.find(u => u.id === userId)
                      return user ? (
                        <Badge
                          key={userId}
                          variant="secondary"
                          className="gba:bg-blue-100 gba:text-blue-800 gba:text-xs"
                        >
                          {user.name}
                        </Badge>
                      ) : null
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
