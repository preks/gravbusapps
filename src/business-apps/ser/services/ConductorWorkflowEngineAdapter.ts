import type {
  WorkflowEngine,
  StepReceiver,
  StepInstance,
  SubmittedRequest,
  Comment,
  StepStatus,
} from 'packages/services-plus-core';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

/**
 * ConductorWorkflowEngineAdapter - Integrates Services+ with Custom Flow Engine
 * 
 * This adapter bridges the Services+ WorkflowEngine interface with the Custom Flow Engine
 * that uses Conductor for workflow orchestration. It enables service requests initiated
 * from the Service Portal to be executed as sophisticated workflows with proper task
 * assignment, tracking, and service desk integration.
 */
export class ConductorWorkflowEngineAdapter implements WorkflowEngine {
  private flowEngineBaseUrl: string;
  private accessToken: string;
  private currentUserId: string;

  constructor(context: BusinessAppContextProps) {
    this.flowEngineBaseUrl = process.env.NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_URL || 'http://localhost:3000';
    this.accessToken = context.accessToken;
    this.currentUserId = context.userInfo?.id || 'unknown-user';
  }

  /**
   * Start a new service request workflow
   * Converts service template to flow template and executes it
   */
  async startRequest(templateKey: string, formData: any): Promise<string> {
    try {
      console.log(`[ConductorAdapter] Starting request with template: ${templateKey}`, { formData });

      // Map template key to actual flow template
      const flowTemplateId = this.mapServiceTemplateToFlowTemplate(templateKey);
      
      // Prepare execution context with assignment resolution
      const executionContext = this.buildExecutionContext(formData);
      
      // Execute the flow template via Custom Flow Engine
      const response = await fetch(`${this.flowEngineBaseUrl}/api/templates/${flowTemplateId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          initiator: this.currentUserId,
          context: {
            serviceRequestType: templateKey,
            requesterId: this.currentUserId,
            initiatedFrom: 'service-portal',
            urgency: formData.urgency || 'standard'
          },
          runtimeAssignments: executionContext.assignments,
          inputValues: formData
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to execute template: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const flowId = result.data.flowId || result.flowId;

      console.log(`[ConductorAdapter] Request started successfully: ${flowId}`);
      return flowId;

    } catch (error) {
      console.error('[ConductorAdapter] Error starting request:', error);
      throw new Error(`Failed to start service request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }



  /**
   * Get all service requests for current user
   * Queries flows initiated by current user and fetches full details for each
   */
  async getMyRequests(): Promise<SubmittedRequest[]> {
    try {
      console.log(`[ConductorAdapter] Getting requests for user: ${this.currentUserId}`);

      // Step 1: Get list of flows initiated by the current user  
      const listResponse = await fetch(`${this.flowEngineBaseUrl}/api/flows/user/${this.currentUserId}/initiated?limit=50&offset=0`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (!listResponse.ok) {
        throw new Error(`Failed to get user flows: ${listResponse.status} ${listResponse.statusText}`);
      }

      const listResult = await listResponse.json();
      const flowSummaries = listResult.data?.flows || listResult.flows || listResult.data || [];

      console.log(`[ConductorAdapter] Found ${flowSummaries.length} flow summaries`);

      // Step 2: Get full details for each flow
      const submittedRequests: SubmittedRequest[] = [];
      
      for (const flowSummary of flowSummaries) {
        try {
          const flowId = flowSummary.flowId || flowSummary.id;
          console.log(`[ConductorAdapter] Fetching full details for flow: ${flowId}`);
          
          // Get full flow details
          const fullRequest = await this.getRequest(flowId);
          submittedRequests.push(fullRequest);
          
        } catch (error) {
          console.error(`[ConductorAdapter] Error getting details for flow ${flowSummary.flowId}:`, error);
          // Continue with other flows instead of failing completely
        }
      }
      
      console.log(`[ConductorAdapter] Retrieved full details for ${submittedRequests.length} requests`);
      return submittedRequests;

    } catch (error) {
      console.error('[ConductorAdapter] Error getting user requests:', error);
      throw new Error(`Failed to get user requests: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a specific service request by ID
   * Retrieves detailed flow information including steps and progress
   */
  async getRequest(requestId: string): Promise<SubmittedRequest> {
    try {
      console.log(`[ConductorAdapter] Getting request details for: ${requestId}`);

      // Get flow details from Custom Flow Engine
      const response = await fetch(`${this.flowEngineBaseUrl}/api/flows/${requestId}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get request: ${response.status} ${response.statusText}`);
      }

      const flowData = await response.json();
      
      // Convert flow data to SubmittedRequest format
      const submittedRequest = this.convertFlowToSubmittedRequest(flowData);
      
      console.log(`[ConductorAdapter] Retrieved request details for: ${requestId}`);
      return submittedRequest;

    } catch (error) {
      console.error(`[ConductorAdapter] Error getting request ${requestId}:`, error);
      throw new Error(`Failed to get request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get tickets for a specific service desk
   * Queries tasks assigned to desk capabilities
   */
  async getDeskTickets(desk: StepReceiver): Promise<StepInstance[]> {
    try {
      console.log(`[ConductorAdapter] Getting tickets for desk: ${desk}`);

      // Map service desk to capabilities
      const capabilities = this.mapDeskToCapabilities(desk);
      
      // Query tasks for these capabilities (pass userId to enable claimable logic)
      const response = await fetch(`${this.flowEngineBaseUrl}/api/tasks/search?userId=${encodeURIComponent(this.currentUserId)}&capabilities=${capabilities.join(',')}&includeAssigned=true&includeClaimable=true`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get desk tickets: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const tasks = result.data?.tasks || result.tasks || [];

      // Convert tasks to StepInstance format
      const stepInstances = tasks.map((task: any) => this.convertTaskToStepInstance(task));
      
      console.log(`[ConductorAdapter] Found ${stepInstances.length} tickets for desk ${desk}`);
      return stepInstances;

    } catch (error) {
      console.error(`[ConductorAdapter] Error getting desk tickets for ${desk}:`, error);
      throw new Error(`Failed to get desk tickets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get detailed information for a specific ticket
   */
  async getTicketDetail(ticketId: string): Promise<StepInstance | null> {
    try {
      console.log(`🔍 [ConductorAdapter] *** GETTING TICKET DETAIL FOR: ${ticketId} ***`);
      console.log(`🔍 [ConductorAdapter] API URL: ${this.flowEngineBaseUrl}/api/tasks/${ticketId}?userId=${this.currentUserId}`);

      const response = await fetch(`${this.flowEngineBaseUrl}/api/tasks/${ticketId}?userId=${this.currentUserId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`[ConductorAdapter] Ticket not found: ${ticketId}`);
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const taskData = await response.json();
      console.log(`[ConductorAdapter] Got task detail:`, taskData);
      
      // Convert to StepInstance format
      const stepInstance = this.convertTaskToStepInstance(taskData);
      return stepInstance;

    } catch (error) {
      console.error(`[ConductorAdapter] Error getting ticket detail for ${ticketId}:`, error);
      throw new Error(`Failed to get ticket detail: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Claim a step/task for the current user
   */
  async claim(stepId: string): Promise<void> {
    try {
      console.log(`[ConductorAdapter] Claiming step: ${stepId} for user: ${this.currentUserId}`);

      const response = await fetch(`${this.flowEngineBaseUrl}/api/tasks/${stepId}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          userId: this.currentUserId,
          comment: `Claimed by ${this.currentUserId} via Service Desk`
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to claim task: ${response.status} ${response.statusText}`);
      }

      console.log(`[ConductorAdapter] Step claimed successfully: ${stepId}`);

    } catch (error) {
      console.error(`[ConductorAdapter] Error claiming step ${stepId}:`, error);
      throw new Error(`Failed to claim step: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Assign a step to a specific user
   */
  async assign(stepId: string, userId: string): Promise<void> {
    try {
      console.log(`[ConductorAdapter] Assigning step: ${stepId} to user: ${userId}`);

      const response = await fetch(`${this.flowEngineBaseUrl}/api/tasks/${stepId}/reassign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          userId: this.currentUserId,
          reassignTo: userId,
          comment: `Assigned to ${userId} via Service Desk`
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to assign task: ${response.status} ${response.statusText}`);
      }

      console.log(`[ConductorAdapter] Step assigned successfully: ${stepId} -> ${userId}`);

    } catch (error) {
      console.error(`[ConductorAdapter] Error assigning step ${stepId}:`, error);
      throw new Error(`Failed to assign step: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Advance/complete a step with optional data
   */
  async advance(stepId: string, payload?: any): Promise<void> {
    try {
      console.log(`[ConductorAdapter] Advancing step: ${stepId}`, payload ? 'with payload' : 'without payload');

      const response = await fetch(`${this.flowEngineBaseUrl}/api/tasks/${stepId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          userId: this.currentUserId,
          formData: payload || {},
          comment: payload?.comment || `Completed via Service Desk by ${this.currentUserId}`
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to complete task: ${response.status} ${response.statusText}`);
      }

      console.log(`[ConductorAdapter] Step completed successfully: ${stepId}`);

    } catch (error) {
      console.error(`[ConductorAdapter] Error completing step ${stepId}:`, error);
      throw new Error(`Failed to complete step: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add a comment to a step
   */
  async comment(stepId: string, body: string): Promise<Comment> {
    try {
      console.log(`[ConductorAdapter] Adding comment to step: ${stepId}`);

      const response = await fetch(`${this.flowEngineBaseUrl}/api/tasks/${stepId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          userId: this.currentUserId,
          comment: body,
          visibility: 'current_and_downstream'
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to add comment: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      const comment: Comment = {
        id: result.commentId || `comment-${Date.now()}`,
        stepId: stepId,
        authorId: this.currentUserId,
        createdAt: new Date().toISOString(),
        body: body,
        visibility: 'current_and_downstream'
      };

      console.log(`[ConductorAdapter] Comment added successfully: ${comment.id}`);
      return comment;

    } catch (error) {
      console.error(`[ConductorAdapter] Error adding comment to step ${stepId}:`, error);
      throw new Error(`Failed to add comment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // =================================================================================
  // PRIVATE HELPER METHODS
  // =================================================================================

  /**
   * Map service template key to flow template ID
   */
  private mapServiceTemplateToFlowTemplate(templateKey: string): string {
    const templateMapping: Record<string, string> = {
      'employee-onboarding-request': 'flow_employee_onboarding_service_request',
      'new-hardware-request': 'flow_employee_onboarding_service_request', // Fallback for testing
      'it-support-request': 'flow_employee_service_request_process',
      'hr-service-request': 'flow_employee_service_request_process'
    };

    return templateMapping[templateKey] || 'flow_employee_onboarding_service_request';
  }

  /**
   * Build execution context with assignment resolution
   * Maps real form data (departments, positions, managers) to proper workflow assignments
   */
  private buildExecutionContext(formData: any): { assignments: Record<string, any> } {
    console.log('[ConductorAdapter] Building execution context with real data:', formData);

    // Extract real organizational data from form
    const employeeDepartment = formData.department;
    const reportingManager = formData.reportingManager;

    // Map real data to workflow step assignments
    const assignments: Record<string, any> = {};

    // Step 0: HR Documentation (assign to employee's actual department + HR capabilities)
    assignments['step_0'] = {
      assignment: {
        targets: {
          users: reportingManager ? [reportingManager] : [],
          organizationalUnits: employeeDepartment ? [employeeDepartment] : [],
          capabilities: ['cap-001'],
          matrixTeams: [],
          companies: [],
          siteLocations: [],
          costCenters: []
        },
        assignmentMode: 'CLAIM',
        allowReassignment: true
      }
    };

    // Step 1: IT Equipment (assign to IT department + technical capabilities)
    assignments['step_1'] = {
      assignment: {
        targets: {
          users: [],
          organizationalUnits: ['OU_IT_001'], // Map to actual IT department ID
          capabilities: ['cap-002','cap-005'],
          matrixTeams: [],
          companies: [],
          siteLocations: [],
          costCenters: []
        },
        assignmentMode: 'CLAIM',
        allowReassignment: true
      }
    };

    // Step 2: System Access (assign to IT Security team)
    assignments['step_2'] = {
      assignment: {
        targets: {
          users: [],
          organizationalUnits: ['OU_IT_001'],
          capabilities: ['cap-002'],
          matrixTeams: [],
          companies: [],
          siteLocations: [],
          costCenters: []
        },
        assignmentMode: 'CLAIM',
        allowReassignment: true
      }
    };

    // Step 3: Training (assign to employee's department + HR/L&D capabilities)
    assignments['step_3'] = {
      assignment: {
        targets: {
          users: reportingManager ? [reportingManager] : [],
          organizationalUnits: employeeDepartment ? [employeeDepartment, 'OU_HR_001'] : ['OU_HR_001'],
          capabilities: ['cap-001'],
          matrixTeams: [],
          companies: [],
          siteLocations: [],
          costCenters: []
        },
        assignmentMode: 'CLAIM',
        allowReassignment: true
      }
    };

    // Step 4: Workspace Setup (assign to Facilities + employee department)
    assignments['step_4'] = {
      assignment: {
        targets: {
          users: [],
          organizationalUnits: employeeDepartment ? [employeeDepartment, 'OU_FACILITIES_001'] : ['OU_FACILITIES_001'],
          capabilities: ['cap-001'],
          matrixTeams: [],
          companies: [],
          siteLocations: [],
          costCenters: []
        },
        assignmentMode: 'CLAIM',
        allowReassignment: true
      }
    };

    // Step 5: Manager Notification (assign to reporting manager + HR)
    assignments['step_5'] = {
      assignment: {
        targets: {
          users: reportingManager ? [reportingManager] : [],
          organizationalUnits: employeeDepartment ? [employeeDepartment] : [],
          capabilities: ['cap-001'],
          matrixTeams: [],
          companies: [],
          siteLocations: [],
          costCenters: []
        },
        assignmentMode: 'CLAIM',
        allowReassignment: true
      }
    };

    // Step 6: Final Completion (assign to HR + manager)
    assignments['step_6'] = {
      assignment: {
        targets: {
          users: reportingManager ? [reportingManager] : [],
          organizationalUnits: ['OU_HR_001'],
          capabilities: ['cap-001'],
          matrixTeams: [],
          companies: [],
          siteLocations: [],
          costCenters: []
        },
        assignmentMode: 'CLAIM',
        allowReassignment: true
      }
    };

    console.log('[ConductorAdapter] Generated real data assignments:', assignments);

    return { assignments };
  }

  /**
   * Convert flow data to SubmittedRequest format
   */
  private convertFlowToSubmittedRequest(flowData: any): SubmittedRequest {
    // Extract the original form data from the workflow
    const formData = this.extractFormDataFromFlow(flowData);
    
    // Convert workflow steps to StepInstance format with rich details
    const steps: StepInstance[] = (flowData.steps || []).map((step: any, index: number) => {
      // Map Custom Flow Engine step status to Services+ step status
      const stepStatus = this.mapFlowStepStatusToStepStatus(step.status);
      
      // Extract assignment information  
      const assignmentTargets = step.assignmentTargets || {};
      const desk = this.mapCapabilitiesToDesk(assignmentTargets.capabilities || []);
      
      // Build step with rich details
      return {
        id: step.taskId || `${flowData.id || flowData.flowId}-step-${index}`,
        defId: step.stepId || `step_${index}`,
        name: step.title || `Step ${index + 1}`,
        desk: desk,
        status: stepStatus,
        assignedToUserId: step.assignedTo === 'AVAILABLE' ? undefined : step.assignedTo,
        claimedByUserId: step.claimedBy,
        startedAt: step.startedAt || (stepStatus === 'in_progress' ? step.scheduledAt : undefined),
        finishedAt: step.finishedAt,
        comments: step.comments || [],
        requestId: flowData.id || flowData.flowId,
        
        // Additional rich details for the UI
        description: step.message,
        expectedStartAt: step.expectedStartAt,
        expectedFinishAt: step.expectedFinishAt,
        dueDate: step.dueDate,
        inputs: step.inputs || [],
        links: step.links || [],
        assignmentMode: step.assignmentMode,
        allowReassignment: step.allowReassignment
      };
    });

    // Build comprehensive timeline from flow progress and steps
    const timeline = this.buildComprehensiveTimeline(flowData, steps);

    return {
      id: flowData.flowId || flowData.id,
      templateId: flowData.templateId || 'unknown',
      templateVersion: flowData.version || 1,
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
      progressPercentage: flowData.progress?.percentage
    } as SubmittedRequest;
  }

  /**
   * Extract original form data from workflow
   * ISSUE: Custom Flow Engine not persisting inputValues, implementing fallback
   */
  private extractFormDataFromFlow(flowData: any): any {
    // Extract original form data - now properly returned by Custom Flow Engine
    let formData = flowData.input?.inputValues ||        // ✅ FIXED: From Conductor via Custom Flow Engine
                   flowData.input ||                     // Direct input object  
                   flowData.inputValues ||               // Alternative location
                   flowData.formData ||                  // Legacy location
                   {};
    
    // If still no data found, provide a helpful empty state
    if (!formData || Object.keys(formData).length === 0) {
      console.warn('[ConductorAdapter] No form data found in workflow response');
      formData = {
        '_message': 'No form data available for this request',
        '_submitDateTime': flowData.createdAt || flowData.startTime || new Date().toISOString(),
        '_requestType': flowData.name || flowData.templateId || 'Service Request'
      };
    } else {
      console.log('[ConductorAdapter] ✅ SUCCESS: Real form data extracted:', Object.keys(formData));
    }
    
    return formData;
  }

  /**
   * Map Custom Flow Engine step status to Services+ step status
   */
  private mapFlowStepStatusToStepStatus(flowStepStatus: string): StepStatus {
    const statusMapping: Record<string, StepStatus> = {
      'SCHEDULED': 'ready',
      'READY': 'ready', 
      'QUEUED': 'ready',
      'IN_PROGRESS': 'in_progress',
      'RUNNING': 'in_progress',
      'COMPLETED': 'done',
      'DONE': 'done',
      'FAILED': 'blocked',
      'ERROR': 'blocked',
      'CANCELLED': 'blocked',
      'SKIPPED': 'done',
      'PAUSED': 'blocked'
    };

    return statusMapping[flowStepStatus] || 'ready';
  }

  /**
   * Build comprehensive timeline from flow data and steps
   */
  private buildComprehensiveTimeline(flowData: any, steps: StepInstance[]): Array<{at: string, message: string}> {
    const timeline: Array<{at: string, message: string}> = [];
    
    // Add flow creation entry
    if (flowData.startTime || flowData.createdAt) {
      timeline.push({
        at: flowData.startTime || flowData.createdAt,
        message: `Request "${flowData.flowName || flowData.name}" submitted by ${flowData.initiatedBy || 'User'}`
      });
    }

    // Add step-based timeline entries
    steps.forEach((step) => {
      // Add step start entry
      if (step.startedAt) {
        timeline.push({
          at: step.startedAt,
          message: `Step "${step.name}" started`
        });
      }
      
      // Add step completion entry
      if (step.finishedAt) {
        timeline.push({
          at: step.finishedAt,
          message: `Step "${step.name}" completed`
        });
      }
      
      // Add claim entry if step is claimed
      if (step.claimedByUserId && step.status === 'in_progress') {
        timeline.push({
          at: step.startedAt || new Date().toISOString(),
          message: `Step "${step.name}" claimed by ${step.claimedByUserId}`
        });
      }
    });

    // Add workflow completion entry
    if (flowData.endTime) {
      timeline.push({
        at: flowData.endTime,
        message: `Request completed`
      });
    }

    // Sort timeline by timestamp
    timeline.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
    
    return timeline;
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
    };

    // Check for keywords in template ID
    const lowerTemplateId = (templateId || '').toLowerCase();
    for (const [keyword, category] of Object.entries(categoryMapping)) {
      if (lowerTemplateId.includes(keyword)) {
        return category;
      }
    }

    // Default to HR for employee-related templates
    if (lowerTemplateId.includes('employee') || lowerTemplateId.includes('onboarding')) {
      return 'hr';
    }

    return 'general';
  }

  /**
   * Convert task data to StepInstance format
   */
  private convertTaskToStepInstance(taskData: any): StepInstance {
    console.log(`🔄 [ConductorAdapter] Converting task data:`, JSON.stringify(taskData, null, 2));
    
    const stepInstance = {
      id: taskData.id, // ← FIXED: API returns 'id', not 'taskId'
      defId: taskData.stepId || taskData.type,
      name: taskData.title,
      desk: this.mapCapabilitiesToDesk(taskData.assignment?.targets?.capabilities || []),
      status: this.mapTaskStatusToStepStatus(taskData.status),
      assignedToUserId: taskData.assignment?.assignedTo,
      claimedByUserId: taskData.assignment?.claimedBy,
      startedAt: taskData.startedAt,
      finishedAt: taskData.finishedAt,
      comments: taskData.comments || [],
      requestId: taskData.flowId,
      // Add rich data fields (extend the interface)
      message: taskData.message,
      requester: taskData.requester,
      form: taskData.form || [],
      links: taskData.links || [],
      assignment: taskData.assignment,
      dueDate: taskData.dueDate,
      urgencyLevel: taskData.urgency_level,
      availableActions: taskData.availableActions,
    } as any; // Use 'as any' to allow extended fields
    
    console.log(`🔄 [ConductorAdapter] Converted to StepInstance:`, stepInstance);
    return stepInstance;
  }

  /**
   * Map service desk to flow engine capabilities
   */
  private mapDeskToCapabilities(desk: StepReceiver): string[] {
    const deskMapping: Record<StepReceiver, string[]> = {
      'HR': ['HR_SPECIALIST', 'HR_MANAGER', 'HR_COORDINATOR'],
      'IT': ['IT_SPECIALIST', 'IT_INFRASTRUCTURE', 'IT_SUPPORT'],
      'Facilities': ['FACILITIES_MANAGEMENT', 'WORKPLACE_ADMIN'],
      'Finance': ['FINANCE_SPECIALIST', 'FINANCE_MANAGER'],
      'Procurement': ['PROCUREMENT_SPECIALIST', 'PROCUREMENT_MANAGER'],
      'Legal': ['LEGAL_COUNSEL', 'LEGAL_SPECIALIST'],
      'Security': ['IT_SECURITY', 'SECURITY_SPECIALIST'],
      'AccessIdentity': ['ACCESS_ADMIN', 'IT_SECURITY'],
      'Workplace': ['WORKPLACE_ADMIN', 'FACILITIES_MANAGEMENT'],
      'Fleet': ['FLEET_MANAGER', 'FLEET_COORDINATOR'],
      'Data': ['DATA_ANALYST', 'DATA_ENGINEER'],
      'L&D': ['LEARNING_DEVELOPMENT', 'TRAINING_COORDINATOR'],
      'Admin': ['ADMIN_SUPPORT', 'OFFICE_MANAGER']
    };

    return deskMapping[desk] || ['ADMIN_SUPPORT'];
  }

  /**
   * Map capabilities back to service desk
   */
  private mapCapabilitiesToDesk(capabilities: string[]): StepReceiver {
    if (!capabilities || capabilities.length === 0) return 'Admin';

    const capabilityMapping: Record<string, StepReceiver> = {
      'HR_SPECIALIST': 'HR',
      'HR_MANAGER': 'HR',
      'HR_COORDINATOR': 'HR',
      'IT_SPECIALIST': 'IT',
      'IT_INFRASTRUCTURE': 'IT',
      'IT_SUPPORT': 'IT',
      'IT_SECURITY': 'Security',
      'ACCESS_ADMIN': 'AccessIdentity',
      'FACILITIES_MANAGEMENT': 'Facilities',
      'WORKPLACE_ADMIN': 'Workplace',
      'FINANCE_SPECIALIST': 'Finance',
      'FINANCE_MANAGER': 'Finance',
      'PROCUREMENT_SPECIALIST': 'Procurement',
      'PROCUREMENT_MANAGER': 'Procurement',
      'LEGAL_COUNSEL': 'Legal',
      'LEGAL_SPECIALIST': 'Legal',
      'LEARNING_DEVELOPMENT': 'L&D',
      'TRAINING_COORDINATOR': 'L&D',
      'FLEET_MANAGER': 'Fleet',
      'FLEET_COORDINATOR': 'Fleet',
      'DATA_ANALYST': 'Data',
      'DATA_ENGINEER': 'Data',
      'ADMIN_SUPPORT': 'Admin',
      'OFFICE_MANAGER': 'Admin'
    };

    // Find first matching capability
    for (const capability of capabilities) {
      if (capabilityMapping[capability]) {
        return capabilityMapping[capability];
      }
    }

    return 'Admin'; // Default fallback
  }

  /**
   * Map flow engine task status to service portal step status
   */
  private mapTaskStatusToStepStatus(taskStatus: string): StepStatus {
    const statusMapping: Record<string, StepStatus> = {
      'OPEN': 'ready',
      'IN_PROGRESS': 'in_progress', 
      'COMPLETED': 'done',
      'REJECTED': 'canceled',
      'SCHEDULED': 'ready'  // SCHEDULED tasks should be claimable → 'ready'
    };

    return statusMapping[taskStatus] || 'pending';
  }

  /**
   * Map flow status to service request status
   */
  private mapFlowStatusToRequestStatus(flowStatus: string): 'open' | 'in_progress' | 'completed' | 'canceled' {
    const statusMapping: Record<string, 'open' | 'in_progress' | 'completed' | 'canceled'> = {
      'RUNNING': 'in_progress',
      'COMPLETED': 'completed',
      'FAILED': 'canceled',
      'PAUSED': 'in_progress',
      'TERMINATED': 'canceled'
    };

    return statusMapping[flowStatus] || 'open';
  }


}

/**
 * Factory function to create ConductorWorkflowEngineAdapter instance
 */
export const createConductorWorkflowEngine = (context: BusinessAppContextProps): WorkflowEngine => {
  return new ConductorWorkflowEngineAdapter(context);
};
