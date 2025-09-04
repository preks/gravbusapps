import { useState, useEffect, useCallback } from 'react';
import { FlowTemplate, FlowTemplateState, DynamicFormField } from '../../../types/flowTemplate';
import { createTemplatesService, TemplateServiceOptions } from '../../../services/templatesService';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

interface UseFlowTemplatesOptions {
  categoryId?: string;
  enabled?: boolean;
  limit?: number;
  offset?: number;
}

interface UseFlowTemplatesResult extends FlowTemplateState {
  refetch: () => Promise<void>;
  hasNextPage: boolean;
  loadMore: () => Promise<void>;
}

export const useFlowTemplates = (
  contextProps: BusinessAppContextProps,
  options: UseFlowTemplatesOptions = {}
): UseFlowTemplatesResult => {
  const {
    categoryId,
    enabled = true,
    limit = 100,
    offset = 0
  } = options;

  const [state, setState] = useState<FlowTemplateState>({
    templates: [],
    isLoading: false,
    error: null,
    totalCount: 0
  });

  const [currentOffset, setCurrentOffset] = useState(offset);

  // Transform workflow engine template to FlowTemplate with form schema extraction
  const transformTemplate = useCallback((engineTemplate: any): FlowTemplate => {
    // Extract form schema from step_0 if it exists
    const step0 = engineTemplate.steps?.[0];
    let formSchema: DynamicFormField[] | undefined;
    
    if (step0?.form && Array.isArray(step0.form)) {
      formSchema = step0.form.map((field: any): DynamicFormField => ({
        type: field.type || 'TEXT',
        name: field.name || '',
        label: field.label || field.name || '',
        required: field.required || false,
        placeholder: field.placeholder,
        description: field.description,
        options: field.options?.map((opt: any) => ({
          value: opt.value || opt,
          label: opt.label || opt.value || opt
        })),
        validation: field.validation || (field.required ? [{ type: 'required' as const }] : undefined)
      }));
    }

    // Calculate UI metadata
    const stepCount = engineTemplate.steps?.length || 0;
    const estimatedDuration = `${Math.max(1, Math.floor(stepCount * 0.5))}-${stepCount * 1} days`;
    
    let difficulty: 'simple' | 'standard' | 'complex' = 'standard';
    if (stepCount <= 2) difficulty = 'simple';
    else if (stepCount >= 5) difficulty = 'complex';

    return {
      id: engineTemplate.id,
      type: 'TEMPLATE',
      name: engineTemplate.name || 'Untitled Template',
      description: engineTemplate.description || '',
      version: engineTemplate.version || 1,
      steps: engineTemplate.steps || [],
      formSchema,
      estimatedDuration,
      stepCount,
      metadata: {
        difficulty,
        estimatedTime: estimatedDuration
      }
    };
  }, []);

  const fetchTemplates = useCallback(async (isLoadMore = false) => {
    if (!enabled) return;

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));

    try {
      console.log('🎭 [useFlowTemplates] Fetching templates with options:', {
        categoryId,
        limit,
        offset: isLoadMore ? currentOffset : 0
      });

      const templatesService = createTemplatesService(contextProps);
      
      const result = await templatesService.getTemplates({
        limit,
        offset: isLoadMore ? currentOffset : 0,
        onlyLatest: true,
        includeDrafts: false,
        categoryId: categoryId,
        search: undefined
      });

      console.log('🎭 [useFlowTemplates] Raw templates received from shared service:', result);

      if (result.error) {
        throw new Error(result.error);
      }

      // Handle response from shared templates service
      const rawTemplates = result.templates || [];
      const totalCount = result.totalCount || rawTemplates.length;

      // Transform templates
      const transformedTemplates = rawTemplates
        .filter((template: any) => template && typeof template === 'object')
        .map(transformTemplate)
        .filter((template: FlowTemplate) => {
          // Filter by category if specified
          if (categoryId && template.category && template.category !== categoryId) {
            return false;
          }
          // For now, show all templates since we don't have category field yet
          return true;
        });

      console.log('🎭 [useFlowTemplates] Transformed templates:', transformedTemplates);

      setState(prev => ({
        ...prev,
        templates: isLoadMore ? [...prev.templates, ...transformedTemplates] : transformedTemplates,
        isLoading: false,
        totalCount,
        error: null
      }));

      if (isLoadMore) {
        setCurrentOffset(prev => prev + limit);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch flow templates';
      console.error('🎭 [useFlowTemplates] Error fetching templates:', error);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        templates: isLoadMore ? prev.templates : []
      }));
    }
  }, [contextProps, categoryId, enabled, limit, currentOffset, transformTemplate]);

  const refetch = useCallback(async () => {
    setCurrentOffset(0);
    await fetchTemplates(false);
  }, [fetchTemplates]);

  const loadMore = useCallback(async () => {
    await fetchTemplates(true);
  }, [fetchTemplates]);

  // Initial fetch
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const hasNextPage = state.templates.length < state.totalCount;

  return {
    ...state,
    refetch,
    hasNextPage,
    loadMore
  };
};
