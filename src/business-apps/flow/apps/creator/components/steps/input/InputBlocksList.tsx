import React from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useFlowTemplateStore } from '../../../hooks/useFlowTemplateStore'
import { InputBlock, InputType } from '../../../types/flowTemplate'
import { TextInputBlock } from './TextInputBlock'
import { SelectInputBlock } from './SelectInputBlock'
import { DatetimeInputBlock } from './DatetimeInputBlock'
import { FileUploadBlock } from './FileUploadBlock'
import { SignatureBlock } from './SignatureBlock'

interface InputBlocksListProps {
  taskId: string
  blocks: InputBlock[]
  'data-testid'?: string
}

/**
 * Component for managing input blocks within a task
 */
export const InputBlocksList: React.FC<InputBlocksListProps> = ({
  taskId,
  blocks,
  'data-testid': testId = 'input-blocks-list'
}) => {
  const { addInputBlock, removeInputBlock } = useFlowTemplateStore()

  const handleAddBlock = (type: InputType) => {
    addInputBlock(taskId, type)
  }

  const renderBlock = (block: InputBlock, index: number) => {
    switch (block.type) {
      case InputType.TEXT:
      case InputType.TEXTAREA:
      case InputType.NUMBER:
        return (
          <TextInputBlock
            key={block.id}
            taskId={taskId}
            block={block}
            onRemove={() => removeInputBlock(taskId, block.id)}
            data-testid={`${testId}-text-${index}`}
          />
        )
      case InputType.SELECT:
      case InputType.RADIO:
      case InputType.CHECKBOX:
        return (
          <SelectInputBlock
            key={block.id}
            taskId={taskId}
            block={block}
            onRemove={() => removeInputBlock(taskId, block.id)}
            data-testid={`${testId}-select-${index}`}
          />
        )
      case InputType.DATETIME:
        return (
          <DatetimeInputBlock
            key={block.id}
            taskId={taskId}
            block={block}
            onRemove={() => removeInputBlock(taskId, block.id)}
            data-testid={`${testId}-datetime-${index}`}
          />
        )
      case InputType.FILE:
        return (
          <FileUploadBlock
            key={block.id}
            taskId={taskId}
            block={block}
            onRemove={() => removeInputBlock(taskId, block.id)}
            data-testid={`${testId}-file-${index}`}
          />
        )
      case InputType.SIGNATURE:
        return (
          <SignatureBlock
            key={block.id}
            taskId={taskId}
            block={block}
            onRemove={() => removeInputBlock(taskId, block.id)}
            data-testid={`${testId}-signature-${index}`}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-4" data-testid={testId}>
      <div className="gba:flex gba:flex-wrap gba:gap-2" data-testid={`${testId}-add-buttons`}>
        <div className="gba:flex gba:gap-1">
          <span className="gba:text-sm gba:text-gray-500">
            {getTranslationFromI18nKeyAndLabel('flow.creator.textInput', 'Text:')}
          </span>
          <button
            onClick={() => handleAddBlock(InputType.TEXT)}
            className="gba:px-2 gba:py-0.5 gba:bg-blue-100 gba:text-blue-700 gba:rounded gba:text-sm"
            data-testid={`${testId}-add-text-button`}
          >
            {getTranslationFromI18nKeyAndLabel('flow.creator.text', 'Text')}
          </button>
          <button
            onClick={() => handleAddBlock(InputType.TEXTAREA)}
            className="gba:px-2 gba:py-0.5 gba:bg-blue-100 gba:text-blue-700 gba:rounded gba:text-sm"
            data-testid={`${testId}-add-textarea-button`}
          >
            {getTranslationFromI18nKeyAndLabel('flow.creator.textarea', 'Textarea')}
          </button>
          <button
            onClick={() => handleAddBlock(InputType.NUMBER)}
            className="gba:px-2 gba:py-0.5 gba:bg-blue-100 gba:text-blue-700 gba:rounded gba:text-sm"
            data-testid={`${testId}-add-number-button`}
          >
            {getTranslationFromI18nKeyAndLabel('flow.creator.number', 'Number')}
          </button>
        </div>

        <div className="gba:flex gba:gap-1">
          <span className="gba:text-sm gba:text-gray-500">
            {getTranslationFromI18nKeyAndLabel('flow.creator.selectInput', 'Select:')}
          </span>
          <button
            onClick={() => handleAddBlock(InputType.SELECT)}
            className="gba:px-2 gba:py-0.5 gba:bg-blue-100 gba:text-blue-700 gba:rounded gba:text-sm"
            data-testid={`${testId}-add-dropdown-button`}
          >
            {getTranslationFromI18nKeyAndLabel('flow.creator.dropdown', 'Dropdown')}
          </button>
          <button
            onClick={() => handleAddBlock(InputType.RADIO)}
            className="gba:px-2 gba:py-0.5 gba:bg-blue-100 gba:text-blue-700 gba:rounded gba:text-sm"
            data-testid={`${testId}-add-radio-button`}
          >
            {getTranslationFromI18nKeyAndLabel('flow.creator.radio', 'Radio')}
          </button>
          <button
            onClick={() => handleAddBlock(InputType.CHECKBOX)}
            className="gba:px-2 gba:py-0.5 gba:bg-blue-100 gba:text-blue-700 gba:rounded gba:text-sm"
            data-testid={`${testId}-add-checkbox-button`}
          >
            {getTranslationFromI18nKeyAndLabel('flow.creator.checkbox', 'Checkbox')}
          </button>
        </div>

        <div className="gba:flex gba:gap-1">
          <span className="gba:text-sm gba:text-gray-500">
            {getTranslationFromI18nKeyAndLabel('flow.creator.other', 'Other:')}
          </span>
          <button
            onClick={() => handleAddBlock(InputType.DATETIME)}
            className="gba:px-2 gba:py-0.5 gba:bg-blue-100 gba:text-blue-700 gba:rounded gba:text-sm"
            data-testid={`${testId}-add-datetime-button`}
          >
            {getTranslationFromI18nKeyAndLabel('flow.creator.datetime', 'DateTime')}
          </button>
          <button
            onClick={() => handleAddBlock(InputType.FILE)}
            className="gba:px-2 gba:py-0.5 gba:bg-blue-100 gba:text-blue-700 gba:rounded gba:text-sm"
            data-testid={`${testId}-add-file-button`}
          >
            {getTranslationFromI18nKeyAndLabel('flow.creator.file', 'File')}
          </button>
          <button
            onClick={() => handleAddBlock(InputType.SIGNATURE)}
            className="gba:px-2 gba:py-0.5 gba:bg-blue-100 gba:text-blue-700 gba:rounded gba:text-sm"
            data-testid={`${testId}-add-signature-button`}
          >
            {getTranslationFromI18nKeyAndLabel('flow.creator.signature', 'Signature')}
          </button>
        </div>
      </div>

      {blocks.length === 0 ? (
        <div
          className="gba:p-4 gba:text-center gba:text-gray-500 gba:border gba:border-dashed gba:border-gray-300 gba:rounded"
          data-testid={`${testId}-empty-message`}
        >
          {getTranslationFromI18nKeyAndLabel(
            'flow.creator.noInputBlocks',
            'No input blocks added yet. Click on one of the buttons above to add input fields.'
          )}
        </div>
      ) : (
        <div className="gba:flex gba:flex-col gba:gap-4" data-testid={`${testId}-blocks`}>
          {blocks.map((block, index) => renderBlock(block, index))}
        </div>
      )}
    </div>
  )
}
