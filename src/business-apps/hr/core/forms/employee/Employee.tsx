import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { EmployeeProvider } from './context/EmployeeContext'
import EmployeeForm from './components/EmployeeForm'
import { EmployeeFormValues } from './types'

interface EmployeeProps extends BusinessAppContextProps {
  initialValues?: Partial<EmployeeFormValues>
  isEdit?: boolean
}

const Employee: React.FC<EmployeeProps> = ({ accessToken, initialValues = {}, isEdit = false, additionalData }) => {
  const structureId = getCurrentActiveStructureId()
  const targetOrgUnitId = additionalData?.psi_taskPayload?.psi_initialParameters?.orgUnitId
  const targetJobPositionId = additionalData?.psi_taskPayload?.psi_initialParameters?.jobPositionId

  if (!accessToken) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-full">
        <div className="gba:text-muted-foreground">Access token required</div>
      </div>
    )
  }

  if (!structureId) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-full">
        <div className="gba:text-muted-foreground">Structure ID required</div>
      </div>
    )
  }

  return (
    <EmployeeProvider
      accessToken={accessToken}
      structureId={structureId}
      targetOrgUnitId={targetOrgUnitId}
      targetJobPositionId={targetJobPositionId}
      initialValues={initialValues}
      isEdit={isEdit}
    >
      <EmployeeForm />
    </EmployeeProvider>
  )
}

export default Employee
