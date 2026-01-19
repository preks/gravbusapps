import React from 'react'
import { Input } from '@newwork/nw-design-system'
import { TranslatableField } from '@/components/translatable-field'

interface EditableCellProps {
  value: string | number | undefined
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  testId: string
  type?: 'text' | 'number'
  isEdited?: boolean

  // Translation props (optional)
  isTranslatable?: boolean
  translations?: Record<string, string>
  onTranslationsChange?: (translations: Record<string, string>) => void
}

export const EditableCell: React.FC<EditableCellProps> = ({
  value,
  onChange,
  placeholder = '',
  disabled = false,
  testId,
  type = 'text',
  isEdited = false,
  isTranslatable = false,
  translations = {},
  onTranslationsChange = () => {}
}) => {
  // Common styling for both components
  const getBorderClass = () => {
    if (isEdited) {
      return 'gba:border gba:border-blue-500'
    }
    return 'gba:border gba:border-gray-200'
  }

  const commonInputClassName = `gba:bg-transparent gba:p-1 gba:h-6 gba:text-xs gba:focus:bg-white ${getBorderClass()}`

  if (isTranslatable) {
    return (
      <div className="gba:min-w-[120px]">
        <TranslatableField
          label=""
          value={value?.toString() || ''}
          onChange={onChange}
          translations={translations}
          onTranslationsChange={onTranslationsChange}
          data-testid={testId}
          className="gba:space-y-0"
          inputClassName={`gba:h-6 gba:text-xs gba:p-1 gba:bg-transparent gba:focus:bg-white ${getBorderClass()} ${disabled ? 'gba:opacity-50' : ''}`}
          placeholder={placeholder}
        />
      </div>
    )
  }

  return (
    <Input
      type={type}
      value={value?.toString() || ''}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className={commonInputClassName}
      style={{
        minWidth: '100px'
      }}
      data-testid={testId}
    />
  )
}

export default EditableCell
