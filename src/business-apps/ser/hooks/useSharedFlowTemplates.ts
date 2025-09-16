import { useState, useEffect, useCallback, useMemo } from 'react';
import { FlowTemplate, DynamicFormField } from '../types/flowTemplate';
import { createTemplatesService, TemplateServiceOptions } from '../services/templatesService';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

interface UseSharedFlowTemplatesOptions extends TemplateServiceOptions {
  enabled?: boolean;
}

interface UseSharedFlowTemplatesResult {
  templates: FlowTemplate[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  hasNextPage: boolean;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
}

/**
 * Shared React hook for Flow Templates
 * Uses the centralized TemplatesService for consistent data fetching
 * Can be used by both Service Desk and Service Portal
 */
export const useSharedFlowTemplates = (
  contextProps: BusinessAppContextProps,
  options: UseSharedFlowTemplatesOptions = {}
): UseSharedFlowTemplatesResult => {
  const {
    categoryId,
    enabled = true,
    limit = 100,
    offset = 0,
    ...restOptions
  } = options;

  // Stabilize restOptions to prevent infinite loops
  const stableRestOptions = useMemo(() => restOptions, [JSON.stringify(restOptions)]);
  
  // Extract stable values from contextProps
  const { accessToken, userInfo } = contextProps;

  const [state, setState] = useState<{
    templates: FlowTemplate[];
    isLoading: boolean;
    error: string | null;
    totalCount: number;
  }>({
    templates: [],
    isLoading: false,
    error: null,
    totalCount: 0
  });

  const [currentOffset, setCurrentOffset] = useState(offset);

  // Transform workflow engine template to FlowTemplate with form schema extraction
  const transformTemplate = useCallback((engineTemplate: any): FlowTemplate => {
    console.log('🎭 [useSharedFlowTemplates] Transforming template:', engineTemplate?.name);
    
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
      
      console.log('🎭 [useSharedFlowTemplates] Extracted form schema:', formSchema);
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
    if (!enabled) {
      console.log('🎭 [useSharedFlowTemplates] Hook disabled, skipping fetch');
      return;
    }

    console.log('🎭 [useSharedFlowTemplates] Starting fetch...', {
      categoryId,
      enabled,
      isLoadMore,
      currentOffset
    });

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));

    try {
      console.log('🎭 [useSharedFlowTemplates] Creating templates service...');
      const templatesService = createTemplatesService({ accessToken, userInfo });
      
      const result = await templatesService.getTemplates({
        ...stableRestOptions,
        categoryId,
        limit,
        offset: isLoadMore ? currentOffset : 0,
        onlyLatest: true,
        includeDrafts: true
      });

      console.log('🎭 [useSharedFlowTemplates] Service result:', result);

      if (result.error) {
        throw new Error(result.error);
      }

      // Transform templates
      const transformedTemplates = result.templates
        .filter((template: any) => template && typeof template === 'object')
        .map(transformTemplate);

      console.log('🎭 [useSharedFlowTemplates] Transformed templates:', transformedTemplates);

      setState(prev => ({
        ...prev,
        templates: isLoadMore ? [...prev.templates, ...transformedTemplates] : transformedTemplates,
        isLoading: false,
        totalCount: result.totalCount,
        error: null
      }));

      if (isLoadMore) {
        setCurrentOffset(prev => prev + limit);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch flow templates';
      console.error('🎭 [useSharedFlowTemplates] Error fetching templates:', error);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        templates: isLoadMore ? prev.templates : []
      }));
    }
  }, [accessToken, userInfo, categoryId, enabled, limit, currentOffset, stableRestOptions, transformTemplate]);

  const refetch = useCallback(async () => {
    console.log('🎭 [useSharedFlowTemplates] Manual refetch requested');
    setCurrentOffset(0);
    await fetchTemplates(false);
  }, [fetchTemplates]);

  const loadMore = useCallback(async () => {
    console.log('🎭 [useSharedFlowTemplates] Load more requested');
    await fetchTemplates(true);
  }, [fetchTemplates]);

  // Initial fetch
  useEffect(() => {
    console.log('🎭 [useSharedFlowTemplates] useEffect triggered, fetching templates...');
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
