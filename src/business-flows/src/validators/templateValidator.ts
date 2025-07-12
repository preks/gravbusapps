import { body, param } from 'express-validator';

export const createTemplateValidator = [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isString()
    .withMessage('Name must be a string')
    .trim(),
  
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string')
    .trim(),
  
  body('type')
    .optional()
    .isIn(['TEMPLATE', 'INSTANCE', 'DRAFT'])
    .withMessage('Type must be either "TEMPLATE", "INSTANCE", or "DRAFT"'),
  
  body('version')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Version must be a positive integer'),
  
  body('steps')
    .notEmpty()
    .withMessage('Steps are required')
    .isArray()
    .withMessage('Steps must be an array')
    .custom(steps => steps.length > 0)
    .withMessage('At least one step is required')
];

export const updateTemplateValidator = [
  param('id')
    .notEmpty()
    .withMessage('Template ID is required'),
    
  body('name')
    .optional()
    .isString()
    .withMessage('Name must be a string')
    .trim(),
  
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string')
    .trim(),
  
  body('type')
    .optional()
    .isIn(['TEMPLATE', 'INSTANCE', 'DRAFT'])
    .withMessage('Type must be either "TEMPLATE", "INSTANCE", or "DRAFT"'),
  
  body('version')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Version must be a positive integer'),
  
  body('steps')
    .optional()
    .isArray()
    .withMessage('Steps must be an array')
    .custom(steps => !steps || steps.length > 0)
    .withMessage('Steps array cannot be empty if provided')
];
