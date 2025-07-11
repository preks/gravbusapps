import React from 'react';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useFlowTemplateStore } from '../../../hooks/useFlowTemplateStore';
import { ContentBlock } from '../../../types/flowTemplate';

interface DocumentContentBlockProps {
  taskId: string;
  block: ContentBlock;
  onRemove: () => void;
  'data-testid'?: string;
}

/**
 * Document content block component for task content
 */
export const DocumentContentBlock: React.FC<DocumentContentBlockProps> = ({
  taskId,
  block,
  onRemove,
  'data-testid': testId = 'document-content-block'
}) => {
  const { updateContentBlock } = useFlowTemplateStore();

  const handleContentChange = (value: string) => {
    updateContentBlock(taskId, block.id, value);
  };

  return (
    <div className="gba:border gba:border-gray-200 gba:rounded gba:p-4 gba:bg-gray-50" data-testid={testId}>
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-2" data-testid={`${testId}-header`}>
        <div className="gba:flex gba:items-center gba:gap-2" data-testid={`${testId}-title`}>
          <span className="gba:text-blue-500 gba:font-medium">
            {getTranslationFromI18nKeyAndLabel('flow.creator.documentBlock', 'Document Block')}
          </span>
        </div>
        
        <button
          onClick={onRemove}
          className="gba:text-red-500"
          data-testid={`${testId}-remove-button`}
        >
          {getTranslationFromI18nKeyAndLabel('flow.creator.remove', 'Remove')}
        </button>
      </div>
      
      <div className="gba:border gba:border-gray-300 gba:rounded gba:px-3 gba:py-2 gba:w-full" data-testid={`${testId}-selector`}>
        <div className="gba:flex gba:justify-between gba:items-center" data-testid={`${testId}-document-input`}>
          <input
            type="text"
            value={block.content}
            onChange={(e) => handleContentChange(e.target.value)}
            className="gba:flex-1 gba:outline-none"
            placeholder={getTranslationFromI18nKeyAndLabel('flow.creator.documentReference', 'Document reference...')}
            data-testid={`${testId}-document-reference-input`}
          />
          
          <button
            className="gba:px-3 gba:py-1 gba:bg-gray-200 gba:text-gray-700 gba:rounded gba:text-sm"
            data-testid={`${testId}-browse-button`}
          >
            {getTranslationFromI18nKeyAndLabel('flow.creator.browse', 'Browse')}
          </button>
        </div>
        
        {block.content && (
          <div className="gba:mt-2 gba:flex gba:items-center gba:gap-2 gba:p-2 gba:bg-gray-100 gba:rounded" data-testid={`${testId}-selected-document`}>
            <span className="gba:text-sm gba:truncate">{block.content}</span>
          </div>
        )}
      </div>
    </div>
  );
};
