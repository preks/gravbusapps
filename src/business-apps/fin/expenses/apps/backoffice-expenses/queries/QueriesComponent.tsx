import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

/**
 * Component that wraps all queries for the backoffice expenses app
 * This component is used by the wrapped-entries system
 */
const QueriesComponent: React.FC<BusinessAppContextProps> = () => {
  return <div data-testid="gba:backoffice-expenses-queries" style={{ display: 'none' }} />
}

export default QueriesComponent
