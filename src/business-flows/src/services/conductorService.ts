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
          label: `Content for ${template.steps[stepIndex]?.title || `Step ${stepIndex + 1}`} - Block ${blockIndex + 1}`
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
        name: `CLAIM_${stepId}`,
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
    // First get all tasks of type CLAIM that are not yet claimed
    const claimTasksResponse = await conductorClient.get('/tasks', {
      params: {
        taskType: 'CLAIM',
        status: status || [TaskStatus.SCHEDULED],
      },
    });
    
    const claimTasks = claimTasksResponse.data || [];
    
    // Then get all tasks of type HUMAN that are assigned to this user
    const humanTasksResponse = await conductorClient.get('/tasks', {
      params: {
        taskType: 'HUMAN',
        status: status || [TaskStatus.IN_PROGRESS, TaskStatus.SCHEDULED],
        limit,
      },
    });
    
    const humanTasks = (humanTasksResponse.data || [])
      .filter((task: Task) => task.inputData?.userId === userId);
    
    return [...claimTasks, ...humanTasks].slice(0, limit);
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
    const response = await conductorClient.get(`/tasks/${taskId}`);
    return response.data;
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
    
    if (task.taskType !== 'CLAIM') {
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
      taskType: task.taskType,
      status: TaskStatus.COMPLETED,
      inputData: task.inputData,
      outputData: {
        ...task.outputData,
        ...output,
        result: 'COMPLETED'
      },
      workerId: task.workerId,
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
