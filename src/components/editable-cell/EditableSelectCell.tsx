import React from 'react'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@newwork/nw-design-system'

export interface EditableSelectCellProps {
  value: string | undefined
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  placeholder?: string
  disabled?: boolean
  testId: string
  isEdited?: boolean
  hasError?: boolean
}

export const EditableSelectCell: React.FC<EditableSelectCellProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  testId,
  isEdited = false,
  hasError = false
}) => {
  // Get border class based on edited state and error state
  const getBorderClass = () => {
    if (hasError) {
      return 'gba:border gba:border-destructive'
    }
    if (isEdited) {
      return 'gba:border gba:border-blue-500'
    }
    return 'gba:border gba:border-gray-200'
  }

  // Match EditableCell exactly: h-6 (24px) + p-1 (4px padding) = same total height
  const commonSelectClassName = `gba:w-full gba:[&&]:h-6 gba:text-xs gba:p-1 gba:bg-transparent gba:focus:bg-white ${getBorderClass()} gba:leading-tight`

  return (
    <div
      className="gba:w-full"
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
      aria-invalid={hasError ? 'true' : undefined}
    >
      <Select value={value || ''} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger size="sm" className={commonSelectClassName} data-testid={testId}>
          <SelectValue placeholder={placeholder} className="gba:text-xs gba:leading-tight" />
        </SelectTrigger>
        <SelectContent className="gba:max-h-[200px]">
          {options.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default EditableSelectCell
