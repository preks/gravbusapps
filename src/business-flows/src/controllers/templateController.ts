import express from 'express';
import { StatusCodes } from 'http-status-codes';
import { 
  createTemplate, 
  getTemplateById, 
  getAllTemplates, 
  updateTemplate, 
  deleteTemplate,
  getTemplateWithMetadata,
  getAllTemplatesWithMetadata,
  getDraftTemplates,
  getPublishedTemplates,
  publishTemplate,
  getOriginalTemplate
} from '../services/templateService';
import { createWorkflowDefinition, generateSampleResolvedAssignments, startWorkflow } from '../services/conductorService';
import { FlowTemplate } from '../models/flowTemplate';
import { logger } from '../utils/logger';

/**
 * Create a new flow template
 */
export const createTemplateController = async (
  req: any,
  res: any,
  next: any
): Promise<void> => {
  try {
    const templateData: FlowTemplate = req.body;
    const isDraft = req.body.isDraft || false;
    
    const newTemplate = await createTemplate(templateData, isDraft);
    
    res.status(StatusCodes.CREATED).json({
      status: 'success',
      data: newTemplate
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a template by ID
 */
export const getTemplateController = async (
  req: any,
  res: any,
  next: any
): Promise<void> => {
  try {
    const templateId = req.params.id;
    const template = getTemplateById(templateId);
    
    res.status(StatusCodes.OK).json({
      status: 'success',
      data: template
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all templates
 */
export const getAllTemplatesController = async (
  req: any,
  res: any,
  next: any
): Promise<void> => {
  try {
    const templates = getAllTemplates();
    
    res.status(StatusCodes.OK).json({
      status: 'success',
      count: templates.length,
      data: templates
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a template by ID
 */
export const updateTemplateController = async (
  req: any,
  res: any,
  next: any
): Promise<void> => {
  try {
    const templateId = req.params.id;
    const templateData = req.body;
    
    const updatedTemplate = await updateTemplate(templateId, templateData);
    
    res.status(StatusCodes.OK).json({
      status: 'success',
      data: updatedTemplate
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a template by ID
 */
export const deleteTemplateController = async (
  req: any,
  res: any,
  next: any
): Promise<void> => {
  try {
    const templateId = req.params.id;
    deleteTemplate(templateId);
    
    res.status(StatusCodes.NO_CONTENT).send();
  } catch (error) {
    next(error);
  }
};

/**
 * Generate Conductor workflow definition from a template
 * Uses the same logic as the workflow registration to ensure consistency
 */
export const generateConductorFlowController = async (
  req: any,
  res: any,
  next: any
): Promise<void> => {
  try {
    const templateData: FlowTemplate = req.body;
    
    // Use the same workflow definition creation logic as the registration process
    // This ensures consistency between preview and actual workflow registration
    const workflowDefinition = createWorkflowDefinition(templateData);
    
    res.status(StatusCodes.OK).json({
      status: 'success',
      data: workflowDefinition
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate Conductor workflow definition with sample resolved assignments
 * This endpoint provides a complete example showing how the workflow would look
 * when executed with resolved user assignments
 */
export const generateConductorFlowWithResolvedAssignmentsController = async (
  req: any,
  res: any,
  next: any
): Promise<void> => {
  try {
    const templateData: FlowTemplate = req.body;
    
    // Generate the workflow definition
    const workflowDefinition = createWorkflowDefinition(templateData);
    
    // Generate sample resolved assignments for steps with assignToAll=true
    const sampleResolvedAssignments = generateSampleResolvedAssignments(templateData);
    
    res.status(StatusCodes.OK).json({
      status: 'success',
      data: {
        workflowDefinition,
        sampleResolvedAssignments,
        executionExample: {
          description: 'To execute this workflow, provide the resolvedAssignments in the workflow input',
          inputParameters: {
            initiator: 'user123',
            context: { flowInstanceId: 'flow_123' },
            resolvedAssignments: sampleResolvedAssignments
          }
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Save template as draft
 */
export const saveDraftController = async (
  req: any,
  res: any,
  next: any
): Promise<void> => {
  try {
    const templateData: FlowTemplate = req.body;
    
    const draftTemplate = await createTemplate(templateData, true);
    
    res.status(StatusCodes.CREATED).json({
      status: 'success',
      data: draftTemplate,
      message: 'Template saved as draft'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all draft templates
 */
export const getDraftsController = async (
  req: any,
  res: any,
  next: any
): Promise<void> => {
  try {
    const drafts = getDraftTemplates();
    
    res.status(StatusCodes.OK).json({
      status: 'success',
      count: drafts.length,
      data: drafts
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get template with metadata
 */
export const getTemplateWithMetadataController = async (
  req: any,
  res: any,
  next: any
): Promise<void> => {
  try {
    const templateId = req.params.id;
    const templateWithMetadata = getTemplateWithMetadata(templateId);
    
    res.status(StatusCodes.OK).json({
      status: 'success',
      data: templateWithMetadata
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Publish a draft template
 */
export const publishTemplateController = async (
  req: any,
  res: any,
  next: any
): Promise<void> => {
  try {
    const templateId = req.params.id;
    const publishedTemplate = await publishTemplate(templateId);
    
    res.status(StatusCodes.OK).json({
      status: 'success',
      data: publishedTemplate,
      message: 'Template published successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get original template for editing
 */
export const getOriginalTemplateController = async (
  req: any,
  res: any,
  next: any
): Promise<void> => {
  try {
    const templateId = req.params.id;
    const originalTemplate = getOriginalTemplate(templateId);
    
    res.status(StatusCodes.OK).json({
      status: 'success',
      data: originalTemplate
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Execute/Launch a workflow from a template
 */
export const executeWorkflowController = async (
  req: any,
  res: any,
  next: any
): Promise<void> => {
  try {
    const templateId = req.params.id;
    const { runtimeParameters, initiator, context } = req.body;
    
    // Get the template with metadata
    const templateWithMetadata = getTemplateWithMetadata(templateId);
    const template = templateWithMetadata.template;
    const workflowDefinition = templateWithMetadata.metadata.workflowDefinition;
    
    if (!workflowDefinition) {
      throw new Error('Template does not have a workflow definition');
    }
    
    // Resolve assignment targets for each step
    const resolvedAssignments: any = {};
    template.steps.forEach((step: any, index) => {
      if (step.assignmentTargets && step.assignmentTargets.length > 0) {
        resolvedAssignments[`step_${index}`] = {
          assignmentTargets: step.assignmentTargets,
          stepType: step.stepType,
          title: step.title,
          description: step.description,
          contentBlocks: step.contentBlocks || [],
          inputBlocks: step.inputBlocks || []
        };
      }
    });
    
    // Prepare workflow input
    const workflowInput = {
      initiator: initiator || 'system',
      context: context || {
        flowInstanceId: `flow_instance_${Date.now()}`,
        templateId: templateId,
        launchedAt: new Date().toISOString()
      },
      resolvedAssignments,
      ...runtimeParameters // Include runtime content block values
    };
    
    // Start the workflow
    const workflowId = await startWorkflow(workflowDefinition.name, workflowInput);
    
    logger.info(`Workflow started: ${workflowId} from template: ${templateId}`);
    
    res.status(StatusCodes.CREATED).json({
      status: 'success',
      data: {
        workflowId,
        templateId,
        workflowName: workflowDefinition.name,
        input: workflowInput
      },
      message: 'Workflow started successfully'
    });
  } catch (error) {
    next(error);
  }
};
