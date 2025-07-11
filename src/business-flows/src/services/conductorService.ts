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
 * Convert a flow template to a Conductor workflow definition
 * 
 * Two different patterns are used based on assignment configuration:
 * 
 * 1. assignToAll=false (shared task): CLAIM task → HUMAN task
 *    - CLAIM task allows any eligible user to claim the task
 *    - HUMAN task is then assigned to the user who claimed it
 * 
 * 2. assignToAll=true (individual tasks): DYNAMIC FORK JOIN → HUMAN tasks
 *    - Uses DYNAMIC FORK JOIN to create parallel HUMAN tasks for each resolved user
 *    - No CLAIM task needed since users are known upfront
 *    - Requires 'resolvedAssignments' input parameter with structure:
 *      resolvedAssignments: {
 *        step_0: {
 *          forkedTasks: [
 *            { name: "HUMAN_step1_user1", taskReferenceName: "human_step1_user1" },
 *            { name: "HUMAN_step1_user2", taskReferenceName: "human_step1_user2" }
 *          ],
 *          forkedTasksInputs: [
 *            { assignee: "user1", assigneeType: "user", ... },
 *            { assignee: "user2", assigneeType: "user", ... }
 *          ]
 *        }
 *      }
 */
export const createWorkflowDefinition = (template: FlowTemplate): any => {
  // Generate workflow name based on template title
  const workflowName = `flow_${template.title.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
  
  // Extract content blocks that need runtime values (empty content)
  const runtimeContentBlocks: any[] = [];
  
  // Helper function to process content blocks
  const processContentBlocks = (contentBlocks: any[], stepIndex: number) => {
    return contentBlocks.map((block, blockIndex) => {
      if (!block.content || block.content.trim() === '') {
        // This content block needs to be filled at runtime
        const parameterName = `step_${stepIndex}_content_${blockIndex}`;
        runtimeContentBlocks.push({
          parameterName,
          stepIndex,
          blockIndex,
          blockId: block.id,
          blockType: block.type,
          label: block.description || `Content for ${template.steps[stepIndex]?.title || `Step ${stepIndex + 1}`} - Block ${blockIndex + 1}`,
          required: block.required || false
        });
        
        // Wire to workflow input parameter
        return {
          ...block,
          content: `\${workflow.input.${parameterName}}`
        };
      }
      return block;
    });
  };
  
  // Start building the workflow tasks
  const workflowTasks: any[] = [];
  
  // Determine if we should use parallel or sequential execution
  const isParallel = template.executionStrategy === 'PARALLEL';
  
  // Process each step and group tasks by execution pattern
  const stepGroups: any[] = [];
  
  template.steps.forEach((step, index) => {
    const stepId = step.id || `step_${index}`;
    
    // Get assignment configuration (step-level overrides flow-level when present)
    const assignment = step.assignment || template.assignment;
    
    if (assignment && assignment.assignToAll) {
      // For assignToAll=true: Use DYNAMIC FORK JOIN to create tasks for all resolved users
      // No CLAIM task needed since we know all users upfront
      const dynamicForkTask = {
        name: `DYNAMIC_FORK_${stepId}`,
        taskReferenceName: `dynamic_fork_${stepId}`,
        type: 'FORK_JOIN_DYNAMIC',
        dynamicForkTasksParam: 'forkedTasks',
        dynamicForkTasksInputParamName: 'forkedTasksInputs',
        inputParameters: {
          stepIndex: index,
          title: step.title,
          description: step.description,
          stepType: step.type,
          contentBlocks: processContentBlocks(step.contentBlocks || [], index),
          inputBlocks: step.inputBlocks || [],
          assignmentTargets: assignment.targets,
          allowReassignment: assignment.allowReassignment || false,
          // This will be populated at execution time with resolved userIds
          forkedTasks: `\${workflow.input.resolvedAssignments.step_${index}.forkedTasks}`,
          forkedTasksInputs: `\${workflow.input.resolvedAssignments.step_${index}.forkedTasksInputs}`,
        },
      };
      
      stepGroups.push(dynamicForkTask);
    } else {
      // For assignToAll=false: Use CLAIM task + HUMAN task pattern
      // First CLAIM task to determine who gets the task
      const claimTask = {
        name: 'CLAIM',
        taskReferenceName: `claim_${stepId}`,
        type: 'SIMPLE',
        taskDefinition: {
          name: 'CLAIM',
        },
        inputParameters: {
          stepIndex: index,
          title: step.title,
          description: step.description,
          stepType: step.type,
          assignmentTargets: assignment?.targets || [],
          taskCategory: 'CLAIM', // Add consistent field for type identification
        },
      };
      
      // Then HUMAN task assigned to the user who claimed it
      const humanTask = {
        name: `HUMAN_${stepId}`,
        taskReferenceName: `human_${stepId}`,
        type: 'HUMAN',
        inputParameters: {
          stepIndex: index,
          title: step.title,
          description: step.description,
          stepType: step.type,
          contentBlocks: processContentBlocks(step.contentBlocks || [], index),
          inputBlocks: step.inputBlocks || [],
          assignmentTargets: assignment?.targets || [],
          sharedTask: true,
          allowReassignment: assignment?.allowReassignment || false,
          userId: `\${claim_${stepId}.output.userId}`, // Get userId from CLAIM task output
          assignee: `\${claim_${stepId}.output.userId}`, // Assign to the user who claimed it
          taskCategory: 'HUMAN', // Add consistent field for type identification
        },
      };
      
      // Add both tasks sequentially for this step
      stepGroups.push(claimTask);
      stepGroups.push(humanTask);
    }
  });
  
  // Set workflowTasks to the step groups
  workflowTasks.push(...stepGroups);
  
  // Wrap tasks in appropriate execution structure
  let finalTasks: any[];
  
  if (isParallel && workflowTasks.length > 1) {
    // Use FORK_JOIN for parallel execution
    finalTasks = [{
      name: 'FORK_JOIN',
      taskReferenceName: 'parallel_execution',
      type: 'FORK_JOIN',
      forkTasks: [workflowTasks], // All tasks in parallel
      joinOn: workflowTasks.map(task => task.taskReferenceName),
    }];
  } else {
    // Sequential execution (default)
    finalTasks = workflowTasks;
  }
  
  // Create the workflow definition
  const workflowDef = {
    name: workflowName,
    description: template.description,
    version: 1,
    tasks: finalTasks,
    inputParameters: [
      'initiator', 
      'context', 
      'resolvedAssignments', // Contains resolved userIds for each step's assignments
      ...runtimeContentBlocks.map(block => block.parameterName) // Add runtime content parameters
    ],
    outputParameters: {
      results: finalTasks.map(task => `\${${task.taskReferenceName}.output}`),
      completed: true,
    },
    schemaVersion: 2,
    restartable: true,
    ownerEmail: 'admin@newwork.com',
    timeoutPolicy: 'ALERT_ONLY',
    timeoutSeconds: 0,
    variables: {},
    metadata: {
      flowType: template.flowType || 'TEMPLATE',
      originalTemplate: {
        title: template.title,
        description: template.description,
        executionStrategy: template.executionStrategy,
        stepsCount: template.steps.length,
        flowType: template.flowType,
      },
      assignmentResolutionRequired: template.steps.some(step => {
        const assignment = step.assignment || template.assignment;
        return assignment && assignment.assignToAll;
      }),
      runtimeContentBlocks, // Content blocks that need to be filled at execution time
    },
  };
  
  return workflowDef;
};

/**
 * Generate a sample resolvedAssignments structure for testing
 * In production, this would be created by resolving the assignment targets to actual userIds
 */
export const generateSampleResolvedAssignments = (template: FlowTemplate): any => {
  const resolvedAssignments: any = {};
  
  template.steps.forEach((step, index) => {
    const assignment = step.assignment || template.assignment;
    
    if (assignment && assignment.assignToAll) {
      const stepId = step.id || `step_${index}`;
      
      // Generate sample resolved userIds based on assignment targets
      const forkedTasks: any[] = [];
      const forkedTasksInputs: any[] = [];
      
      if (assignment.targets.length > 0) {
        // Use actual targets
        assignment.targets.forEach((target, targetIndex) => {
          // In production, this would resolve department/team/role to actual userIds
          const sampleUserIds = target.entity === 'user' 
            ? [target.id] 
            : [`${target.id}_user1`, `${target.id}_user2`, `${target.id}_user3`]; // Mock resolution
            
          sampleUserIds.forEach((userId, userIndex) => {
            const taskId = `step${index}_${userId}`;
            
            forkedTasks.push({
              name: `HUMAN_${taskId}`,
              taskReferenceName: `human_${taskId}`,
              type: 'HUMAN'
            });
            
            forkedTasksInputs.push({
              stepIndex: index,
              title: step.title,
              description: step.description,
              stepType: step.type,
              contentBlocks: step.contentBlocks || [], // Keep original for sample generation
              inputBlocks: step.inputBlocks || [],
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
        
        sampleUserIds.forEach((userId, userIndex) => {
          const taskId = `step${index}_${userId}`;
          
          forkedTasks.push({
            name: `HUMAN_${taskId}`,
            taskReferenceName: `human_${taskId}`,
            type: 'HUMAN'
          });
          
          forkedTasksInputs.push({
            stepIndex: index,
            title: step.title,
            description: step.description,
            stepType: step.type,
            contentBlocks: step.contentBlocks || [],
            inputBlocks: step.inputBlocks || [],
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
  });
  
  return resolvedAssignments;
};

/**
 * Register a workflow definition with Conductor
 */
export const registerWorkflowDefinition = async (workflowDef: any): Promise<any> => {
  try {
    const response = await conductorClient.post('/metadata/workflow', workflowDef);
    logger.info(`Workflow ${workflowDef.name} registered successfully`);
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
    if (task.taskType !== 'HUMAN') {
      throw new AppError('Only HUMAN tasks can be released', StatusCodes.BAD_REQUEST);
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
 * Complete a HUMAN task
 */
export const completeTask = async (taskId: string, output: any): Promise<Task> => {
  try {
    // First get the task to ensure it exists
    const task = await getTaskById(taskId);
    
    if (task.taskType !== 'HUMAN') {
      throw new AppError('Task is not of type HUMAN', StatusCodes.BAD_REQUEST);
    }
    
    if (task.status !== TaskStatus.IN_PROGRESS) {
      throw new AppError('Task is not in IN_PROGRESS state', StatusCodes.BAD_REQUEST);
    }
    
    // Update the task with the output data and complete it
    const updatedTask = await conductorClient.post(`/tasks`, {
      taskId: task.taskId,
      workflowInstanceId: task.workflowInstanceId,
      status: 'COMPLETED',
      outputData: {
        ...output,
        result: 'COMPLETED'
      }
    });
    
    logger.info(`Task ${taskId} completed by worker ${task.workerId}`);
    return updatedTask.data;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error(`Failed to complete task ${taskId}`, error);
    throw new AppError('Failed to complete task', StatusCodes.INTERNAL_SERVER_ERROR);
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
