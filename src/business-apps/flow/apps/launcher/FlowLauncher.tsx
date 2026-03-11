import React, { useState, useEffect, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { mockUsers } from '../../data/mockUsers'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { getFlowEngineApiBaseUrl } from '@/common/network/flows/flowEngineUrl'
import {
  Toaster,
  toast,
  Button,
  Alert,
  Spinner,
  Dialog,
  DialogContent,
  Card,
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { AlertTriangle, RefreshCw, Play } from 'lucide-react'
import { MockDataProvider } from '../../providers/MockDataProvider'
import { TemplateCard, LaunchConfiguration, EmptyState, SimulationWizard } from './components'
import { FlowTemplate, LaunchParameters, ExecutionAssignment } from './types'

// API configuration
const API_BASE = getFlowEngineApiBaseUrl()

/**
 * Flow Launcher App component for launching published workflow templates
 */
interface FlowLauncherProps extends BusinessAppContextProps {
  'data-testid'?: string
}

export const FlowLauncher: React.FC<FlowLauncherProps> = ({
  accessToken,
  userInfo,
  'data-testid': testId = 'flow-launcher'
}) => {
  // API client functions
  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...options.headers
      }
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // State management
  const [templates, setTemplates] = useState<FlowTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<FlowTemplate | null>(null)
  const [templateMetadata, setTemplateMetadata] = useState<any>(null)
  const [launchParameters, setLaunchParameters] = useState<LaunchParameters>({})
  const [executionAssignments, setExecutionAssignments] = useState<ExecutionAssignment[]>([])
  const [selectedInitiator, setSelectedInitiator] = useState<string>(
    userInfo?.id || userInfo?.employeeDetails?.employeeId || mockUsers[0]?.id || ''
  )
  const [isLaunching, setIsLaunching] = useState(false)
  const [showExecutionWizard, setShowExecutionWizard] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(12)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const hasAppliedTemplateIdFromUrl = useRef(false)

  // Load published templates from API with pagination and search
  const loadPublishedTemplates = async (page: number = 1, search: string = '') => {
    try {
      setIsLoading(true)
      setError(null)
      const offset = (page - 1) * itemsPerPage
      const params = new URLSearchParams({
        limit: String(itemsPerPage),
        offset: String(offset),
        onlyLatest: 'true',
        includeDrafts: 'true'
      })
      const q = search.trim()
      if (q) params.append('search', q)

      const response = await fetchWithAuth(`${API_BASE}/templates/list?${params.toString()}`)
      const list = response.data || []
      setTemplates(list)
      setTotalCount(Number(response.totalCount || 0))
      setHasMore(Boolean(response.hasMore))
      setCurrentPage(page)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates')
      console.error('Error loading templates:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Load template metadata
  const loadTemplateMetadata = async (templateId: string) => {
    try {
      // Use the template ID directly (now contains the actual workflow definition name from backend)
      const response = await fetchWithAuth(`${API_BASE}/templates/${templateId}/metadata`)
      setTemplateMetadata(response.data || response)

      // Initialize empty launch parameters
      setLaunchParameters({})

      // Initialize execution assignments for steps that need them (only for user tasks, not system tasks)
      const template = response.data?.template || response.template
      if (template?.steps) {
        const SYSTEM_TASK_TYPES = ['FUNCTION', 'AI_AGENT', 'AI_TASK_EXPERT']
        const assignments: ExecutionAssignment[] = template.steps
          .map((step: any, index: number) => {
            // Skip system tasks - they don't need user assignment
            if (SYSTEM_TASK_TYPES.includes(step.type)) {
              return null
            }

            const assignment = step.assignment
            // Check if step needs execution-time assignment (has no targets configured)
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
          .filter(Boolean)

        setExecutionAssignments(assignments)
      }
    } catch (err) {
      console.error('Error loading template metadata:', err)
    }
  }

  // Load templates on component mount
  useEffect(() => {
    console.log('FlowLauncher: accessToken =', accessToken ? 'PRESENT' : 'MISSING')
    if (accessToken) {
      console.log('FlowLauncher: Making API call to load templates')
      loadPublishedTemplates(1, '')
    } else {
      console.log('FlowLauncher: No accessToken, skipping API call')
    }
  }, [accessToken])

  // Pre-select template from URL (e.g. from orchestrator "Open in Flow Launcher" link)
  useEffect(() => {
    if (typeof globalThis.window === 'undefined' || !accessToken || isLoading || hasAppliedTemplateIdFromUrl.current)
      return
    const params = new URLSearchParams(globalThis.window.location.search)
    const templateId = params.get('templateId') || params.get('template')
    if (!templateId) return

    const found = templates.find(t => t.id === templateId)
    if (found) {
      hasAppliedTemplateIdFromUrl.current = true
      handleTemplateSelect(found)
      return
    }

    // Template not in list (e.g. pagination) - fetch metadata by ID
    const fetchAndSelect = async () => {
      try {
        const response = await fetchWithAuth(`${API_BASE}/templates/${templateId}/metadata`)
        const data = response.data || response
        const tpl = data.template || data
        const synthetic: FlowTemplate = {
          id: templateId,
          name: tpl?.name || templateId,
          description: tpl?.description || '',
          steps: tpl?.steps || []
        }
        hasAppliedTemplateIdFromUrl.current = true
        handleTemplateSelect(synthetic)
      } catch {
        // Template may not exist or not accessible - ignore
      }
    }
    fetchAndSelect()
  }, [accessToken, templates, isLoading])

  // Debounced server-side search
  useEffect(() => {
    if (!accessToken) return
    const handle = setTimeout(() => {
      setIsSearching(Boolean(searchTerm.trim()))
      loadPublishedTemplates(1, searchTerm)
    }, 300)
    return () => clearTimeout(handle)
  }, [searchTerm])

  // Handle template selection
  const handleTemplateSelect = async (template: FlowTemplate) => {
    setSelectedTemplate(template)
    // Always use the template.id which contains the workflow definition name from backend
    if (template.id) {
      await loadTemplateMetadata(template.id)
    } else {
      console.error('Template missing ID field:', template)
    }
  }

  // Initiator selection is now in the header (top-right)

  // Launch the workflow using ExecutionWizard
  const handleLaunchWithWizard = () => {
    if (!selectedTemplate) return
    setShowExecutionWizard(true)
  }

  // Execute workflow from ExecutionWizard
  const handleExecuteWorkflow = async (executionConfig: any) => {
    if (!selectedTemplate || !templateMetadata) return

    try {
      setIsLaunching(true)

      // Prepare runtime assignments with correct step ID format and targets structure
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

      // Prepare execution parameters for the custom flow engine API
      const executionParams = {
        runtimeParameters: launchParameters,
        initiator: selectedInitiator || 'unknown',
        context: {
          flowInstanceId: `flow_instance_${Date.now()}`,
          launchedBy: userInfo?.userName || userInfo?.id || userInfo?.employeeDetails?.employeeId || 'unknown',
          launchedAt: new Date().toISOString(),
          templateTitle: selectedTemplate.name
        },
        inputValues: launchParameters,
        runtimeAssignments,
        ...executionConfig
      }

      // Execute the workflow via the custom flow engine API
      const result = await fetchWithAuth(`${API_BASE}/templates/${selectedTemplate.id}/execute`, {
        method: 'POST',
        body: JSON.stringify(executionParams)
      })

      console.log('Flow launched successfully:', result)

      toast.success('Flow launched successfully!', {
        description: `Flow ID: ${result.data?.workflowId}\nTemplate: ${selectedTemplate.name}`
      })

      // Reset form after successful launch
      setLaunchParameters({})
      setExecutionAssignments([])
      setSelectedTemplate(null)
      setTemplateMetadata(null)
      setShowExecutionWizard(false)
    } catch (err) {
      console.error('Error launching workflow:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to launch workflow'
      toast.error('Failed to launch workflow', {
        description: errorMessage
      })
    } finally {
      setIsLaunching(false)
    }
  }

  // Direct launch (legacy method - kept for simple templates)
  const handleDirectLaunch = async () => {
    if (!selectedTemplate || !templateMetadata) return

    try {
      setIsLaunching(true)

      // Prepare runtime assignments with correct step ID format and targets structure
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

      // Prepare execution parameters for the custom flow engine API
      const executionParams = {
        runtimeParameters: launchParameters,
        initiator: selectedInitiator || 'unknown',
        context: {
          flowInstanceId: `flow_instance_${Date.now()}`,
          launchedBy: userInfo?.userName || userInfo?.id || userInfo?.employeeDetails?.employeeId || 'unknown',
          launchedAt: new Date().toISOString(),
          templateTitle: selectedTemplate.name
        },
        inputValues: launchParameters,
        runtimeAssignments
      }

      // Execute the workflow via the custom flow engine API
      const result = await fetchWithAuth(`${API_BASE}/templates/${selectedTemplate.id}/execute`, {
        method: 'POST',
        body: JSON.stringify(executionParams)
      })

      console.log('Flow launched successfully:', result)

      toast.success('Flow launched successfully!', {
        description: `Flow ID: ${result.data?.workflowId}\nTemplate: ${selectedTemplate.name}`
      })

      // Reset form after successful launch
      setLaunchParameters({})
      setExecutionAssignments([])
      setSelectedTemplate(null)
      setTemplateMetadata(null)
    } catch (err) {
      console.error('Error launching workflow:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to launch workflow'
      toast.error('Failed to launch workflow', {
        description: errorMessage
      })
    } finally {
      setIsLaunching(false)
    }
  }

  // Check if template can be launched
  const canLaunch =
    selectedTemplate &&
    templateMetadata &&
    executionAssignments.every(assignment => assignment.assignedUsers.length > 0)

  const renderMainContent = () => {
    if (isLoading) {
      return (
        <Card className="gba:bg-white/80 gba:backdrop-blur-sm gba:border gba:border-white/20 gba:shadow-xl">
          <CardContent className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-12">
            <Spinner size="lg" />
            <p className="gba:mt-4 gba:text-sm gba:text-gray-600">Loading templates...</p>
          </CardContent>
        </Card>
      )
    }
    if (error) {
      return (
        <Card className="gba:bg-white/80 gba:backdrop-blur-sm gba:border gba:border-white/20 gba:shadow-xl">
          <CardContent className="gba:p-6">
            <Alert variant="destructive" data-testid={`${testId}-error`}>
              <AlertTriangle className="gba:h-5 gba:w-5" />
              <div className="gba:ml-3">
                <h3 className="gba:font-semibold gba:mb-2">Error Loading Templates</h3>
                <p className="gba:mb-4">{error}</p>
                <Button
                  variant="outline"
                  onClick={() => loadPublishedTemplates()}
                  className="gba:gap-2"
                  data-testid={`${testId}-retry`}
                >
                  <RefreshCw size={16} />
                  Retry
                </Button>
              </div>
            </Alert>
          </CardContent>
        </Card>
      )
    }
    return (
      <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-3 gba:gap-6 gba:w-full">
        {/* Template Selection - 2/3 width */}
        <div className="gba:lg:col-span-2">
          <Card
            className="gba:bg-white/80 gba:backdrop-blur-sm gba:border gba:border-white/20 gba:shadow-xl gba:h-full"
            data-testid={`${testId}-template-selection`}
          >
            <CardContent className="gba:p-6">
              <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
                <h2 className="gba:text-lg gba:font-semibold gba:text-gray-900">
                  {getTranslationFromI18nKeyAndLabel('flow.launcher.selectTemplate', 'Choose a Workflow Template')}
                </h2>
              </div>

              {/* Search Input */}
              <div className="gba:mb-4">
                <input
                  type="text"
                  placeholder="Search templates..."
                  className="gba:w-full gba:px-4 gba:py-2 gba:border gba:border-gray-300 gba:rounded-lg gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-blue-500 gba:focus:border-transparent"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  data-testid={`${testId}-search-input`}
                />
              </div>

              {templates.length === 0 ? (
                <EmptyState
                  title="No Published Templates"
                  description={
                    isSearching
                      ? 'No templates match your search. Try different keywords.'
                      : 'No published flow templates are available for launch. Create and publish templates to get started with workflow automation.'
                  }
                  actionLabel="Refresh Templates"
                  onAction={() => loadPublishedTemplates(1, searchTerm)}
                  data-testid={`${testId}-no-templates`}
                />
              ) : (
                <>
                  <div className="gba:space-y-1">
                    {templates.map(template => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        isSelected={selectedTemplate?.id === template.id}
                        onClick={handleTemplateSelect}
                        data-testid={`${testId}-template-${template.id}`}
                      />
                    ))}
                  </div>
                  {/* Pagination Controls */}
                  <div className="gba:flex gba:items-center gba:justify-between gba:mt-4">
                    <div className="gba:text-sm gba:text-gray-600">
                      {totalCount > 0 && (
                        <span>
                          {Math.min((currentPage - 1) * itemsPerPage + 1, totalCount)}-
                          {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount}
                        </span>
                      )}
                    </div>
                    <div className="gba:flex gba:gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadPublishedTemplates(Math.max(1, currentPage - 1), searchTerm)}
                        disabled={currentPage <= 1 || isLoading}
                        data-testid={`${testId}-prev-page`}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadPublishedTemplates(currentPage + 1, searchTerm)}
                        disabled={!hasMore || isLoading}
                        data-testid={`${testId}-next-page`}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Launch Configuration - 1/3 width */}
        <div className="gba:lg:col-span-1">
          <Card
            className="gba:bg-white/80 gba:backdrop-blur-sm gba:border gba:border-white/20 gba:shadow-xl gba:h-full"
            data-testid={`${testId}-launch-config`}
          >
            <CardContent className="gba:p-6">
              <h2 className="gba:text-lg gba:font-semibold gba:mb-4 gba:text-gray-900">
                {getTranslationFromI18nKeyAndLabel('flow.launcher.launchConfiguration', 'Launch Configuration')}
              </h2>

              <LaunchConfiguration
                accessToken={accessToken}
                selectedTemplate={selectedTemplate}
                templateMetadata={templateMetadata}
                executionAssignments={executionAssignments}
                isLaunching={isLaunching}
                canLaunch={canLaunch}
                onAssignmentsChange={setExecutionAssignments}
                onDirectLaunch={handleDirectLaunch}
                onLaunchWithWizard={handleLaunchWithWizard}
                data-testid={`${testId}-launch-configuration`}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <MockDataProvider>
      <div
        className="gba:min-h-screen gba:bg-gradient-to-br gba:from-blue-50 gba:via-indigo-50 gba:to-purple-100 gba:p-6"
        data-testid={testId}
      >
        <Toaster />

        {/* Header */}
        <div className="gba:mb-6" data-testid={`${testId}-header`}>
          <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:p-3 gba:bg-gradient-to-br gba:from-blue-500 gba:via-indigo-600 gba:to-purple-600 gba:rounded-xl gba:shadow-lg gba:shadow-blue-500/25">
                <Play className="gba:h-8 gba:w-8 gba:text-white" />
              </div>
              <div>
                <h1 className="gba:text-3xl gba:font-bold gba:text-gray-900" data-testid={`${testId}-title`}>
                  {getTranslationFromI18nKeyAndLabel('flow.launcher.title', 'FLOW Launcher')}
                </h1>
                <p className="gba:text-lg gba:text-gray-600">
                  {getTranslationFromI18nKeyAndLabel(
                    'flow.launcher.description',
                    'Launch & Configure Workflow Templates'
                  )}
                </p>
              </div>
            </div>
            {/* Top Right: Initiator Selection (no label) */}
            <div className="gba:flex gba:items-center gba:gap-3">
              <Select
                value={selectedInitiator}
                onValueChange={setSelectedInitiator}
                data-testid={`${testId}-initiator-select`}
              >
                <SelectTrigger className="gba:w-64 gba:bg-white gba:shadow-sm">
                  <SelectValue placeholder="Select initiator" />
                </SelectTrigger>
                <SelectContent>
                  {mockUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <span className="gba:font-medium">{user.name}</span>
                        <span className="gba:text-xs gba:text-gray-500">({user.id})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Main Dashboard Content */}
        <div className="gba:w-full gba:max-w-none">{renderMainContent()}</div>

        {/* Simulation Wizard Dialog */}
        {selectedTemplate && (
          <Dialog open={showExecutionWizard} onOpenChange={setShowExecutionWizard}>
            <DialogContent
              className="gba:max-w-[85vw] gba:w-[85vw] gba:max-h-[85vh] gba:h-[85vh] gba:overflow-auto gba:p-0"
              style={{
                maxWidth: '85vw',
                width: '85vw',
                maxHeight: '85vh',
                height: '85vh'
              }}
              data-testid={`${testId}-simulation-wizard-modal`}
            >
              <div className="gba:h-full gba:w-full gba:overflow-auto">
                <SimulationWizard
                  template={selectedTemplate as any}
                  accessToken={accessToken}
                  userInfo={userInfo}
                  onExecute={handleExecuteWorkflow}
                  onCancel={() => setShowExecutionWizard(false)}
                  data-testid={`${testId}-simulation-wizard`}
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </MockDataProvider>
  )
}

export default FlowLauncher
