// NO BUSINESS LOGIC HERE. Data + actions come from props.

import React, { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Label,
  Input,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Spinner,
  toast
} from '@newwork/nw-design-system'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { MagnifyingGlassIcon as Search, WarningCircleIcon as AlertCircle } from '@phosphor-icons/react'
import { ProjectStatusBE, ProjectStatusUI } from '@/business-apps/mdm/apps/project-management/types'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { useOrgchartClient } from '@/common/network/orgchart/useOrgchartClient'
import { getActiveWorkingHours } from '@/business-apps/hr/core/utils/workingHoursUtils'

interface Project {
  id: string
  name: string
  matrixUnitId: string | null
  status: string
}

const formatProjectStatus = (status?: string): string => {
  switch (status) {
    case ProjectStatusBE.PLANNED:
      return ProjectStatusUI.Planned
    case ProjectStatusBE.IN_PROGRESS:
      return ProjectStatusUI.InProgress
    case ProjectStatusBE.ON_HOLD:
      return ProjectStatusUI.OnHold
    case ProjectStatusBE.CANCELLED:
      return ProjectStatusUI.Canceled
    case ProjectStatusBE.COMPLETED:
      return ProjectStatusUI.Completed
    default:
      return ProjectStatusUI.InProgress
  }
}

interface AssignProjectDialogProps {
  employee: {
    id: string
    name: string
    avatar?: string
    currentAllocation: number
  } | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  accessToken: string
}

export const AssignProjectDialog: React.FC<AssignProjectDialogProps> = ({
  employee,
  open,
  onOpenChange,
  onSuccess,
  accessToken
}) => {
  const [projects, setProjects] = useState<Project[]>([])
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [allocationPercent, setAllocationPercent] = useState<string>('')
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [workingHoursData, setWorkingHoursData] = useState<{
    id: string
    version: number
    totalAllocationPercent: number
  } | null>(null)
  const [existingAssignments, setExistingAssignments] = useState<
    Array<{ id: string; matrixUnitId: string; percentage: number }>
  >([])

  const graphqlClient = useGraphqlClient(accessToken)
  const orgchartClient = useOrgchartClient(accessToken)
  const restClientEmployeeProcess = useRestClient(env('NEXT_PUBLIC_BASE_URL') + '/processes/employee')
  const structureId = getCurrentActiveStructureId()

  // Fetch projects and employee data when dialog opens
  useEffect(() => {
    if (open && structureId) {
      fetchProjects()
      if (employee) {
        fetchEmployeeWorkingHours()
        fetchEmployeeExistingAssignments()
      }
    }
  }, [open, structureId, employee])

  // Filter projects based on search
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredProjects(projects)
    } else {
      const lowercaseSearch = searchTerm.toLowerCase()
      setFilteredProjects(projects.filter(p => p.name.toLowerCase().includes(lowercaseSearch)))
    }
  }, [searchTerm, projects])

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchTerm('')
      setSelectedProjectId('')
      setAllocationPercent('')
      setWorkingHoursData(null)
    }
  }, [open])

  const fetchProjects = async () => {
    setIsLoadingProjects(true)
    try {
      const query = `
        query GetActiveProjects($structureId: uuid!) {
          Project(
            where: {
              isDeleted: { _eq: false }
              structureId: { _eq: $structureId }
              status: { _in: ["IN_PROGRESS", "PLANNED"] }
            }
            orderBy: { name: ASC }
            limit: 100
          ) {
            id
            name
            matrixUnitId
            status
          }
        }
      `

      const response = await graphqlClient.request<{ Project: Project[] }>(query, { structureId })
      // Filter to only projects with matrixUnitId (have teams)
      const projectsWithTeams = response.Project.filter(p => p.matrixUnitId)
      setProjects(projectsWithTeams)
      setFilteredProjects(projectsWithTeams)
    } catch (error) {
      console.error('Error fetching projects:', error)
      toast.error('Failed to load projects')
    } finally {
      setIsLoadingProjects(false)
    }
  }

  const fetchEmployeeWorkingHours = async () => {
    if (!employee) return

    try {
      const query = `
        query GetEmployeeWorkingHours($employeeId: uuid!) {
          EmployeeWorkingHours(
            where: {
              employeeId: { _eq: $employeeId }
              isDeleted: { _eq: false }
            }
            orderBy: [{ activeFrom: DESC }, { createdAt: DESC }]
          ) {
            activeFrom
            activeTo
            id
            version
            totalAllocationPercent
          }
        }
      `

      const response = await graphqlClient.request<{
        EmployeeWorkingHours: Array<{
          activeFrom: string | null
          activeTo: string | null
          id: string
          version: number
          totalAllocationPercent: number | null
        }>
      }>(query, { employeeId: employee.id })

      if (response.EmployeeWorkingHours.length > 0) {
        const wh = getActiveWorkingHours(response.EmployeeWorkingHours)
        if (!wh) {
          return
        }

        setWorkingHoursData({
          id: wh.id,
          version: wh.version,
          totalAllocationPercent: wh.totalAllocationPercent ?? 0
        })
      }
    } catch (error) {
      console.error('Error fetching employee working hours:', error)
    }
  }

  const fetchEmployeeExistingAssignments = async () => {
    if (!employee || !structureId) return

    try {
      const query = `
        query GetEmployeeAssignments($employeeId: uuid!, $structureId: uuid!) {
          MatrixUnitEmployee(
            where: {
              employeeId: { _eq: $employeeId }
              structureId: { _eq: $structureId }
            }
          ) {
            id
            matrixUnitId
            percentage
          }
        }
      `

      const response = await graphqlClient.request<{
        MatrixUnitEmployee: Array<{
          id: string
          matrixUnitId: string
          percentage: number
        }>
      }>(query, { employeeId: employee.id, structureId })

      setExistingAssignments(response.MatrixUnitEmployee || [])
    } catch (error) {
      console.error('Error fetching employee existing assignments:', error)
    }
  }

  const handleSubmit = useCallback(async () => {
    if (!employee || !selectedProjectId || !allocationPercent) {
      toast.error('Please select a project and enter allocation percentage')
      return
    }

    const allocationValue = Number.parseFloat(allocationPercent)
    if (Number.isNaN(allocationValue) || allocationValue <= 0) {
      toast.error('Please enter a valid allocation percentage')
      return
    }

    const currentAllocation = employee.currentAllocation || 0
    if (currentAllocation + allocationValue > 100) {
      toast.error(`Total allocation cannot exceed 100%. Available: ${100 - currentAllocation}%`)
      return
    }

    const selectedProject = projects.find(p => p.id === selectedProjectId)
    const selectedProjectMatrixUnitId = selectedProject?.matrixUnitId
    if (!selectedProjectMatrixUnitId) {
      toast.error('Selected project does not have a team')
      return
    }

    // Check if employee is already assigned to this matrix unit
    const existingAssignment = existingAssignments.find(a => a.matrixUnitId === selectedProject.matrixUnitId)

    if (existingAssignment) {
      toast.error(
        `${employee.name} is already assigned to this project with ${existingAssignment.percentage}%. Please update the allocation from the Project Allocation page instead.`
      )
      return
    }

    setIsSubmitting(true)

    try {
      // Step 1: Assign employee to project team
      const assignPayload = {
        employeeId: employee.id,
        structureId: structureId,
        matrixUnitId: selectedProjectMatrixUnitId,
        percentage: allocationValue
      }

      await orgchartClient.assignEmployeesToMatrixUnit([assignPayload], {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      // Step 2: Always update employee working hours in process endpoint
      const newTotalAllocation = currentAllocation + allocationValue
      const workingHoursPayload = {
        changeMode: 'INSERT',
        employeeWorkingHours: {
          employeeId: employee.id,
          totalAllocationPercent: newTotalAllocation,
          id: workingHoursData?.id || employee.id,
          version: workingHoursData?.version ?? 0
        }
      }

      await restClientEmployeeProcess.post('/updateEmployeeWorkingHours', workingHoursPayload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      toast.success(`Successfully allocated ${employee.name} to ${selectedProject.name}`)
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error assigning project:', error)
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to assign project'
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }, [
    employee,
    selectedProjectId,
    allocationPercent,
    projects,
    structureId,
    accessToken,
    workingHoursData,
    existingAssignments,
    orgchartClient,
    restClientEmployeeProcess,
    onSuccess,
    onOpenChange
  ])

  if (!employee) return null

  const currentAllocation = employee.currentAllocation || 0
  const availablePercent = 100 - currentAllocation
  const allocationValue = Number.parseFloat(allocationPercent) || 0
  const afterAllocation = currentAllocation + allocationValue

  const initials = employee.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Project</DialogTitle>
          <DialogDescription>
            Allocate {employee.name} to a project with a specific allocation percentage
          </DialogDescription>
        </DialogHeader>

        <div className="gba:space-y-4 gba:py-4">
          {/* Employee Info */}
          <div className="gba:flex gba:items-center gba:gap-3 gba:p-3 gba:bg-muted gba:rounded-lg">
            <Avatar>
              {employee.avatar && <AvatarImage src={employee.avatar} />}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="gba:flex-1">
              <p className="gba:font-medium">{employee.name}</p>
              <p className="gba:text-sm gba:text-muted-foreground">
                Current allocation: {currentAllocation}% • Available: {availablePercent}%
              </p>
            </div>
          </div>

          {/* Project Selection */}
          <div className="gba:space-y-2">
            <Label htmlFor="project-search">Select Project</Label>
            <div className="gba:relative">
              <Search className="gba:absolute gba:left-3 gba:top-3 gba:h-4 gba:w-4 gba:text-muted-foreground" />
              <Input
                id="project-search"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="gba:pl-9"
              />
            </div>

            {isLoadingProjects ? (
              <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
                <Spinner />
              </div>
            ) : (
              <div className="gba:border gba:rounded-lg gba:max-h-48 gba:overflow-y-auto">
                {filteredProjects.length === 0 ? (
                  <div className="gba:p-4 gba:text-center gba:text-sm gba:text-muted-foreground">
                    {searchTerm ? 'No projects found' : 'No active projects available'}
                  </div>
                ) : (
                  filteredProjects.map(project => (
                    <button
                      key={project.id}
                      onClick={() => setSelectedProjectId(project.id)}
                      className={`gba:w-full gba:text-left gba:px-3 gba:py-2 gba:border-b last:gba:border-b-0 hover:gba:bg-muted/50 gba:transition-colors ${
                        selectedProjectId === project.id ? 'gba:bg-primary/10' : ''
                      }`}
                    >
                      <p className="gba:text-sm gba:font-medium">{project.name}</p>
                      <p className="gba:text-xs gba:text-muted-foreground">{formatProjectStatus(project.status)}</p>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Allocation Percentage */}
          <div className="gba:space-y-2">
            <Label htmlFor="allocation">Allocation Percentage</Label>
            <Input
              id="allocation"
              type="number"
              min="0"
              max={availablePercent}
              step="5"
              placeholder="e.g., 50"
              value={allocationPercent}
              onChange={e => setAllocationPercent(e.target.value)}
            />
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground">
              <span>Available: {availablePercent}%</span>
              {allocationValue > 0 && (
                <>
                  <span>•</span>
                  <span>After allocation: {afterAllocation}%</span>
                </>
              )}
            </div>
            {allocationValue > availablePercent && (
              <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-destructive">
                <AlertCircle size={12} />
                <span>Allocation exceeds available capacity</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !selectedProjectId ||
              !allocationPercent ||
              allocationValue <= 0 ||
              allocationValue > availablePercent ||
              isSubmitting
            }
          >
            {isSubmitting ? (
              <>
                <Spinner className="gba:mr-2 gba:h-4 gba:w-4" />
                Assigning...
              </>
            ) : (
              'Assign to Project'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
