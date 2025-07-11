import React from 'react';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useFlowTemplateStore } from '../../../hooks/useFlowTemplateStore';
import { ContentBlock } from '../../../types/flowTemplate';

interface ImageContentBlockProps {
  taskId: string;
  block: ContentBlock;
  onRemove: () => void;
  'data-testid'?: string;
}

/**
 * Image content block component for task content
 */
export const ImageContentBlock: React.FC<ImageContentBlockProps> = ({
  taskId,
  block,
  onRemove,
  'data-testid': testId = 'image-content-block'
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
            {getTranslationFromI18nKeyAndLabel('flow.creator.imageBlock', 'Image Block')}
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
        <div className="gba:flex gba:justify-between gba:items-center" data-testid={`${testId}-image-input`}>
          <input
            type="text"
            value={block.content}
            onChange={(e) => handleContentChange(e.target.value)}
            className="gba:flex-1 gba:outline-none"
            placeholder={getTranslationFromI18nKeyAndLabel('flow.creator.imageReference', 'Image reference or URL...')}
            data-testid={`${testId}-image-reference-input`}
          />
          
          <button
            className="gba:px-3 gba:py-1 gba:bg-gray-200 gba:text-gray-700 gba:rounded gba:text-sm"
            data-testid={`${testId}-browse-button`}
          >
            {getTranslationFromI18nKeyAndLabel('flow.creator.browse', 'Browse')}
          </button>
        </div>
        
        {block.content && (
          <div className="gba:mt-2 gba:p-2 gba:bg-gray-100 gba:rounded gba:flex gba:justify-center" data-testid={`${testId}-image-preview`}>
            <div className="gba:relative gba:max-w-[300px]" data-testid={`${testId}-image-container`}>
              <div className="gba:flex gba:items-center gba:justify-center gba:border gba:border-gray-300 gba:rounded gba:h-[120px] gba:w-full gba:bg-white" data-testid={`${testId}-image-placeholder`}>
                <span className="gba:text-gray-500 gba:text-sm">
                  {getTranslationFromI18nKeyAndLabel('flow.creator.imagePreview', 'Image preview')}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
