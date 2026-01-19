import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getWorkflowEngine } from './workflowEngineProvider';

export interface TemplateServiceOptions {
  limit?: number;
  offset?: number;
  onlyLatest?: boolean;
  includeDrafts?: boolean;
  search?: string;
  categoryId?: string;
}

export interface TemplatesServiceResult {
  templates: any[];
  totalCount: number;
  hasMore?: boolean;
  error?: string;
}

/**
 * Shared Templates Service
 * Central service for fetching templates from custom-flow-engine
 * Used by both Service Desk and Service Portal
 */
export class TemplatesService {
  private context: BusinessAppContextProps;

  constructor(context: BusinessAppContextProps) {
    this.context = context;
  }

  /**
   * Get templates from custom-flow-engine
   * @param options Query options for filtering templates
   */
  async getTemplates(options: TemplateServiceOptions = {}): Promise<TemplatesServiceResult> {
    try {
      console.log('🎯 [TemplatesService] Fetching templates with options:', {
        ...options,
        userId: this.context.userInfo?.id
      });

      const workflowEngine = getWorkflowEngine(this.context);
      
      // Check if engine supports getTemplates
      if (!workflowEngine.getTemplates || typeof workflowEngine.getTemplates !== 'function') {
        const errorMsg = 'Templates functionality not available in current workflow engine';
        console.warn('🎯 [TemplatesService] Warning:', errorMsg);
        return {
          templates: [],
          totalCount: 0,
          hasMore: false,
          error: errorMsg
        };
      }

      console.log('🎯 [TemplatesService] Calling workflow engine getTemplates...');

      const result = await workflowEngine.getTemplates({
        limit: options.limit || 100,
        offset: options.offset || 0,
        onlyLatest: options.onlyLatest !== false, // Default true
        includeDrafts: options.includeDrafts || false,
        search: options.search
      });

      console.log('🎯 [TemplatesService] Raw result from workflow engine:', result);

      // Handle different response formats from workflow engine
      const templates = result.templates || result.data || [];
      const totalCount = result.totalCount || result.total || templates.length;
      const hasMore = result.hasMore || (templates.length === (options.limit || 100));

      // Apply category filtering if specified (since backend doesn't have category yet)
      let filteredTemplates = templates;
      if (options.categoryId) {
        // For now, show all templates regardless of category
        // TODO: Filter by category when backend supports it
        console.log('🎯 [TemplatesService] Category filtering requested but not yet implemented:', options.categoryId);
      }

      const finalResult = {
        templates: filteredTemplates,
        totalCount,
        hasMore,
        error: undefined
      };

      console.log('🎯 [TemplatesService] Final processed result:', {
        templatesCount: finalResult.templates.length,
        totalCount: finalResult.totalCount,
        hasMore: finalResult.hasMore,
        categoryId: options.categoryId
      });

      return finalResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch templates';
      console.error('🎯 [TemplatesService] Error fetching templates:', error);
      
      return {
        templates: [],
        totalCount: 0,
        hasMore: false,
        error: errorMessage
      };
    }
  }

  /**
   * Check if the workflow engine is available and supports templates
   */
  async checkTemplatesAvailability(): Promise<{
    available: boolean;
    error?: string;
  }> {
    try {
      const workflowEngine = getWorkflowEngine(this.context);
      
      if (!workflowEngine.getTemplates || typeof workflowEngine.getTemplates !== 'function') {
        return {
          available: false,
          error: 'Workflow engine does not support getTemplates method'
        };
      }

      // Try to fetch one template to test connectivity
      const testResult = await workflowEngine.getTemplates({ limit: 1 });
      
      return {
        available: true
      };

    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * Factory function to create TemplatesService instance
 */
export const createTemplatesService = (context: BusinessAppContextProps): TemplatesService => {
  return new TemplatesService(context);
};

/**
 * Shared hook for templates (can be used by both service-desk and service-portal)
 */
export const useSharedTemplates = (
  context: BusinessAppContextProps,
  options: TemplateServiceOptions = {}
) => {
  const templatesService = createTemplatesService(context);
  return templatesService.getTemplates(options);
};
