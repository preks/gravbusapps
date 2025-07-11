import express from 'express';
import { StatusCodes } from 'http-status-codes';
import { getUserTasks, getTaskById, claimTask, releaseTask, completeTask } from '../services/conductorService';
import { Task, TaskStatus, TaskPriority } from '../models/task';
import { logger } from '../utils/logger';
import { 
  getUserById, 
  resolveAssignmentTargets, 
  userMatchesAssignmentTargets,
  AssignmentTarget 
} from '../services/assignmentResolutionService';

export interface EnhancedTask extends Task {
  // Enhanced fields for better UI experience
  title: string;
  description: string;
  assignedTo?: string;
  assignedToName?: string;
  templateTitle?: string;
  stepTitle?: string;
  contentBlocks?: any[];
  inputBlocks?: any[];
  dueDate?: string;
  priority?: TaskPriority;
  canClaim?: boolean;
  canComplete?: boolean;
  canRelease?: boolean;
  canReassign?: boolean;
}

/**
 * Get claimable tasks for the current user
 * These are tasks that are available to be claimed by users who match the assignment criteria
 */
export const getClaimableTasksController = async (
  req: any,
  res: any,
  next: any
): Promise<void> => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: 'userId query parameter is required'
      });
    }

    // Get user information for assignment resolution
    const user = getUserById(userId);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Get all active tasks (SCHEDULED and IN_PROGRESS)
    const allTasks = await getUserTasks('system', [TaskStatus.SCHEDULED, TaskStatus.IN_PROGRESS], 100);
    
    // Filter tasks that this user can claim
    const claimableTasks: EnhancedTask[] = [];
    
    for (const task of allTasks) {
      let canClaim = false;
      
      // Check if task can be claimed
      if (task.inputData?.taskCategory === 'CLAIM' && task.taskType === 'CLAIM') {
        // CLAIM type tasks - must not be assigned to anyone and user must match assignment targets
        const assignmentTargets: AssignmentTarget[] = task.inputData.assignmentTargets || [];
        const isUnassigned = !task.workerId && !task.inputData?.userId;
        canClaim = isUnassigned && userMatchesAssignmentTargets(userId, assignmentTargets);
      } else if (task.inputData?.taskCategory === 'HUMAN' && !task.workerId) {
        // HUMAN tasks with no assigned worker can be claimed
        canClaim = true;
      }
      
      if (canClaim) {
        const enhancedTask: EnhancedTask = {
          ...task,
          title: task.inputData?.title || 'Untitled Task',
          description: task.inputData?.description || 'No description available',
          assignedTo: null, // Claimable tasks are not assigned to anyone
          assignedToName: null,
          templateTitle: task.inputData?.templateTitle,
          stepTitle: task.inputData?.title,
          contentBlocks: task.inputData?.contentBlocks || [],
          inputBlocks: task.inputData?.inputBlocks || [],
          priority: 5,
          canClaim: true,
          canComplete: false,
          canRelease: false,
          canReassign: false
        };
        
        claimableTasks.push(enhancedTask);
      }
    }

    logger.info(`Found ${claimableTasks.length} claimable tasks for user ${userId}`);

    res.status(StatusCodes.OK).json({
      status: 'success',
      count: claimableTasks.length,
      data: claimableTasks
    });
  } catch (error) {
    logger.error('Error fetching claimable tasks:', error);
    next(error);
  }
};

/**
 * Get tasks assigned to a specific user
 * These are tasks that are currently assigned to and can be worked on by the user
 */
export const getUserTasksController = async (
  req: any,
  res: any,
  next: any
): Promise<void> => {
  try {
    const { userId } = req.params;
    const { status, limit = 50 } = req.query;
    
    if (!userId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: 'userId parameter is required'
      });
    }

    // Get user information (allow 'system' user for internal queries)
    const user = getUserById(userId);
    if (!user && userId !== 'system') {
      return res.status(StatusCodes.NOT_FOUND).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Parse status filter
    let statusFilter: TaskStatus[] = [TaskStatus.IN_PROGRESS, TaskStatus.SCHEDULED];
    if (status) {
      statusFilter = Array.isArray(status) ? status : [status];
    }

    // Get all tasks and filter for those actually assigned to this user
    const allTasks = await getUserTasks('system', statusFilter, parseInt(limit));
    
    // Filter tasks that are actually assigned to this user
    const assignedTasks = allTasks.filter(task => {
      const isHumanTask = task.inputData?.taskCategory === 'HUMAN';
      const isClaimTask = task.inputData?.taskCategory === 'CLAIM' && task.taskType === 'CLAIM';
      
      // HUMAN tasks assigned to this user
      if (isHumanTask && task.workerId === userId) {
        return true;
      }
      
      // CLAIM tasks should NOT appear in assigned tasks - they should only be in claimable tasks
      if (isClaimTask) {
        return false;
      }
      
      return false;
    });
    
    // Enhance tasks with additional information
    const enhancedTasks: EnhancedTask[] = assignedTasks.map(task => {
      const isHumanTask = task.inputData?.taskCategory === 'HUMAN';
      const isClaimTask = task.inputData?.taskCategory === 'CLAIM' && task.taskType === 'CLAIM';
      
      return {
        ...task,
        title: task.inputData?.title || 'Untitled Task',
        description: task.inputData?.description || 'No description available',
        assignedTo: task.workerId || task.inputData?.userId,
        assignedToName: user?.name || 'System User',
        templateTitle: task.inputData?.templateTitle,
        stepTitle: task.inputData?.title,
        contentBlocks: task.inputData?.contentBlocks || [],
        inputBlocks: task.inputData?.inputBlocks || [],
        priority: 5,
        canClaim: false, // Assigned tasks cannot be claimed
        canComplete: isHumanTask && task.status === TaskStatus.IN_PROGRESS,
        canRelease: isHumanTask && task.status === TaskStatus.IN_PROGRESS,
        canReassign: task.inputData?.allowReassignment || false
      };
    });

    logger.info(`Found ${enhancedTasks.length} tasks for user ${req.params.userId}`);

    res.status(StatusCodes.OK).json({
      status: 'success',
      count: enhancedTasks.length,
      data: enhancedTasks
    });
  } catch (error) {
    logger.error(`Error fetching tasks for user ${req.params.userId}:`, error);
    next(error);
  }
};

/**
 * Get a specific task by ID
 */
export const getTaskController = async (
  req: any,
  res: any,
  next: any
): Promise<void> => {
  try {
    const { taskId } = req.params;
    const { userId } = req.query;
    
    if (!taskId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: 'taskId parameter is required'
      });
    }

    // Get the task
    const task = await getTaskById(taskId);
    
    // Get user information if provided
    let user = null;
    if (userId) {
      user = getUserById(userId);
    }

        // Enhance task with additional information
    const enhancedTask: EnhancedTask = {
      ...task,
      title: task.inputData?.title || 'Untitled Task',
      description: task.inputData?.description || 'No description available',
      assignedTo: task.workerId || task.inputData?.userId,
      assignedToName: user?.name,
      templateTitle: task.inputData?.templateTitle,
      stepTitle: task.inputData?.title,
      contentBlocks: task.inputData?.contentBlocks || [],
      inputBlocks: task.inputData?.inputBlocks || [],
      priority: 5,
      canClaim: task.inputData?.taskCategory === 'CLAIM' && task.taskType === 'CLAIM' && task.status === TaskStatus.SCHEDULED,
      canComplete: task.taskType === 'HUMAN' && task.status === TaskStatus.IN_PROGRESS,
      canRelease: task.taskType === 'HUMAN' && task.status === TaskStatus.IN_PROGRESS,
      canReassign: task.inputData?.allowReassignment || false
    };

    res.status(StatusCodes.OK).json({
      status: 'success',
      data: enhancedTask
    });
  } catch (error) {
    logger.error(`Error fetching task ${req.params.taskId}:`, error);
    next(error);
  }
};

/**
 * Claim a task
 */
export const claimTaskController = async (
  req: any,
  res: any,
  next: any
): Promise<void> => {
  try {
    const { taskId } = req.params;
    const { userId } = req.body;
    
    if (!taskId || !userId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: 'taskId and userId are required'
      });
    }

    // Get user information
    const user = getUserById(userId);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Claim the task
    const claimedTask = await claimTask(taskId, userId);
    
    logger.info(`Task ${taskId} claimed by user ${userId} (${user.name})`);

    res.status(StatusCodes.OK).json({
      status: 'success',
      data: claimedTask,
      message: 'Task claimed successfully'
    });
  } catch (error) {
    logger.error(`Error claiming task ${req.params.taskId}:`, error);
    next(error);
  }
};

/**
 * Release a task
 */
export const releaseTaskController = async (
  req: any,
  res: any,
  next: any
): Promise<void> => {
  try {
    const { taskId } = req.params;
    const { userId } = req.body;
    
    if (!taskId || !userId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: 'taskId and userId are required'
      });
    }

    // Get user information
    const user = getUserById(userId);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Release the task
    const releasedTask = await releaseTask(taskId, userId);
    
    logger.info(`Task ${taskId} released by user ${userId} (${user.name})`);

    res.status(StatusCodes.OK).json({
      status: 'success',
      data: releasedTask,
      message: 'Task released successfully'
    });
  } catch (error) {
    logger.error(`Error releasing task ${req.params.taskId}:`, error);
    next(error);
  }
};

/**
 * Complete a task
 */
export const completeTaskController = async (
  req: any,
  res: any,
  next: any
): Promise<void> => {
  try {
    const { taskId } = req.params;
    const { outputData } = req.body;
    
    if (!taskId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: 'taskId parameter is required'
      });
    }

    if (!outputData) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: 'outputData is required'
      });
    }

    // Complete the task
    const completedTask = await completeTask(taskId, outputData);
    
    logger.info(`Task ${taskId} completed`);

    res.status(StatusCodes.OK).json({
      status: 'success',
      data: completedTask,
      message: 'Task completed successfully'
    });
  } catch (error) {
    logger.error(`Error completing task ${req.params.taskId}:`, error);
    next(error);
  }
};

/**
 * Get task statistics for a user
 */
export const getTaskStatsController = async (
  req: any,
  res: any,
  next: any
): Promise<void> => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: 'userId parameter is required'
      });
    }

    // Get user information
    const user = getUserById(userId);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Get tasks in different states
    const [
      inProgressTasks,
      scheduledTasks,
      completedTasks
    ] = await Promise.all([
      getUserTasks(userId, [TaskStatus.IN_PROGRESS], 100),
      getUserTasks(userId, [TaskStatus.SCHEDULED], 100),
      getUserTasks(userId, [TaskStatus.COMPLETED], 100)
    ]);

    // Get claimable tasks
    const allScheduledTasks = await getUserTasks('system', [TaskStatus.SCHEDULED], 100);
    const claimableCount = allScheduledTasks.filter(task => {
      if (task.taskType === 'CLAIM' && task.inputData) {
        const assignmentTargets: AssignmentTarget[] = task.inputData.assignmentTargets || [];
        return userMatchesAssignmentTargets(userId, assignmentTargets);
      }
      return false;
    }).length;

    const stats = {
      userId,
      userName: user.name,
      inProgress: inProgressTasks.length,
      scheduled: scheduledTasks.length,
      completed: completedTasks.length,
      claimable: claimableCount,
      total: inProgressTasks.length + scheduledTasks.length + completedTasks.length
    };

    res.status(StatusCodes.OK).json({
      status: 'success',
      data: stats
    });
  } catch (error) {
    logger.error(`Error fetching task stats for user ${req.params.userId}:`, error);
    next(error);
  }
};
