import React from 'react'
import { CreateCalculationRuleForm } from '@/business-apps/fin/expenses/forms/create-calculation-rule'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FormCatalogs } from '../hooks/useExpenseCalculationRules'

interface CreateRuleDialogProps extends Pick<BusinessAppContextProps, 'accessToken'> {
  open: boolean
  onOpenChange: (open: boolean) => void
  additionalData?: any
  formCatalogs?: FormCatalogs
  onCreated: () => void
}

const CreateRuleDialog: React.FC<CreateRuleDialogProps> = ({
  open,
  onOpenChange,
  accessToken,
  additionalData,
  formCatalogs,
  onCreated
}) => {
  return (
    <CreateCalculationRuleForm
      open={open}
      onOpenChange={onOpenChange}
      accessToken={accessToken}
      additionalData={additionalData}
      preloadedCatalogs={formCatalogs}
      onCancel={() => onOpenChange(false)}
      onCreate={() => {
        onOpenChange(false)
        onCreated()
      }}
    />
  )
}

export default CreateRuleDialog
