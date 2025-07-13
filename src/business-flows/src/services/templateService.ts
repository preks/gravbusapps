import { v4 as uuidv4 } from 'uuid';
import { FlowTemplate } from '../models/flowTemplate';
import { AppError } from '../middleware/errorHandler';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../utils/logger';
import {
  createWorkflowDefinition,
  registerWorkflowDefinition,
  getAllWorkflowDefinitions,
  getWorkflowDefinition,
  convertWorkflowDefinitionToTemplate
} from './conductorService';

// Remove in-memory storage - service is now stateless
// Templates are stored as workflow definitions in Conductor

/**
 * Check if template already exists by ID
 */
export const templateExists = async (templateId: string): Promise<boolean> => {
  try {
    await getWorkflowDefinition(templateId);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Create a new flow template with duplicate prevention
 */
export const createTemplate = async (templateData: FlowTemplate, isDraft: boolean = false): Promise<FlowTemplate> => {
  try {
    // Create a clean workflow name from template name for ID
    const cleanName = templateData.name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
    
    const workflowName = `flow_${cleanName}`;
    const version = templateData.version || 1;
    
    const template: FlowTemplate = {
      id: workflowName, // Use workflow name as ID
      version: version,
      type: templateData.type || 'TEMPLATE', // Default to TEMPLATE if not specified
      name: templateData.name || 'Untitled Template', // Ensure name is included
      description: templateData.description,
      steps: templateData.steps || [] // Ensure steps is included
    };

    // Check if template already exists
    const exists = await templateExists(workflowName);
    if (exists) {
      logger.warn(`Template ${workflowName} already exists, updating instead of creating`);
      return await updateTemplate(workflowName, templateData, isDraft);
    }

    // Create a workflow definition in Conductor (skip for drafts)
    let workflowDef;
    if (!isDraft) {
      workflowDef = createWorkflowDefinition(template);
      await registerWorkflowDefinition(workflowDef);
      logger.info(`Created template with ID ${workflowName} (version ${version})`);
    } else {
      // For drafts, we could store them in a separate system or mark them differently
      // For now, we'll create the workflow but mark it as draft in metadata
      workflowDef = createWorkflowDefinition(template);
      workflowDef.metadata.isDraft = true;
      await registerWorkflowDefinition(workflowDef);
      logger.info(`Created draft template with ID ${workflowName} (version ${version})`);
    }
    
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
 * Get a template by ID (fetches from Conductor)
 */
export const getTemplateById = async (templateId: string): Promise<FlowTemplate> => {
  try {
    const workflowDef = await getWorkflowDefinition(templateId);
    return convertWorkflowDefinitionToTemplate(workflowDef);
  } catch (error) {
    if (error instanceof AppError && error.statusCode === StatusCodes.NOT_FOUND) {
      throw error;
    }
    logger.error('Failed to get template by ID', error);
    throw new AppError('Failed to get template', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Get all templates (fetches from Conductor)
 */
export const getAllTemplates = async (): Promise<FlowTemplate[]> => {
  try {
    const workflowDefs = await getAllWorkflowDefinitions();
    
    // Filter only our flow templates (those with flow_ prefix or flow metadata)
    const flowTemplates = workflowDefs
      .filter(def => def.name?.startsWith('flow_') || def.metadata?.flowType)
      .map(def => convertWorkflowDefinitionToTemplate(def));
    
    return flowTemplates;
  } catch (error) {
    logger.error('Failed to get all templates', error);
    throw new AppError('Failed to get templates', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Get template with metadata by ID (fetches from Conductor)
 */
export const getTemplateWithMetadata = async (templateId: string): Promise<any> => {
  try {
    const workflowDef = await getWorkflowDefinition(templateId);
    const template = convertWorkflowDefinitionToTemplate(workflowDef);
    
    return {
      template,
      metadata: {
        createdAt: workflowDef.createTime ? new Date(workflowDef.createTime).toISOString() : new Date().toISOString(),
        updatedAt: workflowDef.updateTime ? new Date(workflowDef.updateTime).toISOString() : new Date().toISOString(),
        isDraft: workflowDef.metadata?.isDraft || false,
        originalTemplate: workflowDef.metadata?.originalTemplate || template,
        workflowDefinition: workflowDef
      }
    };
  } catch (error) {
    if (error instanceof AppError && error.statusCode === StatusCodes.NOT_FOUND) {
      throw error;
    }
    logger.error('Failed to get template with metadata', error);
    throw new AppError('Failed to get template with metadata', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Get the original template for editing (from Conductor metadata)
 */
export const getOriginalTemplate = async (templateId: string): Promise<FlowTemplate> => {
  try {
    const workflowDef = await getWorkflowDefinition(templateId);
    const originalTemplate = workflowDef.metadata?.originalTemplate;
    
    if (originalTemplate) {
      return originalTemplate;
    }
    
    // Fallback to converted template
    return convertWorkflowDefinitionToTemplate(workflowDef);
  } catch (error) {
    if (error instanceof AppError && error.statusCode === StatusCodes.NOT_FOUND) {
      throw error;
    }
    logger.error('Failed to get original template', error);
    throw new AppError('Failed to get original template', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Get all templates with metadata (fetches from Conductor)
 */
export const getAllTemplatesWithMetadata = async (): Promise<any[]> => {
  try {
    const workflowDefs = await getAllWorkflowDefinitions();
    
    // Filter only our flow templates and convert them
    const flowTemplatesWithMetadata = workflowDefs
      .filter(def => def.name?.startsWith('flow_') || def.metadata?.flowType)
      .map(def => {
        const template = convertWorkflowDefinitionToTemplate(def);
        return {
          template,
          metadata: {
            createdAt: def.createTime ? new Date(def.createTime).toISOString() : new Date().toISOString(),
            updatedAt: def.updateTime ? new Date(def.updateTime).toISOString() : new Date().toISOString(),
            isDraft: def.metadata?.isDraft || false,
            originalTemplate: def.metadata?.originalTemplate || template,
            workflowDefinition: def
          }
        };
      });
    
    return flowTemplatesWithMetadata;
  } catch (error) {
    logger.error('Failed to get all templates with metadata', error);
    throw new AppError('Failed to get templates with metadata', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Get only draft templates (fetches from Conductor)
 */
export const getDraftTemplates = async (): Promise<FlowTemplate[]> => {
  try {
    const allTemplatesWithMetadata = await getAllTemplatesWithMetadata();
    return allTemplatesWithMetadata
      .filter(item => item.metadata.isDraft)
      .map(item => item.template);
  } catch (error) {
    logger.error('Failed to get draft templates', error);
    throw new AppError('Failed to get draft templates', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Get only published templates (fetches from Conductor)
 */
export const getPublishedTemplates = async (): Promise<FlowTemplate[]> => {
  try {
    const allTemplatesWithMetadata = await getAllTemplatesWithMetadata();
    return allTemplatesWithMetadata
      .filter(item => !item.metadata.isDraft)
      .map(item => item.template);
  } catch (error) {
    logger.error('Failed to get published templates', error);
    throw new AppError('Failed to get published templates', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Publish a draft template (convert from draft to published)
 */
export const publishTemplate = async (templateId: string): Promise<FlowTemplate> => {
  try {
    const workflowDef = await getWorkflowDefinition(templateId);
    
    if (!workflowDef.metadata?.isDraft) {
      throw new AppError('Template is already published', StatusCodes.BAD_REQUEST);
    }
    
    // Update metadata to mark as published
    workflowDef.metadata.isDraft = false;
    workflowDef.updateTime = Date.now();
    
    // Re-register the workflow with updated metadata
    await registerWorkflowDefinition(workflowDef);
    
    const template = convertWorkflowDefinitionToTemplate(workflowDef);
    logger.info(`Published template with ID ${templateId}`);
    return template;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Failed to publish template', error);
    throw new AppError('Failed to publish template', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Update an existing template (creates new version)
 */
export const updateTemplate = async (
  templateId: string,
  templateData: Partial<FlowTemplate>,
  isDraft: boolean = false
): Promise<FlowTemplate> => {
  try {
    // Get the existing template to determine next version
    let currentVersion = 1;
    try {
      const existingWorkflowDef = await getWorkflowDefinition(templateId);
      currentVersion = existingWorkflowDef.version || 1;
    } catch (error) {
      // Template doesn't exist, start with version 1
      logger.info(`Template ${templateId} doesn't exist, creating new template`);
    }
    
    const nextVersion = currentVersion + 1;
    
    // Create updated template
    const updatedTemplate: FlowTemplate = {
      ...templateData,
      id: templateId,
      version: nextVersion,
      type: templateData.type || 'TEMPLATE'
    };

    // Create new workflow definition version
    const workflowDef = createWorkflowDefinition(updatedTemplate);
    if (isDraft) {
      workflowDef.metadata.isDraft = true;
    }
    
    await registerWorkflowDefinition(workflowDef);
    logger.info(`Updated template ${templateId} to version ${nextVersion}`);
    
    return updatedTemplate;
  } catch (error) {
    logger.error('Failed to update template', error);
    throw new AppError('Failed to update template', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Delete a template by ID
 * Note: Conductor doesn't have a direct delete API for workflow definitions
 * This is a placeholder implementation
 */
export const deleteTemplate = async (templateId: string): Promise<void> => {
  try {
    // Verify template exists
    await getWorkflowDefinition(templateId);
    
    // Note: OSS Conductor doesn't provide a delete API for workflow definitions
    // In a production environment, you might:
    // 1. Mark it as deleted in metadata
    // 2. Use a different storage system for templates
    // 3. Use Conductor's enterprise features if available
    
    logger.warn(`Template deletion requested for ${templateId} - not implemented in OSS Conductor`);
    throw new AppError('Template deletion not supported in current Conductor version', StatusCodes.BAD_REQUEST);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Failed to delete template', error);
    throw new AppError('Failed to delete template', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Initialize templates (no longer needed - templates are fetched from Conductor)
 */
export const initializeTemplates = (): void => {
  logger.info('Template initialization skipped - templates are now fetched from Conductor');
};
