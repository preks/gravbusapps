/**
 * Data Import App
 * Main entry point for IRM data import functionality
 * Supports multiple entity types: Lead, Contact, Account, Real Estate Investment, Equity Investment, Liquid Fund Investment
 */

import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DataImportLayout } from '@/common/components/common-relations/apps/data-import'
import { createIrmDataImportConfig } from './config/irmDataImportConfig'

export type DataImportProps = BusinessAppContextProps

export const DataImport: React.FC<DataImportProps> = props => {
  const config = useMemo(() => createIrmDataImportConfig(), [])

  return <DataImportLayout config={config} {...props} />
}

export default DataImport
