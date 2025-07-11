import { v4 as uuidv4 } from 'uuid';
import { FlowTemplate } from '../models/flowTemplate';
import { AppError } from '../middleware/errorHandler';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../utils/logger';
import {
  createWorkflowDefinition,
  registerWorkflowDefinition
} from './conductorService';

// In-memory storage for templates with metadata
// In a production environment, this would be replaced with a database
interface StoredTemplate {
  template: FlowTemplate;
  metadata: {
    createdAt: string;
    updatedAt: string;
    isDraft: boolean;
    originalTemplate: FlowTemplate; // Store original for easy editing
    workflowDefinition?: any; // Store generated workflow definition
  };
}

const templates: Record<string, StoredTemplate> = {};

/**
 * Create a new flow template
 */
export const createTemplate = async (templateData: FlowTemplate, isDraft: boolean = false): Promise<FlowTemplate> => {
  try {
    // Generate ID if not provided
    const templateId = templateData.id || uuidv4();
    const template: FlowTemplate = {
      ...templateData,
      id: templateId,
      flowType: templateData.flowType || 'TEMPLATE' // Default to TEMPLATE if not specified
    };

    // Create a workflow definition in Conductor (skip for drafts)
    let workflowDef;
    if (!isDraft) {
      workflowDef = createWorkflowDefinition(template);
      await registerWorkflowDefinition(workflowDef);
    }

    // Store the template with metadata
    const now = new Date().toISOString();
    templates[templateId] = {
      template,
      metadata: {
        createdAt: now,
        updatedAt: now,
        isDraft,
        originalTemplate: { ...template }, // Store the complete template (same format)
        workflowDefinition: workflowDef
      }
    };
    
    logger.info(`Created ${isDraft ? 'draft ' : ''}template with ID ${templateId}`);
    return template;
  } catch (error) {
    logger.error('Failed to create template', error);
    throw new AppError(
      'Failed to create template',
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * Get a template by ID
 */
export const getTemplateById = (templateId: string): FlowTemplate => {
  const storedTemplate = templates[templateId];
  if (!storedTemplate) {
    throw new AppError('Template not found', StatusCodes.NOT_FOUND);
  }
  return storedTemplate.template;
};

/**
 * Get all templates
 */
export const getAllTemplates = (): FlowTemplate[] => {
  return Object.values(templates).map(stored => stored.template);
};

/**
 * Get template with metadata by ID
 */
export const getTemplateWithMetadata = (templateId: string): StoredTemplate => {
  const storedTemplate = templates[templateId];
  if (!storedTemplate) {
    throw new AppError('Template not found', StatusCodes.NOT_FOUND);
  }
  return storedTemplate;
};

/**
 * Get the original template for editing (from metadata)
 */
export const getOriginalTemplate = (templateId: string): FlowTemplate => {
  const storedTemplate = templates[templateId];
  if (!storedTemplate) {
    throw new AppError('Template not found', StatusCodes.NOT_FOUND);
  }
  return storedTemplate.metadata.originalTemplate;
};

/**
 * Get all templates with metadata
 */
export const getAllTemplatesWithMetadata = (): StoredTemplate[] => {
  return Object.values(templates);
};

/**
 * Get only draft templates
 */
export const getDraftTemplates = (): FlowTemplate[] => {
  return Object.values(templates)
    .filter(stored => stored.metadata.isDraft)
    .map(stored => stored.template);
};

/**
 * Get only published templates
 */
export const getPublishedTemplates = (): FlowTemplate[] => {
  return Object.values(templates)
    .filter(stored => !stored.metadata.isDraft)
    .map(stored => stored.template);
};

/**
 * Publish a draft template (convert from draft to published)
 */
export const publishTemplate = async (templateId: string): Promise<FlowTemplate> => {
  const storedTemplate = templates[templateId];
  if (!storedTemplate) {
    throw new AppError('Template not found', StatusCodes.NOT_FOUND);
  }
  
  if (!storedTemplate.metadata.isDraft) {
    throw new AppError('Template is already published', StatusCodes.BAD_REQUEST);
  }
  
  // Create workflow definition in Conductor
  const workflowDef = createWorkflowDefinition(storedTemplate.template);
  await registerWorkflowDefinition(workflowDef);
  
  // Update template to published status
  templates[templateId] = {
    ...storedTemplate,
    metadata: {
      ...storedTemplate.metadata,
      isDraft: false,
      updatedAt: new Date().toISOString(),
      workflowDefinition: workflowDef
    }
  };
  
  logger.info(`Published template with ID ${templateId}`);
  return storedTemplate.template;
};

/**
 * Update a template by ID
 */
export const updateTemplate = async (
  templateId: string,
  templateData: Partial<FlowTemplate>,
  isDraft: boolean = false
): Promise<FlowTemplate> => {
  const storedTemplate = templates[templateId];
  if (!storedTemplate) {
    throw new AppError('Template not found', StatusCodes.NOT_FOUND);
  }
  
  const updatedTemplate: FlowTemplate = {
    ...storedTemplate.template,
    ...templateData,
    id: templateId,
    flowType: templateData.flowType || storedTemplate.template.flowType || 'TEMPLATE'
  };

  // Update the workflow definition in Conductor (skip for drafts)
  let workflowDef;
  if (!isDraft) {
    workflowDef = createWorkflowDefinition(updatedTemplate);
    await registerWorkflowDefinition(workflowDef);
  }

  // Update the template in storage
  templates[templateId] = {
    template: updatedTemplate,
    metadata: {
      ...storedTemplate.metadata,
      updatedAt: new Date().toISOString(),
      isDraft,
      originalTemplate: { ...updatedTemplate }, // Store the complete updated template
      workflowDefinition: workflowDef || storedTemplate.metadata.workflowDefinition
    }
  };
  
  logger.info(`Updated ${isDraft ? 'draft ' : ''}template with ID ${templateId}`);
  return updatedTemplate;
};

/**
 * Delete a template by ID
 */
export const deleteTemplate = (templateId: string): void => {
  const storedTemplate = templates[templateId];
  if (!storedTemplate) {
    throw new AppError('Template not found', StatusCodes.NOT_FOUND);
  }
  
  // Delete the template from storage
  delete templates[templateId];
  
  logger.info(`Deleted template with ID ${templateId}`);
};

/**
 * Initialize with some sample templates for testing
 */
export const initializeTemplates = (): void => {
  // Commenting out sample template for now to avoid type conflicts
  // TODO: Update sample template to match new FlowTemplate structure
  logger.info('Template initialization skipped - using empty templates store');
};
