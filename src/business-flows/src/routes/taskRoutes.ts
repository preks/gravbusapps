import { Router } from 'express';
import {
  getTasksController,
  getTaskController,
  claimTaskController,
  completeTaskController
} from '../controllers/taskController';
import {
  getTasksValidator,
  getTaskValidator,
  claimTaskValidator,
  completeTaskValidator
} from '../validators/taskValidator';
import { validateRequest } from '../middleware/validationMiddleware';

export const taskRoutes = Router();

// GET all tasks for current user
taskRoutes.get('/', getTasksValidator, validateRequest, getTasksController);

// GET task by ID
taskRoutes.get('/:id', getTaskValidator, validateRequest, getTaskController);

// POST claim a task
taskRoutes.post('/:id/claim', claimTaskValidator, validateRequest, claimTaskController);

// POST complete a task
taskRoutes.post('/:id/complete', completeTaskValidator, validateRequest, completeTaskController);
