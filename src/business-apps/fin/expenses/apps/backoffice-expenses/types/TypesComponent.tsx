import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

/**
 * Component that wraps all types for the backoffice expenses app
 * This component is used by the wrapped-entries system
 */
const TypesComponent: React.FC<BusinessAppContextProps> = () => {
  return <div data-testid="gba:backoffice-expenses-types" style={{ display: 'none' }} />
}

export default TypesComponent
