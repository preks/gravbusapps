import React, { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Alert,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Spinner,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@newwork/nw-design-system'
import { FileText, Filter, RefreshCw, Eye, Play, Calendar, Users } from 'lucide-react'
import { DebouncedInput } from '@/components/data-filter/DebouncedInput'
import { toast } from 'sonner'
import { AssignmentSelector } from '@/components/assignment-selector'
import { AssignmentMode } from '@/common/network/flows/FlowTemplateClient'
import { getFlowEngineBaseUrl } from '@/common/network/flows/flowEngineUrl'

interface SurveyTemplate {
  id: string
  name: string
  description?: string
  version: number
  tags: Record<string, string>
  surveyType?: string
  questionCount?: number
  estimatedDuration?: string
  createdAt: string
  createdBy?: string
  isActive: boolean
  usageCount?: number
}

type SurveyTemplatesTabProps = BusinessAppContextProps

export const SurveyTemplatesTab: React.FC<SurveyTemplatesTabProps> = ({ accessToken, ...context }) => {
  const [templates, setTemplates] = useState<SurveyTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Launch dialog state
  const [showLaunchDialog, setShowLaunchDialog] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<SurveyTemplate | null>(null)
  const [isLaunching, setIsLaunching] = useState(false)

  // Assignment state
  const [assignments, setAssignments] = useState<any>(null)

  const loadTemplates = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const baseUrl = getFlowEngineBaseUrl()

      // Fetch flow templates tagged with solution=survey using the full template endpoint
      const params = new URLSearchParams({
        'tag.solution': 'survey',
        limit: '20',
        offset: '0',
        onlyLatest: 'true',
        includeDrafts: 'true'
      })

      const response = await fetch(`${baseUrl}/api/templates?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch survey templates: ${response.statusText}`)
      }

      const data = await response.json()

      // Transform template data from the full template endpoint format - ensure data.data is an array
      const templatesData = Array.isArray(data.data) ? data.data : []
      const surveyTemplates: SurveyTemplate[] = templatesData.map((template: any) => {
        // Count actual form questions from the first step (survey step)
        const surveyStep = template.steps?.find((step: any) => step.form && step.form.length > 0)
        const questionCount = surveyStep?.form?.length || 0

        return {
          id: template.id,
          name: template.name || 'Unnamed Survey Template',
          description: template.description,
          version: template.version || 1,
          tags: template.tags || {},
          surveyType: template.tags?.surveyType || 'custom',
          questionCount,
          estimatedDuration: calculateEstimatedDuration(questionCount, surveyStep?.form || []),
          createdAt: template.metadata?.databaseInfo?.createdOn || new Date().toISOString(),
          createdBy: template.tags?.createdBy || 'Unknown',
          isActive: !template.metadata?.databaseInfo?.isDraft,
          usageCount: 0 // Not available in template endpoint
        }
      })

      setTemplates(surveyTemplates)
    } catch (err) {
      console.error('Error loading survey templates:', err)
      setError(err instanceof Error ? err.message : 'Failed to load survey templates')

      // Provide mock templates for development
      setTemplates(generateMockTemplates())
    } finally {
      setIsLoading(false)
    }
  }, [accessToken])

  const calculateEstimatedDuration = (questionCount: number, formFields: any[] = []): string => {
    if (questionCount === 0) return '2 min'

    // Calculate duration based on question types for more accuracy
    let totalSeconds = 0

    formFields.forEach((field: any) => {
      const fieldType = field.type?.toLowerCase()

      switch (fieldType) {
        case 'text':
        case 'number':
        case 'date':
          totalSeconds += 30 // 30 seconds for simple input
          break
        case 'textarea':
          totalSeconds += 60 // 1 minute for text areas
          break
        case 'radio':
          totalSeconds += 20 // 20 seconds for radio buttons
          break
        case 'select':
          totalSeconds += 25 // 25 seconds for dropdowns
          break
        case 'checkbox':
          totalSeconds += 30 // 30 seconds for checkboxes (multiple selection)
          break
        case 'rating':
          totalSeconds += 15 // 15 seconds for rating scales
          break
        default:
          totalSeconds += 30 // Default 30 seconds for unknown types
      }
    })

    // Add base time for reading instructions and navigation
    totalSeconds += 60 // 1 minute base time

    // Convert to minutes and round up
    const estimatedMinutes = Math.max(2, Math.ceil(totalSeconds / 60))
    return `${estimatedMinutes} min`
  }

  const generateMockTemplates = (): SurveyTemplate[] => {
    return [
      {
        id: 'template_1',
        name: 'Employee Satisfaction Survey',
        description: 'Comprehensive employee satisfaction and engagement survey',
        version: 1,
        tags: { solution: 'survey', surveyType: 'feedback' },
        surveyType: 'feedback',
        questionCount: 15,
        estimatedDuration: '8 min',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdBy: 'HR Team',
        isActive: true,
        usageCount: 24
      },
      {
        id: 'template_2',
        name: 'Product Feedback Survey',
        description: 'Collect customer feedback on product features and usability',
        version: 2,
        tags: { solution: 'survey', surveyType: 'feedback' },
        surveyType: 'feedback',
        questionCount: 10,
        estimatedDuration: '5 min',
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        createdBy: 'Product Team',
        isActive: true,
        usageCount: 18
      },
      {
        id: 'template_3',
        name: 'Training Assessment',
        description: 'Post-training knowledge assessment and feedback',
        version: 1,
        tags: { solution: 'survey', surveyType: 'assessment' },
        surveyType: 'assessment',
        questionCount: 20,
        estimatedDuration: '10 min',
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        createdBy: 'Training Team',
        isActive: true,
        usageCount: 12
      },
      {
        id: 'template_4',
        name: 'Quick Pulse Poll',
        description: 'Fast pulse check for team morale and priorities',
        version: 1,
        tags: { solution: 'survey', surveyType: 'poll' },
        surveyType: 'poll',
        questionCount: 5,
        estimatedDuration: '2 min',
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        createdBy: 'Management',
        isActive: true,
        usageCount: 45
      }
    ]
  }

  useEffect(() => {
    if (accessToken) {
      loadTemplates()
    }
  }, [accessToken, loadTemplates])

  const handleLaunchTemplate = (template: SurveyTemplate) => {
    setSelectedTemplate(template)
    setAssignments(null)
    setShowLaunchDialog(true)
  }

  const handleViewTemplate = (templateId: string) => {
    // Navigate to template details/editor
    window.open(`/platform/apps/flow/apps/creator?templateId=${templateId}`, '_blank')
  }

  const handleConfirmLaunch = async () => {
    if (!selectedTemplate || !accessToken) return

    try {
      setIsLaunching(true)

      const baseUrl = getFlowEngineBaseUrl()

      // Get template metadata to check for steps requiring runtime assignment
      const templateResponse = await fetch(`${baseUrl}/api/templates/${selectedTemplate.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      const templateData = await templateResponse.json()
      const template = templateData.data || templateData

      // Prepare runtime assignments
      const runtimeAssignments: any = {}

      // Check each step to see if it requires runtime assignment
      if (template.steps) {
        template.steps.forEach((step: any, index: number) => {
          const stepAssignment = step.assignment
          const needsAssignment =
            stepAssignment &&
            (stepAssignment.targets === null ||
              stepAssignment.targets === undefined ||
              Object.keys(stepAssignment.targets || {}).length === 0)

          if (needsAssignment) {
            const stepId = `step_${index}`

            if (assignments && assignments.targets) {
              // Convert AssignmentSelector format to flow engine format
              const engineTargets: any = {}

              // Map user IDs if present
              if (assignments.targets.users && assignments.targets.users.length > 0) {
                engineTargets.users = assignments.targets.users
              }

              // Map organizational units if present
              if (assignments.targets.organizationalUnits && assignments.targets.organizationalUnits.length > 0) {
                engineTargets.organizationalUnits = assignments.targets.organizationalUnits
              }

              // Add runtime assignment with actual targets
              if (engineTargets.users || engineTargets.organizationalUnits) {
                runtimeAssignments[stepId] = {
                  assignmentMode: AssignmentMode.ASSIGN,
                  targets: engineTargets,
                  allowReassignment: true
                }
              } else {
                // No specific assignment provided, but step requires it - assign to current user
                runtimeAssignments[stepId] = {
                  assignmentMode: AssignmentMode.ASSIGN,
                  targets: {
                    users: [context.userInfo?.id || context.userInfo?.employeeDetails?.employeeId || 'user-001']
                  },
                  allowReassignment: true
                }
              }
            } else {
              // No assignment configured, assign to current user as fallback
              runtimeAssignments[stepId] = {
                assignmentMode: AssignmentMode.ASSIGN,
                targets: {
                  users: [context.userInfo?.id || context.userInfo?.employeeDetails?.employeeId || 'user-001']
                },
                allowReassignment: true
              }
            }
          }
        })
      }

      // Prepare execution parameters
      const executionParams = {
        runtimeParameters: {},
        initiator: context.userInfo?.userName || context.userInfo?.id || 'unknown',
        context: {
          flowInstanceId: `survey_${Date.now()}`,
          launchedBy: context.userInfo?.userName || context.userInfo?.id || 'unknown',
          launchedAt: new Date().toISOString(),
          templateTitle: selectedTemplate.name,
          solution: 'survey'
        },
        inputValues: {},
        runtimeAssignments
      }

      const response = await fetch(`${baseUrl}/api/templates/${selectedTemplate.id}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(executionParams)
      })

      if (!response.ok) {
        throw new Error(`Failed to launch survey: ${response.statusText}`)
      }

      const result = await response.json()

      toast.success('Survey launched successfully!', {
        description: `Survey: ${selectedTemplate.name}\nFlow ID: ${result.data?.workflowId || 'Unknown'}`
      })

      // Close dialog and reset form
      setShowLaunchDialog(false)
      setSelectedTemplate(null)
      setAssignments(null)
    } catch (err) {
      console.error('Error launching survey:', err)
      toast.error('Failed to launch survey', {
        description: err instanceof Error ? err.message : 'Unknown error occurred'
      })
    } finally {
      setIsLaunching(false)
    }
  }

  // Filter templates based on search and filters
  const filteredTemplates = templates.filter(template => {
    const matchesSearch =
      !searchTerm ||
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesType = typeFilter === 'all' || template.surveyType === typeFilter
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && template.isActive) ||
      (statusFilter === 'inactive' && !template.isActive)

    return matchesSearch && matchesType && matchesStatus
  })

  const getSurveyTypeLabel = (type?: string) => {
    switch (type) {
      case 'feedback':
        return 'Feedback'
      case 'research':
        return 'Research'
      case 'assessment':
        return 'Assessment'
      case 'poll':
        return 'Poll'
      case 'custom':
        return 'Custom'
      default:
        return 'Survey'
    }
  }

  const getSurveyTypeBadgeColor = (type?: string) => {
    switch (type) {
      case 'feedback':
        return 'gba:bg-blue-100 gba:text-blue-800'
      case 'research':
        return 'gba:bg-purple-100 gba:text-purple-800'
      case 'assessment':
        return 'gba:bg-green-100 gba:text-green-800'
      case 'poll':
        return 'gba:bg-orange-100 gba:text-orange-800'
      case 'custom':
        return 'gba:bg-gray-100 gba:text-gray-800'
      default:
        return 'gba:bg-gray-100 gba:text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64" data-testid="survey-templates-tab-loading">
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="survey-templates-tab-error">
        <div>
          <h3>Error Loading Survey Templates</h3>
          <p>{error}</p>
          <Button onClick={loadTemplates} variant="secondary" className="gba:mt-2">
            <RefreshCw className="gba:w-4 gba:h-4 gba:mr-2" />
            Retry
          </Button>
        </div>
      </Alert>
    )
  }

  return (
    <div className="gba:space-y-6" data-testid="survey-templates-tab">
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center">
        <div>
          <h2 className="gba:text-2xl gba:font-bold gba:text-gray-900">Survey Templates</h2>
          <p className="gba:text-gray-600">Reusable survey templates for quick deployment</p>
        </div>
        <div className="gba:flex gba:gap-2">
          <Button
            onClick={() => window.open('/platform/apps/flow/apps/creator#create', '_blank')}
            variant="default"
            size="sm"
            data-testid="create-template-button"
          >
            <FileText className="gba:w-4 gba:h-4 gba:mr-2" />
            Create Template
          </Button>
          <Button onClick={loadTemplates} variant="outline" size="sm" data-testid="survey-templates-refresh-button">
            <RefreshCw className="gba:w-4 gba:h-4 gba:mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <Filter className="gba:h-5 gba:w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:gap-4 gba:items-end">
            <div className="gba:flex-1">
              <label className="gba:block gba:text-sm gba:font-medium gba:mb-2">Search Templates</label>
              <DebouncedInput
                placeholder="Search by name or description..."
                value={searchTerm}
                onChange={setSearchTerm}
                debounceDelay={300}
                data-testid="template-search-input"
                className="gba:w-full"
              />
            </div>
            <div className="gba:w-48">
              <label className="gba:block gba:text-sm gba:font-medium gba:mb-2">Survey Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger data-testid="template-type-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="feedback">Feedback</SelectItem>
                  <SelectItem value="research">Research</SelectItem>
                  <SelectItem value="assessment">Assessment</SelectItem>
                  <SelectItem value="poll">Poll</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="gba:w-48">
              <label className="gba:block gba:text-sm gba:font-medium gba:mb-2">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="template-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Templates</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <FileText className="gba:h-5 gba:w-5" />
            Survey Templates ({filteredTemplates.length} templates)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTemplates.length > 0 ? (
            <div className="gba:overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Questions</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="gba:w-[140px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map(template => (
                    <TableRow key={template.id} data-testid={`template-row-${template.id}`}>
                      <TableCell>
                        <div>
                          <div className="gba:font-medium">{template.name}</div>
                          {template.description && (
                            <div className="gba:text-sm gba:text-gray-500 gba:truncate gba:max-w-xs">
                              {template.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getSurveyTypeBadgeColor(template.surveyType)}>
                          {getSurveyTypeLabel(template.surveyType)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="gba:flex gba:items-center gba:gap-1">
                          <FileText className="gba:w-4 gba:h-4 gba:text-gray-400" />
                          {template.questionCount}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="gba:flex gba:items-center gba:gap-1">
                          <Calendar className="gba:w-4 gba:h-4 gba:text-gray-400" />
                          {template.estimatedDuration}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="gba:flex gba:items-center gba:gap-1">
                          <Users className="gba:w-4 gba:h-4 gba:text-gray-400" />
                          {template.usageCount || 0}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="gba:text-sm gba:text-gray-500">
                          {new Date(template.createdAt).toLocaleDateString()}
                          <div className="gba:text-xs">{template.createdBy}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="gba:flex gba:gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleLaunchTemplate(template)}
                            data-testid={`launch-template-${template.id}`}
                            title="Launch survey from this template"
                          >
                            <Play className="gba:w-4 gba:h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewTemplate(template.id)}
                            data-testid={`view-template-${template.id}`}
                            title="View template details"
                          >
                            <Eye className="gba:w-4 gba:h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="gba:text-center gba:py-8 gba:text-gray-500">
              <FileText className="gba:h-12 gba:w-12 gba:mx-auto gba:mb-4 gba:text-gray-300" />
              <p>No survey templates found</p>
              <p className="gba:text-sm">
                {searchTerm || typeFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first survey template to get started'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Launch Confirmation Dialog */}
      <Dialog open={showLaunchDialog} onOpenChange={setShowLaunchDialog}>
        <DialogContent className="gba:max-w-2xl gba:max-h-[80vh] gba:overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="gba:flex gba:items-center gba:gap-2">
              <Play className="gba:h-5 gba:w-5 gba:text-green-600" />
              Launch Survey
            </DialogTitle>
          </DialogHeader>

          {selectedTemplate && (
            <div className="gba:space-y-4">
              <div>
                <h3 className="gba:font-medium gba:text-gray-900">{selectedTemplate.name}</h3>
                {selectedTemplate.description && (
                  <p className="gba:text-sm gba:text-gray-600 gba:mt-1">{selectedTemplate.description}</p>
                )}
              </div>

              <div className="gba:bg-gray-50 gba:p-3 gba:rounded-lg gba:space-y-2">
                <div className="gba:flex gba:justify-between gba:text-sm">
                  <span className="gba:text-gray-600">Questions:</span>
                  <span className="gba:font-medium">{selectedTemplate.questionCount}</span>
                </div>
                <div className="gba:flex gba:justify-between gba:text-sm">
                  <span className="gba:text-gray-600">Estimated Duration:</span>
                  <span className="gba:font-medium">{selectedTemplate.estimatedDuration}</span>
                </div>
                <div className="gba:flex gba:justify-between gba:text-sm">
                  <span className="gba:text-gray-600">Survey Type:</span>
                  <Badge variant="outline" className={getSurveyTypeBadgeColor(selectedTemplate.surveyType)}>
                    {getSurveyTypeLabel(selectedTemplate.surveyType)}
                  </Badge>
                </div>
              </div>

              <div className="gba:bg-blue-50 gba:p-3 gba:rounded-lg">
                <p className="gba:text-sm gba:text-blue-800">
                  This will start a new survey flow that participants can access and complete.
                </p>
              </div>

              {/* Assignment Configuration */}
              <div className="gba:space-y-4">
                <h4 className="gba:font-medium gba:text-gray-900">Survey Assignment</h4>
                <AssignmentSelector
                  value={assignments}
                  onChange={setAssignments}
                  assignmentMode={AssignmentMode.ASSIGN}
                  accessToken={accessToken}
                  userInfo={context.userInfo}
                  data-testid="survey-launch-assignments"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLaunchDialog(false)} disabled={isLaunching}>
              Cancel
            </Button>
            <Button onClick={handleConfirmLaunch} disabled={isLaunching}>
              {isLaunching ? (
                <>
                  <Spinner />
                  Launching...
                </>
              ) : (
                <>
                  <Play className="gba:w-4 gba:h-4 gba:mr-2" />
                  Launch Survey
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
