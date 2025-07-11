import { Task, TaskStatus } from '../models/task';
import { AppError } from '../middleware/errorHandler';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../utils/logger';
import {
  getUserTasks,
  getTaskById,
  claimTask as conductorClaimTask,
  completeTask as conductorCompleteTask
} from './conductorService';

/**
 * Get all tasks for a specific user
 */
export const getTasksForUser = async (
  userId: string, 
  status?: TaskStatus[], 
  limit?: number
): Promise<Task[]> => {
  try {
    return await getUserTasks(userId, status, limit);
  } catch (error) {
    logger.error('Failed to get tasks for user', error);
    throw new AppError(
      'Failed to get tasks for user',
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * Get a task by ID
 */
export const getTask = async (taskId: string): Promise<Task> => {
  try {
    return await getTaskById(taskId);
  } catch (error) {
    logger.error(`Failed to get task ${taskId}`, error);
    throw new AppError('Task not found', StatusCodes.NOT_FOUND);
  }
};

/**
 * Claim a task for a user
 */
export const claimTask = async (taskId: string, userId: string): Promise<Task> => {
  try {
    // Check if the task exists and is claimable
    const task = await getTaskById(taskId);
    
    if (task.taskType !== 'CLAIM') {
      throw new AppError('Task is not claimable', StatusCodes.BAD_REQUEST);
    }
    
    if (task.status !== TaskStatus.SCHEDULED) {
      throw new AppError('Task is not in a claimable state', StatusCodes.BAD_REQUEST);
    }
    
    // Claim the task in Conductor
    return await conductorClaimTask(taskId, userId);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error(`Failed to claim task ${taskId} for user ${userId}`, error);
    throw new AppError('Failed to claim task', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Complete a human task
 */
export const completeTask = async (taskId: string, userId: string, output: any): Promise<Task> => {
  try {
    // Check if the task exists and is completable
    const task = await getTaskById(taskId);
    
    if (task.taskType !== 'HUMAN') {
      throw new AppError('Task is not a human task', StatusCodes.BAD_REQUEST);
    }
    
    if (task.status !== TaskStatus.IN_PROGRESS) {
      throw new AppError('Task is not in progress', StatusCodes.BAD_REQUEST);
    }
    
    if (task.workerId !== userId && task.inputData?.userId !== userId) {
      throw new AppError('You are not assigned to this task', StatusCodes.FORBIDDEN);
    }
    
    // Complete the task in Conductor
    return await conductorCompleteTask(taskId, output);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error(`Failed to complete task ${taskId} for user ${userId}`, error);
    throw new AppError('Failed to complete task', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};
