/**
 * Data Import App
 * Main entry point for CRM data import functionality
 * Supports multiple entity types: Lead, Contact, Account, Opportunity
 */

import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DataImportLayout } from '@/common/components/common-relations/apps/data-import'
import { createCrmDataImportConfig } from './config/crmDataImportConfig'

export type DataImportProps = BusinessAppContextProps

export const DataImport: React.FC<DataImportProps> = props => {
  const config = useMemo(() => createCrmDataImportConfig(), [])

  return <DataImportLayout config={config} {...props} />
}

export default DataImport
