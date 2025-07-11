import { body, param } from 'express-validator';

export const createTemplateValidator = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isString()
    .withMessage('Title must be a string')
    .trim(),
  
  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .isString()
    .withMessage('Description must be a string')
    .trim(),
  
  body('executionStrategy')
    .notEmpty()
    .withMessage('Execution strategy is required')
    .isIn(['PARALLEL', 'SEQUENTIAL'])
    .withMessage('Execution strategy must be either "PARALLEL" or "SEQUENTIAL"'),
  
  body('steps')
    .notEmpty()
    .withMessage('Steps are required')
    .isArray()
    .withMessage('Steps must be an array')
    .custom(steps => steps.length > 0)
    .withMessage('At least one step is required'),
  
  body('flowType')
    .optional()
    .isIn(['TEMPLATE', 'INSTANCE', 'DRAFT'])
    .withMessage('Flow type must be either "TEMPLATE", "INSTANCE", or "DRAFT"')
];

export const updateTemplateValidator = [
  param('id')
    .notEmpty()
    .withMessage('Template ID is required'),
    
  body('title')
    .optional()
    .isString()
    .withMessage('Title must be a string')
    .trim(),
  
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string')
    .trim(),
  
  body('executionStrategy')
    .optional()
    .isIn(['PARALLEL', 'SEQUENTIAL'])
    .withMessage('Execution strategy must be either "PARALLEL" or "SEQUENTIAL"'),
  
  body('steps')
    .optional()
    .isArray()
    .withMessage('Steps must be an array')
    .custom(steps => !steps || steps.length > 0)
    .withMessage('Steps array cannot be empty if provided'),
  
  body('flowType')
    .optional()
    .isIn(['TEMPLATE', 'INSTANCE', 'DRAFT'])
    .withMessage('Flow type must be either "TEMPLATE", "INSTANCE", or "DRAFT"')
];
