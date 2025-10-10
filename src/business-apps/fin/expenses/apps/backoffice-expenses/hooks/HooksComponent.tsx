import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

/**
 * Component that wraps all hooks for the backoffice expenses app
 * This component is used by the wrapped-entries system
 */
const HooksComponent: React.FC<BusinessAppContextProps> = () => {
  return <div data-testid="gba:backoffice-expenses-hooks" style={{ display: 'none' }} />
}

export default HooksComponent
