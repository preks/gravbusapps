import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { FlowTemplate } from '../models/flowTemplate';
import { Task, TaskDefinition, TaskStatus } from '../models/task';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { StatusCodes } from 'http-status-codes';

const conductorApiUrl = process.env.CONDUCTOR_API_URL || 'http://localhost:8080/api';

const conductorClient = axios.create({
  baseURL: conductorApiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Register custom task definitions with Conductor
 */
export const registerTaskDefinitions = async (): Promise<void> => {
  try {
    // Define the CLAIM task type
    const claimTaskDef: TaskDefinition = {
      name: 'CLAIM',
      description: 'Task type for claiming a workflow task by a user',
      retryCount: 0,
      timeoutSeconds: 0, // No timeout, as it needs explicit claiming
      timeoutPolicy: 'ALERT_ONLY',
      inputKeys: ['userId', 'taskId'],
      outputKeys: ['userId', 'taskId', 'claimed'],
      ownerEmail: 'admin@newwork.com',
      type: 'SIMPLE',
    };

    // Register the CLAIM task definition only
    // Note: We'll use the built-in HUMAN task type from Conductor
    await conductorClient.post('/metadata/taskdefs', [claimTaskDef]);
    logger.info('CLAIM task definition registered successfully');
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 409) {
      logger.info('CLAIM task definition already exists');
    } else {
      logger.error('Failed to register CLAIM task definition', error);
      throw new AppError('Failed to register CLAIM task definition', StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
};

/**
 * Transform UI assignment structure to backend assignment structure
 */
const transformUIAssignmentToBackend = (step: any): any => {
  // If step has usePredefinedAssignment structure (UI format)
  if (step.usePredefinedAssignment?.enabled && step.usePredefinedAssignment.assignment) {
    const uiAssignment = step.usePredefinedAssignment.assignment;
    
    // Convert UI TaskAssignment to backend Assignment
    const backendAssignment: any = {
      type: 'SPECIFIC_USERS', // Default type
      userIds: [],
      roleIds: [],
      departmentIds: []
    };
    
    // Process targets and convert to appropriate arrays
    if (uiAssignment.targets && Array.isArray(uiAssignment.targets)) {
      uiAssignment.targets.forEach((target: any) => {
        switch (target.entity) {
          case 'user':
            backendAssignment.userIds.push(target.id);
            backendAssignment.type = 'SPECIFIC_USERS';
            break;
          case 'role':
            backendAssignment.roleIds.push(target.id);
            backendAssignment.type = 'ROLE_BASED';
            break;
          case 'department':
            backendAssignment.departmentIds.push(target.id);
            backendAssignment.type = 'DEPARTMENT';
            break;
        }
      });
    }
    
    // Preserve additional properties
    backendAssignment.assignmentMode = uiAssignment.assignmentMode;
    backendAssignment.allowReassignment = uiAssignment.allowReassignment;
    
    return backendAssignment;
  }
  
  // If step already has backend assignment structure, return as-is
  if (step.assignment) {
    return step.assignment;
  }
  
  // No assignment
  return null;
};

/**
 * Transform backend assignment structure to UI assignment structure
 */
const transformBackendAssignmentToUI = (assignment: any): any => {
  if (!assignment) return null;
  
  // If it's already UI format, return as-is
  if (assignment.targets && assignment.assignmentMode !== undefined) {
    return {
      enabled: true,
      assignment: assignment
    };
  }
  
  // Convert backend Assignment to UI TaskAssignment
  const targets: any[] = [];
  
  // Convert userIds to user targets
  if (assignment.userIds && Array.isArray(assignment.userIds)) {
    assignment.userIds.forEach((userId: string) => {
      targets.push({ entity: 'user', id: userId });
    });
  }
  
  // Convert roleIds to role targets
  if (assignment.roleIds && Array.isArray(assignment.roleIds)) {
    assignment.roleIds.forEach((roleId: string) => {
      targets.push({ entity: 'role', id: roleId });
    });
  }
  
  // Convert departmentIds to department targets
  if (assignment.departmentIds && Array.isArray(assignment.departmentIds)) {
    assignment.departmentIds.forEach((departmentId: string) => {
      targets.push({ entity: 'department', id: departmentId });
    });
  }
  
  return {
    enabled: true,
    assignment: {
      targets: targets,
      assignmentMode: assignment.assignmentMode || 'CLAIM',
      allowReassignment: assignment.allowReassignment !== false
    }
  };
};

/**
 * Create a workflow definition from a flow template
 * Updated for simplified model and proper ID management
 */
export const createWorkflowDefinition = (template: any): any => {
  // Debug: Log template structure
  logger.info('Creating workflow definition for template:', JSON.stringify(template, null, 2));
  
  // Validate template structure
  if (!template || !template.name) {
    logger.error('Invalid template structure - missing name:', template);
    throw new AppError('Invalid template structure - missing name', StatusCodes.BAD_REQUEST);
  }
  
  if (!template.steps || !Array.isArray(template.steps)) {
    logger.error('Invalid template structure - missing or invalid steps:', template);
    throw new AppError('Invalid template structure - missing or invalid steps', StatusCodes.BAD_REQUEST);
  }
  
  // Create a clean workflow name from template name
  const cleanName = template.name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  
  const workflowName = `flow_${cleanName}`;
  const version = template.version || 1;
  
  // Use step title to make task name more readable
  const processInputBlocks = (inputBlocks: any[], stepIndex: number) => {
    return inputBlocks.map((block: any, blockIndex: number) => ({
      ...block,
      parameterName: `step${stepIndex}_${block.name}`,
      blockId: `step${stepIndex}_block${blockIndex}`,
    }));
  };
  
  const workflowTasks: any[] = [];
  
  // Process each step - always sequential execution for simplified model
  template.steps.forEach((step: any, index: number) => {
    // Validate step structure
    if (!step || !step.name) {
      logger.error(`Invalid step structure at index ${index} - missing name:`, step);
      throw new AppError(`Invalid step structure at index ${index} - missing name`, StatusCodes.BAD_REQUEST);
    }
    
    const stepId = `step_${index}`;
    
    // Use step title to make task name more readable
    const sanitizedTitle = step.name.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    
    // Transform assignment structure (handles both UI and backend formats)
    const transformedAssignment = transformUIAssignmentToBackend(step);
    const hasAssignment = transformedAssignment !== null;
    
    if (hasAssignment) {
      const assignment = step.assignment;
      
      // Create CLAIM task first - this handles the claiming logic
      const claimTask = {
        name: `CLAIM_${sanitizedTitle}_${stepId}`,
        taskReferenceName: `claim_${stepId}`,
        type: 'SIMPLE',
        inputParameters: {
          stepIndex: index,
          title: step.name,
          message: step.description || '',
          stepType: step.type,
          assignment: assignment,
          assignmentMode: 'CLAIM',
          taskCategory: 'CLAIM',
        },
      };
      
      // Create HUMAN task that depends on the CLAIM task
      const humanTask = {
        name: `HUMAN_${sanitizedTitle}_${stepId}`,
        taskReferenceName: `human_${stepId}`,
        type: 'HUMAN',
        inputParameters: {
          stepIndex: index,
          title: step.name,
          message: step.description || '',
          stepType: step.type,
          attachments: step.links || [],
          inputBlocks: step.inputs ? processInputBlocks(step.inputs, index) : [],
          assignment: assignment,
          assignmentMode: 'CLAIM',
          taskCategory: 'HUMAN',
          // Get the user who claimed the task
          userId: `\${claim_${stepId}.output.userId}`,
          assignee: `\${claim_${stepId}.output.userId}`,
          claimedBy: `\${claim_${stepId}.output.userId}`,
        },
      };
      
      workflowTasks.push(claimTask);
      workflowTasks.push(humanTask);
    } else {
      // No predefined assignment - will be configured at execution time
      // Still use CLAIM pattern for consistency
      const claimTask = {
        name: `CLAIM_${sanitizedTitle}_${stepId}`,
        taskReferenceName: `claim_${stepId}`,
        type: 'SIMPLE',
        inputParameters: {
          stepIndex: index,
          title: step.name,
          message: step.description || '',
          stepType: step.type,
          assignmentMode: 'CLAIM',
          executionTimeAssignment: true,
          taskCategory: 'CLAIM',
        },
      };
      
      const humanTask = {
        name: `HUMAN_${sanitizedTitle}_${stepId}`,
        taskReferenceName: `human_${stepId}`,
        type: 'HUMAN',
        inputParameters: {
          stepIndex: index,
          title: step.name,
          message: step.description || '',
          stepType: step.type,
          attachments: step.links || [],
          inputBlocks: step.inputs ? processInputBlocks(step.inputs, index) : [],
          assignmentMode: 'CLAIM',
          executionTimeAssignment: true,
          taskCategory: 'HUMAN',
          // Get the user who claimed the task
          userId: `\${claim_${stepId}.output.userId}`,
          assignee: `\${claim_${stepId}.output.userId}`,
          claimedBy: `\${claim_${stepId}.output.userId}`,
        },
      };
      
      workflowTasks.push(claimTask);
      workflowTasks.push(humanTask);
    }
  });
  
  // Create the workflow definition (always sequential for simplified model)
  const workflowDef = {
    name: workflowName,
    description: template.description,
    version: version,
    tasks: workflowTasks,
    inputParameters: [
      'initiator', 
      'context', 
      'resolvedAssignments', // Contains resolved userIds for steps with ASSIGN mode
      'executionTimeAssignments', // Contains assignments configured at execution time
    ],
    outputParameters: {
      results: workflowTasks.map(task => `\${${task.taskReferenceName}.output}`),
      completed: true,
    },
    schemaVersion: 2,
    restartable: true,
    ownerEmail: 'admin@newwork.com',
    timeoutPolicy: 'ALERT_ONLY',
    timeoutSeconds: 0,
    variables: {},
    metadata: {
      flowType: template.type || 'TEMPLATE',
      // Store the complete original template for editing
      originalTemplate: {
        ...template,
        id: workflowName, // Use workflow name as ID
      },
      assignmentResolutionRequired: template.steps.some((step: any) => {
        return step.assignment;
      }),
      executionTimeAssignmentRequired: template.steps.some((step: any) => {
        return !step.assignment;
      }),
      claimTaskPattern: true, // Indicates this workflow uses CLAIM->HUMAN task pattern
    },
  };
  
  return workflowDef;
};

/**
 * Generate a sample resolvedAssignments structure for testing
 * Updated for simplified model - resolves assignment targets to actual userIds
 */
export const generateSampleResolvedAssignments = (template: any): any => {
  const resolvedAssignments: any = {};
  
  template.steps.forEach((step: any, index: number) => {
    const hasAssignment = step.usePredefinedAssignment?.enabled && step.usePredefinedAssignment?.assignment;
    
    if (hasAssignment) {
      const assignment = step.usePredefinedAssignment.assignment;
      
      if (assignment.assignmentMode === 'ASSIGN') {
        // Generate sample resolved userIds for ASSIGN mode
        const forkedTasks: any[] = [];
        const forkedTasksInputs: any[] = [];
        
        if (assignment.targets && assignment.targets.length > 0) {
          // Use actual targets
          assignment.targets.forEach((target: any, targetIndex: number) => {
            // In production, this would resolve department/team/role to actual userIds
            const sampleUserIds = target.entity === 'user' 
              ? [target.id] 
              : [`${target.id}_user1`, `${target.id}_user2`, `${target.id}_user3`]; // Mock resolution
              
            sampleUserIds.forEach((userId: string, userIndex: number) => {
              const taskId = `step${index}_${userId}`;
              
              forkedTasks.push({
                name: `HUMAN_${taskId}`,
                taskReferenceName: `human_${taskId}`,
                type: 'HUMAN'
              });
              
              forkedTasksInputs.push({
                stepIndex: index,
                title: step.title,
                message: step.message,
                stepType: step.type,
                attachments: step.attachments || [],
                inputBlocks: step.requestInput?.enabled ? step.requestInput.inputs || [] : [],
                assignee: userId,
                assigneeType: 'user',
                assigneeName: userId,
                allowReassignment: assignment.allowReassignment || false,
                targetIndex: targetIndex,
                userIndex: userIndex,
              });
            });
          });
        } else {
          // Generate sample users when no targets specified (for testing)
          const sampleUserIds = ['sample_user1', 'sample_user2', 'sample_user3'];
          
          sampleUserIds.forEach((userId: string, userIndex: number) => {
            const taskId = `step${index}_${userId}`;
            
            forkedTasks.push({
              name: `HUMAN_${taskId}`,
              taskReferenceName: `human_${taskId}`,
              type: 'HUMAN'
            });
            
            forkedTasksInputs.push({
              stepIndex: index,
              title: step.title,
              message: step.message,
              stepType: step.type,
              attachments: step.attachments || [],
              inputBlocks: step.requestInput?.enabled ? step.requestInput.inputs || [] : [],
              assignee: userId,
              assigneeType: 'user',
              assigneeName: userId,
              allowReassignment: assignment.allowReassignment || false,
              targetIndex: 0,
              userIndex: userIndex,
            });
          });
        }
        
        resolvedAssignments[`step_${index}`] = {
          forkedTasks,
          forkedTasksInputs
        };
      }
    }
  });
  
  return resolvedAssignments;
};

/**
 * Register a workflow definition in Conductor
 * Updated to handle versioning - creates new version if workflow exists
 */
export const registerWorkflowDefinition = async (workflowDef: any): Promise<any> => {
  try {
    // Check if workflow already exists
    let existingWorkflow;
    try {
      existingWorkflow = await getWorkflowDefinition(workflowDef.name);
    } catch (error) {
      // Workflow doesn't exist, continue with registration
      existingWorkflow = null;
    }

    if (existingWorkflow) {
      // Workflow exists, create new version
      const nextVersion = (existingWorkflow.version || 1) + 1;
      workflowDef.version = nextVersion;
      logger.info(`Workflow ${workflowDef.name} exists, creating version ${nextVersion}`);
    } else {
      // New workflow, start with version 1
      workflowDef.version = workflowDef.version || 1;
      logger.info(`Creating new workflow ${workflowDef.name} version ${workflowDef.version}`);
    }

    const response = await conductorClient.put('/metadata/workflow', [workflowDef]);
    logger.info(`Workflow ${workflowDef.name} (v${workflowDef.version}) registered successfully`);
    return response.data;
  } catch (error) {
    logger.error('Failed to register workflow definition', error);
    throw new AppError('Failed to register workflow definition', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Start a workflow execution
 */
export const startWorkflow = async (workflowName: string, input: any): Promise<string> => {
  try {
    const response = await conductorClient.post('/workflow', {
      name: workflowName,
      version: 1,
      input,
    });
    const workflowId = response.data;
    logger.info(`Started workflow ${workflowName} with ID ${workflowId}`);
    return workflowId;
  } catch (error) {
    logger.error('Failed to start workflow', error);
    throw new AppError('Failed to start workflow', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Get tasks for a specific user
 */
export const getUserTasks = async (userId: string, status?: TaskStatus[], limit = 100): Promise<Task[]> => {
  try {
    // Since search API doesn't return our tasks, let's get tasks from specific workflows
    // First, get all workflows
    const workflowSearchResponse = await conductorClient.get('/workflow/search', {
      params: {
        size: 100,
        sort: 'startTime:DESC'
      }
    });
    
    const allTasks: any[] = [];
    
    // Extract tasks from workflows
    if (workflowSearchResponse.data?.results) {
      for (const workflow of workflowSearchResponse.data.results) {
        if (workflow.status === 'RUNNING') {
          try {
            // Get full workflow details including tasks
            const fullWorkflowResponse = await conductorClient.get(`/workflow/${workflow.workflowId}`);
            if (fullWorkflowResponse.data?.tasks) {
              allTasks.push(...fullWorkflowResponse.data.tasks);
            }
          } catch (error) {
            logger.warn(`Failed to get tasks for workflow ${workflow.workflowId}`, error);
          }
        }
      }
    }
    
    // Filter tasks for the specific user and convert to our Task format
    const userTasks = allTasks
      .filter((conductorTask: any) => {
        // Exclude completed tasks
        if (conductorTask.status === 'COMPLETED') {
          return false;
        }
        
        // If userId is 'system', return all non-completed tasks
        if (userId === 'system') {
          return conductorTask.status === 'IN_PROGRESS' || conductorTask.status === 'SCHEDULED';
        }
        
        // Include HUMAN tasks assigned to this user that are not completed
        if (conductorTask.taskType === 'HUMAN' && conductorTask.workerId === userId) {
          return conductorTask.status === 'IN_PROGRESS' || conductorTask.status === 'SCHEDULED';
        }
        
        // Include tasks that can be claimed (no specific worker assigned and not completed)
        if (!conductorTask.workerId && (conductorTask.status === 'IN_PROGRESS' || conductorTask.status === 'SCHEDULED')) {
          return true;
        }
        
        return false;
      })
      .map((conductorTask: any) => {
        // Parse input and output safely (they might not be valid JSON)
        let parsedInput = {};
        let parsedOutput = {};
        
        try {
          if (conductorTask.input && conductorTask.input.startsWith('{') && conductorTask.input.includes('=')) {
            // This is a Java-style object representation, not JSON
            // For now, we'll create a simple object with the raw data
            parsedInput = { raw: conductorTask.input };
          } else if (conductorTask.input) {
            parsedInput = JSON.parse(conductorTask.input);
          }
        } catch (e) {
          parsedInput = { raw: conductorTask.input };
        }
        
        try {
          if (conductorTask.output && conductorTask.output.startsWith('{') && conductorTask.output.includes('=')) {
            parsedOutput = { raw: conductorTask.output };
          } else if (conductorTask.output) {
            parsedOutput = JSON.parse(conductorTask.output);
          }
        } catch (e) {
          parsedOutput = { raw: conductorTask.output };
        }
        
        // Use inputData directly from Conductor task if available, otherwise use parsed input
        const inputData = conductorTask.inputData || parsedInput;
        
        return {
          taskId: conductorTask.taskId,
          workflowInstanceId: conductorTask.workflowInstanceId || conductorTask.workflowId,
          referenceTaskName: conductorTask.referenceTaskName || conductorTask.taskDefName,
          taskType: conductorTask.taskType,
          name: conductorTask.taskDefName,
          status: conductorTask.status,
          input: parsedInput,
          output: parsedOutput,
          workerId: conductorTask.workerId,
          priority: conductorTask.workflowPriority || 5,
          startTime: conductorTask.startTime ? new Date(conductorTask.startTime).getTime() : Date.now(),
          updateTime: conductorTask.updateTime ? new Date(conductorTask.updateTime).getTime() : Date.now(),
          inputData: inputData
        };
      })
      .slice(0, limit);
    
    return userTasks;
  } catch (error) {
    logger.error('Failed to get user tasks', error);
    throw new AppError('Failed to get user tasks', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Get a specific task by ID
 */
export const getTaskById = async (taskId: string): Promise<Task> => {
  try {
    // Try to get task directly first
    try {
      const taskResponse = await conductorClient.get(`/tasks/${taskId}`);
      if (taskResponse.data) {
        const conductorTask = taskResponse.data;
        
        // Convert Conductor task to our Task format
        let parsedInput = {};
        let parsedOutput = {};
        
        try {
          if (conductorTask.input && conductorTask.input.startsWith('{') && conductorTask.input.includes('=')) {
            parsedInput = { raw: conductorTask.input };
          } else if (conductorTask.input) {
            parsedInput = JSON.parse(conductorTask.input);
          }
        } catch (e) {
          parsedInput = { raw: conductorTask.input };
        }
        
        try {
          if (conductorTask.output && conductorTask.output.startsWith('{') && conductorTask.output.includes('=')) {
            parsedOutput = { raw: conductorTask.output };
          } else if (conductorTask.output) {
            parsedOutput = JSON.parse(conductorTask.output);
          }
        } catch (e) {
          parsedOutput = { raw: conductorTask.output };
        }
        
        // Use inputData directly from Conductor task if available, otherwise use parsed input
        const inputData = conductorTask.inputData || parsedInput;
        
        return {
          taskId: conductorTask.taskId,
          workflowInstanceId: conductorTask.workflowInstanceId || conductorTask.workflowId,
          referenceTaskName: conductorTask.referenceTaskName || conductorTask.taskDefName,
          taskType: conductorTask.taskType,
          name: conductorTask.taskDefName,
          status: conductorTask.status,
          input: parsedInput,
          output: parsedOutput,
          workerId: conductorTask.workerId,
          priority: conductorTask.workflowPriority || 5,
          startTime: conductorTask.startTime ? new Date(conductorTask.startTime).getTime() : Date.now(),
          updateTime: conductorTask.updateTime ? new Date(conductorTask.updateTime).getTime() : Date.now(),
          inputData: inputData
        };
      }
    } catch (directError) {
      // Fall back to searching through workflows
      logger.warn(`Direct task access failed for ${taskId}, trying workflow search`, directError);
    }
    
    // Fallback: search through workflows like getUserTasks does
    const workflowSearchResponse = await conductorClient.get('/workflow/search', {
      params: {
        size: 100,
        sort: 'startTime:DESC'
      }
    });
    
    const allTasks: any[] = [];
    
    if (workflowSearchResponse.data?.results) {
      for (const workflow of workflowSearchResponse.data.results) {
        if (workflow.status === 'RUNNING') {
          try {
            const fullWorkflowResponse = await conductorClient.get(`/workflow/${workflow.workflowId}`);
            if (fullWorkflowResponse.data?.tasks) {
              allTasks.push(...fullWorkflowResponse.data.tasks);
            }
          } catch (error) {
            logger.warn(`Failed to get tasks for workflow ${workflow.workflowId}`, error);
          }
        }
      }
    }
    
    const conductorTask = allTasks.find((t: any) => t.taskId === taskId);
    
    if (!conductorTask) {
      throw new AppError('Task not found', StatusCodes.NOT_FOUND);
    }
    
    // Convert Conductor task to our Task format
    let parsedInput = {};
    let parsedOutput = {};
    
    try {
      if (conductorTask.input && conductorTask.input.startsWith('{') && conductorTask.input.includes('=')) {
        parsedInput = { raw: conductorTask.input };
      } else if (conductorTask.input) {
        parsedInput = JSON.parse(conductorTask.input);
      }
    } catch (e) {
      parsedInput = { raw: conductorTask.input };
    }
    
    try {
      if (conductorTask.output && conductorTask.output.startsWith('{') && conductorTask.output.includes('=')) {
        parsedOutput = { raw: conductorTask.output };
      } else if (conductorTask.output) {
        parsedOutput = JSON.parse(conductorTask.output);
      }
    } catch (e) {
      parsedOutput = { raw: conductorTask.output };
    }
    
    // Use inputData directly from Conductor task if available, otherwise use parsed input
    const inputData = conductorTask.inputData || parsedInput;
    
    return {
      taskId: conductorTask.taskId,
      workflowInstanceId: conductorTask.workflowInstanceId || conductorTask.workflowId,
      referenceTaskName: conductorTask.referenceTaskName || conductorTask.taskDefName,
      taskType: conductorTask.taskType,
      name: conductorTask.taskDefName,
      status: conductorTask.status,
      input: parsedInput,
      output: parsedOutput,
      workerId: conductorTask.workerId,
      priority: conductorTask.workflowPriority || 5,
      startTime: conductorTask.startTime ? new Date(conductorTask.startTime).getTime() : Date.now(),
      updateTime: conductorTask.updateTime ? new Date(conductorTask.updateTime).getTime() : Date.now(),
      inputData: inputData
    };
  } catch (error) {
    logger.error(`Failed to get task ${taskId}`, error);
    throw new AppError('Failed to get task', StatusCodes.NOT_FOUND);
  }
};

/**
 * Claim a task by setting its worker ID to the user ID
 */
export const claimTask = async (taskId: string, userId: string): Promise<Task> => {
  try {
    // First get the task to ensure it exists and is of type CLAIM
    const task = await getTaskById(taskId);
    
    if (task.inputData?.taskCategory !== 'CLAIM') {
      throw new AppError('Task is not of type CLAIM', StatusCodes.BAD_REQUEST);
    }
    
    if (task.status !== TaskStatus.SCHEDULED) {
      throw new AppError('Task is not in SCHEDULED state and cannot be claimed', StatusCodes.BAD_REQUEST);
    }
    
    // Update the task with the user ID and complete it
    const updatedTask = await conductorClient.post(`/tasks`, {
      taskId: task.taskId,
      workflowInstanceId: task.workflowInstanceId,
      taskType: task.taskType,
      status: TaskStatus.COMPLETED,
      inputData: task.inputData,
      outputData: {
        ...task.inputData,
        userId,
        claimed: true
      },
      workerId: userId,
    });
    
    logger.info(`Task ${taskId} claimed by user ${userId}`);
    return updatedTask.data;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error(`Failed to claim task ${taskId}`, error);
    throw new AppError('Failed to claim task', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Release a task by removing its worker assignment
 */
export const releaseTask = async (taskId: string, userId: string): Promise<Task> => {
  try {
    // First get the task to ensure it exists and can be released
    const task = await getTaskById(taskId);
    
    // Check if task can be released
    if (task.taskType !== 'HUMAN' && !task.taskType.startsWith('CLAIM')) {
      throw new AppError('Only HUMAN and CLAIM tasks can be released', StatusCodes.BAD_REQUEST);
    }
    
    if (task.status !== TaskStatus.IN_PROGRESS) {
      throw new AppError('Task is not in IN_PROGRESS state and cannot be released', StatusCodes.BAD_REQUEST);
    }
    
    // Check if the user is authorized to release this task
    if (task.workerId !== userId && task.inputData?.userId !== userId) {
      throw new AppError('You are not authorized to release this task', StatusCodes.FORBIDDEN);
    }
    
    // For this demo, we'll mark the task as released in the output data
    // In a production system, this would integrate with Conductor's task assignment system
    // to actually remove the worker assignment and make the task available for others
    
    const updatedTask = await conductorClient.post(`/tasks`, {
      taskId: task.taskId,
      workflowInstanceId: task.workflowInstanceId,
      status: "COMPLETED", // Complete the task with a "released" status
      outputData: {
        released: true,
        releasedBy: userId,
        releasedAt: new Date().toISOString(),
        reason: 'Task released by user',
        previousAssignee: task.workerId,
        result: 'RELEASED' // Mark as released instead of completed
      }
    });
    
    logger.info(`Task ${taskId} released by user ${userId}`);
    return updatedTask.data;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error(`Failed to release task ${taskId}`, error);
    throw new AppError('Failed to release task', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Complete a HUMAN or CLAIM task
 */
export const completeTask = async (taskId: string, output: any): Promise<Task> => {
  try {
    // First get the task to ensure it exists
    const task = await getTaskById(taskId);
    
    // Allow both HUMAN and CLAIM tasks (CLAIM tasks are user-interactive tasks)
    if (task.taskType !== 'HUMAN' && !task.taskType.startsWith('CLAIM')) {
      throw new AppError('Task is not of type HUMAN or CLAIM', StatusCodes.BAD_REQUEST);
    }
    
    // Allow completion of SCHEDULED tasks as well as IN_PROGRESS tasks
    if (task.status !== TaskStatus.IN_PROGRESS && task.status !== TaskStatus.SCHEDULED) {
      throw new AppError('Task is not in IN_PROGRESS or SCHEDULED state', StatusCodes.BAD_REQUEST);
    }
    
    // Update the task with the output data and complete it
    const updatedTask = await conductorClient.post(`/tasks`, {
      taskId: task.taskId,
      workflowInstanceId: task.workflowInstanceId,
      status: 'COMPLETED',
      outputData: {
        ...output,
        result: output.result || 'COMPLETED'
      }
    });
    
    logger.info(`Task ${taskId} completed by worker ${task.workerId || 'system'}`);
    return updatedTask.data;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error(`Failed to complete task ${taskId}`, error);
    throw new AppError('Failed to complete task', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Get all workflow definitions from Conductor
 */
export const getAllWorkflowDefinitions = async (): Promise<any[]> => {
  try {
    const response = await conductorClient.get('/metadata/workflow');
    return response.data || [];
  } catch (error) {
    logger.error('Failed to get workflow definitions', error);
    throw new AppError('Failed to get workflow definitions', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Get a specific workflow definition from Conductor
 */
export const getWorkflowDefinition = async (workflowName: string, version?: number): Promise<any> => {
  try {
    // If no version specified, get the latest version
    if (!version) {
      const response = await conductorClient.get(`/metadata/workflow/${workflowName}`);
      return response.data;
    }
    
    const response = await conductorClient.get(`/metadata/workflow/${workflowName}/${version}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      throw new AppError('Workflow definition not found', StatusCodes.NOT_FOUND);
    }
    logger.error('Failed to get workflow definition', error);
    throw new AppError('Failed to get workflow definition', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Convert workflow definition back to template format
 * Simplified to use only the stored original template (unidirectional transformation)
 */
export const convertWorkflowDefinitionToTemplate = (workflowDef: any): any => {
  try {
    // Always use the stored original template - this is the single source of truth
    if (workflowDef.metadata?.originalTemplate) {
      return workflowDef.metadata.originalTemplate;
    }

    // Fallback for legacy workflows without stored original template
    // This should only happen for old workflows created before this change
    return {
      id: workflowDef.name,
      name: workflowDef.name.replace(/^flow_/, '').replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
      description: workflowDef.description || '',
      type: workflowDef.metadata?.flowType || 'TEMPLATE',
      version: workflowDef.version || 1,
      steps: [] // Empty steps for legacy workflows - they need to be recreated
    };
  } catch (error) {
    logger.error('Failed to convert workflow definition to template', error);
    // Return minimal template
    return {
      id: workflowDef.name,
      name: workflowDef.name || 'Unknown Template',
      description: workflowDef.description || '',
      type: 'TEMPLATE',
      version: workflowDef.version || 1,
      steps: []
    };
  }
};

// Initialize task definitions when the service starts
export const initializeConductor = async (): Promise<void> => {
  try {
    await registerTaskDefinitions();
    logger.info('Conductor initialization completed');
  } catch (error) {
    logger.error('Failed to initialize Conductor', error);
  }
};
