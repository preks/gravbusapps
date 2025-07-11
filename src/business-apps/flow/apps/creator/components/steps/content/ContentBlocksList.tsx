import React from 'react';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useFlowTemplateStore } from '../../../hooks/useFlowTemplateStore';
import { ContentBlock, ContentBlockType } from '../../../types/flowTemplate';
import { TextContentBlock } from './TextContentBlock';
import { DocumentContentBlock } from './DocumentContentBlock';
import { ImageContentBlock } from './ImageContentBlock';
import { LinkContentBlock } from './LinkContentBlock';

interface ContentBlocksListProps {
  taskId: string;
  blocks: ContentBlock[];
  'data-testid'?: string;
}

/**
 * Component for managing content blocks within a task
 */
export const ContentBlocksList: React.FC<ContentBlocksListProps> = ({ 
  taskId, 
  blocks,
  'data-testid': testId = 'content-blocks-list'
}) => {
  const { addContentBlock, removeContentBlock } = useFlowTemplateStore();

  const handleAddBlock = (type: ContentBlockType) => {
    addContentBlock(taskId, type);
  };

  const renderBlock = (block: ContentBlock, index: number) => {
    switch (block.type) {
      case 'text':
        return (
          <TextContentBlock
            key={block.id}
            taskId={taskId}
            block={block}
            onRemove={() => removeContentBlock(taskId, block.id)}
            data-testid={`${testId}-text-${index}`}
          />
        );
      case 'document':
        return (
          <DocumentContentBlock
            key={block.id}
            taskId={taskId}
            block={block}
            onRemove={() => removeContentBlock(taskId, block.id)}
            data-testid={`${testId}-document-${index}`}
          />
        );
      case 'image':
        return (
          <ImageContentBlock
            key={block.id}
            taskId={taskId}
            block={block}
            onRemove={() => removeContentBlock(taskId, block.id)}
            data-testid={`${testId}-image-${index}`}
          />
        );
      case 'link':
        return (
          <LinkContentBlock
            key={block.id}
            taskId={taskId}
            block={block}
            onRemove={() => removeContentBlock(taskId, block.id)}
            data-testid={`${testId}-link-${index}`}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="gba:flex gba:flex-col gba:gap-4" data-testid={testId}>
      <div className="gba:flex gba:flex-wrap gba:gap-2" data-testid={`${testId}-add-buttons`}>
        <button
          onClick={() => handleAddBlock('text')}
          className="gba:px-3 gba:py-1 gba:bg-blue-100 gba:text-blue-700 gba:rounded gba:text-sm"
          data-testid={`${testId}-add-text-button`}
        >
          + {getTranslationFromI18nKeyAndLabel('flow.creator.text', 'Text')}
        </button>
        
        <button
          onClick={() => handleAddBlock('document')}
          className="gba:px-3 gba:py-1 gba:bg-blue-100 gba:text-blue-700 gba:rounded gba:text-sm"
          data-testid={`${testId}-add-document-button`}
        >
          + {getTranslationFromI18nKeyAndLabel('flow.creator.document', 'Document')}
        </button>
        
        <button
          onClick={() => handleAddBlock('image')}
          className="gba:px-3 gba:py-1 gba:bg-blue-100 gba:text-blue-700 gba:rounded gba:text-sm"
          data-testid={`${testId}-add-image-button`}
        >
          + {getTranslationFromI18nKeyAndLabel('flow.creator.image', 'Image')}
        </button>
        
        <button
          onClick={() => handleAddBlock('link')}
          className="gba:px-3 gba:py-1 gba:bg-blue-100 gba:text-blue-700 gba:rounded gba:text-sm"
          data-testid={`${testId}-add-link-button`}
        >
          + {getTranslationFromI18nKeyAndLabel('flow.creator.link', 'Link')}
        </button>
      </div>
      
      {blocks.length === 0 ? (
        <div 
          className="gba:p-4 gba:text-center gba:text-gray-500 gba:border gba:border-dashed gba:border-gray-300 gba:rounded"
          data-testid={`${testId}-empty-message`}
        >
          {getTranslationFromI18nKeyAndLabel(
            'flow.creator.noContentBlocks',
            'No content blocks added yet. Click on one of the buttons above to add content.'
          )}
        </div>
      ) : (
        <div className="gba:flex gba:flex-col gba:gap-4" data-testid={`${testId}-blocks`}>
          {blocks.map((block, index) => renderBlock(block, index))}
        </div>
      )}
    </div>
  );
};
