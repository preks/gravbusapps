import type {
  WorkflowEngine,
  StepReceiver,
  StepInstance,
  SubmittedRequest,
  RequestWithHistory,
  Comment,
  FlowComment,
  StepStatus,
  TaskStatistics,
  AvailableActions
} from '../packages/services-plus-core/src'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { env } from '@/common/env/EnvUtils'
import { getServiceDeskCatalogCache } from './catalog-cache/ServiceDeskCatalogCache'

// Base URL for the custom flow engine API
const API_BASE =
  (env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || env('NEXT_PUBLIC_BASE_URL') + '/flow-engine') + '/api'

/**
 * Services app catalog identifier for filtering service desk tickets
 * This ensures only tickets from the Services app are shown in the service desk
 */
const SERVICES_APP_TAG = 'AppCatalog:1:SVC'

/**
 * ConductorWorkflowEngineAdapter - Integrates Services+ with Custom Flow Engine
 *
 * This adapter bridges the Services+ WorkflowEngine interface with the Custom Flow Engine
 * that uses Conductor for workflow orchestration. It enables service requests initiated
 * from the Service Portal to be executed as sophisticated workflows with proper task
 * assignment, tracking, and service desk integration.
 */
export class ConductorWorkflowEngineAdapter implements WorkflowEngine {
  private flowEngineBaseUrl: string
  private accessToken: string
  private currentUserId: string
  private userInfo?: any
  private serviceDeskCatalogEntries: any[] = []

  constructor(context: BusinessAppContextProps) {
    this.flowEngineBaseUrl = API_BASE
    this.accessToken = context.accessToken
    this.currentUserId = context.userInfo?.id || 'unknown-user'
    this.userInfo = context.userInfo

    // Load Service Desk Catalog for enhanced desk mapping (async, but don't block constructor)
    this.loadServiceDeskCatalog()

    console.log(`[ConductorAdapterRequester] Initialized with user:`, {
      userId: this.currentUserId,
      hasUserInfo: !!this.userInfo,
      displayName: this.getRequesterDisplayName()
    })
  }

  /**
   * Load Service Desk Catalog for enhanced desk mapping (now using cache)
   */
  private async loadServiceDeskCatalog(): Promise<void> {
    try {
      console.log(`[ConductorAdapter] 🔗 Loading Service Desk Catalog using cache`)
      console.log(
        `[ConductorAdapter] 🔑 Access token available: ${!!this.accessToken} (length: ${this.accessToken?.length || 0})`
      )

      // Use the cached catalog service
      const catalogCache = getServiceDeskCatalogCache()
      catalogCache.initialize(this.accessToken || '')

      const selectedCatalog = await catalogCache.get()

      if (selectedCatalog) {
        this.serviceDeskCatalogEntries = selectedCatalog.catalogEntries || []
      } else {
        console.warn(`[ConductorAdapter] No Service Desk Catalog found in cache`)
        // Create fallback desk entries
        this.createFallbackDeskEntries()
      }
    } catch (error) {
      console.error(`[ConductorAdapter] ❌ Error loading Service Desk Catalog from cache:`, error)
      // Create fallback desk entries
      this.createFallbackDeskEntries()
    }
  }

  /**
   * Create fallback desk entries when catalog loading fails
   */
  private createFallbackDeskEntries(): void {
    console.log(`[ConductorAdapter] 🔧 Creating fallback desk entries`)
    this.serviceDeskCatalogEntries = [
      { code: 'HR', value: 'Human Resources', additionalValue3: 'dept-001' },
      { code: 'IT', value: 'Information Technology', additionalValue3: 'dept-002' },
      { code: 'Finance', value: 'Finance', additionalValue3: 'dept-003' },
      { code: 'Facilities', value: 'Facilities Management', additionalValue3: 'dept-004' },
      { code: 'Admin', value: 'Administration', additionalValue3: 'dept-005' }
    ]
    console.log(`[ConductorAdapter] ✅ Created ${this.serviceDeskCatalogEntries.length} fallback desk entries`)
  }

  /**
   * Get a display name for the current user from available user info
   */
  private getRequesterDisplayName(): string {
    if (!this.userInfo) {
      console.log(`[ConductorAdapterRequester] ⚠️ No user info available for display name`)
      return 'Unknown User'
    }

    // Try different combinations in order of preference
    const possibleNames = [
      // Full name from employee details
      this.userInfo.employeeDetails?.firstName && this.userInfo.employeeDetails?.lastName
        ? `${this.userInfo.employeeDetails.firstName} ${this.userInfo.employeeDetails.lastName}`.trim()
        : null,

      // Full name from user info
      this.userInfo.givenName && this.userInfo.familyName
        ? `${this.userInfo.givenName} ${this.userInfo.familyName}`.trim()
        : null,

      // Individual name fields
      this.userInfo.nickName,
      this.userInfo.userName,
      this.userInfo.givenName,
      this.userInfo.employeeDetails?.firstName,

      // Fallback to user ID if it's not a UUID
      !this.isUUID(this.currentUserId) ? this.currentUserId : null
    ]

    // Return the first non-empty name
    for (const name of possibleNames) {
      if (name && typeof name === 'string' && name.trim().length > 0) {
        console.log(`[ConductorAdapterRequester] ✅ Using display name: ${name}`)
        return name.trim()
      }
    }

    console.log(`[ConductorAdapterRequester] ⚠️ Could not determine display name, falling back to 'Unknown User'`)
    return 'Unknown User'
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.flowEngineBaseUrl}${endpoint}`
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
        ...options.headers
      }
    })

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Start a new service request workflow
   * Converts service template to flow template and executes it
   */
  async startRequest(templateKey: string, formData: any): Promise<string> {
    // Declare payload in broader scope for error handling
    let requestPayload: any = null
    let flowTemplateId: string = ''

    try {
      console.log(`[ConductorAdapter] Starting request with template: ${templateKey}`, { formData })

      // Map template key to actual flow template
      flowTemplateId = this.mapServiceTemplateToFlowTemplate(templateKey)
      const requesterDisplayName = this.getRequesterDisplayName()

      console.log(`[ConductorAdapterRequester] ✅ Will send requester name: ${requesterDisplayName}`)

      // Prepare execution context with assignment resolution
      const executionContext = this.buildExecutionContext(formData, templateKey)

      // Prepare request payload (inputValues removed - not supported by API)
      requestPayload = {
        initiator: this.currentUserId,
        context: {
          serviceRequestType: templateKey,
          requesterId: this.currentUserId,
          requesterName: requesterDisplayName,
          initiatedFrom: 'service-portal',
          urgency: formData.urgency || 'standard'
        },
        runtimeAssignments: executionContext.assignments
        // Note: inputValues removed - form data should be submitted via task completion
      }

      console.log(`[ConductorAdapterRequester] 🚀 API Request Details:`, {
        url: `${this.flowEngineBaseUrl}/templates/${flowTemplateId}/execute`,
        method: 'POST',
        templateKey: templateKey,
        flowTemplateId: flowTemplateId,
        formData: formData,
        assignmentCount: Object.keys(requestPayload.runtimeAssignments || {}).length,
        hasRuntimeAssignments:
          !!requestPayload.runtimeAssignments && Object.keys(requestPayload.runtimeAssignments).length > 0,
        runtimeAssignments: requestPayload.runtimeAssignments,
        runtimeAssignmentKeys: Object.keys(requestPayload.runtimeAssignments || {}),
        step0Assignment: requestPayload.runtimeAssignments?.step_0,
        payload: requestPayload
      })

      // Execute the flow template via Custom Flow Engine
      const response = await fetch(`${this.flowEngineBaseUrl}/templates/${flowTemplateId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`
        },
        body: JSON.stringify(requestPayload)
      })

      if (!response.ok) {
        let errorMessage = `Failed to execute template: ${response.status} ${response.statusText}`
        let errorBody = ''
        try {
          errorBody = await response.text()
          console.error(`[ConductorAdapterRequester] ❌ API Error Response:`, {
            status: response.status,
            statusText: response.statusText,
            body: errorBody,
            url: `${this.flowEngineBaseUrl}/templates/${flowTemplateId}/execute`,
            templateKey: templateKey,
            flowTemplateId: flowTemplateId,
            actualPayloadSent: requestPayload
          })
          errorMessage += ` - Response: ${errorBody}`
        } catch (parseError) {
          console.error(`[ConductorAdapterRequester] Could not parse error response:`, parseError)
        }

        // Create enhanced error with structured debug info (3 separate JSON sections)
        const enhancedError = new Error(errorMessage)
        ;(enhancedError as any).debugPayload = {
          apiCall: {
            method: 'POST',
            url: `${this.flowEngineBaseUrl}/templates/${flowTemplateId}/execute`,
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer [REDACTED]'
            },
            timestamp: new Date().toISOString(),
            templateInfo: {
              templateKey: templateKey,
              flowTemplateId: flowTemplateId
            }
          },
          sentPayload: requestPayload,
          response: {
            status: response.status,
            statusText: response.statusText,
            body: errorBody,
            timestamp: new Date().toISOString()
          }
        }
        throw enhancedError
      }

      const result = await response.json()
      const flowId = result.data.workflowId || result.data.flowId || result.flowId

      console.log(`[ConductorAdapterRequester] ✅ Request created successfully:`, {
        flowId: flowId,
        templateKey: templateKey,
        flowTemplateId: flowTemplateId,
        requesterName: requesterDisplayName,
        result: result
      })
      return flowId
    } catch (error) {
      console.error('[ConductorAdapter] Error starting request:', error)

      // If this is already an enhanced error (from API response), re-throw as-is
      if (error && typeof error === 'object' && 'debugPayload' in error) {
        throw error
      }

      // Create enhanced error for other types of failures (network, parsing, etc.)
      const enhancedError = new Error(
        `Failed to start service request: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      ;(enhancedError as any).debugPayload = {
        apiCall: {
          method: 'POST',
          url: `${this.flowEngineBaseUrl}/templates/${flowTemplateId}/execute`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer [REDACTED]'
          },
          timestamp: new Date().toISOString(),
          templateInfo: {
            templateKey: templateKey,
            flowTemplateId: flowTemplateId
          }
        },
        sentPayload: requestPayload || { error: 'Payload not yet built when error occurred' },
        response: {
          error: 'Network or Processing Error',
          originalError: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        }
      }
      throw enhancedError
    }
  }

  /**
   * Get all service requests for current user
   * Queries flows initiated by current user and fetches full details for each
   */

  /**
   * Get a specific service request by ID
   * Retrieves detailed flow information including steps and progress
   */
  async getRequest(requestId: string): Promise<SubmittedRequest> {
    try {
      console.log(`[ConductorAdapter] Getting request details for: ${requestId}`)

      // Get flow details from Custom Flow Engine
      const response = await fetch(`${this.flowEngineBaseUrl}/flows/${requestId}`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to get request: ${response.status} ${response.statusText}`)
      }

      const flowData = await response.json()

      // Convert flow data to SubmittedRequest format
      const submittedRequest = this.convertFlowToSubmittedRequest(flowData)

      console.log(`[ConductorAdapter] Retrieved request details for: ${requestId}`)
      return submittedRequest
    } catch (error) {
      console.error(`[ConductorAdapter] Error getting request ${requestId}:`, error)
      throw new Error(`Failed to get request: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get detailed information for a specific ticket using real custom-flow-engine task ID
   */
  async getTicketDetail(ticketId: string): Promise<StepInstance | null> {
    try {
      console.log(`🔍 [ConductorAdapter] Getting ticket detail for REAL task ID: ${ticketId}`)

      const response = await fetch(`${this.flowEngineBaseUrl}/tasks/${ticketId}?userId=${this.currentUserId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`
        }
      })

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`[ConductorAdapter] Task not found: ${ticketId}`)
          return null
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      console.log(`[ConductorAdapter] Got REAL task detail:`, result)
      console.log(`[ConductorAdapter] 🔍 FormData check: task.formData =`, result.formData)

      // Use the task data from custom-flow-engine API response
      const taskData = result.task || result

      // Determine the actual desk based on API data instead of hardcoding
      const actualDesk = await this.determineTaskDesk(taskData, [])
      console.log(
        `[ConductorAdapter] 🎯 Determined desk for task ${ticketId}: ${actualDesk} (was hardcoded as 'Admin')`
      )

      // Convert to StepInstance format using real custom-flow-engine task data
      const stepInstance = this.convertCustomFlowEngineTaskToStepInstance(taskData, actualDesk)
      return stepInstance
    } catch (error) {
      console.error(`[ConductorAdapter] Error getting ticket detail for ${ticketId}:`, error)
      throw new Error(`Failed to get ticket detail: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Assign a step to a specific user
   */

  /**
   * Advance/complete a step with optional data
   */

  // =================================================================================
  // PRIVATE HELPER METHODS
  // =================================================================================

  /**
   * ✨ DYNAMIC: Map any template name to flow template ID
   * Converts template names from custom-flow-engine to flow IDs dynamically
   */
  private mapServiceTemplateToFlowTemplate(templateKey: string): string {
    // ✨ DYNAMIC MAPPING: Convert template name to flow ID
    let flowId: string

    if (templateKey.startsWith('flow_')) {
      // Already a flow ID, use as-is
      flowId = templateKey
    } else {
      // Convert template name to flow ID dynamically
      flowId =
        'flow_' +
        templateKey
          .toLowerCase()
          .replace(/\s+/g, '_') // Replace spaces with underscores
          .replace(/[^a-z0-9_]/g, '') // Remove special characters
          .replace(/_+/g, '_') // Remove duplicate underscores
          .replace(/^_|_$/g, '') // Remove leading/trailing underscores
    }

    // Legacy mappings for backward compatibility with hardcoded keys
    const legacyMappings: Record<string, string> = {
      'employee-onboarding-request': 'flow_employee_onboarding_process',
      'new-hardware-request': 'flow_employee_onboarding_process',
      'hardware-equipment-request': 'flow_employee_service_request_process',
      'it-hardware': 'flow_employee_service_request_process',
      'it-support-request': 'flow_employee_service_request_process',
      'hr-service-request': 'flow_employee_service_request_process'
    }

    // Use legacy mapping if available, otherwise use dynamic mapping
    const finalFlowId = legacyMappings[templateKey] || flowId

    console.log(`[ConductorAdapterRequester] 🔧 DYNAMIC Template Mapping:`, {
      inputTemplateKey: templateKey,
      dynamicFlowId: flowId,
      legacyMapping: legacyMappings[templateKey] || 'none',
      finalFlowId: finalFlowId,
      mappingType: legacyMappings[templateKey] ? 'legacy' : 'dynamic'
    })

    return finalFlowId
  }

  /**
   * ✨ DYNAMIC: Analyze template type and assignment requirements
   * Determines if a template needs runtime assignments based on its characteristics
   */
  /**
   * 🌐 UNIVERSAL: Get steps that require runtime assignments for any template
   * This analyzes the actual template definition to detect steps with "targets": null
   */
  async getStepsRequiringAssignment(templateId: string): Promise<
    Array<{
      stepId: string
      stepIndex: number
      title: string
      assignmentMode: string
      requiresUsers: boolean
    }>
  > {
    try {
      // Fetch template definition to analyze steps
      const response = await fetch(`${this.flowEngineBaseUrl}/templates/${templateId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        }
      })

      if (!response.ok) {
        console.warn(`[ConductorAdapter] Could not fetch template ${templateId} for assignment analysis`)
        return []
      }

      const templateResponse = await response.json()
      const template = templateResponse.template || templateResponse.data || templateResponse

      const stepsRequiringAssignment: Array<{
        stepId: string
        stepIndex: number
        title: string
        assignmentMode: string
        requiresUsers: boolean
      }> = []

      if (template?.steps) {
        template.steps.forEach((step: any, index: number) => {
          const stepId = `step_${index}`
          const assignmentMode = step.assignment?.assignmentMode

          // Check if step requires runtime assignment (same logic as custom-flow-engine)
          if (assignmentMode === 'CLAIM' || assignmentMode === 'ASSIGN') {
            if (!step.assignment.targets) {
              // targets: null - requires runtime assignment
              stepsRequiringAssignment.push({
                stepId: stepId,
                stepIndex: index,
                title: step.title || `Step ${index + 1}`,
                assignmentMode: assignmentMode,
                requiresUsers: assignmentMode === 'ASSIGN' // ASSIGN mode requires specific users
              })
            } else if (typeof step.assignment.targets === 'object') {
              // Check if all target arrays are empty
              const targets = step.assignment.targets
              const targetArrays = [
                targets.users,
                targets.organizationalUnits,
                targets.companies,
                targets.siteLocations,
                targets.capabilities,
                targets.costCenters,
                targets.matrixTeams
              ]

              const hasAnyTargets = targetArrays.some(arr => Array.isArray(arr) && arr.length > 0)

              if (!hasAnyTargets) {
                stepsRequiringAssignment.push({
                  stepId: stepId,
                  stepIndex: index,
                  title: step.title || `Step ${index + 1}`,
                  assignmentMode: assignmentMode,
                  requiresUsers: assignmentMode === 'ASSIGN'
                })
              }
            }
          }
        })
      }

      console.log(`[ConductorAdapter] 🔍 Template ${templateId} analysis:`, {
        totalSteps: template?.steps?.length || 0,
        stepsRequiringAssignment: stepsRequiringAssignment.length,
        requiredSteps: stepsRequiringAssignment
      })

      return stepsRequiringAssignment
    } catch (error) {
      console.error(`[ConductorAdapter] Error analyzing template ${templateId}:`, error)
      return []
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private analyzeTemplateType(_templateKey: string): {
    category: string
    needsRuntimeAssignments: boolean
    stepComplexity: string
    description: string
  } {
    // 🌐 UNIVERSAL: Always check if template needs runtime assignments
    // The actual detection is now done by getStepsRequiringAssignment method

    return {
      category: 'universal',
      needsRuntimeAssignments: true, // Always check - let getStepsRequiringAssignment determine actual needs
      stepComplexity: 'universal',
      description: 'Universal approach: analyze actual template to detect runtime assignment requirements'
    }
  }

  /**
   * ✨ DYNAMIC: Build execution context with template-driven assignment resolution
   * Analyzes template structure to determine if runtime assignments are needed
   */
  private buildExecutionContext(formData: any, templateKey?: string): { assignments: Record<string, any> } {
    // 🔧 GENERAL APPROACH: By default, all templates use their predefined assignments
    // This preserves the correct assignmentMode (CLAIM/ASSIGN/etc.) from the template
    const templateType = this.analyzeTemplateType(templateKey || '')

    console.log(`[ConductorAdapterRequester] 🔧 GENERAL ASSIGNMENT APPROACH:`, {
      templateKey: templateKey,
      templateKeyType: typeof templateKey,
      templateKeyExact: `"${templateKey}"`,
      templateType: templateType,
      needsRuntimeAssignments: templateType.needsRuntimeAssignments,
      templateCategory: templateType.category,
      approach: 'Use template defaults to preserve correct assignmentMode'
    })

    const assignments: Record<string, any> = {}

    // 🔧 GENERAL: Most templates use predefined assignments with correct assignmentMode
    if (!templateType.needsRuntimeAssignments) {
      console.log(
        `[ConductorAdapterRequester] ✅ USING TEMPLATE DEFAULTS - All steps will use assignmentMode from template (category: ${templateType.category})`
      )
      console.log(
        `[ConductorAdapterRequester] 🎯 NO RUNTIME OVERRIDES - Template has correct assignmentMode for each step`
      )
      console.log(
        `[ConductorAdapterRequester] 🚪 EARLY RETURN - Returning empty assignments to preserve template assignmentMode`
      )
      return { assignments } // Return empty assignments to use template defaults
    }

    // 🌐 UNIVERSAL: Build assignments from form data for any template
    console.log(`[ConductorAdapterRequester] 🌐 Using Universal Assignment Approach for all templates`)

    // 🌐 UNIVERSAL: Always use the universal assignment builder
    return this.buildUniversalAssignments(formData, templateKey || 'unknown')
  }

  /**
   * ✨ DYNAMIC: Build onboarding-specific assignments (7 steps)
   */

  private buildUniversalAssignments(formData: any, _templateKey: string): { assignments: Record<string, any> } {
    console.log(`[ConductorAdapterRequester] 🌐 Building Universal Assignments from form data`)
    const assignments: Record<string, any> = {}

    // 🌐 UNIVERSAL APPROACH: Build assignments from form data for any template
    // Form data should contain step assignments like: stepAssignments: { step_3: "userId", step_1: "anotherUserId" }

    if (formData.stepAssignments) {
      Object.keys(formData.stepAssignments).forEach(stepId => {
        const assignedUserId = formData.stepAssignments[stepId]

        if (assignedUserId) {
          assignments[stepId] = {
            targets: {
              users: [assignedUserId],
              organizationalUnits: [],
              capabilities: [],
              matrixTeams: [],
              companies: [],
              siteLocations: [],
              costCenters: []
            },
            assignmentMode: formData[`${stepId}_assignmentMode`] || 'ASSIGN', // Default to ASSIGN for user assignments
            allowReassignment: formData[`${stepId}_allowReassignment`] !== false // Default to true unless explicitly false
          }
        }
      })
    }

    console.log(`[ConductorAdapterRequester] 🎯 UNIVERSAL ASSIGNMENTS built from form:`, {
      assignmentCount: Object.keys(assignments).length,
      assignmentKeys: Object.keys(assignments),
      assignments: assignments,
      sourceFormData: formData.stepAssignments,
      templateKey: _templateKey
    })

    return { assignments }
  }

  /**
   * Convert flow data to SubmittedRequest format
   */
  private convertFlowToSubmittedRequest(flowData: any): SubmittedRequest {
    // Extract the original form data from the workflow
    const formData = this.extractFormDataFromFlow(flowData)

    // Convert workflow steps to StepInstance format with rich details
    const steps: StepInstance[] = (flowData.steps || []).map((step: any, index: number) => {
      // Map Custom Flow Engine step status to Services+ step status
      const stepStatus = this.mapFlowStepStatusToStepStatus(step.status)

      // Extract assignment information
      const assignmentTargets = step.assignmentTargets || {}
      const desk = this.mapCapabilitiesToDesk(assignmentTargets.capabilities || [])

      // Build step with rich details
      return {
        id: step.taskId || `${flowData.id || flowData.flowId}-step-${index}`,
        defId: step.stepId || `step_${index}`,
        name: step.title || `Step ${index + 1}`,
        desk: desk,
        status: stepStatus,
        assignedToUserId: step.assignedTo === 'AVAILABLE' ? undefined : step.assignedTo,
        claimedByUserId: step.claimedBy,
        startedAt: step.startedAt || (stepStatus === 'IN_PROGRESS' ? step.scheduledAt : undefined),
        finishedAt: step.finishedAt,
        comments: step.comments || [],
        requestId: flowData.id || flowData.flowId,
        requesterId: flowData.initiatedBy || this.currentUserId,
        requesterName: this.extractRequesterName(flowData),
        flowInitiatedBy: flowData.flowInitiatedById || flowData.initiatedBy, // Flow initiator UUID from API (flowInitiatedById is the UUID, flowInitiatedBy is the display name)

        // Additional rich details for the UI
        description: step.message,
        expectedStartAt: step.expectedStartAt,
        expectedFinishAt: step.expectedFinishAt,
        dueDate: step.dueDate,
        inputs: step.inputs || [],
        links: step.links || [],
        assignmentMode: step.assignmentMode,
        allowReassignment: step.allowReassignment
      }
    })

    // Build comprehensive timeline from flow progress and steps
    const timeline = this.buildComprehensiveTimeline(flowData, steps)

    return {
      id: flowData.flowId || flowData.id,
      templateId: flowData.templateId || 'unknown',
      templateVersion: flowData.version || 'x',
      requesterId: flowData.initiatedBy || flowData.requesterId || this.currentUserId,
      createdAt: flowData.startTime || flowData.createdAt,
      status: this.mapFlowStatusToRequestStatus(flowData.status),
      titleSnapshot: flowData.flowName || flowData.name || 'Service Request',
      categoryIdSnapshot: this.extractCategoryFromTemplate(flowData.templateId),
      formData: formData,
      steps: steps,
      timeline: timeline,

      // Additional metadata for rich display
      progress: flowData.progress,
      currentStep: flowData.progress?.currentStep,
      totalSteps: flowData.progress?.totalSteps,
      completedSteps: flowData.progress?.completedSteps,
      progressPercentage: flowData.progress?.percentage,

      // ✅ PRESERVE original flow steps for workflow visualization
      originalSteps: flowData.steps
    } as SubmittedRequest
  }

  /**
   * Extract original form data from workflow
   * ISSUE: Custom Flow Engine not persisting inputValues, implementing fallback
   */
  private extractFormDataFromFlow(flowData: any): any {
    // Extract original form data - now properly returned by Custom Flow Engine
    let formData =
      flowData.input?.inputValues || // ✅ FIXED: From Conductor via Custom Flow Engine
      flowData.input || // Direct input object
      flowData.inputValues || // Alternative location
      flowData.formData || // Legacy location
      {}

    // If still no data found, provide a helpful empty state
    if (!formData || Object.keys(formData).length === 0) {
      console.warn('[ConductorAdapter] No form data found in workflow response')
      formData = {
        _message: 'No form data available for this request',
        _submitDateTime: flowData.createdAt || flowData.startTime || new Date().toISOString(),
        _requestType: flowData.name || flowData.templateId || 'Service Request'
      }
    } else {
      console.log('[ConductorAdapter] ✅ SUCCESS: Real form data extracted:', Object.keys(formData))
    }

    return formData
  }

  /**
   * Return original Custom Flow Engine step status without any mapping
   */
  private mapFlowStepStatusToStepStatus(flowStepStatus: string): StepStatus {
    // Return original status as-is, defaulting to 'UNKNOWN' if not recognized
    const validStatuses: StepStatus[] = [
      'SCHEDULED',
      'OPEN',
      'IN_PROGRESS',
      'COMPLETED',
      'REJECTED',
      'FAILED',
      'PAUSED',
      'READY',
      'QUEUED',
      'RUNNING',
      'DONE',
      'ERROR',
      'CANCELLED',
      'SKIPPED',
      'TIMED_OUT',
      'CANCELED',
      'UNKNOWN'
    ]
    const upperStatus = flowStepStatus?.toUpperCase() as StepStatus

    // Return the original status without any transformation
    return validStatuses.includes(upperStatus) ? upperStatus : 'UNKNOWN'
  }

  /**
   * Build comprehensive timeline from flow data and steps
   */
  private buildComprehensiveTimeline(flowData: any, steps: StepInstance[]): Array<{ at: string; message: string }> {
    const timeline: Array<{ at: string; message: string }> = []

    // Add flow creation entry
    if (flowData.startTime || flowData.createdAt) {
      timeline.push({
        at: flowData.startTime || flowData.createdAt,
        message: `Request "${flowData.flowName || flowData.name}" submitted by ${flowData.initiatedBy || 'User'}`
      })
    }

    // Add step-based timeline entries
    steps.forEach(step => {
      // Add step start entry
      if (step.startedAt) {
        timeline.push({
          at: step.startedAt,
          message: `Step "${step.name}" started`
        })
      }

      // Add step completion entry
      if (step.finishedAt) {
        timeline.push({
          at: step.finishedAt,
          message: `Step "${step.name}" completed`
        })
      }

      // Add claim entry if step is claimed
      if (step.claimedByUserId && step.status === 'IN_PROGRESS') {
        timeline.push({
          at: step.startedAt || new Date().toISOString(),
          message: `Step "${step.name}" claimed by ${step.claimedByUserId}`
        })
      }
    })

    // Add workflow completion entry
    if (flowData.endTime) {
      timeline.push({
        at: flowData.endTime,
        message: `Request completed`
      })
    }

    // Sort timeline by timestamp
    timeline.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())

    return timeline
  }

  /**
   * Extract category from template ID
   */
  private extractCategoryFromTemplate(templateId: string): string {
    const categoryMapping: Record<string, string> = {
      'employee-onboarding': 'hr',
      'employee-offboarding': 'hr',
      'hardware-request': 'it',
      'software-request': 'it',
      'access-request': 'security',
      'travel-request': 'travel'
    }

    // Check for keywords in template ID
    const lowerTemplateId = (templateId || '').toLowerCase()
    for (const [keyword, category] of Object.entries(categoryMapping)) {
      if (lowerTemplateId.includes(keyword)) {
        return category
      }
    }

    // Default to HR for employee-related templates
    if (lowerTemplateId.includes('employee') || lowerTemplateId.includes('onboarding')) {
      return 'hr'
    }

    return 'general'
  }

  /**
   * Convert task data to StepInstance format for Service Desk display
   * Maps custom-flow-engine task structure to Services+ StepInstance
   */
  private convertTaskToStepInstance(taskData: any, flowDetail?: any): StepInstance {
    // Map custom-flow-engine task status to Services+ StepStatus
    const status = this.mapCustomFlowTaskStatus(taskData.status)

    // Determine desk from task assignment or flow context
    const desk = this.determineTaskDesk(taskData, flowDetail?.steps || [])

    // Extract assignment information
    const assignment = taskData.assignment || {}
    const claimedByUserId = assignment.assignmentStatus === 'CLAIMED' ? assignment.assignedTo : undefined
    const assignedToUserId = assignment.assignmentStatus === 'ASSIGNED' ? assignment.assignedTo : undefined

    // Extract requester name from flow detail
    const extractedRequesterName = this.extractRequesterName(flowDetail)
    console.log(`[ConductorAdapterRequester] 🔍 Requester name extraction result: ${extractedRequesterName}`)

    const stepInstance: StepInstance = {
      id: taskData.taskId || taskData.id,
      defId: taskData.type || 'unknown',
      name: taskData.title || taskData.taskDefName || 'Untitled Task',
      desk: desk,
      status: status,
      assignedToUserId: assignedToUserId,
      claimedByUserId: claimedByUserId,
      startedAt: taskData.scheduledAt,
      updatedAt: taskData.updatedAt || taskData.scheduledAt, // ✅ ADD UPDATED TIMESTAMP
      finishedAt: taskData.completed ? new Date().toISOString() : undefined,
      comments: [],
      requestId: taskData.flowId, // Use flowId as requestId
      requesterId: flowDetail?.initiatedBy || this.currentUserId, // Get from flow context
      requesterName: extractedRequesterName,
      flowInitiatedBy: flowDetail?.flowInitiatedById || flowDetail?.initiatedBy, // Flow initiator UUID from API (flowInitiatedById is the UUID, flowInitiatedBy is the display name)
      message: taskData.message, // ✅ PRESERVE message from task data
      availableActions: taskData.availableActions || this.getDefaultAvailableActions(taskData),
      dueDate: taskData.dueDate,
      // ✅ PRESERVE flowName from task data (for proper display in ticket tables)
      flowName:
        taskData.flowName ||
        taskData.workflowName ||
        taskData.templateName ||
        flowDetail?.flowName ||
        flowDetail?.name ||
        flowDetail?.workflowName ||
        flowDetail?.templateName,
      // ✅ PRESERVE urgency_level from task data
      ...(taskData.urgency_level && { urgency_level: taskData.urgency_level }),
      // ✅ PRESERVE assignment object from task data
      ...(taskData.assignment && { assignment: taskData.assignment }),
      // ✅ PRESERVE formData from task data (submitted form data for completed tasks)
      ...(taskData.formData && { formData: taskData.formData })
    } as StepInstance & { urgency_level?: string; assignment?: any }

    return stepInstance
  }

  /**
   * Return original custom-flow-engine task status without mapping
   */
  private mapCustomFlowTaskStatus(taskStatus: string): StepStatus {
    // Return original status as-is, defaulting to 'SCHEDULED' if unknown
    const validStatuses: StepStatus[] = [
      'SCHEDULED',
      'OPEN',
      'IN_PROGRESS',
      'COMPLETED',
      'REJECTED',
      'FAILED',
      'PAUSED'
    ]
    const upperStatus = taskStatus?.toUpperCase() as StepStatus

    return validStatuses.includes(upperStatus) ? upperStatus : 'SCHEDULED'
  }

  /**
   * Get default available actions based on task state
   */
  private getDefaultAvailableActions(taskData: any): AvailableActions {
    const assignment = taskData.assignment || {}
    const status = taskData.status
    const isClaimable = assignment.assignmentStatus === 'CLAIMABLE'
    const isClaimed = assignment.assignmentStatus === 'CLAIMED' && assignment.assignedTo === this.currentUserId
    const isAssigned = assignment.assignmentStatus === 'ASSIGNED' && assignment.assignedTo === this.currentUserId

    return {
      canClaim: isClaimable && status === 'OPEN',
      canUnclaim: isClaimed,
      canComplete: (isClaimed || isAssigned) && status === 'IN_PROGRESS',
      canReassign: isAssigned || isClaimed,
      canReject: (isClaimed || isAssigned) && status === 'IN_PROGRESS',
      canComment: true
    }
  }

  /**
   * Extract requester name from flow detail data
   * Tries multiple possible fields where user name might be stored
   */
  private extractRequesterName(flowDetail: any): string | undefined {
    if (!flowDetail) {
      console.log(`[ConductorAdapterRequester] ❌ No flowDetail provided for name extraction`)
      return undefined
    }

    console.log(`[ConductorAdapterRequester] 🔍 DEBUG: Attempting to extract requester name from flow:`, {
      flowId: flowDetail.flowId || flowDetail.id,
      initiatedBy: flowDetail.initiatedBy,
      availableKeys: Object.keys(flowDetail),
      hasContext: !!flowDetail.context,
      hasInput: !!flowDetail.input,
      hasInputValues: !!flowDetail.input?.inputValues,
      hasFormData: !!flowDetail.formData
    })

    // Check various possible locations for user name
    const possibleNames = [
      flowDetail.context?.requesterName, // ✨ NEW: From context data we now send
      flowDetail.initiatorName, // Direct initiator name field
      flowDetail.initiatedByName, // Alternative name field
      flowDetail.requestedBy?.name, // Nested user object
      flowDetail.createdBy?.name, // Created by user object
      flowDetail.input?.requesterName, // From input data
      flowDetail.input?.inputValues?.requesterName, // From nested input data
      flowDetail.formData?.requesterName, // From form data
      flowDetail.metadata?.initiatorName // From metadata
    ]

    // Debug: Log what we're checking
    console.log(`[ConductorAdapterRequester] 🔍 Checking possible name fields:`, {
      contextRequesterName: flowDetail.context?.requesterName, // ⭐ This should now have the name!
      initiatorName: flowDetail.initiatorName,
      initiatedByName: flowDetail.initiatedByName,
      inputRequesterName: flowDetail.input?.requesterName,
      inputValuesRequesterName: flowDetail.input?.inputValues?.requesterName,
      formDataRequesterName: flowDetail.formData?.requesterName
    })

    // Return the first non-empty name found
    for (const name of possibleNames) {
      if (name && typeof name === 'string' && name.trim().length > 0) {
        console.log(`[ConductorAdapterRequester] ✅ Found requester name: ${name}`)
        return name.trim()
      }
    }

    // If no name found, try to extract from initiator ID if it looks like an email
    const initiatorId = flowDetail.initiatedBy
    if (initiatorId && typeof initiatorId === 'string') {
      console.log(`[ConductorAdapterRequester] 🔍 Checking initiator ID: ${initiatorId}`)

      // If it's an email, use the part before @
      if (initiatorId.includes('@')) {
        const emailName = initiatorId.split('@')[0]
        console.log(`[ConductorAdapterRequester] 📧 Extracted name from email: ${emailName}`)
        return emailName
      }

      // If it's a readable string (not a UUID), use it as is
      if (!this.isUUID(initiatorId)) {
        console.log(`[ConductorAdapterRequester] 📝 Using non-UUID initiator as name: ${initiatorId}`)
        return initiatorId
      }
    }

    console.log(
      `[ConductorAdapterRequester] ⚠️ Could not extract requester name from flow, available keys:`,
      Object.keys(flowDetail)
    )

    // Fallback: If the flow was initiated by the current user, use their display name
    if (flowDetail.initiatedBy === this.currentUserId) {
      const currentUserDisplayName = this.getRequesterDisplayName()
      console.log(
        `[ConductorAdapterRequester] 💡 Using current user display name as fallback: ${currentUserDisplayName}`
      )
      return currentUserDisplayName
    }

    return undefined
  }

  /**
   * Check if a string is a UUID format
   */
  private isUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(str)
  }

  /**
   * Map capabilities back to service desk
   */
  private mapCapabilitiesToDesk(capabilities: string[]): StepReceiver {
    if (!capabilities || capabilities.length === 0) return 'Admin'

    const capabilityMapping: Record<string, StepReceiver> = {
      HR_SPECIALIST: 'HR',
      HR_MANAGER: 'HR',
      HR_COORDINATOR: 'HR',
      IT_SPECIALIST: 'IT',
      IT_INFRASTRUCTURE: 'IT',
      IT_SUPPORT: 'IT',
      IT_SECURITY: 'Security',
      ACCESS_ADMIN: 'AccessIdentity',
      FACILITIES_MANAGEMENT: 'Facilities',
      WORKPLACE_ADMIN: 'Workplace',
      FINANCE_SPECIALIST: 'Finance',
      FINANCE_MANAGER: 'Finance',
      PROCUREMENT_SPECIALIST: 'Procurement',
      PROCUREMENT_MANAGER: 'Procurement',
      LEGAL_COUNSEL: 'Legal',
      LEGAL_SPECIALIST: 'Legal',
      LEARNING_DEVELOPMENT: 'L&D',
      TRAINING_COORDINATOR: 'L&D',
      FLEET_MANAGER: 'Fleet',
      FLEET_COORDINATOR: 'Fleet',
      DATA_ANALYST: 'Data',
      DATA_ENGINEER: 'Data',
      ADMIN_SUPPORT: 'Admin',
      OFFICE_MANAGER: 'Admin'
    }

    // Find first matching capability
    for (const capability of capabilities) {
      if (capabilityMapping[capability]) {
        return capabilityMapping[capability]
      }
    }

    return 'Admin' // Default fallback
  }

  /**
   * Map flow status to service request status
   * Case-insensitive to handle API variations
   */
  private mapFlowStatusToRequestStatus(flowStatus: string): 'open' | 'in_progress' | 'completed' | 'canceled' {
    // Normalize status to uppercase for consistent mapping
    const normalizedStatus = flowStatus?.toUpperCase() || 'UNKNOWN'

    const statusMapping: Record<string, 'open' | 'in_progress' | 'completed' | 'canceled'> = {
      RUNNING: 'in_progress',
      COMPLETED: 'completed',
      DONE: 'completed', // Alternative completed status
      SUCCESS: 'completed', // Alternative completed status
      FAILED: 'canceled',
      PAUSED: 'in_progress',
      TERMINATED: 'canceled',
      CANCELLED: 'canceled', // Alternative spelling
      CANCELED: 'canceled'
    }

    const mappedStatus = statusMapping[normalizedStatus] || 'open'

    // Log status mapping for debugging
    console.log(`[ConductorAdapter] Status mapping:`, {
      originalStatus: flowStatus,
      normalizedStatus,
      mappedStatus,
      foundInMapping: normalizedStatus in statusMapping
    })

    return mappedStatus
  }

  // =================================================================================
  // ENHANCED METHODS - Aligned with custom-flow-engine v2 APIs
  // =================================================================================

  /**
   * Get comprehensive request with history
   */
  async getRequestWithHistory(requestId: string): Promise<RequestWithHistory> {
    try {
      console.log(`[ConductorAdapter] Getting request with history: ${requestId}`)

      const [basicRequest, history] = await Promise.all([
        this.getRequest(requestId),
        this.makeRequest(`/flows/${requestId}/history`)
      ])

      return {
        ...basicRequest,
        comprehensiveHistory: history.events || []
      }
    } catch (error) {
      console.error('[ConductorAdapter] Error getting request with history:', error)
      throw new Error(`Failed to get request with history: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get user tasks with enhanced filtering
   */
  async getUserTasks(
    userId: string,
    filters?: {
      includeAssigned?: boolean
      includeClaimable?: boolean
      status?: string
      limit?: number
    }
  ): Promise<StepInstance[]> {
    try {
      console.log(`[ConductorAdapter] Getting user tasks for: ${userId}`, filters)

      const params = new URLSearchParams()
      if (filters?.includeAssigned !== undefined) params.set('includeAssigned', filters.includeAssigned.toString())
      if (filters?.includeClaimable !== undefined) params.set('includeClaimable', filters.includeClaimable.toString())
      if (filters?.status) params.set('status', filters.status)
      if (filters?.limit) params.set('limit', filters.limit.toString())

      const result = await this.makeRequest(`/tasks/user/${userId}?${params.toString()}`)

      const tasks = result.tasks || []
      return tasks.map((task: any) => this.convertTaskToStepInstance(task))
    } catch (error) {
      console.error('[ConductorAdapter] Error getting user tasks:', error)
      throw new Error(`Failed to get user tasks: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get task statistics for a user
   */
  async getTaskStatistics(userId: string): Promise<TaskStatistics> {
    try {
      console.log(`[ConductorAdapter] Getting task statistics for: ${userId}`)

      const result = await this.makeRequest(`/tasks/user/${userId}/stats`)

      return {
        assigned: result.statistics?.assigned || 0,
        claimable: result.statistics?.claimable || 0,
        completed: result.statistics?.completed || 0,
        rejected: result.statistics?.rejected || 0,
        totalActive: result.statistics?.totalActive || 0
      }
    } catch (error) {
      console.error('[ConductorAdapter] Error getting task statistics:', error)
      throw new Error(`Failed to get task statistics: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get completed tickets for a user
   * Filters by Services app tag to show only service desk tickets
   */
  async getCompletedTickets(options?: {
    limit?: number
    offset?: number
  }): Promise<{ tickets: StepInstance[]; totalCount: number; hasMore: boolean }> {
    try {
      console.log(`[ConductorAdapter] Getting completed tickets for user: ${this.currentUserId}`, options)

      const params = new URLSearchParams()
      if (options?.limit) params.set('limit', options.limit.toString())
      if (options?.offset) params.set('offset', options.offset.toString())
      // Filter by Services app tag at the database level for better performance
      params.set('tags.app', SERVICES_APP_TAG)

      const result = await this.makeRequest(`/tasks/user/${this.currentUserId}/completed?${params.toString()}`)

      const tasks = result.tasks || []
      const totalCount = result.totalCount || tasks.length
      const hasMore = result.hasMore || false

      console.log(
        `[ConductorAdapter] Retrieved ${tasks.length} completed tickets (${totalCount} total, hasMore: ${hasMore})`
      )

      // Convert tasks to step instances, potentially fetching flow details if needed
      const tickets = await Promise.all(
        tasks.map(async (task: any) => {
          // Try to get flow details if we have a flowId and no flowName
          let flowDetail = null
          if (task.flowId && !task.flowName && !task.workflowName && !task.templateName) {
            try {
              const flowResult = await this.makeRequest(`/flows/${task.flowId}`)
              flowDetail = flowResult
            } catch (error) {
              console.warn(`[ConductorAdapter] Could not fetch flow details for ${task.flowId}:`, error)
            }
          }

          return this.convertTaskToStepInstance(task, flowDetail)
        })
      )

      return {
        tickets,
        totalCount,
        hasMore
      }
    } catch (error) {
      console.error('[ConductorAdapter] Error getting completed tickets:', error)
      throw new Error(`Failed to get completed tickets: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Claim method - matches custom-flow-engine API contract
   * NOTE: custom-flow-engine recreates tasks on claim, so task ID may change
   */
  async claim(stepId: string, userId: string): Promise<void> {
    try {
      console.log(`[ConductorAdapter] Claiming step: ${stepId} by user: ${userId}`)
      console.warn(`[ConductorAdapter] ⚠️ WARNING: Task ID may change after claim due to workflow recreation`)

      await this.makeRequest(`/tasks/${stepId}/claim`, {
        method: 'POST',
        body: JSON.stringify({
          userId
        })
      })

      console.log(`[ConductorAdapter] ✅ Step ${stepId} claimed - note that task may have new ID now`)
    } catch (error) {
      console.error('[ConductorAdapter] Error claiming step:', error)
      throw new Error(`Failed to claim step: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Unclaim a task
   */
  async unclaim(stepId: string, userId: string, comment?: string): Promise<void> {
    try {
      console.log(`[ConductorAdapter] Unclaiming step: ${stepId} by user: ${userId}`)

      await this.makeRequest(`/tasks/${stepId}/unclaim`, {
        method: 'POST',
        body: JSON.stringify({
          userId,
          comment
        })
      })
    } catch (error) {
      console.error('[ConductorAdapter] Error unclaiming step:', error)
      throw new Error(`Failed to unclaim step: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Enhanced assign method with comment support (for already claimed/assigned tasks)
   * This is an alias for reassign
   */
  async assign(stepId: string, userId: string, assignToUserId: string, comment?: string): Promise<void> {
    try {
      console.log(`[ConductorAdapter] Assigning step: ${stepId} from ${userId} to ${assignToUserId}`)

      await this.makeRequest(`/tasks/${stepId}/reassign`, {
        method: 'POST',
        body: JSON.stringify({
          currentUserId: userId,
          newUserId: assignToUserId,
          comment
        })
      })
    } catch (error) {
      console.error('[ConductorAdapter] Error assigning step:', error)
      throw new Error(`Failed to assign step: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Assign an unclaimed task directly to a user (workaround: claim + reassign)
   *
   * WORKAROUND: Backend doesn't support direct assignment of unclaimed tasks yet.
   * Current implementation: claim task first, then reassign to target user
   *
   * FUTURE: When backend implements /tasks/:taskId/assign endpoint, update this to:
   *   - Call POST /tasks/:taskId/assign with { userId: assignToUserId, comment }
   *   - Remove the claim + reassign workaround
   */
  async assignToUser(stepId: string, currentUserId: string, assignToUserId: string, comment?: string): Promise<void> {
    try {
      console.log(
        `[ConductorAdapter] Assigning unclaimed task: ${stepId} to ${assignToUserId} (workaround: claim + reassign)`
      )

      // WORKAROUND STEP 1: Claim the task as current user
      await this.claim(stepId, currentUserId)
      console.log(`[ConductorAdapter] ✓ Step 1: Claimed task ${stepId} as ${currentUserId}`)

      // WORKAROUND STEP 2: Reassign to target user
      await this.reassign(stepId, currentUserId, assignToUserId, comment)
      console.log(`[ConductorAdapter] ✓ Step 2: Reassigned task ${stepId} to ${assignToUserId}`)

      console.log(`[ConductorAdapter] ✓ Assignment completed: ${stepId} → ${assignToUserId}`)
    } catch (error) {
      console.error('[ConductorAdapter] Error assigning unclaimed task:', error)
      throw new Error(`Failed to assign task to user: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Unassign a task
   */
  async unassign(stepId: string, userId: string, comment?: string): Promise<void> {
    try {
      console.log(`[ConductorAdapter] Unassigning step: ${stepId} by user: ${userId}`)

      await this.makeRequest(`/tasks/${stepId}/unassign`, {
        method: 'POST',
        body: JSON.stringify({
          userId,
          comment
        })
      })
    } catch (error) {
      console.error('[ConductorAdapter] Error unassigning step:', error)
      throw new Error(`Failed to unassign step: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Reassign a task
   */
  async reassign(stepId: string, currentUserId: string, newUserId: string, comment?: string): Promise<void> {
    try {
      console.log(`[ConductorAdapter] Reassigning step: ${stepId} from ${currentUserId} to ${newUserId}`)

      await this.makeRequest(`/tasks/${stepId}/reassign`, {
        method: 'POST',
        body: JSON.stringify({
          currentUserId,
          newUserId,
          comment
        })
      })
    } catch (error) {
      console.error('[ConductorAdapter] Error reassigning step:', error)
      throw new Error(`Failed to reassign step: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Enhanced advance method with comment support
   */
  async advance(
    stepId: string,
    userId: string,
    payload?: any,
    comment?: string,
    commentVisibility?: string
  ): Promise<void> {
    try {
      console.log(`[ConductorAdapter] Advancing step: ${stepId} by user: ${userId}`)

      const requestBody = {
        userId,
        formData: payload || {},
        ...(comment && {
          comment,
          commentVisibility: commentVisibility || 'INTERNAL_TASK'
        })
      }

      await this.makeRequest(`/tasks/${stepId}/complete`, {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })
    } catch (error) {
      console.error('[ConductorAdapter] Error advancing step:', error)
      throw new Error(`Failed to advance step: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Reject a task
   */
  async reject(stepId: string, userId: string, reason: string): Promise<void> {
    try {
      console.log(`[ConductorAdapter] Rejecting step: ${stepId} by user: ${userId}`)

      await this.makeRequest(`/tasks/${stepId}/reject`, {
        method: 'POST',
        body: JSON.stringify({
          userId,
          comment: reason
        })
      })
    } catch (error) {
      console.error('[ConductorAdapter] Error rejecting step:', error)
      throw new Error(`Failed to reject step: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Complete a task with form data (dynamic form completion)
   * This method is specifically for completing tasks that have associated forms
   */
  async completeTask(taskId: string, formData: any, comment?: string, commentVisibility?: string): Promise<void> {
    try {
      console.log(`[ConductorAdapter] Completing task: ${taskId} with form data:`, formData)

      const requestBody = {
        userId: this.currentUserId,
        formData: formData,
        ...(comment && {
          comment,
          commentVisibility: commentVisibility || 'INTERNAL_FLOW'
        })
      }

      console.log(`[ConductorAdapter] Request body for task completion:`, requestBody)

      await this.makeRequest(`/tasks/${taskId}/complete`, {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      console.log(`[ConductorAdapter] ✅ Task ${taskId} completed successfully with form data`)
    } catch (error) {
      console.error('[ConductorAdapter] Error completing task:', error)
      throw new Error(`Failed to complete task: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Execute template with two-step process:
   * 1. Execute template to start workflow (without inputValues)
   * 2. Complete first task with form data
   */
  async executeTemplate(templateId: string, formData: any): Promise<string> {
    try {
      console.log(`[ConductorAdapter] 🚀 Starting two-step template execution: ${templateId}`)

      // Step 1: Execute template to start workflow (pass formData for runtime assignments, but inputValues already removed from startRequest)
      const flowId = await this.startRequest(templateId, formData) // Pass formData for runtime assignments

      console.log(`[ConductorAdapter] ✅ Step 1 complete - Workflow started with ID: ${flowId}`)

      // Step 2: Get step_0 task ID and complete it with form data
      console.log(`[ConductorAdapter] 🔍 Step 2 - Getting step_0 task ID for workflow: ${flowId}`)

      try {
        // Use the endpoint you provided to get the actual task ID
        const stepResponse = await this.makeRequest(`/flows/${flowId}/steps/step_0/data`, {
          method: 'GET'
        })

        console.log(`[ConductorAdapter] 🔍 Step data response:`, stepResponse)

        if (stepResponse.data && stepResponse.data.length > 0) {
          const firstStepData = stepResponse.data[0]
          const taskId = firstStepData.taskId

          console.log(`[ConductorAdapter] ✅ Found step_0 task: ${taskId}`)

          // Directly complete the task with form data (no claiming needed)
          await this.completeTask(taskId, formData, 'Initial form submission from Service Portal')
          console.log(`[ConductorAdapter] ✅ Step 2 complete - First task completed with form data`)
        } else {
          console.log(`[ConductorAdapter] ⚠️ No task data found for step_0 in workflow ${flowId}`)
        }
      } catch (stepError) {
        console.error(`[ConductorAdapter] ❌ Error getting step_0 task data:`, stepError)
        console.log(
          `[ConductorAdapter] ⚠️ Continuing without form data submission - workflow started but form data not submitted`
        )
      }

      return flowId
    } catch (error) {
      console.error('[ConductorAdapter] ❌ Error in executeTemplate:', error)
      throw new Error(`Failed to execute template: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Enhanced comment method with userId parameter and visibility support
   * NOTE: custom-flow-engine recreates tasks on comment, so task ID may change
   */
  async comment(stepId: string, userId: string, body: string, visibility?: string): Promise<Comment> {
    try {
      console.log(
        `[ConductorAdapter] Adding comment to step: ${stepId} by user: ${userId} with visibility: ${visibility || 'default'}`
      )
      console.warn(
        `[ConductorAdapter] ⚠️ WARNING: Task ID may change after comment due to workflow recreation (same as CLAIM issue)`
      )

      const result = await this.makeRequest(`/tasks/${stepId}/comment`, {
        method: 'POST',
        body: JSON.stringify({
          userId,
          comment: body,
          commentVisibility: visibility || 'EXTERNAL' // Default to EXTERNAL if not specified
        })
      })

      console.log(
        `[ConductorAdapter] ✅ Comment added to step ${stepId} with visibility ${visibility || 'EXTERNAL'} - note that task may have new ID now`
      )

      return {
        id: result.taskId || Date.now().toString(),
        stepId,
        authorId: userId,
        createdAt: new Date().toISOString(),
        body,
        visibility: visibility || 'EXTERNAL',
        action: 'COMMENT'
      }
    } catch (error) {
      console.error('[ConductorAdapter] Error adding comment:', error)
      throw new Error(`Failed to add comment: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get task comments
   */
  async getTaskComments(stepId: string): Promise<Comment[]> {
    try {
      console.log(`[ConductorAdapter] Getting comments for step: ${stepId}`)

      const task = await this.makeRequest(`/tasks/${stepId}?userId=${this.currentUserId}`)

      // Extract comments from task data - assuming comments are in task response
      return task.comments || []
    } catch (error) {
      console.error('[ConductorAdapter] Error getting task comments:', error)
      throw new Error(`Failed to get task comments: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get flow comments
   */
  async getFlowComments(flowId: string): Promise<FlowComment[]> {
    try {
      console.log(`[ConductorAdapter] Getting flow comments for: ${flowId}`)

      const result = await this.makeRequest(`/flows/${flowId}/comments`)

      return result.comments || []
    } catch (error) {
      console.error('[ConductorAdapter] Error getting flow comments:', error)
      throw new Error(`Failed to get flow comments: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Post a comment to a flow (flow-level comment)
   */
  async postFlowComment(flowId: string, userId: string, comment: string, visibility?: string): Promise<Comment> {
    try {
      console.log(`[ConductorAdapter] Adding flow comment to: ${flowId} by user: ${userId}`)

      const result = await this.makeRequest(`/flows/${flowId}/comment`, {
        method: 'POST',
        body: JSON.stringify({
          comment,
          userId
        })
      })

      console.log(`[ConductorAdapter] ✅ Flow comment added to ${flowId} with visibility ${visibility || 'EXTERNAL'}`)

      return {
        id: result.commentId || Date.now().toString(),
        stepId: flowId, // Use flowId as stepId for flow-level comments
        authorId: userId,
        createdAt: new Date().toISOString(),
        body: comment,
        visibility: visibility || 'EXTERNAL',
        action: 'COMMENT'
      }
    } catch (error) {
      console.error('[ConductorAdapter] Error adding flow comment:', error)
      throw new Error(`Failed to add flow comment: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get a specific task with enhanced details
   */
  async getTask(stepId: string, userId?: string): Promise<StepInstance> {
    try {
      console.log(`[ConductorAdapter] Getting task: ${stepId} for user: ${userId || 'anonymous'}`)

      const params = userId ? `?userId=${userId}` : ''
      const result = await this.makeRequest(`/tasks/${stepId}${params}`)

      return this.convertTaskToStepInstance(result)
    } catch (error) {
      console.error('[ConductorAdapter] Error getting task:', error)
      throw new Error(`Failed to get task: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get available actions for a task
   */
  async getAvailableActions(stepId: string, userId: string): Promise<AvailableActions> {
    try {
      console.log(`[ConductorAdapter] Getting available actions for step: ${stepId} and user: ${userId}`)

      const result = await this.makeRequest(`/tasks/${stepId}/actions?userId=${userId}`)

      const actions = result.availableActions || []

      return {
        canClaim: actions.includes('CLAIM'),
        canUnclaim: actions.includes('UNCLAIM'),
        canComplete: actions.includes('COMPLETE'),
        canReassign: actions.includes('REASSIGN'),
        canReject: actions.includes('REJECT'),
        canComment: true // Comments are generally always available
      }
    } catch (error) {
      console.error('[ConductorAdapter] Error getting available actions:', error)
      throw new Error(`Failed to get available actions: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Sync tasks (optional maintenance operation)
   */
  async syncTasks(): Promise<{ tasksSynced: number; message: string }> {
    try {
      console.log(`[ConductorAdapter] Triggering task synchronization`)

      const result = await this.makeRequest('/tasks/sync', {
        method: 'POST'
      })

      return {
        tasksSynced: result.tasksSynced || 0,
        message: result.message || 'Synchronization completed'
      }
    } catch (error) {
      console.error('[ConductorAdapter] Error syncing tasks:', error)
      throw new Error(`Failed to sync tasks: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get count of user's requests without fetching full details
   * Optimized for performance - only makes one API call
   * Filters by Services app tag to count only service portal requests
   */
  async getMyRequestsCount(userId?: string): Promise<number> {
    const targetUserId = userId || this.currentUserId
    try {
      console.log(`[ConductorAdapter] Getting requests count for user: ${targetUserId}`)

      // Only get the list of flows filtered by Services app tag - no need to fetch individual details
      const listResponse = await this.makeRequest(
        `/flows/user/${targetUserId}/initiated?limit=100&offset=0&tag.app=${SERVICES_APP_TAG}`
      )

      const flows = listResponse.data?.flows || listResponse.flows || []
      const count = flows.length

      console.log(
        `[ConductorAdapter] Found ${count} flows for user ${targetUserId} (count only, filtered by Services app tag)`
      )
      return count
    } catch (error) {
      console.error('[ConductorAdapter] Error getting user requests count:', error)
      throw new Error(`Failed to get user requests count: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Enhanced getMyRequests with optional userId parameter
   * Filters by Services app tag to show only service portal requests
   */
  async getMyRequests(userId?: string): Promise<SubmittedRequest[]> {
    const targetUserId = userId || this.currentUserId
    try {
      console.log(`[ConductorAdapter] Getting requests for user: ${targetUserId}`)

      // Step 1: Get list of flows initiated by the user, filtered by Services app tag
      const listResponse = await this.makeRequest(
        `/flows/user/${targetUserId}/initiated?limit=50&offset=0&tag.app=${SERVICES_APP_TAG}`
      )

      const flows = listResponse.data?.flows || listResponse.flows || []
      console.log(`[ConductorAdapter] Found ${flows.length} flows for user ${targetUserId}`)

      // Step 2: Get detailed information for each flow in parallel
      const detailPromises = flows.map(async (flow: any) => {
        try {
          const flowId = flow.flowId || flow.id
          console.log(`[ConductorAdapter] Getting details for flow: ${flowId}`)

          const detailResponse = await this.makeRequest(`/flows/${flowId}`)
          const transformed = this.convertFlowToSubmittedRequest(detailResponse)
          console.log(`[ConductorAdapter] ✅ Successfully processed flow ${flowId}`)
          return transformed
        } catch (error) {
          console.warn(`[ConductorAdapter] ❌ Failed to get details for flow ${flow.flowId || flow.id}:`, error)
          return null
        }
      })

      const detailedFlows = await Promise.all(detailPromises)
      const validFlows = detailedFlows.filter(flow => flow !== null)

      console.log(`[ConductorAdapter] Successfully retrieved ${validFlows.length} detailed flows`)
      return validFlows
    } catch (error) {
      console.error('[ConductorAdapter] Error getting user requests:', error)
      throw new Error(`Failed to get user requests: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get real active tickets for a specific desk from custom-flow-engine
   * Uses the SAME API as what actually works for claiming
   * Filters by Services app tag to show only service desk tickets
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getDeskTickets(desk: StepReceiver, _userId?: string): Promise<StepInstance[]> {
    try {
      // Use the actual custom-flow-engine API with tag filtering for Services app
      // This filters at the database level for better performance
      const response = await fetch(
        `${this.flowEngineBaseUrl}/tasks/user/${this.currentUserId}?tags.app=${SERVICES_APP_TAG}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.accessToken}`
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to get user tasks: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      const tasks = result.tasks || []

      // Skip orphan validation - show all tasks
      const validTasks = tasks

      // DESK FILTERING: Filter tasks by desk before converting
      const deskSpecificTasks = []
      for (const task of validTasks) {
        const actualTaskDesk = await this.determineTaskDesk(task, [])

        if (actualTaskDesk === desk) {
          deskSpecificTasks.push(task)
        }
      }

      // Convert only desk-specific tasks to StepInstance format
      const stepInstances = []
      for (const task of deskSpecificTasks) {
        const taskDesk = await this.determineTaskDesk(task, [])
        stepInstances.push(this.convertCustomFlowEngineTaskToStepInstance(task, taskDesk))
      }

      return stepInstances
    } catch (error) {
      console.error(`[ConductorAdapter] Error getting real desk tickets:`, error)
      throw new Error(`Failed to get desk tickets: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Convert custom-flow-engine task to StepInstance format
   */
  private convertCustomFlowEngineTaskToStepInstance(task: any, desk: StepReceiver): StepInstance {
    const taskId = task.id

    // Determine assignedToUserId and claimedByUserId based on assignmentStatus
    const assignmentStatus = task.assignment?.assignmentStatus
    const assignedToUser = task.assignment?.assignedTo

    let assignedToUserId: string | undefined
    let claimedByUserId: string | undefined

    if (assignedToUser) {
      if (assignmentStatus === 'ASSIGNED') {
        assignedToUserId = assignedToUser
        claimedByUserId = undefined
      } else if (assignmentStatus === 'CLAIMED') {
        assignedToUserId = undefined
        claimedByUserId = assignedToUser
      } else {
        // For other statuses (CLAIMABLE, UNASSIGNED), both should be undefined
        assignedToUserId = undefined
        claimedByUserId = undefined
      }
    }

    return {
      id: taskId,
      defId: task.stepId || taskId, // Add defId field
      name: task.title || 'Unnamed Task',
      status: this.mapCustomFlowEngineStatusToStepStatus(task.status),
      desk: desk,
      requestId: task.flowId || 'unknown', // Use flowId as requestId
      requesterId: task.requesterId || 'unknown', // Use requesterId from API response
      flowInitiatedBy: task.flowInitiatedById || task.flowInitiatedBy, // Flow initiator UUID from API (flowInitiatedById is the UUID, flowInitiatedBy is for backwards compatibility)
      requesterName: undefined,
      startedAt: task.scheduledAt || new Date().toISOString(),
      updatedAt: task.updatedAt,
      dueDate: task.dueDate, // Fix field name from dueAt to dueDate
      comments: task.comments || [], // Add comments field
      assignedToUserId,
      claimedByUserId,
      allowReassignment: task.assignment?.allowReassignment || false,

      // ✅ PRESERVE flowName from custom-flow-engine response
      flowName: task.flowName,

      // ✅ PRESERVE message from custom-flow-engine response
      message: task.message,

      // ✅ PRESERVE availableActions from custom-flow-engine response
      availableActions: task.availableActions
        ? {
            canClaim: task.availableActions.canClaim || false,
            canUnclaim: task.availableActions.canUnclaim || false,
            canComplete: task.availableActions.canComplete || false,
            canReassign: task.availableActions.canReassign || false,
            canReject: task.availableActions.canReject || false,
            canComment: task.availableActions.canComment !== false // Default to true
          }
        : undefined,

      // ✅ PRESERVE form, inputs, links, assignment, urgency_level, and formData from custom-flow-engine response
      ...(task.form && { form: task.form }),
      ...(task.inputs && { inputs: task.inputs }),
      ...(task.links && { links: task.links }),
      ...(task.assignment && { assignment: task.assignment }),
      ...(task.urgency_level && { urgency_level: task.urgency_level }),
      ...(task.formData && { formData: task.formData })
    } as StepInstance & {
      form?: any[]
      inputs?: any[]
      links?: any[]
      assignment?: any
      urgency_level?: string
      formData?: Record<string, any>
    }
  }

  /**
   * Return original custom-flow-engine task status without mapping
   */
  private mapCustomFlowEngineStatusToStepStatus(status: string): StepStatus {
    // Return original status as-is, defaulting to 'SCHEDULED' if unknown
    const validStatuses: StepStatus[] = [
      'SCHEDULED',
      'OPEN',
      'IN_PROGRESS',
      'COMPLETED',
      'REJECTED',
      'FAILED',
      'PAUSED'
    ]
    const upperStatus = status?.toUpperCase() as StepStatus

    return validStatuses.includes(upperStatus) ? upperStatus : 'SCHEDULED'
  }

  /**
   * Determine which desk a task belongs to based on its assignment information
   */
  private async determineTaskDesk(task: any, flowSteps: any[]): Promise<StepReceiver> {
    try {
      // First, try to get assignment from the task itself
      if (task.assignment?.targets) {
        return await this.mapAssignmentTargetsToDesk(task.assignment.targets)
      }

      // If no direct assignment, try to find the corresponding step in the flow
      if (task.taskDefName && flowSteps.length > 0) {
        const matchingStep = flowSteps.find(
          step =>
            step.title === task.taskDefName ||
            step.title?.includes(task.taskDefName) ||
            task.taskDefName?.includes(step.title)
        )

        if (matchingStep?.assignment?.targets) {
          return await this.mapAssignmentTargetsToDesk(matchingStep.assignment.targets)
        }
      }

      // Fallback: analyze task name for desk hints
      return this.inferDeskFromTaskName(task.taskDefName || '')
    } catch (error) {
      console.warn(`[ConductorAdapter] Error determining desk for task:`, error)
      return 'HR' // Safe fallback
    }
  }

  /**
   * Map assignment targets to service desk using Service Desk Catalog data
   */
  private async mapAssignmentTargetsToDesk(targets: any): Promise<StepReceiver> {
    // Ensure catalog is loaded before processing
    if (this.serviceDeskCatalogEntries.length === 0) {
      await this.loadServiceDeskCatalog()
    }

    // Check organizational units with Service Desk Catalog mapping (via additionalValue3)
    if (targets.organizationalUnits?.length > 0) {
      const orgUnit = targets.organizationalUnits[0]
      const deptMatch = this.serviceDeskCatalogEntries.find(entry => entry.additionalValue3 === orgUnit)
      if (deptMatch) {
        return deptMatch.code as StepReceiver
      }
    }

    // Check capabilities with Service Desk Catalog mapping
    if (targets.capabilities?.length > 0) {
      // Try to match capability UUIDs with catalog entries using the "objectValue" field
      for (const entry of this.serviceDeskCatalogEntries) {
        if (!entry.objectValue) {
          continue
        }

        try {
          // Get capabilities array from objectValue (these are capability UUIDs)
          const catalogCapabilities = entry.objectValue.capabilities || []

          if (!Array.isArray(catalogCapabilities) || catalogCapabilities.length === 0) {
            continue
          }

          // Check if any task capability UUID matches catalog capability UUIDs
          const hasMatch = targets.capabilities.some((taskCapabilityUuid: string) =>
            catalogCapabilities.some(
              (catalogCapabilityUuid: string) =>
                catalogCapabilityUuid.toLowerCase() === taskCapabilityUuid.toLowerCase()
            )
          )

          if (hasMatch) {
            return entry.code as StepReceiver
          }
        } catch {
          continue
        }
      }

      // No capability UUID match found, go to "Under desk"
      return 'Under desk' as StepReceiver
    }

    // Default fallback - send to "Under desk" for manual categorization
    return 'Under desk' as StepReceiver
  }

  /**
   * Infer desk from task/step name when no explicit assignment is available
   */
  private inferDeskFromTaskName(taskName: string): StepReceiver {
    const name = taskName.toLowerCase()

    // Try to match with catalog entries first
    for (const entry of this.serviceDeskCatalogEntries) {
      const entryCode = entry.code.toLowerCase()
      const entryValue = entry.value?.toLowerCase() || ''

      if (name.includes(entryCode) || name.includes(entryValue)) {
        console.log(`[ConductorAdapter] ✅ Task name inference: "${taskName}" → ${entry.code}`)
        return entry.code as StepReceiver
      }
    }

    // Legacy task name inference
    if (name.includes('hr') || name.includes('onboarding') || name.includes('training')) return 'HR'
    if (name.includes('it') || name.includes('system') || name.includes('equipment')) return 'IT'
    if (name.includes('finance') || name.includes('budget')) return 'Finance'
    if (name.includes('facilities') || name.includes('office') || name.includes('workspace')) return 'Facilities'
    if (name.includes('marketing') || name.includes('campaign')) return 'HR' // Marketing → HR fallback

    // Default fallback - return first available catalog entry or "Under desk"
    if (this.serviceDeskCatalogEntries.length > 0) {
      const defaultEntry = this.serviceDeskCatalogEntries[0]
      console.log(`[ConductorAdapter] 🔄 Task name fallback to default catalog entry: ${defaultEntry.code}`)
      return defaultEntry.code as StepReceiver
    }

    return 'Under desk' as StepReceiver // Ultimate fallback for uncategorized tasks
  }

  /**
   * ✅ NEW: Get comments for a specific task step (all instances)
   * Uses the new custom-flow-engine endpoint that includes comments from recreated tasks
   */
  async getTaskStepComments(taskId: string): Promise<{ comments: any[]; totalComments: number }> {
    try {
      console.log(`[ConductorAdapter] Getting task step comments for: ${taskId}`)

      // makeRequest already handles response validation and returns parsed JSON
      const result = await this.makeRequest(`/tasks/${taskId}/comments`, {
        method: 'GET'
      })

      console.log(`[ConductorAdapter] ✅ Task step comments fetched:`, {
        taskId,
        commentsCount: result.totalComments,
        comments: result.comments
      })

      return result
    } catch (error) {
      console.error(`[ConductorAdapter] ❌ Error getting task step comments for ${taskId}:`, error)
      throw error
    }
  }

  /**
   * Get step data for a specific flow step
   * Returns task information for a given step reference (e.g., step_0, step_1)
   */
  async getFlowStepData(
    flowId: string,
    stepReference: string
  ): Promise<{
    data: Array<{
      flowId: string
      taskId: string
      userId: string
      userName: string
      timestamp: string
      stepTitle: string
      formData: any
    }>
    totalCount: number
    hasMore: boolean
    stepReference: string
    flowId: string
  }> {
    try {
      console.log(`[ConductorAdapter] 🚀 getFlowStepData called with flowId=${flowId}, stepReference=${stepReference}`)
      console.log(`[ConductorAdapter] 🚀 API Base URL: ${this.flowEngineBaseUrl}`)
      console.log(
        `[ConductorAdapter] 🚀 Full URL will be: ${this.flowEngineBaseUrl}/flows/${flowId}/steps/${stepReference}/data`
      )
      console.log(
        `[ConductorAdapter] 🚀 Access token available: ${!!this.accessToken} (length: ${this.accessToken?.length || 0})`
      )

      const result = await this.makeRequest(`/flows/${flowId}/steps/${stepReference}/data`, {
        method: 'GET'
      })

      console.log(`[ConductorAdapter] ✅ Step data fetched successfully:`, {
        flowId,
        stepReference,
        dataCount: result.data?.length || 0,
        totalCount: result.totalCount,
        fullResult: result
      })

      return result
    } catch (error) {
      console.error(`[ConductorAdapter] ❌ Error getting step data for ${flowId}/${stepReference}:`, error)
      console.error(`[ConductorAdapter] ❌ Error details:`, {
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        flowId,
        stepReference,
        apiUrl: `${this.flowEngineBaseUrl}/flows/${flowId}/steps/${stepReference}/data`
      })
      throw new Error(`Failed to get step data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get templates from custom-flow-engine
   * Implementation of optional WorkflowEngine.getTemplates method
   */
  async getTemplates(options?: {
    limit?: number
    offset?: number
    onlyLatest?: boolean
    includeDrafts?: boolean
    search?: string
  }): Promise<{
    status: string
    count: number
    totalCount: number
    hasMore: boolean
    data: any[]
  }> {
    try {
      console.log('[ConductorAdapter] Getting templates from custom-flow-engine...', options)

      // Build query parameters
      const params = new URLSearchParams()
      if (options?.limit) params.append('limit', options.limit.toString())
      if (options?.offset) params.append('offset', options.offset.toString())
      if (options?.search) params.append('search', options.search)

      const queryString = params.toString()
      const endpoint = `/templates${queryString ? `?${queryString}` : ''}`

      const result = await this.makeRequest(endpoint, {
        method: 'GET'
      })

      console.log('[ConductorAdapter] ✅ Templates fetched successfully:', {
        count: result.count,
        totalCount: result.totalCount,
        hasMore: result.hasMore,
        templatesWithTags: result.data?.filter((t: any) => t.tags)?.length || 0
      })

      return {
        status: result.status || 'success',
        count: result.count || 0,
        totalCount: result.totalCount || 0,
        hasMore: result.hasMore || false,
        data: result.data || []
      }
    } catch (error) {
      console.error('[ConductorAdapter] ❌ Error getting templates:', error)
      throw new Error(`Failed to get templates: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get a single template by ID with all resolved data including catalog options
   */
  async getTemplateById(templateId: string): Promise<any> {
    try {
      const response = await fetch(`${this.flowEngineBaseUrl}/templates/${templateId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      const template = result.template || result.data || result

      return template
    } catch (error) {
      console.error('[ConductorAdapter] ❌ Error getting template by ID:', error)
      throw new Error(`Failed to get template: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // =================================================================================
  // MANAGER ANALYTICS METHODS - Custom Flow Engine Analytics API Integration
  // =================================================================================

  /**
   * Get comprehensive flow analytics for manager dashboard
   * Maps to /api/analytics/flows endpoint
   */
  async getFlowAnalytics(params?: {
    timeframe?: 'last24h' | 'wtd' | 'mtd' | 'qtd' | 'ytd' | 'custom'
    startDate?: string
    endDate?: string
    departmentId?: string
    templateId?: string
    userId?: string
    includeBusinessMetrics?: boolean
    includeOperationalMetrics?: boolean
    correlationEntity?: string
    correlationEntityId?: string
  }): Promise<{
    status: string
    data: {
      businessMetrics: {
        totalFlows: number
        completedFlows: number
        avgCompletionTime: number
        successRate: number
      }
      operationalMetrics: {
        activeFlows: number
        bottlenecks: string[]
      }
    }
    timeRange: {
      start: string
      end: string
    }
  }> {
    try {
      console.log('[ConductorAdapter] Getting flow analytics...', params)

      // Build query parameters
      const queryParams = new URLSearchParams()
      if (params?.timeframe) queryParams.append('timeframe', params.timeframe)
      if (params?.startDate) queryParams.append('startDate', params.startDate)
      if (params?.endDate) queryParams.append('endDate', params.endDate)
      if (params?.departmentId) queryParams.append('departmentId', params.departmentId)
      if (params?.templateId) queryParams.append('templateId', params.templateId)
      if (params?.userId) queryParams.append('userId', params.userId)
      if (params?.includeBusinessMetrics !== undefined)
        queryParams.append('includeBusinessMetrics', params.includeBusinessMetrics.toString())
      if (params?.includeOperationalMetrics !== undefined)
        queryParams.append('includeOperationalMetrics', params.includeOperationalMetrics.toString())
      if (params?.correlationEntity) queryParams.append('correlationEntity', params.correlationEntity)
      if (params?.correlationEntityId) queryParams.append('correlationEntityId', params.correlationEntityId)

      const queryString = queryParams.toString()
      const endpoint = `/analytics/flows${queryString ? `?${queryString}` : ''}`

      const result = await this.makeRequest(endpoint, {
        method: 'GET'
      })

      console.log('[ConductorAdapter] ✅ Flow analytics fetched successfully:', {
        totalFlows: result.data?.businessMetrics?.totalFlows,
        successRate: result.data?.businessMetrics?.successRate,
        activeFlows: result.data?.operationalMetrics?.activeFlows
      })

      return result
    } catch (error) {
      console.error('[ConductorAdapter] ❌ Error getting flow analytics:', error)
      throw new Error(`Failed to get flow analytics: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get detailed task performance analytics including user performance
   * Maps to /api/analytics/task-performance endpoint
   */
  async getTaskPerformanceAnalytics(params?: {
    timeframe?: 'last24h' | 'wtd' | 'mtd' | 'ytd' | 'custom'
    startDate?: string
    endDate?: string
    departmentId?: string
    templateId?: string
    userId?: string
    stepType?: string
    workflowType?: string
  }): Promise<{
    status: string
    data: {
      performanceOverview: {
        totalTasks: number
        avgCompletionTime: number
        efficiencyScore: number
      }
      performanceByStep: Array<{
        stepType: string
        avgDuration: number
        completionRate: number
        bottleneckRisk: 'low' | 'medium' | 'high'
      }>
      userPerformance: Array<{
        userId: string
        tasksCompleted: number
        avgCompletionTime: number
        efficiencyRating: 'excellent' | 'good' | 'average' | 'poor'
      }>
    }
  }> {
    try {
      console.log('[ConductorAdapter] Getting task performance analytics...', params)

      // Build query parameters
      const queryParams = new URLSearchParams()
      if (params?.timeframe) queryParams.append('timeframe', params.timeframe)
      if (params?.startDate) queryParams.append('startDate', params.startDate)
      if (params?.endDate) queryParams.append('endDate', params.endDate)
      if (params?.departmentId) queryParams.append('departmentId', params.departmentId)
      if (params?.templateId) queryParams.append('templateId', params.templateId)
      if (params?.userId) queryParams.append('userId', params.userId)
      if (params?.stepType) queryParams.append('stepType', params.stepType)
      if (params?.workflowType) queryParams.append('workflowType', params.workflowType)

      const queryString = queryParams.toString()
      const endpoint = `/analytics/task-performance${queryString ? `?${queryString}` : ''}`

      const result = await this.makeRequest(endpoint, {
        method: 'GET'
      })

      console.log('[ConductorAdapter] ✅ Task performance analytics fetched successfully:', {
        totalTasks: result.data?.performanceOverview?.totalTasks,
        efficiencyScore: result.data?.performanceOverview?.efficiencyScore,
        userPerformanceCount: result.data?.userPerformance?.length
      })

      return result
    } catch (error) {
      console.error('[ConductorAdapter] ❌ Error getting task performance analytics:', error)
      throw new Error(
        `Failed to get task performance analytics: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get template performance analytics
   * Maps to /api/analytics/template-performance endpoint
   */
  async getTemplatePerformanceAnalytics(params?: {
    timeframe?: 'last24h' | 'wtd' | 'mtd' | 'qtd' | 'ytd' | 'custom'
    startDate?: string
    endDate?: string
    limit?: number
    offset?: number
    sortBy?: 'totalWorkflows' | 'completionRate' | 'avgDuration' | 'successRate' | 'activeWorkflows'
    sortOrder?: 'asc' | 'desc'
    templateId?: string
    minUsage?: number
  }): Promise<{
    status: string
    data: {
      templates: Array<{
        templateId: string
        templateName: string
        totalWorkflows: number
        completedWorkflows: number
        activeWorkflows: number
        completionRate: number
        avgDurationHours: number
        successRate: number
        failureRate: number
        bottleneckSteps: string[]
        utilizationTrend: string
      }>
      totalTemplates: number
      averagePerformance: {
        completionRate: number
        avgDurationHours: number
        successRate: number
      }
    }
    timeRange: {
      start: string
      end: string
    }
    pagination: {
      limit: number
      offset: number
      total: number
      hasMore: boolean
    }
  }> {
    try {
      console.log('[ConductorAdapter] Getting template performance analytics...', params)

      // Build query parameters
      const queryParams = new URLSearchParams()
      if (params?.timeframe) queryParams.append('timeframe', params.timeframe)
      if (params?.startDate) queryParams.append('startDate', params.startDate)
      if (params?.endDate) queryParams.append('endDate', params.endDate)
      if (params?.limit) queryParams.append('limit', params.limit.toString())
      if (params?.offset) queryParams.append('offset', params.offset.toString())
      if (params?.sortBy) queryParams.append('sortBy', params.sortBy)
      if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder)
      if (params?.templateId) queryParams.append('templateId', params.templateId)
      if (params?.minUsage) queryParams.append('minUsage', params.minUsage.toString())

      const queryString = queryParams.toString()
      const endpoint = `/analytics/template-performance${queryString ? `?${queryString}` : ''}`

      const result = await this.makeRequest(endpoint, {
        method: 'GET'
      })

      console.log('[ConductorAdapter] ✅ Template performance analytics fetched successfully:', {
        templatesCount: result.data?.templates?.length,
        totalTemplates: result.data?.totalTemplates,
        avgCompletionRate: result.data?.averagePerformance?.completionRate
      })

      return result
    } catch (error) {
      console.error('[ConductorAdapter] ❌ Error getting template performance analytics:', error)
      throw new Error(
        `Failed to get template performance analytics: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get audit logs with filtering and pagination
   * Maps to /api/audit/logs endpoint
   */
  async getAuditLogs(params?: {
    userId?: string
    department?: string
    templateId?: string
    flowId?: string
    taskId?: string
    action?: 'TASK' | 'APPROVAL' | 'REJECTION' | 'ASSIGNMENT' | 'COMPLETION'
    status?: 'COMPLETED' | 'REJECTED' | 'IN_PROGRESS' | 'PENDING'
    startDate?: string
    endDate?: string
    limit?: number
    offset?: number
  }): Promise<{
    status: string
    data: Array<{
      id: string
      timestamp: string
      userId: string
      userName: string
      action: string
      entityType: string
      entityId: string
      flowId: string
      templateId: string
      details: Record<string, any>
      status: string
    }>
    pagination: {
      total: number
      offset: number
      limit: number
      hasMore: boolean
    }
  }> {
    try {
      console.log('[ConductorAdapter] Getting audit logs...', params)

      // Build query parameters
      const queryParams = new URLSearchParams()
      if (params?.userId) queryParams.append('userId', params.userId)
      if (params?.department) queryParams.append('department', params.department)
      if (params?.templateId) queryParams.append('templateId', params.templateId)
      if (params?.flowId) queryParams.append('flowId', params.flowId)
      if (params?.taskId) queryParams.append('taskId', params.taskId)
      if (params?.action) queryParams.append('action', params.action)
      if (params?.status) queryParams.append('status', params.status)
      if (params?.startDate) queryParams.append('startDate', params.startDate)
      if (params?.endDate) queryParams.append('endDate', params.endDate)
      if (params?.limit) queryParams.append('limit', params.limit.toString())
      if (params?.offset) queryParams.append('offset', params.offset.toString())

      const queryString = queryParams.toString()
      const endpoint = `/audit/logs${queryString ? `?${queryString}` : ''}`

      const result = await this.makeRequest(endpoint, {
        method: 'GET'
      })

      console.log('[ConductorAdapter] ✅ Audit logs fetched successfully:', {
        entriesCount: result.data?.length,
        totalEntries: result.pagination?.total,
        hasMore: result.pagination?.hasMore
      })

      return result
    } catch (error) {
      console.error('[ConductorAdapter] ❌ Error getting audit logs:', error)
      throw new Error(`Failed to get audit logs: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get flow management analytics for manager dashboard
   * Maps to /api/analytics/flow-management endpoint
   */
  async getFlowManagementAnalytics(params?: {
    timeframe?: 'last24h' | 'wtd' | 'mtd' | 'qtd' | 'ytd' | 'custom'
    startDate?: string
    endDate?: string
    departmentId?: string
    templateId?: string
    userId?: string
    includeResourceUtilization?: boolean
    includeBottleneckAnalysis?: boolean
    correlationEntity?: string
    correlationEntityId?: string
  }): Promise<{
    status: string
    data: {
      resourceUtilization: {
        totalResources: number
        activeResources: number
        utilizationRate: number
        overloadedResources: string[]
      }
      bottleneckAnalysis: {
        identifiedBottlenecks: Array<{
          stepType: string
          severity: 'low' | 'medium' | 'high'
          impactedFlows: number
          avgDelayTime: number
        }>
        recommendations: string[]
      }
    }
    timeRange: {
      start: string
      end: string
    }
  }> {
    try {
      console.log('[ConductorAdapter] Getting flow management analytics...', params)

      // Build query parameters
      const queryParams = new URLSearchParams()
      if (params?.timeframe) queryParams.append('timeframe', params.timeframe)
      if (params?.startDate) queryParams.append('startDate', params.startDate)
      if (params?.endDate) queryParams.append('endDate', params.endDate)
      if (params?.departmentId) queryParams.append('departmentId', params.departmentId)
      if (params?.templateId) queryParams.append('templateId', params.templateId)
      if (params?.userId) queryParams.append('userId', params.userId)
      if (params?.includeResourceUtilization !== undefined)
        queryParams.append('includeResourceUtilization', params.includeResourceUtilization.toString())
      if (params?.includeBottleneckAnalysis !== undefined)
        queryParams.append('includeBottleneckAnalysis', params.includeBottleneckAnalysis.toString())
      if (params?.correlationEntity) queryParams.append('correlationEntity', params.correlationEntity)
      if (params?.correlationEntityId) queryParams.append('correlationEntityId', params.correlationEntityId)

      const queryString = queryParams.toString()
      const endpoint = `/analytics/flow-management${queryString ? `?${queryString}` : ''}`

      const result = await this.makeRequest(endpoint, {
        method: 'GET'
      })

      console.log('[ConductorAdapter] ✅ Flow management analytics fetched successfully:', {
        totalResources: result.data?.resourceUtilization?.totalResources,
        utilizationRate: result.data?.resourceUtilization?.utilizationRate,
        bottleneckCount: result.data?.bottleneckAnalysis?.identifiedBottlenecks?.length
      })

      return result
    } catch (error) {
      console.error('[ConductorAdapter] ❌ Error getting flow management analytics:', error)
      throw new Error(
        `Failed to get flow management analytics: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get trend analytics for manager dashboard
   * Maps to /api/analytics/trends endpoint
   */
  async getTrendAnalytics(params?: {
    timeframe?: 'last24h' | 'wtd' | 'mtd' | 'qtd' | 'ytd' | 'custom'
    startDate?: string
    endDate?: string
    departmentId?: string
    templateId?: string
    userId?: string
    comparisonPeriod?: 'previous_period' | 'same_period_last_year'
    includeForecasting?: boolean
    correlationEntity?: string
    correlationEntityId?: string
  }): Promise<{
    status: string
    data: {
      periodComparison: {
        currentPeriod: {
          totalFlows: number
          completionRate: number
          avgCompletionTime: number
        }
        previousPeriod: {
          totalFlows: number
          completionRate: number
          avgCompletionTime: number
        }
        percentageChange: {
          totalFlows: number
          completionRate: number
          avgCompletionTime: number
        }
      }
      forecasting: {
        nextPeriodPrediction: {
          expectedFlows: number
          confidenceLevel: number
        }
        trendDirection: 'increasing' | 'decreasing' | 'stable'
      }
    }
    timeRange: {
      start: string
      end: string
    }
  }> {
    try {
      console.log('[ConductorAdapter] Getting trend analytics...', params)

      // Build query parameters
      const queryParams = new URLSearchParams()
      if (params?.timeframe) queryParams.append('timeframe', params.timeframe)
      if (params?.startDate) queryParams.append('startDate', params.startDate)
      if (params?.endDate) queryParams.append('endDate', params.endDate)
      if (params?.departmentId) queryParams.append('departmentId', params.departmentId)
      if (params?.templateId) queryParams.append('templateId', params.templateId)
      if (params?.userId) queryParams.append('userId', params.userId)
      if (params?.comparisonPeriod) queryParams.append('comparisonPeriod', params.comparisonPeriod)
      if (params?.includeForecasting !== undefined)
        queryParams.append('includeForecasting', params.includeForecasting.toString())
      if (params?.correlationEntity) queryParams.append('correlationEntity', params.correlationEntity)
      if (params?.correlationEntityId) queryParams.append('correlationEntityId', params.correlationEntityId)

      const queryString = queryParams.toString()
      const endpoint = `/analytics/trends${queryString ? `?${queryString}` : ''}`

      const result = await this.makeRequest(endpoint, {
        method: 'GET'
      })

      console.log('[ConductorAdapter] ✅ Trend analytics fetched successfully:', {
        currentFlows: result.data?.periodComparison?.currentPeriod?.totalFlows,
        previousFlows: result.data?.periodComparison?.previousPeriod?.totalFlows,
        trendDirection: result.data?.forecasting?.trendDirection
      })

      return result
    } catch (error) {
      console.error('[ConductorAdapter] ❌ Error getting trend analytics:', error)
      throw new Error(`Failed to get trend analytics: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get usage analytics for manager dashboard
   * Maps to /api/analytics/usage endpoint
   */
  async getUsageAnalytics(params?: {
    timeframe?: 'last24h' | 'wtd' | 'mtd' | 'qtd' | 'ytd' | 'custom'
    startDate?: string
    endDate?: string
    departmentId?: string
    templateId?: string
    userId?: string
    groupBy?: 'department' | 'template' | 'user'
    includeAdoptionMetrics?: boolean
    correlationEntity?: string
    correlationEntityId?: string
  }): Promise<{
    status: string
    data: {
      adoptionMetrics: {
        totalUsers: number
        activeUsers: number
        adoptionRate: number
        newUserGrowth: number
      }
      usageByGroup: Array<{
        groupId: string
        groupName: string
        totalUsage: number
        uniqueUsers: number
        avgSessionDuration: number
      }>
    }
    timeRange: {
      start: string
      end: string
    }
  }> {
    try {
      console.log('[ConductorAdapter] Getting usage analytics...', params)

      // Build query parameters
      const queryParams = new URLSearchParams()
      if (params?.timeframe) queryParams.append('timeframe', params.timeframe)
      if (params?.startDate) queryParams.append('startDate', params.startDate)
      if (params?.endDate) queryParams.append('endDate', params.endDate)
      if (params?.departmentId) queryParams.append('departmentId', params.departmentId)
      if (params?.templateId) queryParams.append('templateId', params.templateId)
      if (params?.userId) queryParams.append('userId', params.userId)
      if (params?.groupBy) queryParams.append('groupBy', params.groupBy)
      if (params?.includeAdoptionMetrics !== undefined)
        queryParams.append('includeAdoptionMetrics', params.includeAdoptionMetrics.toString())
      if (params?.correlationEntity) queryParams.append('correlationEntity', params.correlationEntity)
      if (params?.correlationEntityId) queryParams.append('correlationEntityId', params.correlationEntityId)

      const queryString = queryParams.toString()
      const endpoint = `/analytics/usage${queryString ? `?${queryString}` : ''}`

      const result = await this.makeRequest(endpoint, {
        method: 'GET'
      })

      console.log('[ConductorAdapter] ✅ Usage analytics fetched successfully:', {
        totalUsers: result.data?.adoptionMetrics?.totalUsers,
        activeUsers: result.data?.adoptionMetrics?.activeUsers,
        adoptionRate: result.data?.adoptionMetrics?.adoptionRate,
        groupCount: result.data?.usageByGroup?.length
      })

      return result
    } catch (error) {
      console.error('[ConductorAdapter] ❌ Error getting usage analytics:', error)
      throw new Error(`Failed to get usage analytics: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get workflow summary with visibility filtering
   * Uses summaryFields defined in Step 0 to determine what data to show
   */
  async getFlowSummary(
    flowId: string,
    userId: string
  ): Promise<{
    workflowId: string
    workflowName: string
    status: string
    initiator: string
    createdAt: string
    completedAt?: string
    progress?: number
    summaryData: Array<{
      label: string
      value: any
      type?: string
      format?: string
      visibility?: string
    }>
  }> {
    console.log(`[ConductorAdapter] 📊 Getting workflow summary for flow: ${flowId}, user: ${userId}`)

    try {
      const queryParams = new URLSearchParams()
      queryParams.append('userId', userId)

      const result = await this.makeRequest(`/flows/${flowId}/summary?${queryParams.toString()}`, {
        method: 'GET'
      })

      console.log('[ConductorAdapter] ✅ Flow summary fetched successfully:', {
        workflowId: result.workflowId,
        status: result.status,
        summaryFieldsCount: result.summaryData?.length || 0
      })

      return result
    } catch (error) {
      console.error('[ConductorAdapter] ❌ Error getting flow summary:', error)
      throw new Error(`Failed to get flow summary: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

/**
 * Factory function to create ConductorWorkflowEngineAdapter instance
 */
export const createConductorWorkflowEngine = (context: BusinessAppContextProps): WorkflowEngine => {
  return new ConductorWorkflowEngineAdapter(context)
}
