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
  AvailableActions,
  TaskAction,
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
  private userInfo?: any;

  constructor(context: BusinessAppContextProps) {
    this.flowEngineBaseUrl = process.env.NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_URL || 'http://localhost:3000';
    this.accessToken = context.accessToken;
    this.currentUserId = context.userInfo?.id || 'unknown-user';
    this.userInfo = context.userInfo;
    
    console.log(`[ConductorAdapterRequester] Initialized with user:`, {
      userId: this.currentUserId,
      hasUserInfo: !!this.userInfo,
      displayName: this.getRequesterDisplayName()
    });
  }

  /**
   * Get a display name for the current user from available user info
   */
  private getRequesterDisplayName(): string {
    if (!this.userInfo) {
      console.log(`[ConductorAdapterRequester] ⚠️ No user info available for display name`);
      return 'Unknown User';
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
    ];
    
    // Return the first non-empty name
    for (const name of possibleNames) {
      if (name && typeof name === 'string' && name.trim().length > 0) {
        console.log(`[ConductorAdapterRequester] ✅ Using display name: ${name}`);
        return name.trim();
      }
    }
    
    console.log(`[ConductorAdapterRequester] ⚠️ Could not determine display name, falling back to 'Unknown User'`);
    return 'Unknown User';
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.flowEngineBaseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Start a new service request workflow
   * Converts service template to flow template and executes it
   */
  async startRequest(templateKey: string, formData: any): Promise<string> {
    // Declare payload in broader scope for error handling
    let requestPayload: any = null;
    let flowTemplateId: string = '';
    
    try {
      console.log(`[ConductorAdapter] Starting request with template: ${templateKey}`, { formData });

      // Map template key to actual flow template
      flowTemplateId = this.mapServiceTemplateToFlowTemplate(templateKey);
      const requesterDisplayName = this.getRequesterDisplayName();
      
      console.log(`[ConductorAdapterRequester] ✅ Will send requester name: ${requesterDisplayName}`);
      
      // Prepare execution context with assignment resolution
      const executionContext = this.buildExecutionContext(formData, templateKey);
      
      // Prepare request payload
      requestPayload = {
          initiator: this.currentUserId,
          context: {
            serviceRequestType: templateKey,
            requesterId: this.currentUserId,
          requesterName: requesterDisplayName,
            initiatedFrom: 'service-portal',
            urgency: formData.urgency || 'standard'
          },
          runtimeAssignments: executionContext.assignments,
          inputValues: formData
      };

      console.log(`[ConductorAdapterRequester] 🚀 API Request Details:`, {
        url: `${this.flowEngineBaseUrl}/api/templates/${flowTemplateId}/execute`,
        method: 'POST',
        templateKey: templateKey,
        flowTemplateId: flowTemplateId,
        formData: formData,
        assignmentCount: Object.keys(requestPayload.runtimeAssignments || {}).length,
        hasRuntimeAssignments: !!requestPayload.runtimeAssignments && Object.keys(requestPayload.runtimeAssignments).length > 0,
        runtimeAssignments: requestPayload.runtimeAssignments,
        runtimeAssignmentKeys: Object.keys(requestPayload.runtimeAssignments || {}),
        step0Assignment: requestPayload.runtimeAssignments?.step_0,
        payload: requestPayload
      });
      
      // Execute the flow template via Custom Flow Engine
      const response = await fetch(`${this.flowEngineBaseUrl}/api/templates/${flowTemplateId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        let errorMessage = `Failed to execute template: ${response.status} ${response.statusText}`;
        let errorBody = '';
        try {
          errorBody = await response.text();
          console.error(`[ConductorAdapterRequester] ❌ API Error Response:`, {
            status: response.status,
            statusText: response.statusText,
            body: errorBody,
            url: `${this.flowEngineBaseUrl}/api/templates/${flowTemplateId}/execute`,
            templateKey: templateKey,
            flowTemplateId: flowTemplateId,
            actualPayloadSent: requestPayload
          });
          errorMessage += ` - Response: ${errorBody}`;
        } catch (parseError) {
          console.error(`[ConductorAdapterRequester] Could not parse error response:`, parseError);
        }
        
        // Create enhanced error with structured debug info (3 separate JSON sections)
        const enhancedError = new Error(errorMessage);
        (enhancedError as any).debugPayload = {
          apiCall: {
            method: 'POST',
            url: `${this.flowEngineBaseUrl}/api/templates/${flowTemplateId}/execute`,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer [REDACTED]'
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
        };
        throw enhancedError;
      }

      const result = await response.json();
      const flowId = result.data.flowId || result.flowId;

      console.log(`[ConductorAdapterRequester] ✅ Request created successfully:`, {
        flowId: flowId,
        templateKey: templateKey,
        flowTemplateId: flowTemplateId,
        requesterName: requesterDisplayName,
        result: result
      });
      return flowId;

    } catch (error) {
      console.error('[ConductorAdapter] Error starting request:', error);
      
      // If this is already an enhanced error (from API response), re-throw as-is
      if (error && typeof error === 'object' && 'debugPayload' in error) {
        throw error;
      }
      
      // Create enhanced error for other types of failures (network, parsing, etc.)
      const enhancedError = new Error(`Failed to start service request: ${error instanceof Error ? error.message : 'Unknown error'}`);
      (enhancedError as any).debugPayload = {
        apiCall: {
          method: 'POST',
          url: `${this.flowEngineBaseUrl}/api/templates/${flowTemplateId}/execute`,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer [REDACTED]'
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
      };
      throw enhancedError;
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
      const flowSummaries = listResult.data?.flows || listResult.flows || [];

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
   * ✨ DYNAMIC: Map any template name to flow template ID
   * Converts template names from custom-flow-engine to flow IDs dynamically
   */
  private mapServiceTemplateToFlowTemplate(templateKey: string): string {
    // ✨ DYNAMIC MAPPING: Convert template name to flow ID
    let flowId: string;
    
    if (templateKey.startsWith('flow_')) {
      // Already a flow ID, use as-is
      flowId = templateKey;
    } else {
      // Convert template name to flow ID dynamically
      flowId = 'flow_' + templateKey
        .toLowerCase()
        .replace(/\s+/g, '_')           // Replace spaces with underscores
        .replace(/[^a-z0-9_]/g, '')     // Remove special characters
        .replace(/_+/g, '_')            // Remove duplicate underscores
        .replace(/^_|_$/g, '');         // Remove leading/trailing underscores
    }

    // Legacy mappings for backward compatibility with hardcoded keys
    const legacyMappings: Record<string, string> = {
      'employee-onboarding-request': 'flow_employee_onboarding_process',
      'new-hardware-request': 'flow_employee_onboarding_process',
      'hardware-equipment-request': 'flow_employee_service_request_process',
      'it-hardware': 'flow_employee_service_request_process',
      'it-support-request': 'flow_employee_service_request_process',
      'hr-service-request': 'flow_employee_service_request_process'
    };

    // Use legacy mapping if available, otherwise use dynamic mapping
    const finalFlowId = legacyMappings[templateKey] || flowId;

    console.log(`[ConductorAdapterRequester] 🔧 DYNAMIC Template Mapping:`, {
      inputTemplateKey: templateKey,
      dynamicFlowId: flowId,
      legacyMapping: legacyMappings[templateKey] || 'none',
      finalFlowId: finalFlowId,
      mappingType: legacyMappings[templateKey] ? 'legacy' : 'dynamic'
    });

    return finalFlowId;
  }

  /**
   * ✨ DYNAMIC: Analyze template type and assignment requirements
   * Determines if a template needs runtime assignments based on its characteristics
   */
  /**
   * 🌐 UNIVERSAL: Get steps that require runtime assignments for any template
   * This analyzes the actual template definition to detect steps with "targets": null
   */
  async getStepsRequiringAssignment(templateId: string): Promise<Array<{
    stepId: string;
    stepIndex: number;
    title: string;
    assignmentMode: string;
    requiresUsers: boolean;
  }>> {
    try {
      // Fetch template definition to analyze steps
      const response = await fetch(`${this.flowEngineBaseUrl}/api/templates/${templateId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        console.warn(`[ConductorAdapter] Could not fetch template ${templateId} for assignment analysis`);
        return [];
      }

      const templateResponse = await response.json();
      const template = templateResponse.template || templateResponse.data || templateResponse;
      
      const stepsRequiringAssignment: Array<{
        stepId: string;
        stepIndex: number;
        title: string;
        assignmentMode: string;
        requiresUsers: boolean;
      }> = [];

      if (template?.steps) {
        template.steps.forEach((step: any, index: number) => {
          const stepId = `step_${index}`;
          const assignmentMode = step.assignment?.assignmentMode;

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
              });
            } else if (typeof step.assignment.targets === 'object') {
              // Check if all target arrays are empty
              const targets = step.assignment.targets;
              const targetArrays = [
                targets.users,
                targets.organizationalUnits,
                targets.companies,
                targets.siteLocations,
                targets.capabilities,
                targets.costCenters,
                targets.matrixTeams
              ];
              
              const hasAnyTargets = targetArrays.some(arr => 
                Array.isArray(arr) && arr.length > 0
              );
              
              if (!hasAnyTargets) {
                stepsRequiringAssignment.push({
                  stepId: stepId,
                  stepIndex: index,
                  title: step.title || `Step ${index + 1}`,
                  assignmentMode: assignmentMode,
                  requiresUsers: assignmentMode === 'ASSIGN'
                });
              }
            }
          }
        });
      }

      console.log(`[ConductorAdapter] 🔍 Template ${templateId} analysis:`, {
        totalSteps: template?.steps?.length || 0,
        stepsRequiringAssignment: stepsRequiringAssignment.length,
        requiredSteps: stepsRequiringAssignment
      });

      return stepsRequiringAssignment;
    } catch (error) {
      console.error(`[ConductorAdapter] Error analyzing template ${templateId}:`, error);
      return [];
    }
  }

  private analyzeTemplateType(templateKey: string): {
    category: string;
    needsRuntimeAssignments: boolean;
    stepComplexity: string;
    description: string;
  } {
    // 🌐 UNIVERSAL: Always check if template needs runtime assignments
    // The actual detection is now done by getStepsRequiringAssignment method
    
    return {
      category: 'universal',
      needsRuntimeAssignments: true, // Always check - let getStepsRequiringAssignment determine actual needs
      stepComplexity: 'universal',
      description: 'Universal approach: analyze actual template to detect runtime assignment requirements'
    };
  }

  /**
   * ✨ DYNAMIC: Build execution context with template-driven assignment resolution
   * Analyzes template structure to determine if runtime assignments are needed
   */
  private buildExecutionContext(formData: any, templateKey?: string): { assignments: Record<string, any> } {
    // 🔧 GENERAL APPROACH: By default, all templates use their predefined assignments
    // This preserves the correct assignmentMode (CLAIM/ASSIGN/etc.) from the template
    const templateType = this.analyzeTemplateType(templateKey || '');
    
    console.log(`[ConductorAdapterRequester] 🔧 GENERAL ASSIGNMENT APPROACH:`, {
      templateKey: templateKey,
      templateKeyType: typeof templateKey,
      templateKeyExact: `"${templateKey}"`,
      templateType: templateType,
      needsRuntimeAssignments: templateType.needsRuntimeAssignments,
      templateCategory: templateType.category,
      approach: 'Use template defaults to preserve correct assignmentMode'
    });

    const assignments: Record<string, any> = {};

    // 🔧 GENERAL: Most templates use predefined assignments with correct assignmentMode
    if (!templateType.needsRuntimeAssignments) {
      console.log(`[ConductorAdapterRequester] ✅ USING TEMPLATE DEFAULTS - All steps will use assignmentMode from template (category: ${templateType.category})`);
      console.log(`[ConductorAdapterRequester] 🎯 NO RUNTIME OVERRIDES - Template has correct assignmentMode for each step`);
      console.log(`[ConductorAdapterRequester] 🚪 EARLY RETURN - Returning empty assignments to preserve template assignmentMode`);
      return { assignments }; // Return empty assignments to use template defaults
    }

    // 🌐 UNIVERSAL: Build assignments from form data for any template
    console.log(`[ConductorAdapterRequester] 🌐 Using Universal Assignment Approach for all templates`);

    // Extract organizational data for backwards compatibility
    const employeeDepartment = formData.department;
    const reportingManager = formData.reportingManager;
    
    // 🌐 UNIVERSAL: Always use the universal assignment builder
    return this.buildUniversalAssignments(formData, templateKey || 'unknown');
  }

  /**
   * ✨ DYNAMIC: Build onboarding-specific assignments (7 steps)
   */
  private buildUniversalAssignments(formData: any, templateKey: string): { assignments: Record<string, any> } {
    console.log(`[ConductorAdapterRequester] 🌐 Building Universal Assignments from form data`);
    const assignments: Record<string, any> = {};

    // 🌐 UNIVERSAL APPROACH: Build assignments from form data for any template
    // Form data should contain step assignments like: stepAssignments: { step_3: "userId", step_1: "anotherUserId" }
    
    if (formData.stepAssignments) {
      Object.keys(formData.stepAssignments).forEach(stepId => {
        const assignedUserId = formData.stepAssignments[stepId];
        
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
          };
        }
      });
    }

    console.log(`[ConductorAdapterRequester] 🎯 UNIVERSAL ASSIGNMENTS built from form:`, {
      assignmentCount: Object.keys(assignments).length,
      assignmentKeys: Object.keys(assignments),
      assignments: assignments,
      sourceFormData: formData.stepAssignments,
      templateKey: templateKey
    });

    return { assignments };
  }

  private buildOnboardingAssignments(formData: any, employeeDepartment: any, reportingManager: any): { assignments: Record<string, any> } {
    // 🌐 UNIVERSAL: Delegate to universal assignment builder
    return this.buildUniversalAssignments(formData, 'onboarding');
  }

  /**
   * ✨ DYNAMIC: Build training-specific assignments
   */
  private buildTrainingAssignments(formData: any, employeeDepartment: any, reportingManager: any): { assignments: Record<string, any> } {
    console.log(`[ConductorAdapterRequester] 🎓 Building Training Assignments - Multi-step training workflow`);
    const assignments: Record<string, any> = {};

    // Generic training assignments - can be customized based on training type
    assignments['step_0'] = {
      assignment: {
        targets: {
          users: reportingManager ? [reportingManager] : [],
          organizationalUnits: employeeDepartment ? [employeeDepartment, 'OU_HR_001'] : ['OU_HR_001'],
          capabilities: ['cap-003'], // Training capability
          matrixTeams: [],
          companies: [],
          siteLocations: [],
          costCenters: []
        },
        assignmentMode: 'CLAIM',
        allowReassignment: true
      }
    };

    console.log(`[ConductorAdapterRequester] 🎯 FINAL ASSIGNMENTS - Training Template:`, {
      assignmentCount: Object.keys(assignments).length,
      assignmentKeys: Object.keys(assignments),
      assignments: assignments
    });

    return { assignments };
  }

  /**
   * ✨ DYNAMIC: Build recruiting-specific assignments  
   */
  private buildRecruitingAssignments(formData: any, employeeDepartment: any, reportingManager: any): { assignments: Record<string, any> } {
    console.log(`[ConductorAdapterRequester] 👥 Building Recruiting Assignments - Multi-step recruitment workflow`);
    const assignments: Record<string, any> = {};

    // Generic recruiting assignments
    assignments['step_0'] = {
      assignment: {
        targets: {
          users: reportingManager ? [reportingManager] : [],
          organizationalUnits: ['OU_HR_001'], // HR leads recruiting
          capabilities: ['cap-004'], // Recruiting capability
          matrixTeams: [],
          companies: [],
          siteLocations: [],
          costCenters: []
        },
        assignmentMode: 'CLAIM',
        allowReassignment: true
      }
    };

    console.log(`[ConductorAdapterRequester] 🎯 FINAL ASSIGNMENTS - Recruiting Template:`, {
      assignmentCount: Object.keys(assignments).length,
      assignmentKeys: Object.keys(assignments),
      assignments: assignments
    });

    return { assignments };
  }

  /**
   * ✨ DYNAMIC: Build requisition-specific assignments
   */
  private buildRequisitionAssignments(formData: any, employeeDepartment: any, reportingManager: any): { assignments: Record<string, any> } {
    console.log(`[ConductorAdapterRequester] 📋 Building Requisition Assignments - Multi-step requisition workflow`);
    const assignments: Record<string, any> = {};

    // Generic requisition assignments
    assignments['step_0'] = {
      assignment: {
        targets: {
          users: reportingManager ? [reportingManager] : [],
          organizationalUnits: employeeDepartment ? [employeeDepartment] : ['OU_HR_001'],
          capabilities: ['cap-005'], // Requisition capability
          matrixTeams: [],
          companies: [],
          siteLocations: [],
          costCenters: []
        },
        assignmentMode: 'CLAIM',
        allowReassignment: true
      }
    };

    console.log(`[ConductorAdapterRequester] 🎯 FINAL ASSIGNMENTS - Requisition Template:`, {
      assignmentCount: Object.keys(assignments).length,
      assignmentKeys: Object.keys(assignments),
      assignments: assignments
    });

    return { assignments };
  }

  /**
   * ✨ DYNAMIC: Build generic assignments for unknown template types
   */
  private buildGenericAssignments(formData: any, employeeDepartment: any, reportingManager: any, templateCategory: string): { assignments: Record<string, any> } {
    console.log(`[ConductorAdapterRequester] 🔧 Building Generic Assignments - Unknown template category: ${templateCategory}`);
    const assignments: Record<string, any> = {};

    // Generic fallback assignments
    assignments['step_0'] = {
      assignment: {
        targets: {
          users: reportingManager ? [reportingManager] : [],
          organizationalUnits: employeeDepartment ? [employeeDepartment, 'OU_HR_001'] : ['OU_HR_001'],
          capabilities: ['cap-001'], // Generic capability
          matrixTeams: [],
          companies: [],
          siteLocations: [],
          costCenters: []
        },
        assignmentMode: 'CLAIM',
        allowReassignment: true
      }
    };

    console.log(`[ConductorAdapterRequester] 🎯 FINAL ASSIGNMENTS - Generic Template:`, {
      templateCategory: templateCategory,
      assignmentCount: Object.keys(assignments).length,
      assignmentKeys: Object.keys(assignments),
      assignments: assignments
    });

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
        requesterId: flowData.initiatedBy || this.currentUserId,
        requesterName: this.extractRequesterName(flowData),
        
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
   * Convert task data to StepInstance format for Service Desk display
   * Maps custom-flow-engine task structure to Services+ StepInstance
   */
  private convertTaskToStepInstance(taskData: any, flowDetail?: any): StepInstance {
    console.log(`[ConductorAdapterRequester] Converting task to StepInstance:`, {
      taskId: taskData.taskId || taskData.id,
      title: taskData.title,
      taskDefName: taskData.taskDefName,
      status: taskData.status,
      assignment: taskData.assignment,
      hasFlowDetail: !!flowDetail,
      flowDetailKeys: flowDetail ? Object.keys(flowDetail) : []
    });
    
    // Map custom-flow-engine task status to Services+ StepStatus
    const status = this.mapCustomFlowTaskStatus(taskData.status);
    
    // Determine desk from task assignment or flow context
    const desk = this.determineTaskDesk(taskData, flowDetail?.steps || []);
    
    // Extract assignment information
    const assignment = taskData.assignment || {};
    const claimedByUserId = assignment.assignmentStatus === 'CLAIMED' ? assignment.assignedTo : undefined;
    const assignedToUserId = assignment.assignmentStatus === 'ASSIGNED' ? assignment.assignedTo : undefined;
    
    // Extract requester name from flow detail
    const extractedRequesterName = this.extractRequesterName(flowDetail);
    console.log(`[ConductorAdapterRequester] 🔍 Requester name extraction result: ${extractedRequesterName}`);
    
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
      requestId: taskData.flowId,
      requesterId: flowDetail?.initiatedBy || this.currentUserId, // Get from flow context
      requesterName: extractedRequesterName,
      availableActions: taskData.availableActions || this.getDefaultAvailableActions(taskData),
      dueDate: taskData.dueDate
    };
    
    console.log(`[ConductorAdapterRequester] ✅ Converted to StepInstance:`, {
      id: stepInstance.id,
      name: stepInstance.name,
      desk: stepInstance.desk,
      status: stepInstance.status,
      claimedBy: stepInstance.claimedByUserId,
      assignedTo: stepInstance.assignedToUserId,
      requesterId: stepInstance.requesterId,
      requesterName: stepInstance.requesterName,
      startedAt: stepInstance.startedAt, // ✅ ADD TIMESTAMP LOGGING
      updatedAt: stepInstance.updatedAt  // ✅ ADD TIMESTAMP LOGGING
    });
    
    return stepInstance;
  }

  /**
   * Map custom-flow-engine task status to Services+ StepStatus
   */
  private mapCustomFlowTaskStatus(taskStatus: string): StepStatus {
    const statusMapping: Record<string, StepStatus> = {
      'OPEN': 'ready',
      'SCHEDULED': 'ready',
      'IN_PROGRESS': 'in_progress',
      'COMPLETED': 'done',
      'REJECTED': 'canceled',
      'FAILED': 'blocked'
    };
    
    return statusMapping[taskStatus] || 'pending';
  }

  /**
   * Get default available actions based on task state
   */
  private getDefaultAvailableActions(taskData: any): AvailableActions {
    const assignment = taskData.assignment || {};
    const status = taskData.status;
    const isClaimable = assignment.assignmentStatus === 'CLAIMABLE';
    const isClaimed = assignment.assignmentStatus === 'CLAIMED' && assignment.assignedTo === this.currentUserId;
    const isAssigned = assignment.assignmentStatus === 'ASSIGNED' && assignment.assignedTo === this.currentUserId;
    
    return {
      canClaim: isClaimable && status === 'OPEN',
      canUnclaim: isClaimed,
      canComplete: (isClaimed || isAssigned) && status === 'IN_PROGRESS',
      canReassign: isAssigned || isClaimed,
      canReject: (isClaimed || isAssigned) && status === 'IN_PROGRESS',
      canComment: true
    };
  }

  /**
   * Extract requester name from flow detail data
   * Tries multiple possible fields where user name might be stored
   */
  private extractRequesterName(flowDetail: any): string | undefined {
    if (!flowDetail) {
      console.log(`[ConductorAdapterRequester] ❌ No flowDetail provided for name extraction`);
      return undefined;
    }
    
    console.log(`[ConductorAdapterRequester] 🔍 DEBUG: Attempting to extract requester name from flow:`, {
      flowId: flowDetail.flowId || flowDetail.id,
      initiatedBy: flowDetail.initiatedBy,
      availableKeys: Object.keys(flowDetail),
      hasContext: !!flowDetail.context,
      hasInput: !!flowDetail.input,
      hasInputValues: !!flowDetail.input?.inputValues,
      hasFormData: !!flowDetail.formData
    });
    
    // Check various possible locations for user name
    const possibleNames = [
      flowDetail.context?.requesterName,  // ✨ NEW: From context data we now send
      flowDetail.initiatorName,           // Direct initiator name field
      flowDetail.initiatedByName,        // Alternative name field
      flowDetail.requestedBy?.name,       // Nested user object
      flowDetail.createdBy?.name,         // Created by user object
      flowDetail.input?.requesterName,    // From input data
      flowDetail.input?.inputValues?.requesterName, // From nested input data
      flowDetail.formData?.requesterName, // From form data
      flowDetail.metadata?.initiatorName  // From metadata
    ];
    
    // Debug: Log what we're checking
    console.log(`[ConductorAdapterRequester] 🔍 Checking possible name fields:`, {
      contextRequesterName: flowDetail.context?.requesterName,  // ⭐ This should now have the name!
      initiatorName: flowDetail.initiatorName,
      initiatedByName: flowDetail.initiatedByName,
      inputRequesterName: flowDetail.input?.requesterName,
      inputValuesRequesterName: flowDetail.input?.inputValues?.requesterName,
      formDataRequesterName: flowDetail.formData?.requesterName
    });
    
    // Return the first non-empty name found
    for (const name of possibleNames) {
      if (name && typeof name === 'string' && name.trim().length > 0) {
        console.log(`[ConductorAdapterRequester] ✅ Found requester name: ${name}`);
        return name.trim();
      }
    }
    
    // If no name found, try to extract from initiator ID if it looks like an email
    const initiatorId = flowDetail.initiatedBy;
    if (initiatorId && typeof initiatorId === 'string') {
      console.log(`[ConductorAdapterRequester] 🔍 Checking initiator ID: ${initiatorId}`);
      
      // If it's an email, use the part before @
      if (initiatorId.includes('@')) {
        const emailName = initiatorId.split('@')[0];
        console.log(`[ConductorAdapterRequester] 📧 Extracted name from email: ${emailName}`);
        return emailName;
      }
      
      // If it's a readable string (not a UUID), use it as is
      if (!this.isUUID(initiatorId)) {
        console.log(`[ConductorAdapterRequester] 📝 Using non-UUID initiator as name: ${initiatorId}`);
        return initiatorId;
      }
    }
    
    console.log(`[ConductorAdapterRequester] ⚠️ Could not extract requester name from flow, available keys:`, Object.keys(flowDetail));
    
    // Fallback: If the flow was initiated by the current user, use their display name
    if (flowDetail.initiatedBy === this.currentUserId) {
      const currentUserDisplayName = this.getRequesterDisplayName();
      console.log(`[ConductorAdapterRequester] 💡 Using current user display name as fallback: ${currentUserDisplayName}`);
      return currentUserDisplayName;
    }
    
    return undefined;
  }

  /**
   * Check if a string is a UUID format
   */
  private isUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
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


  // =================================================================================
  // ENHANCED METHODS - Aligned with custom-flow-engine v2 APIs
  // =================================================================================

  /**
   * Get comprehensive request with history
   */
  async getRequestWithHistory(requestId: string): Promise<RequestWithHistory> {
    try {
      console.log(`[ConductorAdapter] Getting request with history: ${requestId}`);

      const [basicRequest, history] = await Promise.all([
        this.getRequest(requestId),
        this.makeRequest(`/api/flows/${requestId}/history`)
      ]);

      return {
        ...basicRequest,
        comprehensiveHistory: history.events || []
      };

    } catch (error) {
      console.error('[ConductorAdapter] Error getting request with history:', error);
      throw new Error(`Failed to get request with history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user tasks with enhanced filtering
   */
  async getUserTasks(userId: string, filters?: {
    includeAssigned?: boolean;
    includeClaimable?: boolean;
    status?: string;
    limit?: number;
  }): Promise<StepInstance[]> {
    try {
      console.log(`[ConductorAdapter] Getting user tasks for: ${userId}`, filters);

      const params = new URLSearchParams();
      if (filters?.includeAssigned !== undefined) params.set('includeAssigned', filters.includeAssigned.toString());
      if (filters?.includeClaimable !== undefined) params.set('includeClaimable', filters.includeClaimable.toString());
      if (filters?.status) params.set('status', filters.status);
      if (filters?.limit) params.set('limit', filters.limit.toString());

      const result = await this.makeRequest(`/api/tasks/user/${userId}?${params.toString()}`);
      
      const tasks = result.tasks || [];
      return tasks.map((task: any) => this.convertTaskToStepInstance(task));

    } catch (error) {
      console.error('[ConductorAdapter] Error getting user tasks:', error);
      throw new Error(`Failed to get user tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get task statistics for a user
   */
  async getTaskStatistics(userId: string): Promise<TaskStatistics> {
    try {
      console.log(`[ConductorAdapter] Getting task statistics for: ${userId}`);

      const result = await this.makeRequest(`/api/tasks/user/${userId}/stats`);
      
      return {
        assigned: result.statistics?.assigned || 0,
        claimable: result.statistics?.claimable || 0,
        completed: result.statistics?.completed || 0,
        rejected: result.statistics?.rejected || 0,
        totalActive: result.statistics?.totalActive || 0
      };

    } catch (error) {
      console.error('[ConductorAdapter] Error getting task statistics:', error);
      throw new Error(`Failed to get task statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Claim method - matches custom-flow-engine API contract
   */
  async claim(stepId: string, userId: string): Promise<void> {
    try {
      console.log(`[ConductorAdapter] Claiming step: ${stepId} by user: ${userId}`);

      await this.makeRequest(`/api/tasks/${stepId}/claim`, {
        method: 'POST',
        body: JSON.stringify({
          userId
        }),
      });

    } catch (error) {
      console.error('[ConductorAdapter] Error claiming step:', error);
      throw new Error(`Failed to claim step: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Unclaim a task
   */
  async unclaim(stepId: string, userId: string, comment?: string): Promise<void> {
    try {
      console.log(`[ConductorAdapter] Unclaiming step: ${stepId} by user: ${userId}`);

      await this.makeRequest(`/api/tasks/${stepId}/unclaim`, {
        method: 'POST',
        body: JSON.stringify({
          userId,
          comment
        }),
      });

    } catch (error) {
      console.error('[ConductorAdapter] Error unclaiming step:', error);
      throw new Error(`Failed to unclaim step: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Enhanced assign method with comment support
   */
  async assign(stepId: string, userId: string, assignToUserId: string, comment?: string): Promise<void> {
    try {
      console.log(`[ConductorAdapter] Assigning step: ${stepId} from ${userId} to ${assignToUserId}`);

      await this.makeRequest(`/api/tasks/${stepId}/reassign`, {
        method: 'POST',
        body: JSON.stringify({
          currentUserId: userId,
          newUserId: assignToUserId,
          comment
        }),
      });

    } catch (error) {
      console.error('[ConductorAdapter] Error assigning step:', error);
      throw new Error(`Failed to assign step: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Unassign a task
   */
  async unassign(stepId: string, userId: string, comment?: string): Promise<void> {
    try {
      console.log(`[ConductorAdapter] Unassigning step: ${stepId} by user: ${userId}`);

      await this.makeRequest(`/api/tasks/${stepId}/unassign`, {
        method: 'POST',
        body: JSON.stringify({
          userId,
          comment
        }),
      });

    } catch (error) {
      console.error('[ConductorAdapter] Error unassigning step:', error);
      throw new Error(`Failed to unassign step: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Reassign a task
   */
  async reassign(stepId: string, currentUserId: string, newUserId: string, comment?: string): Promise<void> {
    try {
      console.log(`[ConductorAdapter] Reassigning step: ${stepId} from ${currentUserId} to ${newUserId}`);

      await this.makeRequest(`/api/tasks/${stepId}/reassign`, {
        method: 'POST',
        body: JSON.stringify({
          currentUserId,
          newUserId,
          comment
        }),
      });

    } catch (error) {
      console.error('[ConductorAdapter] Error reassigning step:', error);
      throw new Error(`Failed to reassign step: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Enhanced advance method with comment support
   */
  async advance(stepId: string, userId: string, payload?: any, comment?: string): Promise<void> {
    try {
      console.log(`[ConductorAdapter] Advancing step: ${stepId} by user: ${userId}`);

      await this.makeRequest(`/api/tasks/${stepId}/complete`, {
        method: 'POST',
        body: JSON.stringify({
          userId,
          formData: payload,
          comment
        }),
      });

    } catch (error) {
      console.error('[ConductorAdapter] Error advancing step:', error);
      throw new Error(`Failed to advance step: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Reject a task
   */
  async reject(stepId: string, userId: string, reason: string): Promise<void> {
    try {
      console.log(`[ConductorAdapter] Rejecting step: ${stepId} by user: ${userId}`);

      await this.makeRequest(`/api/tasks/${stepId}/reject`, {
        method: 'POST',
        body: JSON.stringify({
          userId,
          comment: reason
        }),
      });

    } catch (error) {
      console.error('[ConductorAdapter] Error rejecting step:', error);
      throw new Error(`Failed to reject step: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Enhanced comment method with userId parameter
   */
  async comment(stepId: string, userId: string, body: string): Promise<Comment> {
    try {
      console.log(`[ConductorAdapter] Adding comment to step: ${stepId} by user: ${userId}`);

      const result = await this.makeRequest(`/api/tasks/${stepId}/comment`, {
        method: 'POST',
        body: JSON.stringify({
          userId,
          comment: body
        }),
      });
      
      return {
        id: result.taskId || Date.now().toString(),
        stepId,
        authorId: userId,
        createdAt: new Date().toISOString(),
        body,
        visibility: 'current_and_downstream',
        action: 'COMMENT'
      };

    } catch (error) {
      console.error('[ConductorAdapter] Error adding comment:', error);
      throw new Error(`Failed to add comment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get task comments
   */
  async getTaskComments(stepId: string): Promise<Comment[]> {
    try {
      console.log(`[ConductorAdapter] Getting comments for step: ${stepId}`);

      const task = await this.makeRequest(`/api/tasks/${stepId}?userId=${this.currentUserId}`);
      
      // Extract comments from task data - assuming comments are in task response
      return task.comments || [];

    } catch (error) {
      console.error('[ConductorAdapter] Error getting task comments:', error);
      throw new Error(`Failed to get task comments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get flow comments
   */
  async getFlowComments(flowId: string): Promise<FlowComment[]> {
    try {
      console.log(`[ConductorAdapter] Getting flow comments for: ${flowId}`);

      const result = await this.makeRequest(`/api/flows/${flowId}/comments`);
      
      return result.comments || [];

    } catch (error) {
      console.error('[ConductorAdapter] Error getting flow comments:', error);
      throw new Error(`Failed to get flow comments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a specific task with enhanced details
   */
  async getTask(stepId: string, userId?: string): Promise<StepInstance> {
    try {
      console.log(`[ConductorAdapter] Getting task: ${stepId} for user: ${userId || 'anonymous'}`);

      const params = userId ? `?userId=${userId}` : '';
      const result = await this.makeRequest(`/api/tasks/${stepId}${params}`);
      
      return this.convertTaskToStepInstance(result);

    } catch (error) {
      console.error('[ConductorAdapter] Error getting task:', error);
      throw new Error(`Failed to get task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get available actions for a task
   */
  async getAvailableActions(stepId: string, userId: string): Promise<AvailableActions> {
    try {
      console.log(`[ConductorAdapter] Getting available actions for step: ${stepId} and user: ${userId}`);

      const result = await this.makeRequest(`/api/tasks/${stepId}/actions?userId=${userId}`);
      
      const actions = result.availableActions || [];
      
      return {
        canClaim: actions.includes('CLAIM'),
        canUnclaim: actions.includes('UNCLAIM'),
        canComplete: actions.includes('COMPLETE'),
        canReassign: actions.includes('REASSIGN'),
        canReject: actions.includes('REJECT'),
        canComment: true // Comments are generally always available
      };

    } catch (error) {
      console.error('[ConductorAdapter] Error getting available actions:', error);
      throw new Error(`Failed to get available actions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sync tasks (optional maintenance operation)
   */
  async syncTasks(): Promise<{ tasksSynced: number; message: string }> {
    try {
      console.log(`[ConductorAdapter] Triggering task synchronization`);

      const result = await this.makeRequest('/api/tasks/sync', {
        method: 'POST',
      });
      
      return {
        tasksSynced: result.tasksSynced || 0,
        message: result.message || 'Synchronization completed'
      };

    } catch (error) {
      console.error('[ConductorAdapter] Error syncing tasks:', error);
      throw new Error(`Failed to sync tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Enhanced getMyRequests with optional userId parameter
   */
  async getMyRequests(userId?: string): Promise<SubmittedRequest[]> {
    const targetUserId = userId || this.currentUserId;
    try {
      console.log(`[ConductorAdapter] Getting requests for user: ${targetUserId}`);

      // Step 1: Get list of flows initiated by the user  
      const listResponse = await this.makeRequest(`/api/flows/user/${targetUserId}/initiated?limit=50&offset=0`);

      const flows = listResponse.data?.flows || listResponse.flows || [];
      console.log(`[ConductorAdapter] Found ${flows.length} flows for user ${targetUserId}`);

      // Step 2: Get detailed information for each flow in parallel
      const detailPromises = flows.map(async (flow: any) => {
        try {
          const flowId = flow.flowId || flow.id;
          console.log(`[ConductorAdapter] Getting details for flow: ${flowId}`);
          
          const detailResponse = await this.makeRequest(`/api/flows/${flowId}`);
          const transformed = this.convertFlowToSubmittedRequest(detailResponse);
          console.log(`[ConductorAdapter] ✅ Successfully processed flow ${flowId}`);
          return transformed;
        } catch (error) {
          console.warn(`[ConductorAdapter] ❌ Failed to get details for flow ${flow.flowId || flow.id}:`, error);
          return null;
        }
      });

      const detailedFlows = await Promise.all(detailPromises);
      const validFlows = detailedFlows.filter(flow => flow !== null);

      console.log(`[ConductorAdapter] Successfully retrieved ${validFlows.length} detailed flows`);
      return validFlows;

    } catch (error) {
      console.error('[ConductorAdapter] Error getting user requests:', error);
      throw new Error(`Failed to get user requests: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get real active tickets for a specific desk from custom-flow-engine
   * Uses the SAME API as what actually works for claiming
   */
  async getDeskTickets(desk: StepReceiver, userId?: string): Promise<StepInstance[]> {
    try {
      console.log(`[ConductorAdapter] Getting REAL tickets for desk: ${desk} using custom-flow-engine API`);

      // Use the actual custom-flow-engine API that we know works
      const response = await fetch(`${this.flowEngineBaseUrl}/api/tasks/user/${this.currentUserId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get user tasks: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const tasks = result.tasks || [];

      console.log(`[ConductorAdapter] Retrieved ${tasks.length} REAL tasks from custom-flow-engine:`, tasks.map(t => t.id));
      
      // Convert custom-flow-engine tasks to StepInstance format
      const stepInstances = tasks.map((task: any) => this.convertCustomFlowEngineTaskToStepInstance(task, desk));
      
      console.log(`[ConductorAdapter] Converted to ${stepInstances.length} StepInstances for desk: ${desk}`);
      return stepInstances;

    } catch (error) {
      console.error(`[ConductorAdapter] Error getting real desk tickets:`, error);
      throw new Error(`Failed to get desk tickets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert custom-flow-engine task to StepInstance format
   */
  private convertCustomFlowEngineTaskToStepInstance(task: any, desk: StepReceiver): StepInstance {
    const taskId = task.id;
    
    return {
      id: taskId,
      name: task.title || 'Unnamed Task',
      stepIndex: 0,
      status: this.mapCustomFlowEngineStatusToStepStatus(task.status),
      desk: desk,
      requesterId: task.workflowMeta?.rootWorkflowId || 'unknown',
      requesterName: undefined,
      startedAt: task.scheduledAt || new Date().toISOString(),
      dueAt: task.dueDate,
      formSchema: task.form || [],
      data: task.inputs || {},
      assignedToUserId: task.assignment?.assignedTo,
      claimedByUserId: task.assignment?.assignedTo,
      allowReassignment: task.assignment?.allowReassignment || false,
    };
  }

  /**
   * Map custom-flow-engine task status to StepInstance status
   */
  private mapCustomFlowEngineStatusToStepStatus(status: string): 'ready' | 'in-progress' | 'completed' | 'cancelled' {
    switch (status?.toUpperCase()) {
      case 'SCHEDULED':
      case 'OPEN':
        return 'ready';
      case 'IN_PROGRESS':
        return 'in-progress';
      case 'COMPLETED':
        return 'completed';
      case 'REJECTED':
      case 'FAILED':
        return 'cancelled';
      default:
        return 'ready';
    }
  }

  /**
   * Extract real active tasks from a flow that belong to a specific desk
   * This analyzes the flow's actual task data from the workflow engine, not synthetic data
   */
  private async extractRealTasksForDesk(flowDetail: any, targetDesk: StepReceiver): Promise<StepInstance[]> {
    try {
      const tasks: StepInstance[] = [];
      const flowId = flowDetail.flowId || flowDetail.id || flowDetail.workflowId;
      
      console.log(`[ConductorAdapter] Extracting REAL tasks from flow ${flowId} for desk: ${targetDesk}`);
      
      // Get active tasks from the flow - these should be actual Conductor tasks
      const activeTasks = flowDetail.tasks || flowDetail.activeTasks || [];
      const flowSteps = flowDetail.steps || [];
      
      console.log(`[ConductorAdapter] Flow ${flowId} has ${activeTasks.length} active tasks and ${flowSteps.length} steps`);
      
      // Process actual active tasks (these are real tasks from Conductor waiting for action)
      for (const task of activeTasks) {
        // Only include tasks that are actively waiting for action
        if (task.status === 'SCHEDULED' || task.status === 'IN_PROGRESS') {
          
          // Determine which desk this task belongs to based on its assignment
          const taskDesk = this.determineTaskDesk(task, flowSteps);
          
          if (taskDesk === targetDesk) {
            // Convert to StepInstance format with flow context
            const stepInstance = this.convertTaskToStepInstance(task, flowDetail);
            
            tasks.push(stepInstance);
            console.log(`[ConductorAdapter] ✅ Found REAL ${targetDesk} task: ${task.taskDefName} (${task.taskId})`);
          }
        }
      }
      
      // If no active tasks but we have flow steps, check if any steps are waiting to be executed
      if (activeTasks.length === 0 && flowSteps.length > 0) {
        console.log(`[ConductorAdapterRequester] No active tasks found, checking ${flowSteps.length} flow steps for pending execution...`);
        
        // Debug: Log the flow steps structure
        console.log(`[ConductorAdapterRequester] 🔍 Flow steps structure:`, flowSteps.map((step, i) => ({
          index: i,
          title: step.title,
          type: step.type,
          status: step.status,
          hasAssignment: !!step.assignment,
          keys: Object.keys(step)
        })));
        
        // Find the current step that should be active
        const currentStepIndex = this.findCurrentStepIndex(flowDetail);
        console.log(`[ConductorAdapterRequester] Current step index: ${currentStepIndex}`);
        
        if (currentStepIndex !== -1 && currentStepIndex < flowSteps.length) {
          const currentStep = flowSteps[currentStepIndex];
          const stepDesk = this.determineStepDesk(currentStep);
          
          console.log(`[ConductorAdapterRequester] 🔍 Current step analysis:`, {
            stepIndex: currentStepIndex,
            stepTitle: currentStep.title,
            stepType: currentStep.type,
            stepDesk: stepDesk,
            targetDesk: targetDesk,
            isMatch: stepDesk === targetDesk,
            isTask: currentStep.type === 'TASK'
          });
          
          if (stepDesk === targetDesk && currentStep.type === 'TASK') {
            // Create a task representation from the current step
            const syntheticTaskId = `${flowId}_current_step_${currentStepIndex}`;
            console.log(`[ConductorAdapterRequester] 🔧 Building task ID:`, {
              flowId: flowId,
              currentStepIndex: currentStepIndex,
              stepIndexType: typeof currentStepIndex,
              syntheticTaskId: syntheticTaskId,
              taskIdLength: syntheticTaskId.length
            });
            
            const stepTask = {
              taskId: syntheticTaskId,
              taskDefName: currentStep.title || `Step ${currentStepIndex + 1}`,
              title: currentStep.title || `Step ${currentStepIndex + 1}`, // Add both fields
              status: 'SCHEDULED',
              assignment: currentStep.assignment,
              flowId: flowId,
              stepIndex: currentStepIndex,
              // ✅ ADD PROPER TIMESTAMPS from flow data
              scheduledAt: flowDetail.createdAt, // When the flow was created
              updatedAt: flowDetail.createdAt // For now, use creation time (can be enhanced based on step status)
            };
            
            console.log(`[ConductorAdapterRequester] 🔧 Creating synthetic task:`, stepTask);
            
            const stepInstance = this.convertTaskToStepInstance(stepTask, flowDetail);
            console.log(`[ConductorAdapterRequester] 🔍 FINAL STEP INSTANCE ID:`, {
              originalTaskId: stepTask.taskId,
              stepInstanceId: stepInstance.id,
              stepInstanceName: stepInstance.name,
              areIdsEqual: stepTask.taskId === stepInstance.id
            });
            
            tasks.push(stepInstance);
            console.log(`[ConductorAdapterRequester] ✅ Created synthetic ${targetDesk} task: ${stepInstance.name} (RequesterId: ${stepInstance.requesterId}, RequesterName: ${stepInstance.requesterName})`);
          }
        } else {
          console.log(`[ConductorAdapterRequester] ❌ No valid current step found (index: ${currentStepIndex}, total steps: ${flowSteps.length})`);
        }
      }
      
      return tasks;
    } catch (error) {
      console.error(`[ConductorAdapter] Error extracting real tasks for desk ${targetDesk}:`, error);
      return [];
    }
  }

  /**
   * Determine which desk a task belongs to based on its assignment information
   */
  private determineTaskDesk(task: any, flowSteps: any[]): StepReceiver {
    try {
      // First, try to get assignment from the task itself
      if (task.assignment?.targets) {
        return this.mapAssignmentTargetsToDesk(task.assignment.targets);
      }
      
      // If no direct assignment, try to find the corresponding step in the flow
      if (task.taskDefName && flowSteps.length > 0) {
        const matchingStep = flowSteps.find(step => 
          step.title === task.taskDefName || 
          step.title?.includes(task.taskDefName) ||
          task.taskDefName?.includes(step.title)
        );
        
        if (matchingStep?.assignment?.targets) {
          return this.mapAssignmentTargetsToDesk(matchingStep.assignment.targets);
        }
      }
      
      // Fallback: analyze task name for desk hints
      return this.inferDeskFromTaskName(task.taskDefName || '');
    } catch (error) {
      console.warn(`[ConductorAdapter] Error determining desk for task:`, error);
      return 'HR'; // Safe fallback
    }
  }

  /**
   * Determine which desk a step belongs to based on its assignment information
   */
  private determineStepDesk(step: any): StepReceiver {
    if (step.assignment?.targets) {
      return this.mapAssignmentTargetsToDesk(step.assignment.targets);
    }
    return this.inferDeskFromTaskName(step.title || '');
  }

  /**
   * Map assignment targets to service desk
   */
  private mapAssignmentTargetsToDesk(targets: any): StepReceiver {
    // Check organizational units first
    if (targets.organizationalUnits?.length > 0) {
      const orgUnit = targets.organizationalUnits[0].toLowerCase();
      if (orgUnit.includes('hr') || orgUnit === 'ou_hr_001') return 'HR';
      if (orgUnit.includes('it') || orgUnit === 'ou_it_001') return 'IT';
      if (orgUnit.includes('finance')) return 'Finance';
      if (orgUnit.includes('facilities')) return 'Facilities';
    }
    
    // Check capabilities
    if (targets.capabilities?.length > 0) {
      const capabilities = targets.capabilities.join(',').toLowerCase();
      if (capabilities.includes('hr')) return 'HR';
      if (capabilities.includes('it')) return 'IT';
      if (capabilities.includes('finance')) return 'Finance';
      if (capabilities.includes('facilities')) return 'Facilities';
    }
    
    return 'HR'; // Default fallback
  }

  /**
   * Infer desk from task/step name when no explicit assignment is available
   */
  private inferDeskFromTaskName(taskName: string): StepReceiver {
    const name = taskName.toLowerCase();
    if (name.includes('hr') || name.includes('onboarding') || name.includes('training')) return 'HR';
    if (name.includes('it') || name.includes('system') || name.includes('equipment')) return 'IT';
    if (name.includes('finance') || name.includes('budget')) return 'Finance';
    if (name.includes('facilities') || name.includes('office') || name.includes('workspace')) return 'Facilities';
    return 'HR'; // Default fallback
  }

  /**
   * Find the current step index in a flow (the step that should be active)
   */
  private findCurrentStepIndex(flowDetail: any): number {
    // This is a simplified implementation
    // In a real scenario, you'd analyze the flow's execution state
    const steps = flowDetail.steps || [];
    if (steps.length === 0) return -1;
    
    // For now, return the first step that hasn't been completed
    // This would need to be enhanced based on your flow's state tracking
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (step.status !== 'COMPLETED' && step.status !== 'DONE') {
        return i;
      }
    }
    
    return -1; // No current step found
  }

  /**
   * Get detailed information for a specific ticket/task
   * Handles synthetic task IDs: {flowId}_current_step_{stepIndex}
   */
  async getTicketDetail(ticketId: string): Promise<StepInstance | null> {
    try {
      console.log(`[ConductorAdapterRequester] 🔍 Getting ticket detail for: ${ticketId}`);
      
      // Parse synthetic task ID to extract flow ID and step index
      const match = ticketId.match(/^(.+)_current_step_(\d+)$/);
      if (!match) {
        console.error(`[ConductorAdapterRequester] ❌ Invalid synthetic task ID format: ${ticketId}`);
        throw new Error(`Invalid task ID format: ${ticketId}`);
      }
      
      const [, flowId, stepIndexStr] = match;
      const stepIndex = parseInt(stepIndexStr, 10);
      
      console.log(`[ConductorAdapterRequester] 🔍 Parsed task ID:`, {
        originalTaskId: ticketId,
        extractedFlowId: flowId,
        extractedStepIndex: stepIndex,
        isValidStepIndex: !isNaN(stepIndex)
      });
      
      // Fetch the flow details
      const response = await fetch(`${this.flowEngineBaseUrl}/api/flows/${flowId}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });
      
      if (!response.ok) {
        console.error(`[ConductorAdapterRequester] ❌ Failed to fetch flow ${flowId}: ${response.status} ${response.statusText}`);
        throw new Error(`Failed to fetch flow details: ${response.status} ${response.statusText}`);
      }
      
      const flowDetail = await response.json();
      console.log(`[ConductorAdapterRequester] ✅ Fetched flow detail:`, {
        flowId: flowId,
        hasSteps: !!(flowDetail.steps && flowDetail.steps.length > 0),
        stepCount: flowDetail.steps?.length || 0,
        requestedStepIndex: stepIndex
      });
      
      // Validate step index
      const flowSteps = flowDetail.steps || [];
      if (stepIndex >= flowSteps.length || stepIndex < 0) {
        console.error(`[ConductorAdapterRequester] ❌ Invalid step index ${stepIndex} for flow with ${flowSteps.length} steps`);
        throw new Error(`Step index ${stepIndex} out of range for flow with ${flowSteps.length} steps`);
      }
      
      // Get the specific step
      const targetStep = flowSteps[stepIndex];
      console.log(`[ConductorAdapterRequester] 🎯 Target step:`, {
        stepIndex: stepIndex,
        stepTitle: targetStep.title,
        stepType: targetStep.type
      });
      
      // Create synthetic task for this specific step
      const syntheticTask = {
        taskId: ticketId, // Use the original ticket ID
        taskDefName: targetStep.title || `Step ${stepIndex + 1}`,
        title: targetStep.title || `Step ${stepIndex + 1}`,
        status: 'SCHEDULED',
        assignment: targetStep.assignment,
        flowId: flowId,
        stepIndex: stepIndex
      };
      
      // Convert to StepInstance using existing logic
      const stepInstance = this.convertTaskToStepInstance(syntheticTask, flowDetail);
      
      console.log(`[ConductorAdapterRequester] ✅ Created ticket detail:`, {
        ticketId: stepInstance.id,
        name: stepInstance.name,
        desk: stepInstance.desk,
        requesterId: stepInstance.requesterId,
        requesterName: stepInstance.requesterName
      });
      
      return stepInstance;
      
    } catch (error) {
      console.error(`[ConductorAdapterRequester] ❌ Error getting ticket detail:`, error);
      throw new Error(`Failed to get ticket details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all templates from custom-flow-engine for development purposes
   * @param options Query options for filtering templates
   */
  async getTemplates(options?: {
    limit?: number;
    offset?: number;
    onlyLatest?: boolean;
    includeDrafts?: boolean;
    search?: string;
  }): Promise<{
    status: string;
    count: number;
    totalCount: number;
    hasMore: boolean;
    data: any[];
  }> {
    try {
      console.log(`[ConductorAdapterRequester] 📋 Fetching templates from custom-flow-engine:`, options);
      
      const queryParams = new URLSearchParams();
      if (options?.limit) queryParams.append('limit', options.limit.toString());
      if (options?.offset) queryParams.append('offset', options.offset.toString());
      if (options?.onlyLatest !== undefined) queryParams.append('onlyLatest', options.onlyLatest.toString());
      if (options?.includeDrafts !== undefined) queryParams.append('includeDrafts', options.includeDrafts.toString());
      if (options?.search) queryParams.append('search', options.search);

      const url = `${this.flowEngineBaseUrl}/api/templates?${queryParams.toString()}`;
      console.log(`[ConductorAdapterRequester] 🔗 Templates API URL:`, url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch templates: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`[ConductorAdapterRequester] ✅ Templates fetched successfully:`, {
        count: result.count,
        totalCount: result.totalCount,
        hasMore: result.hasMore
      });

      return result;
    } catch (error) {
      console.error(`[ConductorAdapterRequester] ❌ Error fetching templates:`, error);
      throw error;
    }
  }

}

/**
 * Factory function to create ConductorWorkflowEngineAdapter instance
 */
export const createConductorWorkflowEngine = (context: BusinessAppContextProps): WorkflowEngine => {
  return new ConductorWorkflowEngineAdapter(context);
};
