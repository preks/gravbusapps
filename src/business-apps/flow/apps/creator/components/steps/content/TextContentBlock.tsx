import React from 'react';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useFlowTemplateStore } from '../../../hooks/useFlowTemplateStore';
import { ContentBlock } from '../../../types/flowTemplate';

interface TextContentBlockProps {
  taskId: string;
  block: ContentBlock;
  onRemove: () => void;
  'data-testid'?: string;
}

/**
 * Text content block component for task content
 */
export const TextContentBlock: React.FC<TextContentBlockProps> = ({
  taskId,
  block,
  onRemove,
  'data-testid': testId = 'text-content-block'
}) => {
  const { updateContentBlock } = useFlowTemplateStore();

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateContentBlock(taskId, block.id, e.target.value);
  };

  return (
    <div className="gba:border gba:border-gray-200 gba:rounded gba:p-4 gba:bg-gray-50" data-testid={testId}>
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-2" data-testid={`${testId}-header`}>
        <div className="gba:flex gba:items-center gba:gap-2" data-testid={`${testId}-title`}>
          <span className="gba:text-blue-500 gba:font-medium">
            {getTranslationFromI18nKeyAndLabel('flow.creator.textBlock', 'Text Block')}
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
      
      <textarea
        value={block.content}
        onChange={handleContentChange}
        className="gba:border gba:border-gray-300 gba:rounded gba:px-3 gba:py-2 gba:w-full gba:min-h-[120px]"
        placeholder={getTranslationFromI18nKeyAndLabel('flow.creator.enterTextContent', 'Enter text content here...')}
        data-testid={`${testId}-content-input`}
      />
    </div>
  );
};
