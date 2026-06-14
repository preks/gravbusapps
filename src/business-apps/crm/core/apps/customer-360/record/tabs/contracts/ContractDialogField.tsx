import React from 'react'
import { Label } from '@newwork/nw-design-system'

interface ContractDialogFieldProps {
  label: string
  id: string
  children: React.ReactNode
}

const ContractDialogField: React.FC<ContractDialogFieldProps> = ({ label, id, children }) => (
  <div className="gba:flex gba:flex-col gba:gap-2">
    <Label htmlFor={id}>{label}</Label>
    {children}
  </div>
)

export default ContractDialogField
