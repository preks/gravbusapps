import { Router } from 'express';
import {
  createTemplateController,
  getTemplateController,
  getAllTemplatesController,
  updateTemplateController,
  deleteTemplateController,
  generateConductorFlowController,
  generateConductorFlowWithResolvedAssignmentsController,
  saveDraftController,
  getDraftsController,
  getTemplateWithMetadataController,
  publishTemplateController,
  getOriginalTemplateController,
  executeWorkflowController
} from '../controllers/templateController';
import { createTemplateValidator, updateTemplateValidator } from '../validators/templateValidator';
import { validateRequest } from '../middleware/validationMiddleware';

export const templateRoutes = Router();

// GET all templates
templateRoutes.get('/', getAllTemplatesController);

// GET all draft templates (must come before /:id route)
templateRoutes.get('/drafts', getDraftsController);

// GET template by ID
templateRoutes.get('/:id', getTemplateController);

// POST create new template
templateRoutes.post('/', createTemplateValidator, validateRequest, createTemplateController);

// PUT update template by ID
templateRoutes.put('/:id', updateTemplateValidator, validateRequest, updateTemplateController);

// DELETE template by ID
templateRoutes.delete('/:id', deleteTemplateController);

// POST generate Conductor workflow definition from template
templateRoutes.post('/generate-conductor-flow', generateConductorFlowController);

// POST generate Conductor workflow definition with resolved assignments example
templateRoutes.post('/generate-conductor-flow-with-assignments', generateConductorFlowWithResolvedAssignmentsController);

// POST save template as draft
templateRoutes.post('/drafts', createTemplateValidator, validateRequest, saveDraftController);

// GET template with metadata by ID
templateRoutes.get('/:id/metadata', getTemplateWithMetadataController);

// GET original template for editing by ID
templateRoutes.get('/:id/original', getOriginalTemplateController);

// POST publish a draft template
templateRoutes.post('/:id/publish', publishTemplateController);

// POST execute/launch a workflow from a template
templateRoutes.post('/:id/execute', executeWorkflowController);
