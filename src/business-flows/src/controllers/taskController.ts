import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { 
  getTasksForUser, 
  getTask, 
  claimTask, 
  completeTask 
} from '../services/taskService';
import { TaskStatus } from '../models/task';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

/**
 * Get tasks for the current user
 */
export const getTasksController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.headers['user-id'] as string;
    if (!userId) {
      throw new AppError('User ID is required', StatusCodes.BAD_REQUEST);
    }
    
    const status = req.query.status as string[] | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    
    let taskStatuses: TaskStatus[] | undefined;
    if (status && status.length > 0) {
      taskStatuses = status.map(s => s as TaskStatus);
    }
    
    const tasks = await getTasksForUser(userId, taskStatuses, limit);
    
    res.status(StatusCodes.OK).json({
      status: 'success',
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific task by ID
 */
export const getTaskController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const taskId = req.params.id;
    const task = await getTask(taskId);
    
    res.status(StatusCodes.OK).json({
      status: 'success',
      data: task
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Claim a task for the current user
 */
export const claimTaskController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const taskId = req.params.id;
    const userId = req.headers['user-id'] as string;
    
    if (!userId) {
      throw new AppError('User ID is required', StatusCodes.BAD_REQUEST);
    }
    
    const task = await claimTask(taskId, userId);
    
    res.status(StatusCodes.OK).json({
      status: 'success',
      data: task
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Complete a task
 */
export const completeTaskController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const taskId = req.params.id;
    const userId = req.headers['user-id'] as string;
    
    if (!userId) {
      throw new AppError('User ID is required', StatusCodes.BAD_REQUEST);
    }
    
    const output = req.body;
    const task = await completeTask(taskId, userId, output);
    
    res.status(StatusCodes.OK).json({
      status: 'success',
      data: task
    });
  } catch (error) {
    next(error);
  }
};
