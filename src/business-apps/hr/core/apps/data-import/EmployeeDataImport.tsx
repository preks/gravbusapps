/**
 * Employee Data Import App
 *
 * HR-flavored bulk import screen for employee records. Wires the shared
 * `HrEntityImportView` with `employeeImportConfig`. The HR submission
 * strategy POSTs the canonical `{ employee, assignment }` payload that
 * Flowbot's HR profile emits to the new BE endpoint (sibling of
 * `importListOfEmployees`).
 */

import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { HrEntityImportView } from '@/common/components/common-relations/apps/data-import/components/HrEntityImportView'
import { employeeImportConfig } from '@/common/data/hr/types/employeeImportConfig'

export type EmployeeDataImportProps = BusinessAppContextProps

export const EmployeeDataImport: React.FC<EmployeeDataImportProps> = props => {
  return (
    <HrEntityImportView
      config={employeeImportConfig}
      headerTitle="Employee Data Import"
      headerDescription="Upload an Excel or CSV file with employee data and let the AI map columns to the system schema before bulk import."
      entityType="employees"
      entityTypeSingular="employee"
      data-testid="employee-data-import"
      {...props}
    />
  )
}

export default EmployeeDataImport
