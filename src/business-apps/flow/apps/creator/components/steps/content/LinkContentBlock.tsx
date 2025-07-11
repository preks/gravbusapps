import React from 'react';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useFlowTemplateStore } from '../../../hooks/useFlowTemplateStore';
import { ContentBlock } from '../../../types/flowTemplate';
import { Input, Label } from '@newwork/nw-design-system';

interface LinkContentBlockProps {
  taskId: string;
  block: ContentBlock;
  onRemove: () => void;
  'data-testid'?: string;
}

/**
 * Component for a link content block in a task
 */
export const LinkContentBlock: React.FC<LinkContentBlockProps> = ({ 
  taskId, 
  block,
  onRemove,
  'data-testid': testId = 'link-content-block'
}) => {
  const { updateContentBlock } = useFlowTemplateStore();

  const handleLabelChange = (value: string) => {
    // Store link content as JSON with url and label
    try {
      const currentContent = JSON.parse(block.content || '{"url":"","label":""}');
      const newContent = { ...currentContent, label: value };
      updateContentBlock(taskId, block.id, JSON.stringify(newContent));
    } catch (error) {
      // If parsing fails, create new object
      const newContent = { url: '', label: value };
      updateContentBlock(taskId, block.id, JSON.stringify(newContent));
    }
  };

  const handleUrlInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const currentContent = JSON.parse(block.content || '{"url":"","label":""}');
      const newContent = { ...currentContent, url: e.target.value };
      updateContentBlock(taskId, block.id, JSON.stringify(newContent));
    } catch (error) {
      // If parsing fails, create new object
      const newContent = { url: e.target.value, label: '' };
      updateContentBlock(taskId, block.id, JSON.stringify(newContent));
    }
  };

  // Parse content JSON or use defaults
  let linkUrl = '';
  let linkLabel = '';

  try {
    const parsedContent = JSON.parse(block.content || '{"url":"","label":""}');
    linkUrl = parsedContent.url || '';
    linkLabel = parsedContent.label || '';
  } catch (e) {
    // Use empty values if parsing fails
  }

  return (
    <div className="gba:p-4 gba:border gba:border-gray-200 gba:rounded gba:bg-gray-50" data-testid={testId}>
      <div className="gba:flex gba:justify-between gba:mb-2" data-testid={`${testId}-header`}>
        <h4 className="gba:font-medium" data-testid={`${testId}-title`}>
          {getTranslationFromI18nKeyAndLabel('flow.creator.link', 'Link')}
        </h4>
        <button 
          onClick={onRemove}
          className="gba:text-red-500 gba:text-sm"
          data-testid={`${testId}-remove-button`}
        >
          {getTranslationFromI18nKeyAndLabel('flow.creator.remove', 'Remove')}
        </button>
      </div>
      
      <div className="gba:space-y-3" data-testid={`${testId}-content`}>
        <div className="gba:space-y-1" data-testid={`${testId}-url-field`}>
          <Label htmlFor={`link-url-${block.id}`} data-testid={`${testId}-url-label`}>
            {getTranslationFromI18nKeyAndLabel('flow.creator.url', 'URL')}:
          </Label>
          <Input
            id={`link-url-${block.id}`}
            value={linkUrl}
            onChange={handleUrlInputChange}
            placeholder="https://example.com"
            className="gba:w-full"
            data-testid={`${testId}-url-input`}
          />
        </div>
        
        <div className="gba:space-y-1" data-testid={`${testId}-label-field`}>
          <Label htmlFor={`link-label-${block.id}`} data-testid={`${testId}-label-label`}>
            {getTranslationFromI18nKeyAndLabel('flow.creator.displayText', 'Display Text')}:
          </Label>
          <Input
            id={`link-label-${block.id}`}
            value={linkLabel}
            onChange={(e) => handleLabelChange(e.target.value)}
            placeholder={getTranslationFromI18nKeyAndLabel('flow.creator.clickHere', 'Click here')}
            className="gba:w-full"
            data-testid={`${testId}-label-input`}
          />
        </div>
      </div>
    </div>
  );
};
