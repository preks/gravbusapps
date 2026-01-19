import React, { useState } from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useFlowTemplateStore } from '../../../hooks/useFlowTemplateStore'
import { Input } from '../../../types/flowTemplate'

interface SelectInputBlockProps {
  taskId: string
  block: Input
  onRemove: () => void
  'data-testid'?: string
}

/**
 * Select input block component (dropdown, radio, checkbox) for task input fields
 */
export const SelectInputBlock: React.FC<SelectInputBlockProps> = ({
  taskId,
  block,
  onRemove,
  'data-testid': testId = 'select-input-block'
}) => {
  const { updateInputBlock } = useFlowTemplateStore()
  const [newOption, setNewOption] = useState({ value: '', label: '' })

  // Initialize options array if it doesn't exist
  const options = block.options || []

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateInputBlock(taskId, block.id, { label: e.target.value })
  }

  const handleRequiredChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateInputBlock(taskId, block.id, { required: e.target.checked })
  }

  const handleMultipleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateInputBlock(taskId, block.id, { multiple: e.target.checked })
  }

  const handleAddOption = () => {
    if (newOption.value && newOption.label) {
      const updatedOptions = [...options, newOption]
      updateInputBlock(taskId, block.id, { options: updatedOptions })
      setNewOption({ value: '', label: '' })
    }
  }

  const handleRemoveOption = (indexToRemove: number) => {
    const updatedOptions = options.filter((_, index) => index !== indexToRemove)
    updateInputBlock(taskId, block.id, { options: updatedOptions })
  }

  const getInputTypeLabel = () => {
    switch (block.type) {
      case 'dropdown':
        return getTranslationFromI18nKeyAndLabel('flow.creator.dropdownField', 'Dropdown Field')
      case 'radio':
        return getTranslationFromI18nKeyAndLabel('flow.creator.radioField', 'Radio Button Field')
      case 'checkbox':
        return getTranslationFromI18nKeyAndLabel('flow.creator.checkboxField', 'Checkbox Field')
      default:
        return getTranslationFromI18nKeyAndLabel('flow.creator.selectField', 'Select Field')
    }
  }

  return (
    <div className="gba:border gba:border-gray-200 gba:rounded gba:p-4 gba:bg-gray-50" data-testid={testId}>
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-4" data-testid={`${testId}-header`}>
        <div className="gba:flex gba:items-center gba:gap-2" data-testid={`${testId}-title`}>
          <span className="gba:text-blue-500 gba:font-medium">{getInputTypeLabel()}</span>
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

        {/* Options section */}
        <div className="gba:flex gba:flex-col gba:gap-2" data-testid={`${testId}-options-section`}>
          <div className="gba:text-sm gba:text-gray-600" data-testid={`${testId}-options-label`}>
            {getTranslationFromI18nKeyAndLabel('flow.creator.options', 'Options')}:
          </div>

          <div
            className="gba:border gba:border-gray-200 gba:rounded gba:p-2 gba:bg-white"
            data-testid={`${testId}-options-list`}
          >
            {options.length === 0 ? (
              <div
                className="gba:text-sm gba:text-gray-500 gba:p-2 gba:text-center"
                data-testid={`${testId}-no-options`}
              >
                {getTranslationFromI18nKeyAndLabel('flow.creator.noOptions', 'No options added yet')}
              </div>
            ) : (
              <ul className="gba:flex gba:flex-col gba:gap-2" data-testid={`${testId}-options`}>
                {options.map((option, index) => (
                  <li
                    key={index}
                    className="gba:flex gba:items-center gba:justify-between gba:p-2 gba:bg-gray-50 gba:rounded"
                    data-testid={`${testId}-option-${index}`}
                  >
                    <div className="gba:flex gba:flex-col">
                      <span className="gba:text-sm" data-testid={`${testId}-option-label-${index}`}>
                        {option.label}
                      </span>
                      <span className="gba:text-xs gba:text-gray-500" data-testid={`${testId}-option-value-${index}`}>
                        {getTranslationFromI18nKeyAndLabel('flow.creator.value', 'Value')}: {option.value}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveOption(index)}
                      className="gba:text-red-500 gba:text-sm"
                      data-testid={`${testId}-remove-option-${index}`}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Add new option */}
          <div className="gba:flex gba:flex-col gba:gap-2 gba:mt-2" data-testid={`${testId}-add-option-section`}>
            <div className="gba:flex gba:gap-2 gba:items-end" data-testid={`${testId}-new-option-form`}>
              <div className="gba:flex-1" data-testid={`${testId}-option-label-field`}>
                <label htmlFor={`${block.id}-option-label`} className="gba:text-xs gba:text-gray-600">
                  {getTranslationFromI18nKeyAndLabel('flow.creator.label', 'Label')}:
                </label>
                <input
                  id={`${block.id}-option-label`}
                  type="text"
                  value={newOption.label}
                  onChange={e => setNewOption({ ...newOption, label: e.target.value })}
                  className="gba:w-full gba:border gba:border-gray-300 gba:rounded gba:px-3 gba:py-1 gba:text-sm"
                  placeholder={getTranslationFromI18nKeyAndLabel('flow.creator.optionLabel', 'Option label')}
                  data-testid={`${testId}-new-option-label`}
                />
              </div>
              <div className="gba:flex-1" data-testid={`${testId}-option-value-field`}>
                <label htmlFor={`${block.id}-option-value`} className="gba:text-xs gba:text-gray-600">
                  {getTranslationFromI18nKeyAndLabel('flow.creator.value', 'Value')}:
                </label>
                <input
                  id={`${block.id}-option-value`}
                  type="text"
                  value={newOption.value}
                  onChange={e => setNewOption({ ...newOption, value: e.target.value })}
                  className="gba:w-full gba:border gba:border-gray-300 gba:rounded gba:px-3 gba:py-1 gba:text-sm"
                  placeholder={getTranslationFromI18nKeyAndLabel('flow.creator.optionValue', 'Option value')}
                  data-testid={`${testId}-new-option-value`}
                />
              </div>
              <button
                onClick={handleAddOption}
                disabled={!newOption.label || !newOption.value}
                className="gba:px-3 gba:py-1.5 gba:bg-blue-500 gba:text-white gba:rounded gba:text-sm disabled:gba:bg-gray-300"
                data-testid={`${testId}-add-option-button`}
              >
                {getTranslationFromI18nKeyAndLabel('flow.creator.add', 'Add')}
              </button>
            </div>
          </div>
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

          {/* Multiple selection checkbox (only for dropdown and checkbox) */}
          {(block.type === 'dropdown' || block.type === 'checkbox') && (
            <div className="gba:flex gba:items-center" data-testid={`${testId}-multiple-field`}>
              <input
                id={`${block.id}-multiple`}
                type="checkbox"
                checked={block.multiple || false}
                onChange={handleMultipleChange}
                className="gba:mr-2"
                data-testid={`${testId}-multiple-checkbox`}
              />
              <label htmlFor={`${block.id}-multiple`} className="gba:text-sm gba:text-gray-600">
                {getTranslationFromI18nKeyAndLabel('flow.creator.allowMultiple', 'Allow multiple selection')}
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
