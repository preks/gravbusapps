import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Button,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@newwork/nw-design-system'
import { SkipForward, SkipBack, Eye, User, PlayCircle } from 'lucide-react'
import { FlowVisualization } from './FlowVisualization'
import { AssignmentTargetCounter } from './AssignmentTargetCounter'
import { StepSimulationForm } from './StepSimulationForm'
import { SimulationPreview } from './SimulationPreview'
import { FlowTemplate, ExecutionAssignment } from '../types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { AssignmentSelector } from '@/components/assignment-selector'
import { TaskAssignment } from '@/common/network/flows/FlowTemplateClient'
import { OrgDirectoryClient } from '@/common/network/org-directory/OrgDirectoryClient'

interface SimulationData {
  stepIndex: number
  formData: { [key: string]: any }
  completedBy: string
  completedAt: string
  result: 'APPROVED' | 'REJECTED' | 'COMPLETED'
}

interface SimulationWizardProps {
  template: FlowTemplate
  accessToken: string
  userInfo?: any
  onExecute: (executionConfig: any) => Promise<void>
  onCancel: () => void
  'data-testid'?: string
}

export const SimulationWizard: React.FC<SimulationWizardProps> = ({
  template,
  accessToken,
  userInfo,
  onExecute,
  onCancel,
  'data-testid': testId = 'simulation-wizard'
}) => {
  const [currentStep, setCurrentStep] = useState(0)
  const simulationMode = true // Always in simulation mode
  const [simulationData, setSimulationData] = useState<{ [stepIndex: number]: SimulationData }>({})
  const [executionAssignments, setExecutionAssignments] = useState<ExecutionAssignment[]>([])
  const [assignmentCounts, setAssignmentCounts] = useState<{ [stepIndex: number]: number }>({})
  const [userPerspective, setUserPerspective] = useState<string>('current-user')
  const [showPreview, setShowPreview] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [stepAssignments, setStepAssignments] = useState<{ [stepIndex: number]: TaskAssignment }>({})
  const [showAssignmentConfig, setShowAssignmentConfig] = useState(false)

  // Available users for perspective simulation (real org directory + current user)
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; name: string; role: string }>>([
    { id: 'current-user', name: userInfo?.userName || 'Current User', role: 'Initiator' }
  ])

  useEffect(() => {
    let isCancelled = false
    const loadUsers = async () => {
      try {
        const client = new OrgDirectoryClient(accessToken)
        const basics = await client.searchUsersBasic({ limit: 20, offset: 0 })
        if (isCancelled) return
        const mapped = basics.map(u => ({ id: u.id, name: u.name || u.email || u.id, role: 'Employee' }))
        setAvailableUsers(prev => {
          // keep current user at the top, append unique others
          const seen = new Set(prev.map(p => p.id))
          const merged = [...prev]
          mapped.forEach(m => {
            if (!seen.has(m.id)) {
              merged.push(m)
              seen.add(m.id)
            }
          })
          return merged
        })
      } catch (e) {
        // Silent failover: keep current user only
        console.warn('SimulationWizard: failed to load org users for perspective', e)
      }
    }
    if (accessToken) {
      loadUsers()
    }
    return () => {
      isCancelled = true
    }
  }, [accessToken])

  // Initialize execution assignments for steps that need them
  useEffect(() => {
    const assignments: ExecutionAssignment[] = template.steps
      .map((step, index) => {
        const assignment = step.assignment
        const needsAssignment =
          assignment &&
          (assignment.targets === null ||
            assignment.targets === undefined ||
            Object.keys(assignment.targets || {}).length === 0)

        if (needsAssignment) {
          return {
            stepIndex: index,
            stepTitle: step.title || `Step ${index + 1}`,
            assignmentMode: assignment.assignmentMode || 'CLAIM',
            assignedUsers: []
          }
        }
        return null
      })
      .filter(Boolean) as ExecutionAssignment[]

    setExecutionAssignments(assignments)
  }, [template])

  const handleStepComplete = useCallback((stepIndex: number, data: SimulationData) => {
    setSimulationData(prev => ({
      ...prev,
      [stepIndex]: data
    }))
  }, [])

  const handleNext = () => {
    if (currentStep < template.steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  // handlePreview removed (not used)

  const handleExecute = async () => {
    try {
      setIsExecuting(true)

      // Build execution configuration
      const runtimeAssignments: any = {}
      executionAssignments.forEach(assignment => {
        const stepId = `step_${assignment.stepIndex}`
        runtimeAssignments[stepId] = {
          assignmentMode: assignment.assignmentMode,
          targets: {
            users: assignment.assignedUsers
          },
          allowReassignment: true
        }
      })

      // Include simulation data as initial input values
      const inputValues: any = {}
      Object.entries(simulationData).forEach(([stepIndex, data]) => {
        inputValues[`step_${stepIndex}`] = data.formData
      })

      const executionConfig = {
        runtimeParameters: {},
        initiator: userInfo?.id || userInfo?.employeeDetails?.employeeId || 'unknown',
        context: {
          flowInstanceId: `flow_instance_${Date.now()}`,
          launchedBy: userInfo?.userName || userInfo?.id || 'unknown',
          launchedAt: new Date().toISOString(),
          templateTitle: template.name,
          simulationMode: true,
          simulationData: Object.values(simulationData)
        },
        inputValues,
        runtimeAssignments
      }

      await onExecute(executionConfig)
    } catch (error) {
      console.error('Execution error:', error)
    } finally {
      setIsExecuting(false)
    }
  }

  const currentStepData = template.steps[currentStep]
  const canExecute = executionAssignments.every(assignment => assignment.assignedUsers.length > 0)
  const hasSimulationData = Object.keys(simulationData).length > 0

  return (
    <div
      className="gba:min-h-full gba:w-full gba:flex gba:flex-col gba:gap-6 gba:p-6 gba:bg-muted"
      data-testid={testId}
    >
      {/* Main Content */}
      <div className="gba:flex-1 gba:flex gba:flex-col gba:overflow-auto gba:gap-6">
        {/* Header */}
        <div className="gba:mb-2">
          <div className="gba:flex gba:items-center gba:gap-6 gba:mb-6">
            <div className="gba:p-4 gba:bg-gradient-to-br gba:from-primary gba:to-primary/80 gba:rounded-xl gba:shadow-lg">
              <PlayCircle className="gba:h-8 gba:w-8 gba:text-primary-foreground" />
            </div>
            <div>
              <h1 className="gba:text-3xl gba:font-bold gba:mb-1 gba:text-foreground">{template.name}</h1>
              <p className="gba:text-lg gba:text-muted-foreground">{template.description}</p>
            </div>
          </div>

          {/* Controls Card */}
          <Card className="gba:shadow-sm gba:border gba:bg-card">
            <div className="gba:p-6">
              <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
                <div className="gba:flex gba:items-center gba:gap-8">
                  {/* User Perspective Selector */}
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <User className="gba:w-4 gba:h-4 gba:text-success" />
                    <Select value={userPerspective} onValueChange={setUserPerspective}>
                      <SelectTrigger className="gba:w-48">
                        <SelectValue placeholder="Select user perspective" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Progress Indicator */}
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Badge variant="success">Simulation Mode</Badge>
                  <Badge variant="default">
                    Step {currentStep + 1} of {template.steps.length}
                  </Badge>

                  {hasSimulationData && (
                    <Badge variant="info">{Object.keys(simulationData).length} steps simulated</Badge>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Step Configuration Content */}
        <div className="gba:flex-1 gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-6">
          {/* Left Column - Step Configuration */}
          <div className="gba:flex gba:flex-col gba:gap-6">
            {/* Current Step */}
            {currentStepData && (
              <Card className="gba:transition-all gba:duration-200 gba:shadow-sm gba:border gba:bg-card hover:gba:shadow-md">
                <div className="gba:p-6">
                  <h3 className="gba:text-lg gba:font-semibold gba:mb-6 gba:text-foreground">
                    {currentStepData.title}
                  </h3>

                  <StepSimulationForm
                    step={currentStepData}
                    stepIndex={currentStep}
                    simulationMode={simulationMode}
                    userPerspective={userPerspective}
                    onStepComplete={handleStepComplete}
                    data-testid={`${testId}-step-form`}
                  />
                </div>
              </Card>
            )}
          </div>

          {/* Right Column - Assignment Information */}
          <div className="gba:flex gba:flex-col gba:gap-6">
            <Card className="gba:transition-all gba:duration-200 gba:shadow-sm gba:border gba:bg-card hover:gba:shadow-md">
              <div className="gba:p-6">
                <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
                  <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">Assignment Configuration</h3>
                  {currentStepData?.assignment && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAssignmentConfig(!showAssignmentConfig)}
                      data-testid={`${testId}-toggle-assignment-config`}
                    >
                      {showAssignmentConfig ? 'Show Summary' : 'Configure'}
                    </Button>
                  )}
                </div>

                {showAssignmentConfig && currentStepData?.assignment ? (
                  <div className="gba:mt-4">
                    <AssignmentSelector
                      value={stepAssignments[currentStep]}
                      onChange={assignment => {
                        setStepAssignments(prev => ({
                          ...prev,
                          [currentStep]: assignment
                        }))

                        // Update execution assignments
                        const updatedAssignments = [...executionAssignments]
                        const assignmentIndex = updatedAssignments.findIndex(a => a.stepIndex === currentStep)

                        if (assignmentIndex >= 0) {
                          // Extract user IDs from assignment targets
                          const users = assignment.targets?.users || []
                          updatedAssignments[assignmentIndex] = {
                            ...updatedAssignments[assignmentIndex],
                            assignedUsers: users
                          }
                          setExecutionAssignments(updatedAssignments)
                        }
                      }}
                      assignmentMode={currentStepData.assignment.assignmentMode}
                      accessToken={accessToken}
                      userInfo={userInfo}
                      data-testid={`${testId}-assignment-selector`}
                    />
                  </div>
                ) : (
                  <AssignmentTargetCounter
                    template={template}
                    assignments={executionAssignments}
                    accessToken={accessToken}
                    stepAssignments={stepAssignments}
                    onTargetCountsChange={setAssignmentCounts}
                    data-testid={`${testId}-assignment-counter`}
                  />
                )}
              </div>
            </Card>

            {/* Flow Preview */}
            <Card className="gba:transition-all gba:duration-200 gba:shadow-sm gba:border gba:bg-card hover:gba:shadow-md">
              <div className="gba:p-6">
                <h3 className="gba:text-lg gba:font-semibold gba:mb-6 gba:text-foreground">Flow Preview</h3>
                <div className="gba:h-64">
                  <FlowVisualization
                    template={template}
                    currentStep={currentStep}
                    simulationData={simulationData}
                    assignmentCounts={assignmentCounts}
                    data-testid={`${testId}-visualization`}
                  />
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Navigation Footer */}
        <Card className="gba:shadow-sm gba:border gba:bg-card">
          <div className="gba:p-6">
            <div className="gba:flex gba:justify-between gba:items-center">
              <Button variant="outline" onClick={onCancel} data-testid={`${testId}-cancel-button`}>
                {getTranslationFromI18nKeyAndLabel('flow.execution.cancel', 'Cancel')}
              </Button>

              <div className="gba:flex gba:gap-4">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  className="gba:gap-2"
                  data-testid={`${testId}-previous-button`}
                >
                  <SkipBack className="gba:w-4 gba:h-4" />
                  {getTranslationFromI18nKeyAndLabel('flow.execution.previous', 'Previous')}
                </Button>

                {currentStep < template.steps.length - 1 ? (
                  <Button
                    variant="default"
                    onClick={handleNext}
                    className="gba:gap-2"
                    data-testid={`${testId}-next-button`}
                  >
                    {getTranslationFromI18nKeyAndLabel('flow.execution.next', 'Next')}
                    <SkipForward className="gba:w-4 gba:h-4" />
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    onClick={handleExecute}
                    disabled={!canExecute || isExecuting}
                    className="gba:gap-2"
                    data-testid={`${testId}-execute-button`}
                  >
                    <PlayCircle className="gba:w-4 gba:h-4" />
                    {isExecuting
                      ? getTranslationFromI18nKeyAndLabel('flow.execution.launching', 'Launching...')
                      : getTranslationFromI18nKeyAndLabel('flow.execution.execute', 'Execute Flow')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Preview Modal */}
      {showPreview && currentStepData && (
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="gba:max-w-4xl gba:max-h-[90vh] gba:overflow-auto">
            <DialogHeader>
              <DialogTitle className="gba:flex gba:items-center gba:gap-2">
                <Eye className="gba:w-5 gba:h-5" />
                {getTranslationFromI18nKeyAndLabel('flow.execution.stepPreview', 'Step Preview')}
              </DialogTitle>
            </DialogHeader>

            <SimulationPreview
              step={currentStepData}
              stepIndex={currentStep}
              simulationData={simulationData[currentStep]}
              userPerspective={userPerspective}
              availableUsers={availableUsers}
              onClose={() => setShowPreview(false)}
              data-testid={`${testId}-preview`}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
