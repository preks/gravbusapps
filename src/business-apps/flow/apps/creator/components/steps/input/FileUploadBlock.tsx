import React from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useFlowTemplateStore } from '../../../hooks/useFlowTemplateStore'
import { Input } from '../../../types/flowTemplate'

interface FileUploadBlockProps {
  taskId: string
  block: Input
  onRemove: () => void
  'data-testid'?: string
}

/**
 * File upload input block component for task input fields
 */
export const FileUploadBlock: React.FC<FileUploadBlockProps> = ({
  taskId,
  block,
  onRemove,
  'data-testid': testId = 'file-upload-block'
}) => {
  const { updateInputBlock } = useFlowTemplateStore()

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateInputBlock(taskId, block.id, { label: e.target.value })
  }

  const handleRequiredChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateInputBlock(taskId, block.id, { required: e.target.checked })
  }

  const handleAllowMultipleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateInputBlock(taskId, block.id, { multiple: e.target.checked })
  }

  return (
    <div className="gba:border gba:border-gray-200 gba:rounded gba:p-4 gba:bg-gray-50" data-testid={testId}>
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-4" data-testid={`${testId}-header`}>
        <div className="gba:flex gba:items-center gba:gap-2" data-testid={`${testId}-title`}>
          <span className="gba:text-blue-500 gba:font-medium">
            {getTranslationFromI18nKeyAndLabel('flow.creator.fileUploadField', 'File Upload Field')}
          </span>
        </div>

        <button onClick={onRemove} className="gba:text-red-500" data-testid={`${testId}-remove-button`}>
          {getTranslationFromI18nKeyAndLabel('flow.creator.remove', 'Remove')}
        </button>
      </div>

      <div className="gba:grid gba:grid-cols-1 gba:gap-4" data-testid={`${testId}-form`}>
        {/* Label */}
        <div className="gba:flex gba:flex-col gba:gap-1" data-testid={`${testId}-label-field`}>
          <label htmlFor={`${block.id}-label`} className="gba:text-sm gba:text-gray-600">
            {getTranslationFromI18nKeyAndLabel('flow.creator.label', 'Label')}:
          </label>
          <input
            id={`${block.id}-label`}
            type="text"
            value={block.label}
            onChange={handleLabelChange}
            className="gba:border gba:border-gray-300 gba:rounded gba:px-3 gba:py-2"
            placeholder={getTranslationFromI18nKeyAndLabel('flow.creator.enterLabel', 'Enter label')}
            data-testid={`${testId}-label-input`}
          />
        </div>

        {/* Configuration options */}
        <div className="gba:flex gba:flex-col gba:gap-2 gba:mt-2" data-testid={`${testId}-config-options`}>
          {/* Required checkbox */}
          <div className="gba:flex gba:items-center" data-testid={`${testId}-required-field`}>
            <input
              id={`${block.id}-required`}
              type="checkbox"
              checked={block.required}
              onChange={handleRequiredChange}
              className="gba:mr-2"
              data-testid={`${testId}-required-checkbox`}
            />
            <label htmlFor={`${block.id}-required`} className="gba:text-sm gba:text-gray-600">
              {getTranslationFromI18nKeyAndLabel('flow.creator.required', 'Required field')}
            </label>
          </div>

          {/* Multiple files checkbox */}
          <div className="gba:flex gba:items-center" data-testid={`${testId}-multiple-field`}>
            <input
              id={`${block.id}-multiple`}
              type="checkbox"
              checked={block.multiple || false}
              onChange={handleAllowMultipleChange}
              className="gba:mr-2"
              data-testid={`${testId}-multiple-checkbox`}
            />
            <label htmlFor={`${block.id}-multiple`} className="gba:text-sm gba:text-gray-600">
              {getTranslationFromI18nKeyAndLabel('flow.creator.allowMultipleFiles', 'Allow multiple files')}
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
