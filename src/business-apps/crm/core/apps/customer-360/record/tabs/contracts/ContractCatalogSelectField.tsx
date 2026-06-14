import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import ContractDialogField from './ContractDialogField'

interface ContractCatalogSelectFieldProps {
  id: string
  label: string
  value?: string
  options: string[]
  onValueChange: (value: string) => void
}

function formatCatalogLabel(value: string): string {
  return value
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const ContractCatalogSelectField: React.FC<ContractCatalogSelectFieldProps> = ({
  id,
  label,
  value,
  options,
  onValueChange
}) => (
  <ContractDialogField label={label} id={id}>
    <Select value={value ?? ''} onValueChange={onValueChange}>
      <SelectTrigger id={id}>
        <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
      </SelectTrigger>
      <SelectContent>
        {options.map(option => (
          <SelectItem key={option} value={option}>
            {formatCatalogLabel(option)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </ContractDialogField>
)

export default ContractCatalogSelectField
