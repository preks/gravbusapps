import { query, param, header } from 'express-validator';
import { TaskStatus } from '../models/task';

export const getTasksValidator = [
  header('user-id')
    .notEmpty()
    .withMessage('User ID header is required'),
  
  query('status')
    .optional()
    .isArray()
    .withMessage('Status must be an array')
    .custom(statuses => {
      if (!statuses) return true;
      const validStatuses = Object.values(TaskStatus);
      return statuses.every(status => validStatuses.includes(status));
    })
    .withMessage(`Status must be one of ${Object.values(TaskStatus).join(', ')}`),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be an integer between 1 and 100')
];

export const getTaskValidator = [
  param('id')
    .notEmpty()
    .withMessage('Task ID is required')
];

export const claimTaskValidator = [
  param('id')
    .notEmpty()
    .withMessage('Task ID is required'),
  
  header('user-id')
    .notEmpty()
    .withMessage('User ID header is required')
];

export const completeTaskValidator = [
  param('id')
    .notEmpty()
    .withMessage('Task ID is required'),
  
  header('user-id')
    .notEmpty()
    .withMessage('User ID header is required')
];
